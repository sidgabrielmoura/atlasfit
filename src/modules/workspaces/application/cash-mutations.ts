import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { Prisma, type GymFinancialAccount } from "@prisma/client";
import { WorkspaceAccessError } from "../domain/types";
import { cents, safeCentsNumber } from "../domain/money";
import { expectedCash } from "../domain/cash-ledger";
import { serializableTransaction, type GymTransactionClient } from "./transaction";
import { assertGymFinanceAuthority } from "./manual-finance-authority";
import type { WorkspaceCapability } from "../domain/roles";
import type { CreateFinancialAccountInput, TransferBetweenAccountsInput, CreateExpenseInput, PayExpenseInput, CancelExpenseInput, OpenCashDrawerInput, RecordCashMovementInput, CloseCashDrawerInput, ReconcileCashDrawerInput } from "./cash-drawer-expense-service";

const id = z.string().trim().min(1).max(100);
const text = z.string().trim().max(2000).optional();
const money = z.union([z.bigint(), z.number().int().safe()]).transform(cents);
const nonnegative = money.refine(value => value >= BigInt(0), "Valor negativo.");
const positive = money.refine(value => value > BigInt(0), "Valor deve ser positivo.");
const date = z.date().refine(value => Number.isFinite(value.getTime()), "Data inválida.");
const base = { workspaceId: id, actorUserId: id };
const requestKey = z.string().regex(/^[\w:.-]{8,128}$/);
const expenseSchema = z.object({ ...base, idempotencyKey: requestKey, unitId: id.optional(), supplierId: id.optional(), supplierName: text, categoryId: id, title: z.string().trim().min(1).max(200), description: text, documentNumber: text, amountInCents: positive, penaltyInCents: nonnegative.optional(), discountInCents: nonnegative.optional(), dueDate: date, competenceMonth: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).optional(), paidImmediately: z.boolean().optional(), financialAccountId: id.optional(), paymentMethod: text, paymentProofUrl: z.string().url().max(2048).optional() }).strict();
const expensePaymentSchema = z.object({ ...base, idempotencyKey: requestKey, expenseId: id, financialAccountId: id, paidAmountInCents: positive, paidAt: date.optional(), paymentMethod: text, paymentProofUrl: z.string().url().max(2048).optional() }).strict();
const expenseCancellationSchema = z.object({ ...base, expenseId: id, cancellationReason: z.string().trim().min(5).max(2000) }).strict();
const requestDate = z.string().datetime({ offset: true }).transform(value => new Date(value));
export const expenseRequestSchema = expenseSchema.omit({ actorUserId: true }).extend({ dueDate: requestDate });
export const expensePaymentRequestSchema = expensePaymentSchema.omit({ actorUserId: true, expenseId: true }).extend({ paidAt: requestDate.optional() });
export const expenseCancellationRequestSchema = expenseCancellationSchema.omit({ actorUserId: true, expenseId: true });
export const cashTransferRequestSchema = z.object({ workspaceId: id, fromAccountId: id, toAccountId: id, amountInCents: positive, description: text, referenceId: id.optional(), idempotencyKey: requestKey }).strict();
export const cashMovementRequestSchema = z.object({ workspaceId: id, sessionId: id, movementType: z.enum(["SUPPLY", "BLEED"]), amountInCents: positive, description: text, destinationAccountId: id.optional(), idempotencyKey: requestKey }).strict();
export const createInternalAccountRequestSchema = z.object({ workspaceId: id, unitId: id.optional(), name: z.string().trim().min(1).max(150), accountType: z.enum(["CASH", "BANK_ACCOUNT", "SAFE_RESERVE", "OTHER"]), initialBalanceInCents: nonnegative.optional(), bankName: text, agencyNumber: text, accountNumber: text, isDefault: z.boolean().optional() }).strict();
export const openCashRequestSchema = z.object({ workspaceId: id, unitId: id.optional(), financialAccountId: id.optional(), openingAmountInCents: nonnegative.default(BigInt(0)), notes: text }).strict();
export const closeCashRequestSchema = z.object({ workspaceId: id, sessionId: id, actualCashInCents: nonnegative, differenceReason: text, notes: text }).strict();
export const reconcileCashRequestSchema = z.object({ workspaceId: id, sessionId: id, reconciliationNotes: z.string().trim().min(5).max(2000) }).strict();
function fingerprint(input: unknown) { return createHash("sha256").update(JSON.stringify(input, (_key, value: unknown) => typeof value === "bigint" ? value.toString() : value)).digest("hex"); }
function scopedKey(workspaceId: string, kind: string, key: string) { return `GYM:${workspaceId}:${kind}:${createHash("sha256").update(key).digest("hex")}`; }
async function idempotentTransaction<T>(operation: (tx: GymTransactionClient) => Promise<T>): Promise<T> {
  try { return await serializableTransaction(operation); }
  catch (error) {
    // A concurrent insert can report uniqueness instead of a serialization conflict.
    // Re-enter all permission/fingerprint checks; never return an unchecked receipt.
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") throw error;
    return serializableTransaction(operation);
  }
}
function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const parsed = schema.safeParse(input);
  if (!parsed.success) throw new WorkspaceAccessError(400, "INVALID_REQUEST", "Dados da operação financeira inválidos.");
  return parsed.data;
}
async function authority(tx: GymTransactionClient, workspaceId: string, userId: string, capability: WorkspaceCapability, unitId?: string | null) {
  const workspace = await tx.workspace.findUnique({ where: { id: workspaceId }, select: { type: true } });
  if (workspace?.type !== "GYM") throw new WorkspaceAccessError(403, "INVALID_TYPE", "Operação exclusiva da academia.");
  await assertGymFinanceAuthority(tx, workspaceId, userId, capability, unitId);
}
async function account(tx: GymTransactionClient, workspaceId: string, accountId: string) {
  const result = await tx.gymFinancialAccount.findFirst({ where: { id: accountId, workspaceId, isActive: true, accountType: { not: "GATEWAY_ONLINE" } } });
  if (!result) throw new WorkspaceAccessError(404, "FINANCIAL_ACCOUNT_NOT_FOUND", "Conta interna indisponível nesta academia.");
  return result;
}
async function sessionForOperator(tx: GymTransactionClient, workspaceId: string, sessionId: string, userId: string, allowClosedRetry = false) {
  const session = await tx.gymCashDrawerSession.findFirst({ where: { id: sessionId, workspaceId }, include: { movements: true } });
  if (!session) throw new WorkspaceAccessError(404, "CASH_DRAWER_NOT_FOUND", "Caixa não encontrado.");
  await authority(tx, workspaceId, userId, "payments.record", session.unitId);
  if (session.openedByUserId !== userId) throw new WorkspaceAccessError(403, "INSUFFICIENT_PERMISSIONS", "Somente o operador do turno pode movimentar ou fechar este caixa.");
  if (session.status !== "OPEN" && !allowClosedRetry) throw new WorkspaceAccessError(409, "CASH_DRAWER_CLOSED", "Caixa fechado não aceita lançamentos.");
  const cashAccount = await account(tx, workspaceId, session.financialAccountId);
  if (cashAccount.accountType !== "CASH" || cashAccount.unitId !== session.unitId) throw new WorkspaceAccessError(409, "TENANT_MISMATCH", "Conta e unidade do caixa exigem reconciliação.");
  return { session, cashAccount };
}
async function audit(tx: GymTransactionClient, workspaceId: string, userId: string, action: string, severity = "info") {
  await tx.auditLog.create({ data: { userId, action, entity: "WORKSPACE", entityId: workspaceId, severity } });
}
async function debitExpense(tx: GymTransactionClient, input: { workspaceId: string; actorUserId: string; unitId: string | null; expenseId: string; account: GymFinancialAccount; amount: bigint }) {
  await authority(tx, input.workspaceId, input.actorUserId, "invoices.issue", input.account.unitId);
  if (input.account.unitId && input.account.unitId !== input.unitId) throw new WorkspaceAccessError(403, "TENANT_MISMATCH", "Conta não pertence à unidade da despesa.");
  if (input.account.balanceInCents < input.amount) throw new WorkspaceAccessError(409, "INSUFFICIENT_ACCOUNT_BALANCE", "Saldo insuficiente na conta interna.");
  if (input.account.accountType === "CASH") {
    const session = await tx.gymCashDrawerSession.findFirst({ where: { workspaceId: input.workspaceId, openedByUserId: input.actorUserId, financialAccountId: input.account.id, status: "OPEN" }, include: { movements: true } });
    if (!session || session.unitId !== input.account.unitId) throw new WorkspaceAccessError(409, "CASH_DRAWER_NOT_OPEN", "Abra seu caixa na conta e unidade da despesa.");
    if (expectedCash(session.openingAmountInCents, session.movements) < input.amount) throw new WorkspaceAccessError(409, "INSUFFICIENT_ACCOUNT_BALANCE", "Saldo insuficiente no turno de caixa.");
    await tx.gymCashDrawerMovement.create({ data: { sessionId: session.id, movementType: "EXPENSE_PAYMENT", amountInCents: input.amount, expenseId: input.expenseId, performedByUserId: input.actorUserId, description: `Pagamento de despesa ${input.expenseId}` } });
  }
  await tx.gymFinancialAccount.update({ where: { id: input.account.id }, data: { balanceInCents: { decrement: input.amount } } });
}

