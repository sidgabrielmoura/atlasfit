import { Prisma } from "@prisma/client";
import { assertSuperadmin } from "./gym-provisioning";
import { serializableTransaction, type GymTransactionClient } from "./transaction";
import { financeQuerySchema, type FinanceOverview } from "../domain/superadmin-finance";
import { safeCentsNumber } from "../domain/money";
import { reportDateBoundary } from "../domain/gym-report-metrics";
import { reportCalendarRange } from "../domain/gym-report-calendar";
import { WorkspaceAccessError } from "../domain/types";

const timezone = "America/Sao_Paulo" as const;
const transactionSelect = {
  id: true, amount: true, status: true, paymentMethod: true, description: true, createdAt: true,
  user: { select: { id: true, name: true, email: true, subscription: { select: { plan: { select: { id: true, name: true } } } } } },
  workspace: { select: { id: true, name: true, type: true } },
} satisfies Prisma.TransactionSelect;

/** Legacy Float BRL must contain exact whole cents; never hide fractional cents. */
export function catalogCents(value: number): bigint | null {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(String(value));
  if (!match) return null;
  const cents = BigInt(match[1]) * BigInt(100) + BigInt((match[2] || "").padEnd(2, "0"));
  return cents <= BigInt(Number.MAX_SAFE_INTEGER) ? cents : null;
}
const exactMoney = "^[0-9]+([.][0-9]{1,2})?$";
export async function platformFinanceReference(tx: GymTransactionClient, now = new Date()) {
  const rows = await tx.$queryRaw<Array<{ known: string; eligible: bigint; missing: bigint }>>(Prisma.sql`
    WITH subscriptions AS (
      SELECT p.price, lower(p.interval) AS interval FROM "Subscription" s LEFT JOIN "Plan" p ON p.id = s."planId"
      WHERE lower(s.status) = 'active' AND NOT s."isPreSubscription" AND s."startDate" <= ${now} AND (s."endDate" IS NULL OR s."endDate" > ${now})
      UNION ALL
      SELECT p.price, lower(p.interval) FROM "WorkspaceSubscription" s JOIN "Workspace" w ON w.id = s."workspaceId" LEFT JOIN "Plan" p ON p.id = s."planId"
      WHERE s.status = 'ACTIVE' AND w.type = 'GYM' AND s."startDate" <= ${now} AND (s."endDate" IS NULL OR s."endDate" > ${now})
    ), valued AS (
      SELECT *, CASE WHEN price::text ~ ${exactMoney} AND price::numeric * 100 <= ${BigInt(Number.MAX_SAFE_INTEGER)} AND interval IN ('month','year') THEN true ELSE false END AS valid FROM subscriptions
    ) SELECT COALESCE(sum(CASE WHEN valid THEN CASE WHEN interval = 'year' THEN floor((price::numeric * 200 + 12) / 24) ELSE price::numeric * 100 END ELSE 0 END), 0)::bigint::text AS known, count(*) AS eligible, count(*) FILTER (WHERE NOT valid) AS missing FROM valued
  `);
  const row=rows[0], known=BigInt(row.known), monthly=safeCentsNumber(known), missing=safeCentsNumber(row.missing);
  return { mrr: missing ? null : monthly / 100, arr: missing ? null : safeCentsNumber(known * BigInt(12)) / 100, knownMonthlyReferenceInCents: monthly, eligibleSubscriptionsCount: safeCentsNumber(row.eligible), unvaluedSubscriptionsCount: missing };
}

