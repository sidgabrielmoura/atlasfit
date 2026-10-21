import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { performance } from "node:perf_hooks";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import type { GymBillingCycle, GymEnrollmentStatus } from "@prisma/client";
import prisma from "@/lib/prisma";
import { GymAnalyticsService as reports } from "@/modules/workspaces/application/gym-analytics-service";
import { civilDayNumber, reportCalendarRange } from "@/modules/workspaces/domain/gym-report-calendar";

const database = new URL(process.env.DATABASE_URL || "http://invalid");
if (database.hostname !== "127.0.0.1" || database.port !== "56432" || database.pathname !== "/atlasfit_gym_stabilization_20261001") throw new Error("Exige PostgreSQL descartável específico.");
const now = new Date("2026-10-05T03:30:00Z");
const date = (value: string) => new Date(value);
afterEach(() => vi.useRealTimers());
afterAll(async () => prisma.$disconnect());
async function fixture() {
  vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(now);
  const owner = await prisma.user.create({ data: { email: `temporal-${randomUUID()}@example.invalid` } });
  const workspace = await prisma.workspace.create({ data: { subscription: { create: { status: "ACTIVE", maxStaff: 30, maxUnits: 5 } }, ownerId: owner.id, type: "GYM", name: "Indicadores sintéticos", slug: randomUUID() } });
  await prisma.workspaceMember.create({ data: { workspaceId: workspace.id, userId: owner.id, role: "OWNER" } });
  await prisma.gymSettings.create({ data: { workspaceId: workspace.id, timezone: "America/Sao_Paulo" } });
  const unit = await prisma.gymUnit.create({ data: { workspaceId: workspace.id, name: "Unidade autorizada" } });
  const student = await prisma.workspaceMember.create({ data: { workspaceId: workspace.id, unitId: unit.id, role: "STUDENT", userId: (await prisma.user.create({ data: {} })).id } });
  const plan = await prisma.gymPlan.create({ data: { workspaceId: workspace.id, name: "Plano sintético" } });
  let version = 0;
  const contract = async (options: { cycle?: GymBillingCycle; days?: number; price?: bigint; status?: GymEnrollmentStatus; start?: Date; end?: Date | null; activation?: Date | null; cancellation?: Date; previous?: string; kind?: string; created?: Date; events?: Array<{ from: GymEnrollmentStatus | null; to: GymEnrollmentStatus; at: Date }> } = {}) => {
    const planVersion = await prisma.gymPlanVersion.create({ data: { planId: plan.id, version: ++version, name: "Plano", priceInCents: options.price ?? BigInt(1000), billingCycle: options.cycle ?? "MONTHLY", durationDays: options.days ?? 365, termsText: "Condições sintéticas" } });
    // Independent contracts need independent students under the one-live-contract constraint.
    const previous = options.previous ? await prisma.gymEnrollment.findUniqueOrThrow({ where: { id: options.previous }, select: { studentMemberId: true } }) : null;
    const target = previous ? { id: previous.studentMemberId } : await prisma.workspaceMember.create({ data: { workspaceId: workspace.id, unitId: unit.id, role: "STUDENT", userId: (await prisma.user.create({ data: {} })).id } });
    return prisma.gymEnrollment.create({ data: {
      workspaceId: workspace.id, unitId: unit.id, studentMemberId: target.id, planVersionId: planVersion.id,
      startDate: options.start ?? date("2026-08-01T12:00:00Z"), endDate: options.end === undefined ? date("2027-08-01T12:00:00Z") : options.end,
      status: options.status ?? "ACTIVE", priceInCents: options.price ?? BigInt(1000),
      activatedAt: options.activation === undefined ? date("2026-08-01T12:00:00Z") : options.activation,
      cancelledAt: options.cancellation, supersedesEnrollmentId: options.previous, changeKind: options.kind,
      createdAt: options.created ?? date("2026-07-30T12:00:00Z"),
      events: options.events ? { create: options.events.map(event => ({ workspaceId: workspace.id, fromStatus: event.from, toStatus: event.to, effectiveDate: event.at, createdAt: event.at })) } : undefined,
    } });
  };
  const input = { workspaceId: workspace.id, actorUserId: owner.id, startDate: date("2026-09-01T03:00:00Z"), endDate: date("2026-10-01T02:59:59.999Z") };
  return { owner, workspace, unit, student, contract, input };
}