export async function createInternalAccount(input: CreateFinancialAccountInput) {
  const data = parse(createInternalAccountRequestSchema.extend({ actorUserId: id }), input);
  const amount = data.initialBalanceInCents ?? BigInt(0); safeCentsNumber(amount);
  return serializableTransaction(async tx => {
    await authority(tx, data.workspaceId, data.actorUserId, "invoices.issue", data.unitId);
    if (data.isDefault) await tx.gymFinancialAccount.updateMany({ where: { workspaceId: data.workspaceId, unitId: data.unitId || null, isDefault: true }, data: { isDefault: false } });
    const created = await tx.gymFinancialAccount.create({ data: { workspaceId: data.workspaceId, unitId: data.unitId || null, name: data.name, accountType: data.accountType, initialBalanceInCents: amount, balanceInCents: amount, bankName: data.bankName, agencyNumber: data.agencyNumber, accountNumber: data.accountNumber, isDefault: data.isDefault || false } });
    await audit(tx, data.workspaceId, data.actorUserId, `GYM_ACCOUNT_CREATED:${created.id}:initial=${amount}`);
    return { id: created.id, name: created.name, accountType: created.accountType, balanceInCents: safeCentsNumber(created.balanceInCents), isDefault: created.isDefault };
  });
}

export async function transferInternalAccounts(input: TransferBetweenAccountsInput) {
  const data = parse(cashTransferRequestSchema.extend({ performedByUserId: id }), input);
  if (data.fromAccountId === data.toAccountId) throw new WorkspaceAccessError(400, "INVALID_TRANSFER_ACCOUNTS", "Selecione contas diferentes.");
  safeCentsNumber(data.amountInCents);
  const key = scopedKey(data.workspaceId, "TRANSFER", data.idempotencyKey), hash = fingerprint(data);
  return idempotentTransaction(async tx => {
    const source = await account(tx, data.workspaceId, data.fromAccountId); const destination = await account(tx, data.workspaceId, data.toAccountId);
    await authority(tx, data.workspaceId, data.performedByUserId, "invoices.issue", source.unitId);
    await authority(tx, data.workspaceId, data.performedByUserId, "invoices.issue", destination.unitId);
    const existing = await tx.gymAccountTransfer.findUnique({ where: { idempotencyKey: key } });
    if (existing) {
      if (existing.requestFingerprint !== hash || existing.workspaceId !== data.workspaceId || existing.fromAccountId !== source.id || existing.toAccountId !== destination.id) throw new WorkspaceAccessError(409, "IDEMPOTENCY_CONFLICT", "Chave já utilizada em outra transferência.");
      return { transferId: existing.id, fromAccountName: source.name, toAccountName: destination.name, amountInCents: safeCentsNumber(existing.amountInCents), transferredAt: existing.transferredAt.toISOString() };
    }
    const transfer = await tx.gymAccountTransfer.create({ data: { ...data, idempotencyKey: key, requestFingerprint: hash, amountInCents: data.amountInCents } });
    const recordCashSide = async (cash: GymFinancialAccount, outgoing: boolean) => {
      if (cash.accountType !== "CASH") return;
      const session = await tx.gymCashDrawerSession.findFirst({ where: { workspaceId: data.workspaceId, financialAccountId: cash.id, openedByUserId: data.performedByUserId, status: "OPEN" }, include: { movements: true } });
      if (!session || session.unitId !== cash.unitId) throw new WorkspaceAccessError(409, "CASH_DRAWER_NOT_OPEN", "Transferência em dinheiro exige seu turno aberto na conta envolvida.");
      if (outgoing && expectedCash(session.openingAmountInCents, session.movements) < data.amountInCents) throw new WorkspaceAccessError(409, "INSUFFICIENT_ACCOUNT_BALANCE", "Saldo insuficiente no turno.");
      await tx.gymCashDrawerMovement.create({ data: { sessionId: session.id, accountTransferId: transfer.id, movementType: outgoing ? "BLEED" : "SUPPLY", amountInCents: data.amountInCents, performedByUserId: data.performedByUserId, description: `Transferência interna ${data.fromAccountId} → ${data.toAccountId}` } });
    };
    if (source.balanceInCents < data.amountInCents) throw new WorkspaceAccessError(409, "INSUFFICIENT_ACCOUNT_BALANCE", "Saldo insuficiente na origem.");
    await recordCashSide(source, true); await recordCashSide(destination, false);
    await tx.gymFinancialAccount.update({ where: { id: source.id }, data: { balanceInCents: { decrement: data.amountInCents } } });
    await tx.gymFinancialAccount.update({ where: { id: destination.id }, data: { balanceInCents: { increment: data.amountInCents } } });
    await audit(tx, data.workspaceId, data.performedByUserId, `GYM_ACCOUNT_TRANSFER:${transfer.id}:${data.amountInCents}`);
    return { transferId: transfer.id, fromAccountName: source.name, toAccountName: destination.name, amountInCents: safeCentsNumber(transfer.amountInCents), transferredAt: transfer.transferredAt.toISOString() };
  });
}

