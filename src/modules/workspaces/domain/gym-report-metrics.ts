import type { GymBillingCycle, GymEnrollmentStatus } from "@prisma/client";
import { safeCentsNumber } from "./money";
import { WorkspaceAccessError } from "./types";
import { gymCalendarInstant } from "./gym-calendar-date";

/** Date-only filters include the whole local day; timestamp filters stay exact. */
export function reportDateBoundary(value: Date | string, timezone: string, end: boolean): Date {
  if (!end || typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return gymCalendarInstant(value, timezone);
  const next = new Date(`${value}T12:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return new Date(gymCalendarInstant(next.toISOString().slice(0, 10), timezone).getTime() - 1);
}

/** Round only the final rational amount for each contract, using integer cents. */
export function monthlyContractCents(price: bigint, cycle: GymBillingCycle, durationDays: number): bigint {
  if (price < BigInt(0)) throw new WorkspaceAccessError(422, "INVALID_AMOUNT", "Contrato com valor negativo exige revisão.");
  const months = { MONTHLY: 1, BIMONTHLY: 2, QUARTERLY: 3, SEMIANNUAL: 6, ANNUAL: 12 };
  if (cycle === "CUSTOM" && (!Number.isSafeInteger(durationDays) || durationDays <= 0)) throw new WorkspaceAccessError(422, "INVALID_REQUEST", "Duração contratual inválida para o indicador mensal.");
  const numerator = cycle === "CUSTOM" ? price * BigInt(30) : price;
  const denominator = BigInt(cycle === "CUSTOM" ? durationDays : months[cycle]);
  return (numerator * BigInt(2) + denominator) / (denominator * BigInt(2));
}

interface Transition {
  fromStatus: GymEnrollmentStatus | null;
  toStatus: GymEnrollmentStatus;
  effectiveDate: Date;
  createdAt: Date;
  id: string;
}
export interface ReportContract {
  id: string;
  studentMemberId: string;
  status: GymEnrollmentStatus;
  startDate: Date;
  endDate: Date | null;
  createdAt: Date;
  activatedAt: Date | null;
  cancelledAt: Date | null;
  cancellationEffectiveDate: Date | null;
  supersedesEnrollmentId: string | null;
  changeKind: string | null;
  events: Transition[];
}

function transitions(contract: ReportContract) {
  // Scheduling/cancelling a schedule records an event without changing state.
  return contract.events.filter(event => event.fromStatus !== event.toStatus).sort((a, b) =>
    a.effectiveDate.getTime() - b.effectiveDate.getTime() || a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id));
}

export function contractStateAt(contract: ReportContract, at: Date): GymEnrollmentStatus | null {
  if (contract.createdAt > at || contract.startDate > at) return "PENDING_ACTIVATION";
  const events = transitions(contract);
  if (contract.status === "ACTIVE" && !contract.activatedAt && !events.some(event => event.toStatus === "ACTIVE" || event.fromStatus === "ACTIVE")) return null;
  if (contract.status === "PAUSED" && !events.some(event => event.toStatus === "PAUSED")) return null;
  if (contract.status === "CANCELLED" && !contract.cancelledAt && !contract.cancellationEffectiveDate && !events.some(event => event.toStatus === "CANCELLED")) return null;
  const past = events.filter(event => event.effectiveDate <= at);
  let state: GymEnrollmentStatus | null = past.at(-1)?.toStatus ?? events.find(event => event.effectiveDate > at)?.fromStatus ?? null;
  if (!state) {
    if (contract.activatedAt && contract.activatedAt <= at) {
      // A PAUSED legacy row without its transition cannot establish a cohort.
      state = contract.status === "PAUSED" ? null : contract.cancelledAt && contract.cancelledAt <= at ? "CANCELLED" : "ACTIVE";
    } else if (contract.activatedAt && contract.activatedAt > at) state = "PENDING_ACTIVATION";
    else if (["DRAFT", "PENDING_ACCEPTANCE", "PENDING_ACTIVATION"].includes(contract.status)) state = contract.status;
  }
  if ((state === "ACTIVE" || state === "PAUSED") && contract.cancellationEffectiveDate && contract.cancellationEffectiveDate <= at) return "CANCELLED";
  if ((state === "ACTIVE" || state === "PAUSED") && contract.endDate && contract.endDate <= at) return "EXPIRED";
  return state;
}

export function contractPeriodMetrics(contracts: ReportContract[], start: Date, end: Date) {
  const within = (date: Date | null) => date !== null && date >= start && date <= end;
  const byId = new Map(contracts.map(contract => [contract.id, contract]));
  const successors = new Map<string, ReportContract>();
  for (const contract of contracts) if (contract.supersedesEnrollmentId && contract.activatedAt && contract.activatedAt <= end) successors.set(contract.supersedesEnrollmentId, contract);
  const superseded = (contract: ReportContract) => successors.has(contract.id);
  const cancellationDate = (contract: ReportContract) => transitions(contract).find(event => event.toStatus === "CANCELLED")?.effectiveDate ?? contract.cancellationEffectiveDate ?? contract.cancelledAt;
  const cancelled = (contract: ReportContract) => !superseded(contract) && within(cancellationDate(contract)) && (contract.activatedAt !== null || transitions(contract).some(event => event.toStatus === "ACTIVE" || event.fromStatus === "ACTIVE" || event.fromStatus === "PAUSED"));
  const states = contracts.map(contract => ({ contract, state: contractStateAt(contract, new Date(start.getTime() - 1)) }));
  const cohort = states.filter(row => row.state === "ACTIVE").map(row => row.contract);
  const incomplete = states.filter(row => row.state === null).length;
  let churned = 0;
  for (const original of cohort) {
    let terminal = original;
    const visited = new Set([original.id]);
    while (successors.has(terminal.id)) {
      const next = successors.get(terminal.id)!;
      if (visited.has(next.id) || !byId.has(next.id)) throw new WorkspaceAccessError(422, "INVALID_REQUEST", "Histórico de revisões contratuais inconsistente.");
      visited.add(next.id); terminal = next;
    }
    if (cancelled(terminal)) churned++;
  }
  return {
    newEnrollmentsCount: contracts.filter(contract => !contract.supersedesEnrollmentId && within(contract.activatedAt)).length,
    renewalsCount: contracts.filter(contract => contract.changeKind === "RENEWAL" && contract.supersedesEnrollmentId && within(contract.activatedAt)).length,
    cancelledEnrollmentsCount: contracts.filter(cancelled).length,
    churnBasisContractCount: cohort.length,
    churnedContractsCount: churned,
    lifecycleHistoryIncompleteCount: incomplete,
    churnRatePercentage: incomplete ? null : cohort.length ? Number((churned * 100 / cohort.length).toFixed(2)) : 0,
  };
}

export function averageContractCents(total: bigint, count: number): number {
  return count ? safeCentsNumber((total * BigInt(2) + BigInt(count)) / (BigInt(count) * BigInt(2))) : 0;
}
