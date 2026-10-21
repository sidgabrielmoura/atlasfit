import { createHash, randomBytes } from "node:crypto";
import { Prisma, GymInPersonPaymentMethod } from "@prisma/client";
import { WorkspaceAccessError } from "../domain/types";
import { positiveCents } from "../domain/money";
import { expectedCash } from "../domain/cash-ledger";
import { serializableTransaction } from "./transaction";
import type { RecordInPersonPaymentInput, ReversePaymentInput } from "./invoice-service";
import { manualPaymentSchema, manualPaymentReverseSchema } from "../domain/manual-finance-contract";
import { gymCalendarInstant } from "../domain/gym-calendar-date";
import { assertGymFinanceWorkspace, assertInvoiceFinanceAuthority, assertGymFinanceAuthority } from "./manual-finance-authority";
import type { GymTransactionClient } from "./transaction";

const paymentInclude = { allocations: { include: { invoice: true } }, receivedByUser: { select: { id: true, name: true, email: true } } } satisfies Prisma.GymPaymentInclude;
async function assertPaymentAuthority(tx: GymTransactionClient, workspaceId: string, actorUserId: string, capability: "payments.record" | "refunds.approve", payment: Prisma.GymPaymentGetPayload<{ include: typeof paymentInclude }>) {
  await assertGymFinanceWorkspace(tx, workspaceId);
  if (!payment.allocations.length) throw new WorkspaceAccessError(409, "TENANT_MISMATCH", "Recebimento sem alocação exige reconciliação.");
  for (const allocation of payment.allocations) await assertInvoiceFinanceAuthority(tx, workspaceId, actorUserId, capability, allocation.invoice);
  if (payment.financialAccountId) {
    const account = await tx.gymFinancialAccount.findFirst({ where: { id: payment.financialAccountId, workspaceId }, select: { unitId: true } });
    if (!account) throw new WorkspaceAccessError(409, "TENANT_MISMATCH", "Conta do recebimento exige reconciliação.");
    await assertGymFinanceAuthority(tx, workspaceId, actorUserId, capability, account.unitId);
  }
}
function number(prefix: string): string { return `${prefix}-${new Date().toISOString().slice(0, 7).replace('-', '')}-${randomBytes(8).toString('hex').toUpperCase()}`; }