export async function openInternalCash(input: OpenCashDrawerInput) {
  const data = parse(openCashRequestSchema.extend({ openedByUserId: id }), input);
  safeCentsNumber(data.openingAmountInCents);
  return serializableTransaction(async tx => {
    let cashAccount = data.financialAccountId ? await account(tx, data.workspaceId, data.financialAccountId) : null;
    const unitId = data.unitId || cashAccount?.unitId || null;
    await authority(tx, data.workspaceId, data.openedByUserId, "payments.record", unitId);
    if (await tx.gymCashDrawerSession.findFirst({ where: { workspaceId: data.workspaceId, status: "OPEN", openedByUserId: data.openedByUserId } })) throw new WorkspaceAccessError(409, "CASH_DRAWER_ALREADY_OPEN", "Feche seu turno antes de abrir outro.");
    if (!cashAccount) cashAccount = await tx.gymFinancialAccount.findFirst({ where: { workspaceId: data.workspaceId, unitId, accountType: "CASH", isActive: true }, orderBy: { createdAt: "asc" } });
    if (!cashAccount) cashAccount = await tx.gymFinancialAccount.create({ data: { workspaceId: data.workspaceId, unitId, name: "Caixa da recepção", accountType: "CASH", isDefault: true } });
    if (cashAccount.accountType !== "CASH" || cashAccount.unitId !== unitId) throw new WorkspaceAccessError(400, "INVALID_TRANSFER_ACCOUNTS", "Escolha uma conta de caixa da unidade do turno.");
    if (await tx.gymCashDrawerSession.findFirst({ where: { financialAccountId: cashAccount.id, status: "OPEN" } })) throw new WorkspaceAccessError(409, "CASH_DRAWER_ALREADY_OPEN", "Esta conta de caixa já possui turno aberto.");
    const session = await tx.gymCashDrawerSession.create({ data: { workspaceId: data.workspaceId, unitId, financialAccountId: cashAccount.id, openingAmountInCents: data.openingAmountInCents, expectedCashInCents: data.openingAmountInCents, openedByUserId: data.openedByUserId, sessionNumber: `CX-${new Date().toISOString().slice(0, 7).replace("-", "")}-${randomBytes(8).toString("hex")}`, notes: data.notes } });
    await tx.gymCashDrawerMovement.create({ data: { sessionId: session.id, movementType: "OPENING", amountInCents: data.openingAmountInCents, performedByUserId: data.openedByUserId, description: "Contagem inicial do turno; não constitui receita" } });
    await audit(tx, data.workspaceId, data.openedByUserId, `GYM_CASH_DRAWER_OPENED:${session.id}:${data.openingAmountInCents}`);
    return { id: session.id, sessionNumber: session.sessionNumber, status: session.status, openingAmountInCents: safeCentsNumber(session.openingAmountInCents), openedAt: session.openedAt.toISOString() };
  });
}

