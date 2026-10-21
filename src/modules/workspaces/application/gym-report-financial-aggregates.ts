import type { Prisma } from "@prisma/client";
import type { GymTransactionClient } from "./transaction";
import { civilDayNumber } from "../domain/gym-report-calendar";
import { gymCalendarInstant } from "../domain/gym-calendar-date";
import { safeCentsNumber } from "../domain/money";

/** Return aggregate rows only. Receipt/reversal dates remain independent accounting facts. */
export async function gymReportFinancialAggregates(tx: GymTransactionClient, input: {
 workspaceId: string; start: Date; end: Date; now: Date; timezone: string;
 invoiceScope: Prisma.GymInvoiceWhereInput; expenseScope: Prisma.GymExpenseWhereInput;
 paymentScope: Prisma.GymPaymentWhereInput;
}) {
 const { workspaceId, start, end, now, timezone, invoiceScope, expenseScope } = input;
 const interval = { gte: start, lte: end };
 const allocation = (payment: Prisma.GymPaymentWhereInput) => tx.gymPaymentAllocation.aggregate({
  where: { invoice: invoiceScope, payment: { workspaceId, ...payment } }, _sum: { allocatedAmountInCents: true },
 });
 const expense = (dates: Prisma.GymExpensePaymentWhereInput) => tx.gymExpensePayment.aggregate({
  where: { expense: expenseScope, ...dates }, _sum: { amountInCents: true },
 });
 const legacy = { ...expenseScope, status: "PAID" as const, paidAt: interval, payments: { none: {} } };
 const [received, reversed, expenseReceived, expenseReversed, legacyPaid, legacyNominal, methods, unallocatedPayments] = await Promise.all([
  allocation({ paidAt: interval }), allocation({ reversedAt: interval }),
  expense({ paidAt: interval }), expense({ reversedAt: interval }),
  tx.gymExpense.aggregate({ where: { ...legacy, paidAmountInCents: { gt: BigInt(0) } }, _sum: { paidAmountInCents: true }, _count: { _all: true } }),
  tx.gymExpense.aggregate({ where: { ...legacy, paidAmountInCents: { lte: BigInt(0) } }, _sum: { amountInCents: true }, _count: { _all: true } }),
  tx.gymPayment.groupBy({ by: ["paymentMethod"], where: { workspaceId, paidAt: interval, allocations: { some: { invoice: invoiceScope } } }, _count: { _all: true } }),
  tx.gymPayment.count({ where: { AND: [input.paymentScope], workspaceId, OR: [{ paidAt: interval }, { reversedAt: interval }], allocations: { none: {} } } }),
 ]);
 const gross = received._sum.allocatedAmountInCents ?? BigInt(0);
 const refunds = reversed._sum.allocatedAmountInCents ?? BigInt(0);
 const expenses = (expenseReceived._sum.amountInCents ?? BigInt(0)) - (expenseReversed._sum.amountInCents ?? BigInt(0)) + (legacyPaid._sum.paidAmountInCents ?? BigInt(0)) + (legacyNominal._sum.amountInCents ?? BigInt(0));
 const paymentsByMethod = await Promise.all(methods.map(async method => ({
  method: method.paymentMethod, count: method._count._all,
  totalInCents: safeCentsNumber((await allocation({ paidAt: interval, paymentMethod: method.paymentMethod }))._sum.allocatedAmountInCents ?? BigInt(0)),
 })));
 const day = civilDayNumber(now, timezone);
 const dayStart = (offset: number) => gymCalendarInstant(new Date((day + offset) * 86400000).toISOString().slice(0, 10), timezone);
 const currentDayStart = dayStart(0);
 const open: Prisma.GymInvoiceWhereInput = { AND: [invoiceScope], workspaceId, status: { in: ["OPEN", "PARTIALLY_PAID"] }, balanceRemainingInCents: { gt: BigInt(0) } };
 const bucket = (dueDate: Prisma.DateTimeFilter) => tx.gymInvoice.aggregate({ where: { ...open, dueDate }, _sum: { balanceRemainingInCents: true }, _count: { _all: true } });
 const [current, overdue30, overdue60, overdue90, overdueOlder, denominator] = await Promise.all([
  bucket({ gte: currentDayStart }),
  bucket({ gte: dayStart(-30), lt: currentDayStart }),
  bucket({ gte: dayStart(-60), lt: dayStart(-30) }),
  bucket({ gte: dayStart(-90), lt: dayStart(-60) }),
  bucket({ lt: dayStart(-90) }),
  tx.gymInvoice.aggregate({ where: { AND: [invoiceScope], workspaceId, status: { notIn: ["DRAFT", "CANCELLED", "REFUNDED"] }, dueDate: { lt: currentDayStart } }, _sum: { totalInCents: true } }),
 ]);
 const amounts = [current, overdue30, overdue60, overdue90, overdueOlder].map(row => row._sum.balanceRemainingInCents ?? BigInt(0));
 const overdue = amounts.slice(1).reduce((sum, value) => sum + value, BigInt(0));
 const total = amounts[0] + overdue;
 const totalDenominator = denominator._sum.totalInCents ?? BigInt(0);
 const overdueAmount = safeCentsNumber(overdue), denominatorAmount = safeCentsNumber(totalDenominator);
 return {
  cashFlow: {
   grossReceivedInCents: safeCentsNumber(gross), reversedOrRefundedInCents: safeCentsNumber(refunds),
   netReceivedInCents: safeCentsNumber(gross - refunds), expensesPaidInCents: safeCentsNumber(expenses),
   netCashInCents: safeCentsNumber(gross - refunds - expenses), paymentsByMethod,
   historyCoverage: { legacyPaidExpensesCount: legacyPaid._count._all + legacyNominal._count._all, unallocatedPaymentsCount: unallocatedPayments, complete: unallocatedPayments === 0 && legacyPaid._count._all === 0 && legacyNominal._count._all === 0 },
  },
  accountsReceivable: {
   totalReceivableInCents: safeCentsNumber(total), currentInCents: safeCentsNumber(amounts[0]),
   overdue0to30InCents: safeCentsNumber(amounts[1]), overdue31to60InCents: safeCentsNumber(amounts[2]),
   overdue61to90InCents: safeCentsNumber(amounts[3]), overdueOver90InCents: safeCentsNumber(amounts[4]),
   totalOverdueInCents: overdueAmount, defaultRateNumeratorInCents: overdueAmount,
   defaultRateDenominatorInCents: denominatorAmount, defaultRatePercentage: denominatorAmount ? Number((overdueAmount / denominatorAmount * 100).toFixed(2)) : 0,
   overdueInvoicesCount: [overdue30, overdue60, overdue90, overdueOlder].reduce((sum, row) => sum + row._count._all, 0),
  },
 };
}
