import { Prisma } from "@prisma/client";
import type { GymTransactionClient } from "./transaction";
import type { gymReportAuthority } from "./gym-report-authority";
import { averageContractCents } from "../domain/gym-report-metrics";
import { safeCentsNumber } from "../domain/money";
import { WorkspaceAccessError } from "../domain/types";

type Scope = Awaited<ReturnType<typeof gymReportAuthority>>;
/** Only the authority service builds these exact predicates; reject unknown shapes. */
export function gymReportMemberSql(scope: Scope) {
  const clauses = (scope.portfolio.OR || []).map(row => {
    if (Object.keys(row).some(key => !["unitId", "assignedStaffId"].includes(key))) throw new Error("UNSUPPORTED_REPORT_SCOPE");
    return Prisma.sql`(${row.unitId === null ? Prisma.sql`m."unitId" IS NULL` : Prisma.sql`m."unitId"=${row.unitId as string}`} ${row.assignedStaffId ? Prisma.sql`AND m."assignedStaffId"=${row.assignedStaffId as string}` : Prisma.empty})`;
  });
  const and = scope.portfolio.AND;
  const assignment = Array.isArray(and) ? and.map(row => {
    if (Object.keys(row).some(key => key !== "assignedStaffId") || typeof row.assignedStaffId !== "string") throw new Error("UNSUPPORTED_REPORT_SCOPE");
    return Prisma.sql`AND m."assignedStaffId"=${row.assignedStaffId}`;
  }) : [];
  return Prisma.sql`(${clauses.length ? Prisma.join(clauses, " OR ") : Prisma.sql`FALSE`}) ${assignment.length ? Prisma.join(assignment, " ") : Prisma.empty}`;
}