export async function moveInternalCash(input: RecordCashMovementInput) {
  const data = parse(cashMovementRequestSchema.extend({ performedByUserId: id }), input);
  safeCentsNumber(data.amountInCents);
  if (data.movementType === "SUPPLY" && data.destinationAccountId) throw new WorkspaceAccessError(400, "INVALID_TRANSFER_ACCOUNTS", "Suprimento não possui conta de destino.");
  const key = scopedKey(data.workspaceId, "MOVEMENT", data.idempotencyKey), hash = fingerprint(data);
  return idempotentTransaction(async tx => {
    const { session, cashAccount } = await sessionForOperator(tx, data.workspaceId, data.sessionId, data.performedByUserId, true);
    const destination = data.destinationAccountId ? await account(tx, data.workspaceId, data.destinationAccountId) : null;
    if (destination) {
      await authority(tx, data.workspaceId, data.performedByUserId, "payments.record", destination.unitId);
      if (destination.id === cashAccount.id || destination.accountType === "CASH") throw new WorkspaceAccessError(400, "INVALID_TRANSFER_ACCOUNTS", "A sangria deve sair do caixa para uma conta interna não vinculada a turno.");
    }
    const existing = await tx.gymCashDrawerMovement.findUnique({ where: { idempotencyKey: key } });
    if (existing) {
      if (existing.requestFingerprint !== hash || existing.sessionId !== session.id) throw new WorkspaceAccessError(409, "IDEMPOTENCY_CONFLICT", "Chave já utilizada em outra movimentação.");
      return { movementId: existing.id, sessionId: existing.sessionId, movementType: existing.movementType, amountInCents: safeCentsNumber(existing.amountInCents), createdAt: existing.createdAt.toISOString() };
    }
    if (session.status !== "OPEN") throw new WorkspaceAccessError(409, "CASH_DRAWER_CLOSED", "Caixa fechado não aceita novos lançamentos.");
    if (data.movementType === "BLEED" && (cashAccount.balanceInCents < data.amountInCents || expectedCash(session.openingAmountInCents, session.movements) < data.amountInCents)) throw new WorkspaceAccessError(409, "INSUFFICIENT_ACCOUNT_BALANCE", "Saldo insuficiente no caixa.");
    const movement = await tx.gymCashDrawerMovement.create({ data: { sessionId: session.id, movementType: data.movementType, amountInCents: data.amountInCents, description: data.description, performedByUserId: data.performedByUserId, idempotencyKey: key, requestFingerprint: hash } });
    await tx.gymFinancialAccount.update({ where: { id: cashAccount.id }, data: { balanceInCents: data.movementType === "SUPPLY" ? { increment: data.amountInCents } : { decrement: data.amountInCents } } });
    if (destination) {
      await tx.gymFinancialAccount.update({ where: { id: destination.id }, data: { balanceInCents: { increment: data.amountInCents } } });
      const transfer = await tx.gymAccountTransfer.create({ data: { workspaceId: data.workspaceId, fromAccountId: cashAccount.id, toAccountId: destination.id, amountInCents: data.amountInCents, referenceId: movement.id, description: "Sangria de caixa", performedByUserId: data.performedByUserId } });
      await tx.gymCashDrawerMovement.update({ where: { id: movement.id }, data: { accountTransferId: transfer.id } });
    }
    await audit(tx, data.workspaceId, data.performedByUserId, `GYM_CASH_DRAWER_MOVEMENT:${movement.id}:${data.movementType}:${data.amountInCents}`);
    return { movementId: movement.id, sessionId: movement.sessionId, movementType: movement.movementType, amountInCents: safeCentsNumber(movement.amountInCents), createdAt: movement.createdAt.toISOString() };
  });
}