describe("GYM PostgreSQL — indicadores temporais", () => {
  it("agrega volume sintético de 5.000 faturas e 1.000 recebimentos sem truncar saldos", async () => {
    const f = await fixture();
    const invoices = Array.from({ length: 5000 }, (_, index) => ({ id: randomUUID(), workspaceId: f.workspace.id, studentMemberId: f.student.id, studentUserId: f.student.userId, invoiceNumber: randomUUID(), title: "Volume sintético", dueDate: date("2026-09-20T12:00:00Z"), subtotalInCents: BigInt(100), totalInCents: BigInt(100), balanceRemainingInCents: BigInt(index < 1000 ? 0 : 100), status: index < 1000 ? "PAID" as const : "OPEN" as const, payerName: "Fixture", createdByUserId: f.owner.id }));
    const payments = Array.from({ length: 1000 }, (_, index) => ({ id: randomUUID(), workspaceId: f.workspace.id, paymentNumber: randomUUID(), receiptNumber: randomUUID(), idempotencyKey: randomUUID(), amountInCents: BigInt(100), paymentMethod: index % 2 ? "CASH" as const : "BANK_TRANSFER_MANUAL" as const, paidAt: date("2026-09-25T12:00:00Z"), payerName: "Fixture", receivedByUserId: f.owner.id }));
    // Keep each statement below the PostgreSQL parameter limit.
    for (let offset = 0; offset < invoices.length; offset += 1000) await prisma.gymInvoice.createMany({ data: invoices.slice(offset, offset + 1000) });
    await prisma.gymPayment.createMany({ data: payments });
    await prisma.gymPaymentAllocation.createMany({ data: payments.map((payment, index) => ({ paymentId: payment.id, invoiceId: invoices[index].id, allocatedAmountInCents: BigInt(100) })) });
    const started = performance.now();
    const result = await reports.getOverview({ ...f.input, unitId: f.unit.id });
    const durationMs = performance.now() - started;
    expect(result.cashFlow).toMatchObject({ grossReceivedInCents: 100000, reversedOrRefundedInCents: 0, netReceivedInCents: 100000, historyCoverage: { legacyPaidExpensesCount: 0, unallocatedPaymentsCount: 0, complete: true } });
    expect(result.cashFlow.paymentsByMethod).toEqual(expect.arrayContaining([{ method: "CASH", count: 500, totalInCents: 50000 }, { method: "BANK_TRANSFER_MANUAL", count: 500, totalInCents: 50000 }]));
    expect(result.accountsReceivable).toMatchObject({ totalReceivableInCents: 400000, totalOverdueInCents: 400000, overdueInvoicesCount: 4000, defaultRateDenominatorInCents: 500000, defaultRatePercentage: 80 });
    writeFileSync(".tmp/database-efficiency-existing-report-volume.json", JSON.stringify({ recordedAt: new Date(vi.getRealSystemTime()).toISOString(), synthetic: true, invoices: invoices.length, payments: payments.length, durationMs, paymentMethodRowsReturned: result.cashFlow.paymentsByMethod.length, success: true, limitation: "Single disposable PostgreSQL sample; operational volume and lifecycle history require separate validation." }, null, 2) + "\n");
  });

  it("recebimentos e despesas conservam datas próprias de reversão, parcelas por unidade e lacunas do legado", async () => {
    const f = await fixture();
    const otherUnit = await prisma.gymUnit.create({ data: { workspaceId: f.workspace.id, name: "Outra unidade" } });
    const otherStudent = await prisma.workspaceMember.create({ data: { workspaceId: f.workspace.id, unitId: otherUnit.id, role: "STUDENT", userId: (await prisma.user.create({ data: {} })).id } });
    const invoices = await Promise.all([f.student, otherStudent].map(student => prisma.gymInvoice.create({ data: { workspaceId: f.workspace.id, studentMemberId: student.id, studentUserId: student.userId, invoiceNumber: randomUUID(), title: "Fixture", dueDate: now, subtotalInCents: BigInt(10000), totalInCents: BigInt(10000), balanceRemainingInCents: BigInt(10000), payerName: "Fixture", createdByUserId: f.owner.id } })));
    const account = await prisma.gymFinancialAccount.create({ data: { workspaceId: f.workspace.id, unitId: f.unit.id, name: "Fixture", accountType: "BANK_ACCOUNT" } });
    const payment = (amount: number, paidAt: string, reversedAt: string | null, method: "CASH" | "BANK_TRANSFER_MANUAL", allocations: Array<{ invoiceId: string; allocatedAmountInCents: bigint }>) => prisma.gymPayment.create({ data: { workspaceId: f.workspace.id, financialAccountId: account.id, paymentNumber: randomUUID(), receiptNumber: randomUUID(), idempotencyKey: randomUUID(), amountInCents: BigInt(amount), paidAt: date(paidAt), reversedAt: reversedAt ? date(reversedAt) : null, status: reversedAt ? "REVERSED" : "CONFIRMED", paymentMethod: method, payerName: "Fixture", receivedByUserId: f.owner.id, allocations: { create: allocations } } });
    await payment(1000, "2026-09-10T12:00:00Z", "2026-10-03T12:00:00Z", "CASH", [{ invoiceId: invoices[0].id, allocatedAmountInCents: BigInt(1000) }]);
    await payment(500, "2026-08-20T12:00:00Z", "2026-09-15T12:00:00Z", "CASH", [{ invoiceId: invoices[0].id, allocatedAmountInCents: BigInt(500) }]);
    await payment(2000, "2026-09-20T12:00:00Z", null, "BANK_TRANSFER_MANUAL", [{ invoiceId: invoices[0].id, allocatedAmountInCents: BigInt(500) }, { invoiceId: invoices[1].id, allocatedAmountInCents: BigInt(1500) }]);
    await payment(999, "2026-09-20T12:00:00Z", null, "CASH", []);
    const category = await prisma.gymExpenseCategory.create({ data: { workspaceId: f.workspace.id, name: "Fixture" } });
    const expense = (amount: number, paidAt: string, unitId: string, paidAmount: number) => prisma.gymExpense.create({ data: { workspaceId: f.workspace.id, unitId, categoryId: category.id, title: "Fixture", amountInCents: BigInt(amount), paidAmountInCents: BigInt(paidAmount), paidAt: date(paidAt), dueDate: date(paidAt), status: "PAID", competenceMonth: "2026-09", createdByUserId: f.owner.id } });
    for (const [amount, paidAt, reversedAt] of [[300, "2026-09-05T12:00:00Z", "2026-10-01T12:00:00Z"], [100, "2026-08-10T12:00:00Z", "2026-09-20T12:00:00Z"]] as const) {
      const row = await expense(amount, paidAt, f.unit.id, amount);
      await prisma.gymExpensePayment.create({ data: { expenseId: row.id, financialAccountId: account.id, amountInCents: BigInt(amount), paidAt: date(paidAt), reversedAt: date(reversedAt), reversedByUserId: f.owner.id, reversalReason: "Reversão sintética", recordedByUserId: f.owner.id, idempotencyKey: randomUUID(), requestFingerprint: randomUUID() } });
    }
    await expense(400, "2026-09-05T12:00:00Z", f.unit.id, 400);
    await expense(500, "2026-09-05T12:00:00Z", f.unit.id, 0);
    await expense(777, "2026-09-05T12:00:00Z", otherUnit.id, 777);
    const input = { ...f.input, unitId: f.unit.id };
    const september = await reports.getOverview(input);
    expect(september.cashFlow).toMatchObject({ grossReceivedInCents: 1500, reversedOrRefundedInCents: 500, netReceivedInCents: 1000, expensesPaidInCents: 1100, netCashInCents: -100, historyCoverage: { legacyPaidExpensesCount: 2, unallocatedPaymentsCount: 1, complete: false } });
    expect(september.cashFlow.paymentsByMethod).toEqual(expect.arrayContaining([{ method: "CASH", count: 1, totalInCents: 1000 }, { method: "BANK_TRANSFER_MANUAL", count: 1, totalInCents: 500 }]));
    const october = await reports.getOverview({ ...input, startDate: "2026-10-01", endDate: "2026-10-31" });
    expect(october.cashFlow).toEqual({ grossReceivedInCents: 0, reversedOrRefundedInCents: 1000, netReceivedInCents: -1000, expensesPaidInCents: -300, netCashInCents: -700, paymentsByMethod: [], historyCoverage: { legacyPaidExpensesCount: 0, unallocatedPaymentsCount: 0, complete: true } });
  });

  it("posição atual exclui contratos vencidos/futuros e soma ciclos personalizados em centavos; atraso usa o dia civil", async () => {
    const f = await fixture();
    await f.contract({ cycle: "MONTHLY", price: BigInt(12001) });
    await f.contract({ cycle: "ANNUAL", price: BigInt(12001) });
    await f.contract({ cycle: "BIMONTHLY", price: BigInt(10001) });
    await f.contract({ cycle: "QUARTERLY", price: BigInt(10001) });
    await f.contract({ cycle: "SEMIANNUAL", price: BigInt(10001) });
    await f.contract({ cycle: "CUSTOM", days: 45, price: BigInt(30001) });
    await f.contract({ cycle: "CUSTOM", days: 15, price: BigInt(30001) });
    await f.contract({ price: BigInt(999999), end: date("2026-10-05T03:30:00Z") });
    await f.contract({ price: BigInt(999999), start: date("2026-11-01T12:00:00Z") });
    await f.contract({ price: BigInt(999999), status: "PAUSED" });
    const invoice = async (dueDate: string, total: bigint, balance: bigint, status: "OPEN" | "PARTIALLY_PAID" | "PAID" | "CANCELLED" | "REFUNDED" = "OPEN") => prisma.gymInvoice.create({ data: { workspaceId: f.workspace.id, studentMemberId: f.student.id, studentUserId: f.student.userId, invoiceNumber: randomUUID(), title: "Obrigação sintética", dueDate: date(dueDate), subtotalInCents: total, totalInCents: total, balanceRemainingInCents: balance, status, payerName: "Pagador sintético", createdByUserId: f.owner.id } });
    await invoice("2026-10-04T21:00:00Z", BigInt(1000), BigInt(400), "PARTIALLY_PAID"); // Previous civil day, only 6.5 hours ago.
    await invoice("2026-10-05T03:00:00Z", BigInt(1000), BigInt(1000)); // Due today, not overdue.
    await invoice("2026-09-05T12:00:00Z", BigInt(100), BigInt(100)); // 30 days.
    await invoice("2026-09-04T12:00:00Z", BigInt(200), BigInt(200)); // 31 days.
    await invoice("2026-08-05T12:00:00Z", BigInt(300), BigInt(300)); // 61 days.
    await invoice("2026-07-06T12:00:00Z", BigInt(400), BigInt(400)); // 91 days.
    await invoice("2026-10-04T21:00:00Z", BigInt(2000), BigInt(0), "PAID");
    await invoice("2026-10-04T21:00:00Z", BigInt(9000), BigInt(9000), "CANCELLED");
    await invoice("2026-10-04T21:00:00Z", BigInt(9000), BigInt(0), "REFUNDED");
    const result = await reports.getOverview(f.input);
    expect(result.snapshot).toEqual({ asOf: now.toISOString(), basis: "CURRENT" });
    expect(result.executive).toMatchObject({ mrrInCents: 103006, averageTicketInCents: 14715, activeRecurringContracts: 7, activeStudentsCount: 7, pausedStudentsCount: 1 });
    expect(result.accountsReceivable).toEqual({ totalReceivableInCents: 2400, currentInCents: 1000, overdue0to30InCents: 500, overdue31to60InCents: 200, overdue61to90InCents: 300, overdueOver90InCents: 400, totalOverdueInCents: 1400, defaultRatePercentage: 35, defaultRateNumeratorInCents: 1400, defaultRateDenominatorInCents: 4000, overdueInvoicesCount: 5 });
    const anotherPeriod = await reports.getOverview({ ...f.input, startDate: date("2026-01-01T03:00:00Z"), endDate: date("2026-02-01T02:59:59Z") });
    expect(anotherPeriod.accountsReceivable).toEqual(result.accountsReceivable);
    expect(anotherPeriod.executive.mrrInCents).toBe(result.executive.mrrInCents);
    expect(civilDayNumber(date("2026-03-09T04:30:00Z"), "America/New_York") - civilDayNumber(date("2026-03-08T05:30:00Z"), "America/New_York")).toBe(1); // 23-hour DST day.
    expect(reportCalendarRange(date("2026-10-01T00:30:00Z"), "America/Sao_Paulo", "month")).toEqual({ startDate: "2026-09-01", endDate: "2026-09-30" });
    expect(reportCalendarRange(now, "America/Sao_Paulo", "7d")).toEqual({ startDate: "2026-09-29", endDate: "2026-10-05" });
    await f.contract({ price: BigInt(Number.MAX_SAFE_INTEGER) });
    await expect(reports.getOverview(f.input)).rejects.toMatchObject({ statusCode: 422, code: "INVALID_AMOUNT" });
  });

  it("renovação usa ativação; coorte acompanha substituições, ignora propostas/rascunhos e cancelamento não depende de updatedAt", async () => {
    const f = await fixture();
    const cancellation = await f.contract({ status: "CANCELLED", cancellation: now, events: [
      { from: null, to: "PENDING_ACCEPTANCE", at: date("2026-07-30T12:00:00Z") },
      { from: "PENDING_ACTIVATION", to: "ACTIVE", at: date("2026-08-01T12:00:00Z") },
      { from: "ACTIVE", to: "ACTIVE", at: date("2026-09-01T12:00:00Z") },
      { from: "ACTIVE", to: "CANCELLED", at: date("2026-09-15T12:00:00Z") },
    ] });
    await prisma.gymEnrollmentEvent.updateMany({ where: { enrollmentId: cancellation.id, toStatus: "CANCELLED" }, data: { createdAt: now } });
    await f.contract();
    await f.contract({ status: "EXPIRED", end: date("2026-09-20T12:00:00Z") });
    const renewed = await f.contract({ status: "CANCELLED", cancellation: date("2026-09-10T12:00:00Z") });
    const successor = await f.contract({ previous: renewed.id, kind: "RENEWAL", start: date("2026-09-10T12:00:00Z"), activation: date("2026-09-10T12:00:00Z"), created: date("2026-09-09T12:00:00Z") });
    const changed = await f.contract({ status: "CANCELLED", cancellation: date("2026-09-12T12:00:00Z") });
    await f.contract({ previous: changed.id, kind: "PLAN_CHANGE", status: "CANCELLED", start: date("2026-09-12T12:00:00Z"), activation: date("2026-09-12T12:00:00Z"), cancellation: date("2026-09-25T12:00:00Z"), created: date("2026-09-11T12:00:00Z") });
    await f.contract({ status: "CANCELLED", start: date("2026-09-08T12:00:00Z"), activation: date("2026-09-08T12:00:00Z"), cancellation: date("2026-09-26T12:00:00Z"), created: date("2026-09-07T12:00:00Z") });
    await f.contract({ previous: successor.id, kind: "RENEWAL", status: "PENDING_ACCEPTANCE", activation: null, created: date("2026-09-27T12:00:00Z") });
    await f.contract({ status: "CANCELLED", activation: null, cancellation: date("2026-09-26T12:00:00Z"), events: [{ from: null, to: "PENDING_ACCEPTANCE", at: date("2026-08-01T12:00:00Z") }, { from: "PENDING_ACCEPTANCE", to: "CANCELLED", at: date("2026-09-26T12:00:00Z") }] });
    const result = await reports.getOverview(f.input);
    expect(result.executive).toMatchObject({ newEnrollmentsCount: 1, renewalsCount: 1, cancelledEnrollmentsCount: 3, churnBasisContractCount: 5, churnedContractsCount: 2, lifecycleHistoryIncompleteCount: 0, churnRatePercentage: 40 });
    const civilPeriod = await reports.getOverview({ ...f.input, startDate: "2026-09-01", endDate: "2026-09-30" });
    expect(civilPeriod.executive).toEqual(result.executive);
    expect(civilPeriod.period).toMatchObject({ startDate: "2026-09-01T03:00:00.000Z", endDate: "2026-10-01T02:59:59.999Z" });
    const scheduled = await f.contract();
    await prisma.gymEnrollment.update({ where: { id: scheduled.id }, data: { cancellationEffectiveDate: date("2026-10-05T15:00:00Z") } });
    expect((await reports.getOverview({ ...f.input, startDate: "2026-10-05", endDate: "2026-10-05" })).executive.cancelledEnrollmentsCount).toBe(0);
    // A legacy contract with neither activation nor transitions cannot establish the cohort.
    await f.contract({ activation: null });
    expect((await reports.getOverview(f.input)).executive).toMatchObject({ lifecycleHistoryIncompleteCount: 1, churnRatePercentage: null });
    await f.contract({ activation: null, events: [{ from: null, to: "PENDING_ACCEPTANCE", at: date("2026-07-30T12:00:00Z") }] });
    expect((await reports.getOverview(f.input)).executive).toMatchObject({ lifecycleHistoryIncompleteCount: 2, churnRatePercentage: null });
  });
});