/** One aggregate row, including lifecycle history, independent of the number of contracts. */
export async function gymReportContractAggregates(tx: GymTransactionClient, input: { workspaceId: string; start: Date; end: Date; now: Date; scope: Scope; includeFinancial: boolean }) {
  const { workspaceId, start, now, scope } = input;
  const end = new Date(Math.min(input.end.getTime(), now.getTime()));
  const at = new Date(start.getTime() - 1);
  const units = scope.units.map(unit => unit.id);
  const unitScope = Prisma.sql`(${units.length ? Prisma.sql`e."unitId" IN (${Prisma.join(units)})` : Prisma.sql`FALSE`} ${scope.includeUnassigned ? Prisma.sql`OR e."unitId" IS NULL` : Prisma.empty})`;
  const assignments = Array.isArray(scope.portfolio.AND) ? scope.portfolio.AND.map(row => {
    if(Object.keys(row).some(key=>key!=="assignedStaffId") || typeof row.assignedStaffId!=="string")throw Error("UNSUPPORTED_REPORT_SCOPE");
    return Prisma.sql`AND m."assignedStaffId"=${row.assignedStaffId}`;
  }) : [];
  const member = scope.financial
    ? (assignments.length ? Prisma.join(assignments," ") : Prisma.empty)
    : Prisma.sql`AND ${gymReportMemberSql(scope)}`;
  const rows = await tx.$queryRaw<Array<Record<string, bigint | null>>>(Prisma.sql`
    WITH RECURSIVE contracts AS (
      SELECT e.*, v."billingCycle", v."durationDays"
      FROM "GymEnrollment" e JOIN "WorkspaceMember" m ON m.id=e."studentMemberId"
      JOIN "GymPlanVersion" v ON v.id=e."planVersionId" JOIN "GymPlan" p ON p.id=v."planId"
      WHERE e."workspaceId"=${workspaceId} AND m."workspaceId"=${workspaceId} AND p."workspaceId"=${workspaceId} AND ${unitScope} ${member}
    ), facts AS (
      SELECT c.*, h.*, past.state AS past_state, future.state AS future_state,
        COALESCE(h.cancel_date,c."cancellationEffectiveDate",c."cancelledAt") AS cancel_date_fact,
        (c.status='ACTIVE' AND c."startDate"<=${now} AND (c."endDate" IS NULL OR c."endDate">${now}) AND (c."cancellationEffectiveDate" IS NULL OR c."cancellationEffectiveDate">${now})) AS active_now,
        (c.status='PAUSED' AND c."startDate"<=${now} AND (c."endDate" IS NULL OR c."endDate">${now}) AND (c."cancellationEffectiveDate" IS NULL OR c."cancellationEffectiveDate">${now})) AS paused_now
      FROM contracts c
      CROSS JOIN LATERAL (SELECT bool_or(ev."toStatus"='ACTIVE' OR ev."fromStatus"='ACTIVE') AS active_evidence,
        bool_or(ev."toStatus"='PAUSED') AS pause_evidence, bool_or(ev."toStatus"='CANCELLED') AS cancel_evidence,
        (array_agg(ev."effectiveDate" ORDER BY ev."effectiveDate", ev."createdAt", ev.id) FILTER (WHERE ev."toStatus"='CANCELLED'))[1] AS cancel_date
        FROM "GymEnrollmentEvent" ev WHERE ev."enrollmentId"=c.id AND ev."workspaceId"=${workspaceId} AND ev."fromStatus" IS DISTINCT FROM ev."toStatus") h
      LEFT JOIN LATERAL (SELECT ev."toStatus"::text AS state FROM "GymEnrollmentEvent" ev WHERE ev."enrollmentId"=c.id AND ev."workspaceId"=${workspaceId} AND ev."fromStatus" IS DISTINCT FROM ev."toStatus" AND ev."effectiveDate"<=${at} ORDER BY ev."effectiveDate" DESC,ev."createdAt" DESC,ev.id DESC LIMIT 1) past ON TRUE
      LEFT JOIN LATERAL (SELECT ev."fromStatus"::text AS state FROM "GymEnrollmentEvent" ev WHERE ev."enrollmentId"=c.id AND ev."workspaceId"=${workspaceId} AND ev."fromStatus" IS DISTINCT FROM ev."toStatus" AND ev."effectiveDate">${at} ORDER BY ev."effectiveDate",ev."createdAt",ev.id LIMIT 1) future ON TRUE
    ), base AS (
      SELECT f.*, CASE
        WHEN f."createdAt">${at} OR f."startDate">${at} THEN 'PENDING_ACTIVATION'
        WHEN f.status='ACTIVE' AND f."activatedAt" IS NULL AND NOT COALESCE(f.active_evidence,FALSE) THEN NULL
        WHEN f.status='PAUSED' AND NOT COALESCE(f.pause_evidence,FALSE) THEN NULL
        WHEN f.status='CANCELLED' AND f."cancelledAt" IS NULL AND f."cancellationEffectiveDate" IS NULL AND NOT COALESCE(f.cancel_evidence,FALSE) THEN NULL
        ELSE COALESCE(f.past_state,f.future_state, CASE WHEN f."activatedAt"<=${at} THEN CASE WHEN f.status='PAUSED' THEN NULL WHEN f."cancelledAt"<=${at} THEN 'CANCELLED' ELSE 'ACTIVE' END WHEN f."activatedAt">${at} THEN 'PENDING_ACTIVATION' WHEN f.status IN ('DRAFT','PENDING_ACCEPTANCE','PENDING_ACTIVATION') THEN f.status::text ELSE NULL END)
      END AS initial_state FROM facts f
    ), states AS (
      SELECT b.*, CASE WHEN b.initial_state IN ('ACTIVE','PAUSED') AND b."cancellationEffectiveDate"<=${at} THEN 'CANCELLED'
        WHEN b.initial_state IN ('ACTIVE','PAUSED') AND b."endDate"<=${at} THEN 'EXPIRED' ELSE b.initial_state END AS cohort_state,
        NOT EXISTS(SELECT 1 FROM contracts s WHERE s."supersedesEnrollmentId"=b.id AND s."activatedAt"<=${end})
          AND b.cancel_date_fact BETWEEN ${start} AND ${end} AND (b."activatedAt" IS NOT NULL OR COALESCE(b.active_evidence,FALSE) OR EXISTS(SELECT 1 FROM "GymEnrollmentEvent" ev WHERE ev."enrollmentId"=b.id AND ev."workspaceId"=${workspaceId} AND ev."fromStatus" IS DISTINCT FROM ev."toStatus" AND ev."fromStatus"='PAUSED')) AS cancelled_period
      FROM base b
    ), chain AS (
      SELECT s.id AS origin,s.id AS current,ARRAY[s.id] AS path,FALSE AS cycle FROM states s WHERE s.cohort_state='ACTIVE'
      UNION ALL SELECT ch.origin,s.id,ch.path||s.id,s.id=ANY(ch.path)
      FROM chain ch JOIN states s ON s."supersedesEnrollmentId"=ch.current AND s."activatedAt"<=${end} WHERE NOT ch.cycle
    ), totals AS (
      SELECT count(*) FILTER(WHERE active_now)::bigint AS active,
        count(DISTINCT "studentMemberId") FILTER(WHERE active_now)::bigint AS students,
        count(DISTINCT "studentMemberId") FILTER(WHERE paused_now AND "studentMemberId" NOT IN(SELECT "studentMemberId" FROM states WHERE active_now))::bigint AS paused,
        COALESCE(sum(floor(("priceInCents"::numeric * CASE WHEN "billingCycle"='CUSTOM' THEN 30 ELSE 1 END * 2 + CASE "billingCycle" WHEN 'MONTHLY' THEN 1 WHEN 'BIMONTHLY' THEN 2 WHEN 'QUARTERLY' THEN 3 WHEN 'SEMIANNUAL' THEN 6 WHEN 'ANNUAL' THEN 12 ELSE "durationDays" END) / (2 * CASE "billingCycle" WHEN 'MONTHLY' THEN 1 WHEN 'BIMONTHLY' THEN 2 WHEN 'QUARTERLY' THEN 3 WHEN 'SEMIANNUAL' THEN 6 WHEN 'ANNUAL' THEN 12 ELSE NULLIF("durationDays",0) END))) FILTER(WHERE active_now AND ${input.includeFinancial}),0)::bigint AS mrr,
        count(*) FILTER(WHERE active_now AND ${input.includeFinancial} AND ("priceInCents"<0 OR ("billingCycle"='CUSTOM' AND "durationDays"<=0)))::bigint AS invalid,
        count(*) FILTER(WHERE "supersedesEnrollmentId" IS NULL AND "activatedAt" BETWEEN ${start} AND ${end})::bigint AS new,
        count(*) FILTER(WHERE "changeKind"='RENEWAL' AND "supersedesEnrollmentId" IS NOT NULL AND "activatedAt" BETWEEN ${start} AND ${end})::bigint AS renewals,
        count(*) FILTER(WHERE cancelled_period)::bigint AS cancelled,
        count(*) FILTER(WHERE cohort_state='ACTIVE')::bigint AS cohort,
        count(*) FILTER(WHERE cohort_state IS NULL)::bigint AS incomplete FROM states
    ) SELECT t.*,(SELECT count(DISTINCT ch.origin) FROM chain ch JOIN states s ON s.id=ch.current WHERE s.cancelled_period)::bigint AS churned,
      (SELECT count(*) FROM chain WHERE cycle)::bigint AS cycles FROM totals t
  `);
  const row = rows[0];
  if (row.invalid || row.cycles) throw new WorkspaceAccessError(422, "INVALID_REQUEST", "Valores ou histórico de revisões contratuais exigem revisão.");
  const n = (key: string) => safeCentsNumber(row[key] ?? BigInt(0));
  return { mrrInCents: n("mrr"), activeRecurringContracts: n("active"), averageTicketInCents: averageContractCents(row.mrr ?? BigInt(0), n("active")), activeStudentsCount: n("students"), pausedStudentsCount: n("paused"), newEnrollmentsCount: n("new"), renewalsCount: n("renewals"), cancelledEnrollmentsCount: n("cancelled"), churnBasisContractCount: n("cohort"), churnedContractsCount: n("churned"), lifecycleHistoryIncompleteCount: n("incomplete"), churnRatePercentage: row.incomplete ? null : row.cohort ? Number((n("churned") * 100 / n("cohort")).toFixed(2)) : 0 };
}