export async function closeInternalCash(input: CloseCashDrawerInput) {
  const data = parse(closeCashRequestSchema.extend({ closedByUserId: id }), input);
  safeCentsNumber(data.actualCashInCents);
  return serializableTransaction(async tx => {
    const { session } = await sessionForOperator(tx, data.workspaceId, data.sessionId, data.closedByUserId);
    const expected = expectedCash(session.openingAmountInCents, session.movements); const difference = data.actualCashInCents - expected;
    safeCentsNumber(expected); safeCentsNumber(difference);
    if (difference !== BigInt(0) && (!data.differenceReason || data.differenceReason.length < 5)) throw new WorkspaceAccessError(400, "CASH_DRAWER_DIFFERENCE_REASON_REQUIRED", "Justifique a diferença de caixa (mínimo cinco caracteres).");
    await tx.gymCashDrawerMovement.create({ data: { sessionId: session.id, movementType: "CLOSING", amountInCents: data.actualCashInCents, description: "Contagem de fechamento", performedByUserId: data.closedByUserId } });
    const closed = await tx.gymCashDrawerSession.update({ where: { id: session.id }, data: { status: "CLOSED", closedAt: new Date(), closedByUserId: data.closedByUserId, expectedCashInCents: expected, actualCashInCents: data.actualCashInCents, differenceInCents: difference, differenceReason: difference !== BigInt(0) ? data.differenceReason : null, notes: data.notes } });
    await audit(tx, data.workspaceId, data.closedByUserId, `GYM_CASH_DRAWER_CLOSED:${session.id}:expected=${expected}:actual=${data.actualCashInCents}:difference=${difference}`, difference === BigInt(0) ? "info" : "warning");
    return { id: closed.id, sessionNumber: closed.sessionNumber, status: closed.status, expectedCashInCents: safeCentsNumber(expected), actualCashInCents: safeCentsNumber(data.actualCashInCents), differenceInCents: safeCentsNumber(difference), differenceReason: closed.differenceReason, closedAt: closed.closedAt?.toISOString() };
  });
}