export class ManualFinanceService {
  async recordPayment(input: RecordInPersonPaymentInput) {
    const { actorUserId, ...request } = input;
    const parsed = manualPaymentSchema.safeParse(request);
    if (!parsed.success) throw new WorkspaceAccessError(400, "INVALID_REQUEST", "Revise valor, alocações, data e identificação do recebimento.");
    input = { ...parsed.data, actorUserId };
    if (!input.idempotencyKey || !/^[\w:.-]{8,128}$/.test(input.idempotencyKey)) throw new WorkspaceAccessError(400, "INVALID_REQUEST", "Uma chave idempotente estável é obrigatória para registrar recebimento.");
    if (!Object.values(GymInPersonPaymentMethod).includes(input.paymentMethod) || input.paymentMethod === "GATEWAY_ONLINE") throw new WorkspaceAccessError(400, "INVALID_REQUEST", "Selecione uma forma de recebimento manual.");
    if (!input.allocations.length || input.allocations.length > 100) throw new WorkspaceAccessError(400, "INVALID_REQUEST", "Informe de uma a cem alocações.");
    const amount = positiveCents(input.amountInCents);
    const allocations = new Map<string, bigint>();
    for (const allocation of input.allocations) {
      if (!allocation.invoiceId) throw new WorkspaceAccessError(400, "INVALID_REQUEST", "Fatura obrigatória.");
      allocations.set(allocation.invoiceId, (allocations.get(allocation.invoiceId) || BigInt(0)) + positiveCents(allocation.amountInCents));
    }
    if (!allocations.size || [...allocations.values()].reduce((sum, value) => sum + value, BigInt(0)) !== amount) throw new WorkspaceAccessError(400, "ALLOCATION_AMOUNT_MISMATCH", "As alocações devem corresponder ao valor recebido.");
    const key = `GYM:${input.workspaceId}:${createHash('sha256').update(input.idempotencyKey).digest('hex')}`;
    const fingerprint = createHash('sha256').update(JSON.stringify({ method: input.paymentMethod, amount: amount.toString(), allocations: [...allocations].sort(([a], [b]) => a.localeCompare(b)).map(([id, value]) => [id, value.toString()]), actor: input.actorUserId, account: input.financialAccountId || null, paidAt: input.paidAt instanceof Date ? input.paidAt.toISOString() : input.paidAt || null, notes: input.notes || null, proof: input.bankTransferTransactionId || null, posAuthorization: input.posAuthorizationCode || null, posCardBrand: input.posCardBrand || null, posNsu: input.posNsu || null, posTerminalId: input.posTerminalId || null })).digest('hex');
    const existingResult = (payment: Prisma.GymPaymentGetPayload<{ include: typeof paymentInclude }>) => {
      if (payment.workspaceId !== input.workspaceId || payment.requestFingerprint !== fingerprint) throw new WorkspaceAccessError(409, "INVALID_REQUEST", "A chave já foi utilizada para outro recebimento.");
      return payment;
    };
    try {
      return await serializableTransaction(async (tx) => {
        const workspace = await assertGymFinanceWorkspace(tx, input.workspaceId);
        const paidAt = input.paidAt ? gymCalendarInstant(input.paidAt, workspace.settings?.timezone || "America/Sao_Paulo") : new Date();
        if (paidAt.getTime() > Date.now() + 60_000) throw new WorkspaceAccessError(400, "INVALID_REQUEST", "Data de recebimento não pode estar no futuro.");
        const existing = await tx.gymPayment.findUnique({ where: { idempotencyKey: key }, include: paymentInclude });
        if (existing) { await assertPaymentAuthority(tx, input.workspaceId, input.actorUserId, "payments.record", existing); return existingResult(existing); }
        const invoices = await tx.gymInvoice.findMany({ where: { id: { in: [...allocations.keys()] }, workspaceId: input.workspaceId }, include: { enrollment: { select: { unitId: true } } } });
        if (invoices.length !== allocations.size) throw new WorkspaceAccessError(404, "INVOICE_NOT_FOUND", "Uma das faturas não pertence à academia.");
        if (new Set(invoices.map(invoice => invoice.studentMemberId)).size !== 1) throw new WorkspaceAccessError(400, "INVALID_REQUEST", "Um recibo deve corresponder às obrigações de um único aluno.");
        const invoiceUnits = new Set<string | null>();
        for (const invoice of invoices) {
          invoiceUnits.add(await assertInvoiceFinanceAuthority(tx, input.workspaceId, input.actorUserId, "payments.record", invoice));
          if (invoice.status === "CANCELLED" || invoice.status === "REFUNDED") throw new WorkspaceAccessError(409, "INVOICE_CANCELLED", "Fatura cancelada não recebe baixa.");
          if ((allocations.get(invoice.id) || BigInt(0)) > invoice.balanceRemainingInCents) throw new WorkspaceAccessError(409, "INVOICE_OVERALLOCATION", "O recebimento excede o saldo atual da fatura.");
        }
        const cashSession = input.paymentMethod === "CASH" ? await tx.gymCashDrawerSession.findFirst({ where: { workspaceId: input.workspaceId, openedByUserId: input.actorUserId, status: "OPEN" } }) : null;
        if (input.paymentMethod === "CASH" && !cashSession) throw new WorkspaceAccessError(409, "CASH_DRAWER_NOT_OPEN", "Abra seu caixa antes de receber dinheiro.");
        const accountId = cashSession?.financialAccountId || input.financialAccountId;
        if (input.paymentMethod !== "CASH" && !accountId) throw new WorkspaceAccessError(400, "FINANCIAL_ACCOUNT_NOT_FOUND", "Selecione a conta interna que recebeu o valor.");
        const account = await tx.gymFinancialAccount.findFirst({ where: { id: accountId, workspaceId: input.workspaceId, isActive: true, accountType: { not: "GATEWAY_ONLINE" } } });
        if (!account) throw new WorkspaceAccessError(404, "FINANCIAL_ACCOUNT_NOT_FOUND", "Conta interna indisponível nesta academia.");
        await assertGymFinanceAuthority(tx, input.workspaceId, input.actorUserId, "payments.record", account.unitId);
        if (account.unitId && [...invoiceUnits].some(unitId => unitId !== account.unitId)) throw new WorkspaceAccessError(403, "TENANT_MISMATCH", "Conta e obrigações devem pertencer à mesma unidade, ou utilizar uma conta central autorizada.");
        if (cashSession && cashSession.unitId !== account.unitId) throw new WorkspaceAccessError(409, "TENANT_MISMATCH", "Unidade do caixa incompatível com a conta.");
        const firstInvoice = invoices[0];
        const payment = await tx.gymPayment.create({ data: {
          workspaceId: input.workspaceId, paymentNumber: number('PAG'), receiptNumber: number('REC'), idempotencyKey: key, requestFingerprint: fingerprint,
          financialAccountId: account.id, cashDrawerSessionId: cashSession?.id, amountInCents: amount, paymentMethod: input.paymentMethod, paidAt, receivedByUserId: input.actorUserId,
          payerName: firstInvoice.payerName, payerCpfCnpj: firstInvoice.payerCpfCnpj, notes: input.notes || null,
          ...(["EXTERNAL_POS_DEBIT", "EXTERNAL_POS_CREDIT"].includes(input.paymentMethod) ? { posCardBrand: input.posCardBrand, posAuthorizationCode: input.posAuthorizationCode, posNsu: input.posNsu, posTerminalId: input.posTerminalId } : {}),
          ...(input.paymentMethod === "BANK_TRANSFER_MANUAL" ? { bankTransferTransactionId: input.bankTransferTransactionId } : {}),
        } });
        for (const invoice of invoices) {
          const allocated = allocations.get(invoice.id) || BigInt(0);
          const remaining = invoice.balanceRemainingInCents - allocated;
          await tx.gymPaymentAllocation.create({ data: { paymentId: payment.id, invoiceId: invoice.id, allocatedAmountInCents: allocated } });
          await tx.gymInvoice.update({ where: { id: invoice.id }, data: { paidAmountInCents: { increment: allocated }, balanceRemainingInCents: remaining, status: remaining === BigInt(0) ? "PAID" : "PARTIALLY_PAID", paidAt: remaining === BigInt(0) ? paidAt : null } });
        }
        await tx.gymFinancialAccount.update({ where: { id: account.id }, data: { balanceInCents: { increment: amount } } });
        if (cashSession) await tx.gymCashDrawerMovement.create({ data: { sessionId: cashSession.id, movementType: "CASH_INFLOW_PAYMENT", amountInCents: amount, paymentId: payment.id, performedByUserId: input.actorUserId, description: `Recebimento ${payment.receiptNumber}` } });
        await tx.auditLog.create({ data: { userId: input.actorUserId, action: `GYM_PAYMENT_RECORDED:${payment.id}`, entity: "GYM_PAYMENT", entityId: payment.id, severity: "info" } });
        return tx.gymPayment.findUniqueOrThrow({ where: { id: payment.id }, include: paymentInclude });
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const existing = await serializableTransaction(async tx => {
          const payment = await tx.gymPayment.findUnique({ where: { idempotencyKey: key }, include: paymentInclude });
          if (!payment) return null;
          await assertPaymentAuthority(tx, input.workspaceId, input.actorUserId, "payments.record", payment);
          return existingResult(payment);
        });
        if (existing) return existing;
      }
      throw error;
    }
  }

  async reversePayment(input: ReversePaymentInput) {
    const { actorUserId, paymentId, ...request } = input;
    const parsed = manualPaymentReverseSchema.safeParse(request);
    if (!parsed.success) throw new WorkspaceAccessError(400, "REVERSAL_REASON_REQUIRED", "Informe o motivo da reversão.");
    input = { ...parsed.data, actorUserId, paymentId };
    return serializableTransaction(async (tx) => {
      const payment = await tx.gymPayment.findFirst({ where: { id: input.paymentId, workspaceId: input.workspaceId }, include: paymentInclude });
      if (!payment) throw new WorkspaceAccessError(404, "PAYMENT_NOT_FOUND", "Recebimento não encontrado.");
      await assertPaymentAuthority(tx, input.workspaceId, input.actorUserId, "refunds.approve", payment);
      if (payment.status === "REVERSED") return payment;
      for (const allocation of payment.allocations.filter((allocation) => allocation.status === "ACTIVE")) {
        const invoice = allocation.invoice;
        if (invoice.workspaceId !== input.workspaceId) throw new WorkspaceAccessError(409, "TENANT_MISMATCH", "Alocação legada incompatível; exige reconciliação.");
        const paid = invoice.paidAmountInCents - allocation.allocatedAmountInCents;
        if (paid < BigInt(0)) throw new WorkspaceAccessError(409, "INVALID_AMOUNT", "Saldo legado inconsistente; exige reconciliação.");
        await tx.gymPaymentAllocation.update({ where: { id: allocation.id }, data: { status: "REVERSED" } });
        await tx.gymInvoice.update({ where: { id: invoice.id }, data: { paidAmountInCents: paid, balanceRemainingInCents: invoice.balanceRemainingInCents + allocation.allocatedAmountInCents, status: invoice.status === "CANCELLED" ? "CANCELLED" : paid === BigInt(0) ? "OPEN" : "PARTIALLY_PAID", paidAt: null } });
      }
      const originalSession = payment.cashDrawerSessionId ? await tx.gymCashDrawerSession.findFirst({ where: { id: payment.cashDrawerSessionId, workspaceId: input.workspaceId } }) : null;
      const accountId = payment.financialAccountId || originalSession?.financialAccountId;
      if (accountId) {
        const account = await tx.gymFinancialAccount.findFirst({ where: { id: accountId, workspaceId: input.workspaceId } });
        if (!account) throw new WorkspaceAccessError(409, "TENANT_MISMATCH", "Conta do recebimento não pertence à academia.");
        await assertGymFinanceAuthority(tx, input.workspaceId, input.actorUserId, "refunds.approve", account.unitId);
        if (account.balanceInCents < payment.amountInCents) throw new WorkspaceAccessError(409, "INSUFFICIENT_ACCOUNT_BALANCE", "Saldo insuficiente na conta para registrar a devolução.");
        await tx.gymFinancialAccount.update({ where: { id: account.id }, data: { balanceInCents: { decrement: payment.amountInCents } } });
        if (payment.paymentMethod === "CASH") {
          const session = await tx.gymCashDrawerSession.findFirst({ where: { workspaceId: input.workspaceId, openedByUserId: input.actorUserId, financialAccountId: account.id, status: "OPEN" }, include: { movements: true } });
          if (!session) throw new WorkspaceAccessError(409, "CASH_DRAWER_NOT_OPEN", "Abra um caixa nesta conta para registrar a compensação em dinheiro.");
          if (session.unitId !== account.unitId || expectedCash(session.openingAmountInCents, session.movements) < payment.amountInCents) throw new WorkspaceAccessError(409, "INSUFFICIENT_ACCOUNT_BALANCE", "Saldo ou unidade do turno incompatível com a devolução.");
          await tx.gymCashDrawerMovement.create({ data: { sessionId: session.id, movementType: "CASH_INFLOW_PAYMENT", amountInCents: -payment.amountInCents, paymentId: payment.id, performedByUserId: input.actorUserId, description: `Reversão ${payment.receiptNumber}: ${input.reversalReason.trim()}` } });
        }
      }
      await tx.gymPayment.update({ where: { id: payment.id }, data: { status: "REVERSED", reversedAt: new Date(), reversedByUserId: input.actorUserId, reversalReason: input.reversalReason.trim() } });
      await tx.auditLog.create({ data: { userId: input.actorUserId, action: `GYM_PAYMENT_REVERSED:${payment.id}`, entity: "GYM_PAYMENT", entityId: payment.id, severity: "warning" } });
      return tx.gymPayment.findUniqueOrThrow({ where: { id: payment.id }, include: paymentInclude });
    });
  }
}

export const manualFinanceService = new ManualFinanceService();