async function recordedRevenue(tx: GymTransactionClient, now: Date, today: Date) {
  const rows = await tx.$queryRaw<Array<{ approved: string; today: string; failed: string; invalid: bigint }>>(Prisma.sql`
    WITH facts AS (
      SELECT *, CASE WHEN amount::text ~ ${exactMoney} AND amount::numeric * 100 <= ${BigInt(Number.MAX_SAFE_INTEGER)} THEN amount::numeric * 100 ELSE NULL END AS cents
      FROM "Transaction" WHERE upper(status) IN ('APPROVED','FAILED') AND "createdAt" <= ${now}
    ) SELECT COALESCE(sum(cents) FILTER (WHERE upper(status)='APPROVED'), 0)::bigint::text AS approved,
      COALESCE(sum(cents) FILTER (WHERE upper(status)='APPROVED' AND "createdAt" >= ${today}), 0)::bigint::text AS today,
      COALESCE(sum(cents) FILTER (WHERE upper(status)='FAILED'), 0)::bigint::text AS failed, count(*) FILTER (WHERE cents IS NULL) AS invalid FROM facts
  `);
  const row=rows[0];
  if(row.invalid > BigInt(0)) throw new WorkspaceAccessError(422, "INVALID_AMOUNT", "Há transações legadas com valor monetário inválido. Revise os registros antes de consolidar.");
  return { totalRevenue: safeCentsNumber(BigInt(row.approved)) / 100, todaysRevenue: safeCentsNumber(BigInt(row.today)) / 100, totalFailedRevenue: safeCentsNumber(BigInt(row.failed)) / 100 };
}
export async function getSuperadminFinance(actorUserId: string): Promise<FinanceOverview> {
  return serializableTransaction(async tx => {
    await assertSuperadmin(tx, actorUserId);
    const now = new Date();
    const reference = await platformFinanceReference(tx, now);
    const today = reportDateBoundary(reportCalendarRange(now, timezone, "7d").endDate, timezone, false);
    const revenue = await recordedRevenue(tx, now, today);
    const recentTransactions = await tx.transaction.findMany({ take: 10, orderBy: [{ createdAt: "desc" }, { id: "desc" }], select: transactionSelect });
    const upgrades = await tx.subscriptionActivity.findMany({ where: { type: "UPGRADE" }, take: 5, orderBy: [{ createdAt: "desc" }, { id: "desc" }], select: { id: true, userId: true, createdAt: true, user: { select: { name: true, email: true } }, plan: { select: { name: true } } } });
    const recentUpgrades = [];
    for (const upgrade of upgrades) {
      const previous = await tx.subscriptionActivity.findFirst({ where: { userId: upgrade.userId, createdAt: { lt: upgrade.createdAt }, type: { in: ["NEW_SUBSCRIPTION", "RENEWAL", "UPGRADE"] } }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], select: { plan: { select: { name: true } } } });
      recentUpgrades.push({ id: upgrade.id, user: upgrade.user.name || upgrade.user.email || "Conta", to: upgrade.plan.name, from: previous?.plan.name || "Sem histórico anterior", date: upgrade.createdAt.toISOString() });
    }
    return { ...reference, snapshot: { asOf: now.toISOString(), timezone, basis: "CURRENT_CATALOG" },
      ...revenue,
      ltv: null, churn: null, mrrHistory: [], unavailableReason: "Não há preço contratado preservado nem histórico completo de vigência e cancelamento das assinaturas SaaS para calcular MRR histórico, churn ou LTV.",
      recentTransactions: recentTransactions.map(row => ({ ...row, createdAt: row.createdAt.toISOString(), status: row.status.toUpperCase() })), recentUpgrades };
  });
}
export async function listSuperadminTransactions(actorUserId: string, raw: unknown) {
  const parsed = financeQuerySchema.safeParse(raw);
  if (!parsed.success) throw new WorkspaceAccessError(400, "INVALID_REQUEST", "Filtros ou paginação inválidos.");
  const input = parsed.data;
  return serializableTransaction(async tx => {
    await assertSuperadmin(tx, actorUserId);
    const now = new Date();
    const where: Prisma.TransactionWhereInput = { status: { equals: input.status, mode: "insensitive" } };
    if (input.userId) where.userId = input.userId;
    if (input.planId) where.user = { subscription: { planId: input.planId } };
    if (input.dateRange !== "all") {
      const range = reportCalendarRange(now, timezone, input.dateRange === "7days" ? "7d" : "30d");
      const start = input.dateRange === "thisyear" ? `${range.endDate.slice(0, 4)}-01-01` : range.startDate;
      where.createdAt = { gte: reportDateBoundary(start, timezone, false), lte: now };
    }
    const rows = await tx.transaction.findMany({ where, skip: (input.page - 1) * input.limit, take: input.limit, orderBy: [{ createdAt: "desc" }, { id: "desc" }], select: transactionSelect });
    const total = await tx.transaction.count({ where });
    return { data: rows.map(row => ({ ...row, createdAt: row.createdAt.toISOString(), status: row.status.toUpperCase() })), pagination: { total, page: input.page, pages: Math.ceil(total / input.limit), limit: input.limit } };
  });
}