export async function reconcileInternalCash(input: ReconcileCashDrawerInput) {
  const data = parse(reconcileCashRequestSchema.extend({ reconciledByUserId: id }), input);
  return serializableTransaction(async tx => {
    const session = await tx.gymCashDrawerSession.findFirst({ where: { id: data.sessionId, workspaceId: data.workspaceId } });
    if (!session) throw new WorkspaceAccessError(404, "CASH_DRAWER_NOT_FOUND", "Caixa não encontrado.");
    await authority(tx, data.workspaceId, data.reconciledByUserId, "refunds.approve", session.unitId);
    if (session.status !== "CLOSED") throw new WorkspaceAccessError(409, "INVALID_STATUS", "Somente turno fechado pode ser conferido.");
    const result = await tx.gymCashDrawerSession.update({ where: { id: session.id }, data: { status: "RECONCILED", reconciledAt: new Date(), reconciledByUserId: data.reconciledByUserId, reconciliationNotes: data.reconciliationNotes } });
    await audit(tx, data.workspaceId, data.reconciledByUserId, `GYM_CASH_DRAWER_RECONCILED:${session.id}`);
    return { id: result.id, sessionNumber: result.sessionNumber, status: result.status, reconciledAt: result.reconciledAt?.toISOString() };
  });
}

export async function createInternalExpense(input: CreateExpenseInput) {
  const data = parse(expenseSchema, input);
  const total = data.amountInCents + (data.penaltyInCents || BigInt(0)) - (data.discountInCents || BigInt(0));
  if (total <= BigInt(0)) throw new WorkspaceAccessError(400, "INVALID_AMOUNT", "Desconto não pode zerar ou exceder a obrigação.");
  safeCentsNumber(total);
  const key = scopedKey(data.workspaceId, "EXPENSE", data.idempotencyKey); const hash = fingerprint(data);
  return idempotentTransaction(async tx => {
    await authority(tx, data.workspaceId, data.actorUserId, "invoices.issue", data.unitId);
    const existing = await tx.gymExpense.findUnique({ where: { idempotencyKey: key } });
    if (existing) {
      if (existing.workspaceId !== data.workspaceId || existing.requestFingerprint !== hash) throw new WorkspaceAccessError(409, "INVALID_REQUEST", "Chave já usada para outra despesa.");
      return { id: existing.id, title: existing.title, status: existing.status, amountInCents: safeCentsNumber(existing.amountInCents), dueDate: existing.dueDate.toISOString() };
    }
    const category = await tx.gymExpenseCategory.findFirst({ where: { id: data.categoryId, workspaceId: data.workspaceId, isActive: true } });
    if (!category) throw new WorkspaceAccessError(404, "CATEGORY_NOT_FOUND", "Categoria não pertence à academia ou está inativa.");
    const supplier = data.supplierId ? await tx.gymSupplier.findFirst({ where: { id: data.supplierId, workspaceId: data.workspaceId, isActive: true } }) : null;
    if (data.supplierId && !supplier) throw new WorkspaceAccessError(404, "SUPPLIER_NOT_FOUND", "Fornecedor não pertence à academia ou está inativo.");
    const financialAccount = data.financialAccountId ? await account(tx, data.workspaceId, data.financialAccountId) : null;
    if (financialAccount) {
      await authority(tx, data.workspaceId, data.actorUserId, "invoices.issue", financialAccount.unitId);
      if (financialAccount.unitId && financialAccount.unitId !== (data.unitId || null)) throw new WorkspaceAccessError(403, "TENANT_MISMATCH", "Conta não pertence à unidade da despesa.");
    }
    if (data.paidImmediately && !financialAccount) throw new WorkspaceAccessError(400, "FINANCIAL_ACCOUNT_NOT_FOUND", "Informe a conta interna do pagamento.");
    const expense = await tx.gymExpense.create({ data: { workspaceId: data.workspaceId, unitId: data.unitId || null, supplierId: supplier?.id, supplierName: supplier?.tradeName || data.supplierName, categoryId: category.id, title: data.title, description: data.description, documentNumber: data.documentNumber, amountInCents: data.amountInCents, penaltyInCents: data.penaltyInCents, discountInCents: data.discountInCents, dueDate: data.dueDate, competenceMonth: data.competenceMonth || data.dueDate.toISOString().slice(0, 7), createdByUserId: data.actorUserId, paidAmountInCents: data.paidImmediately ? total : BigInt(0), status: data.paidImmediately ? "PAID" : "PENDING", paidAt: data.paidImmediately ? new Date() : null, paidByUserId: data.paidImmediately ? data.actorUserId : null, financialAccountId: financialAccount?.id, paymentMethod: data.paymentMethod, paymentProofUrl: data.paymentProofUrl } });
    await tx.gymExpense.update({ where: { id: expense.id }, data: { idempotencyKey: key, requestFingerprint: hash } });
    if (data.paidImmediately && financialAccount) {
      await debitExpense(tx, { workspaceId: data.workspaceId, actorUserId: data.actorUserId, unitId: expense.unitId, expenseId: expense.id, account: financialAccount, amount: total });
      await tx.gymExpensePayment.create({ data: { expenseId: expense.id, financialAccountId: financialAccount.id, amountInCents: total, paidAt: expense.paidAt || new Date(), recordedByUserId: data.actorUserId, paymentMethod: data.paymentMethod, paymentProofUrl: data.paymentProofUrl, idempotencyKey: `INITIAL:${expense.id}`, requestFingerprint: hash } });
    }
    await audit(tx, data.workspaceId, data.actorUserId, `GYM_EXPENSE_CREATED:${expense.id}:total=${total}:paid=${expense.paidAmountInCents}:account=${financialAccount?.id || "none"}`);
    return { id: expense.id, title: expense.title, status: expense.status, amountInCents: safeCentsNumber(expense.amountInCents), dueDate: expense.dueDate.toISOString() };
  });
}

export async function payInternalExpense(input: PayExpenseInput) {
  const data = parse(expensePaymentSchema, input);
  const paidAt = data.paidAt || new Date();
  if (paidAt.getTime() > Date.now() + 60000) throw new WorkspaceAccessError(400, "INVALID_REQUEST", "Pagamento não pode ter data futura.");
  safeCentsNumber(data.paidAmountInCents);
  const key = scopedKey(data.workspaceId, "EXPENSE_PAYMENT", data.idempotencyKey); const hash = fingerprint(data);
  return idempotentTransaction(async tx => {
    const expense = await tx.gymExpense.findFirst({ where: { id: data.expenseId, workspaceId: data.workspaceId } });
    if (!expense) throw new WorkspaceAccessError(404, "EXPENSE_NOT_FOUND", "Despesa não encontrada.");
    await authority(tx, data.workspaceId, data.actorUserId, "invoices.issue", expense.unitId);
    const existing = await tx.gymExpensePayment.findUnique({ where: { idempotencyKey: key } });
    if (existing) {
      if (existing.expenseId !== expense.id || existing.requestFingerprint !== hash) throw new WorkspaceAccessError(409, "INVALID_REQUEST", "Chave já usada para outro pagamento.");
      return { expenseId: expense.id, paymentId: existing.id, status: expense.status, paidAmountInCents: safeCentsNumber(expense.paidAmountInCents), balanceRemainingInCents: safeCentsNumber(expense.amountInCents + expense.penaltyInCents - expense.discountInCents - expense.paidAmountInCents), paidAt: expense.paidAt?.toISOString() || null };
    }
    if (expense.status === "CANCELLED" || expense.status === "PAID") throw new WorkspaceAccessError(409, "INVALID_STATUS", "Despesa cancelada ou quitada não aceita pagamento.");
    const total = expense.amountInCents + expense.penaltyInCents - expense.discountInCents;
    const paid = expense.paidAmountInCents + data.paidAmountInCents;
    if (total <= BigInt(0) || expense.paidAmountInCents < BigInt(0) || paid > total) throw new WorkspaceAccessError(409, "INVALID_AMOUNT", "Pagamento excede o saldo atual ou exige reconciliação legada.");
    const financialAccount = await account(tx, data.workspaceId, data.financialAccountId);
    await debitExpense(tx, { workspaceId: data.workspaceId, actorUserId: data.actorUserId, unitId: expense.unitId, expenseId: expense.id, account: financialAccount, amount: data.paidAmountInCents });
    const payment = await tx.gymExpensePayment.create({ data: { expenseId: expense.id, financialAccountId: financialAccount.id, amountInCents: data.paidAmountInCents, paidAt, paymentMethod: data.paymentMethod, paymentProofUrl: data.paymentProofUrl, recordedByUserId: data.actorUserId, idempotencyKey: key, requestFingerprint: hash } });
    const result = await tx.gymExpense.update({ where: { id: expense.id }, data: { status: paid === total ? "PAID" : expense.dueDate < new Date() ? "OVERDUE" : "PENDING", paidAmountInCents: paid, paidAt: paid === total ? paidAt : null, paidByUserId: data.actorUserId, financialAccountId: financialAccount.id, paymentMethod: data.paymentMethod, paymentProofUrl: data.paymentProofUrl } });
    await audit(tx, data.workspaceId, data.actorUserId, `GYM_EXPENSE_PAYMENT:${expense.id}:amount=${data.paidAmountInCents}:paid=${paid}:account=${financialAccount.id}:date=${paidAt.toISOString()}:method=${data.paymentMethod || "unspecified"}`);
    return { expenseId: result.id, paymentId: payment.id, status: result.status, paidAmountInCents: safeCentsNumber(result.paidAmountInCents), balanceRemainingInCents: safeCentsNumber(total - paid), paidAt: result.paidAt?.toISOString() || null };
  });
}

export async function reverseInternalExpensePayment(input: { workspaceId: string; expenseId: string; paymentId: string; actorUserId: string; reversalReason: string }) {
  const data = parse(z.object({ ...base, expenseId: id, paymentId: id, reversalReason: z.string().trim().min(5).max(2000) }).strict(), input);
  return serializableTransaction(async tx => {
    const payment = await tx.gymExpensePayment.findFirst({ where: { id: data.paymentId, expenseId: data.expenseId, expense: { workspaceId: data.workspaceId } }, include: { expense: true } });
    if (!payment) throw new WorkspaceAccessError(404, "PAYMENT_NOT_FOUND", "Pagamento individual não encontrado nesta despesa. Agregados legados precisam de reconciliação.");
    await authority(tx, data.workspaceId, data.actorUserId, "refunds.approve", payment.expense.unitId);
    if (payment.reversedAt) return { paymentId: payment.id, reversedAt: payment.reversedAt.toISOString() };
    const financialAccount = await account(tx, data.workspaceId, payment.financialAccountId);
    await authority(tx, data.workspaceId, data.actorUserId, "refunds.approve", financialAccount.unitId);
    const paid = payment.expense.paidAmountInCents - payment.amountInCents;
    if (paid < BigInt(0) || payment.expense.status === "CANCELLED") throw new WorkspaceAccessError(409, "INVALID_AMOUNT", "Fatos legados inconsistentes exigem reconciliação.");
    if (financialAccount.accountType === "CASH") {
      const session = await tx.gymCashDrawerSession.findFirst({ where: { workspaceId: data.workspaceId, financialAccountId: financialAccount.id, openedByUserId: data.actorUserId, status: "OPEN" } });
      if (!session || session.unitId !== financialAccount.unitId) throw new WorkspaceAccessError(409, "CASH_DRAWER_NOT_OPEN", "Abra seu caixa nesta conta para registrar a compensação.");
      await tx.gymCashDrawerMovement.create({ data: { sessionId: session.id, movementType: "EXPENSE_PAYMENT", amountInCents: -payment.amountInCents, expenseId: payment.expenseId, description: `Reversão de pagamento ${payment.id}`, performedByUserId: data.actorUserId } });
    }
    const reversedAt = new Date();
    await tx.gymExpensePayment.update({ where: { id: payment.id }, data: { reversedAt, reversedByUserId: data.actorUserId, reversalReason: data.reversalReason } });
    await tx.gymFinancialAccount.update({ where: { id: financialAccount.id }, data: { balanceInCents: { increment: payment.amountInCents } } });
    await tx.gymExpense.update({ where: { id: payment.expenseId }, data: { paidAmountInCents: paid, status: payment.expense.dueDate < new Date() ? "OVERDUE" : "PENDING", paidAt: null } });
    await audit(tx, data.workspaceId, data.actorUserId, `GYM_EXPENSE_PAYMENT_REVERSED:${payment.id}:amount=${payment.amountInCents}:account=${financialAccount.id}`);
    return { paymentId: payment.id, reversedAt: reversedAt.toISOString() };
  });
}

export async function cancelInternalExpense(input: CancelExpenseInput) {
  const data = parse(expenseCancellationSchema, input);
  return serializableTransaction(async tx => {
    const expense = await tx.gymExpense.findFirst({ where: { id: data.expenseId, workspaceId: data.workspaceId } });
    if (!expense) throw new WorkspaceAccessError(404, "EXPENSE_NOT_FOUND", "Despesa não encontrada.");
    await authority(tx, data.workspaceId, data.actorUserId, "invoices.issue", expense.unitId);
    if (expense.status === "CANCELLED") return { expenseId: expense.id, status: expense.status, cancelledAt: expense.cancelledAt?.toISOString() };
    if (expense.paidAmountInCents !== BigInt(0) || expense.status === "PAID") throw new WorkspaceAccessError(409, "EXPENSE_ALREADY_PAID", "Despesa com pagamento exige reversão rastreável antes de cancelamento.");
    const result = await tx.gymExpense.update({ where: { id: expense.id }, data: { status: "CANCELLED", cancelledAt: new Date(), cancelledByUserId: data.actorUserId, cancellationReason: data.cancellationReason } });
    await audit(tx, data.workspaceId, data.actorUserId, `GYM_EXPENSE_CANCELLED:${expense.id}`);
    return { expenseId: result.id, status: result.status, cancelledAt: result.cancelledAt?.toISOString() };
  });
}
