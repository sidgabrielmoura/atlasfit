import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { WorkspaceAccessError, type WorkspaceAccessErrorCode } from "../domain/types";
import { assertGymFinanceAuthority, assertInvoiceFinanceAuthority } from "./manual-finance-authority";
import { getGymUnitAccess } from "./gym-unit-access";
import { idempotentSerializableTransaction, serializableTransaction, type GymTransactionClient } from "./transaction";
import { lockGymEnrollment } from "./enrollment-lock";
import { gymCalendarInstant } from "../domain/gym-calendar-date";

export const gymReviewKind = z.enum(["CONTRACT", "INVOICE", "ACCOUNT", "CASH_LINK"]);
export type GymReviewKind = z.infer<typeof gymReviewKind>;
const id = z.string().trim().min(1).max(100);
const amount = z.string().regex(/^\d{1,19}$/).refine(value => BigInt(value) <= BigInt("9223372036854775807"));
export const gymReviewSchema = z.object({
  workspaceId: id, requestKey: z.string().uuid(), previewDigest: z.string().regex(/^[a-f0-9]{64}$/),
  reason: z.string().trim().min(10).max(2000), evidenceReference: z.string().trim().min(5).max(300), approved: z.literal(true),
  externalSubscriptionClosed: z.literal(true).optional(), externalChargesReviewed: z.literal(true).optional(),
  creditDisposition: z.enum(["EXTERNALLY_SETTLED", "INVALID_LEGACY_ENTRY"]).optional(), cancelLegacyPlanSchedule: z.literal(true).optional(),
  nextDueDate: z.iso.date().optional(), openingAmountInCents: amount.optional(),
  completedCycles: z.number().int().min(0).max(10000000).optional(),
  cashMovementDisposition: z.enum(["INTERNAL_TRANSFER", "STANDALONE_CASH"]).optional(), transferId: id.optional(),
}).strict();
const json = (value: unknown): Prisma.InputJsonValue => JSON.parse(JSON.stringify(value, (_key, entry: unknown) => typeof entry === "bigint" ? entry.toString() : entry));
const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(json(value))).digest("hex");
function fail(message: string, code: WorkspaceAccessErrorCode = "REVIEW_REQUIRED", status = 409): never { throw new WorkspaceAccessError(status, code, message); }
const sum = (values: bigint[]) => values.reduce((total, value) => total + value, BigInt(0));
type ReviewContext = { unitId: string | null; snapshot: Prisma.InputJsonValue; proposed: Prisma.InputJsonValue; blockers: string[] };

async function preview(tx: GymTransactionClient, workspaceId: string, actorUserId: string, kind: GymReviewKind, resourceId: string): Promise<ReviewContext> {
  if (kind === "CASH_LINK") {
    const movement = await tx.gymCashDrawerMovement.findFirst({ where: { id: resourceId, session: { workspaceId } }, select: { id: true, sessionId: true, movementType: true, amountInCents: true, accountTransferId: true, standaloneReviewedAt: true, idempotencyKey: true, createdAt: true, session: { select: { unitId: true, financialAccountId: true } } } });
    if (!movement) fail("Movimento não encontrado nesta academia.", "RESOURCE_NOT_FOUND", 404);
    await assertGymFinanceAuthority(tx, workspaceId, actorUserId, "workspace.manage", movement.session.unitId);
    if (!["SUPPLY", "BLEED"].includes(movement.movementType) || movement.accountTransferId || movement.standaloneReviewedAt || movement.idempotencyKey) fail("Este movimento já possui classificação ou não admite este vínculo.", "INVALID_TRANSITION");
    const transfers = await tx.gymAccountTransfer.findMany({ where: { workspaceId, amountInCents: movement.amountInCents, ...(movement.movementType === "BLEED" ? { fromAccountId: movement.session.financialAccountId } : { toAccountId: movement.session.financialAccountId }), cashMovements: { none: { movementType: movement.movementType } } }, select: { id: true, amountInCents: true, transferredAt: true, fromAccount: { select: { workspaceId: true, name: true } }, toAccount: { select: { workspaceId: true, name: true } } }, orderBy: [{ transferredAt: "desc" }, { id: "desc" }], take: 1001 });
    if (transfers.length > 1000) fail("Revise as transferências em um lote menor.", "REVIEW_SOURCE_LIMIT");
    return { unitId: movement.session.unitId, snapshot: json({ movement, transfers: transfers.filter(t => t.fromAccount.workspaceId === workspaceId && t.toAccount.workspaceId === workspaceId) }), proposed: json({ amountUnchanged: true, noNewReceipt: true }), blockers: [] };
  }
  if (kind === "CONTRACT") {
    const e = await tx.gymEnrollment.findFirst({ where: { id: resourceId, workspaceId }, select: {
      id: true, workspaceId: true, unitId: true, studentMemberId: true, planVersionId: true, status: true, recurrenceMode: true, startDate: true, endDate: true, priceInCents: true,
      providerSubscriptionId: true, retiredProviderSubscriptionId: true, creditBalanceInCents: true, scheduledPlanVersionId: true,
      subscriptionStatus: true, nextDueDate: true, nextCycleBillingDate: true, cycleCount: true, cancellationEffectiveDate: true, updatedAt: true,
      studentMember: { select: { workspaceId: true } }, planVersion: { select: { name: true, plan: { select: { workspaceId: true } } } },
    } });
    if (!e) fail("Contrato não encontrado nesta academia.", "RESOURCE_NOT_FOUND", 404);
    await assertGymFinanceAuthority(tx, workspaceId, actorUserId, "workspace.manage", e.unitId);
    if (e.studentMember.workspaceId !== workspaceId || e.planVersion.plan.workspaceId !== workspaceId) fail("Vínculos do contrato exigem revisão de integridade.", "TENANT_MISMATCH");
    const invoices = await tx.gymInvoice.findMany({ where: { workspaceId, enrollmentId: e.id }, select: { id: true, billingId: true, providerSubscriptionId: true, cycleNumber: true, dueDate: true, status: true, totalInCents: true, paidAmountInCents: true, balanceRemainingInCents: true }, orderBy: { id: "asc" }, take: 1001 });
    if (invoices.length > 1000) fail("Este contrato exige revisão em lotes menores.", "REVIEW_SOURCE_LIMIT");
    const liveContractsCount = await tx.gymEnrollment.count({ where: { workspaceId, studentMemberId: e.studentMemberId, status: { in: ["ACTIVE", "PAUSED"] } } });
    return { unitId: e.unitId, snapshot: json({ contract: e, invoices, liveContractsCount }), proposed: json({ recurrenceMode: "LOCAL", subscriptionStatus: "INACTIVE", creditBalanceInCents: "0", scheduledPlanVersionId: null, invoicesPreserved: true, accessUnchanged: true }), blockers: [] };
  }
  if (kind === "INVOICE") {
    const invoice = await tx.gymInvoice.findFirst({ where: { id: resourceId, workspaceId }, include: { allocations: { include: { payment: { select: { workspaceId: true, status: true, amountInCents: true, paidAt: true } } }, orderBy: { id: "asc" }, take: 1001 } } });
    if (!invoice) fail("Fatura não encontrada nesta academia.", "RESOURCE_NOT_FOUND", 404);
    const unitId = await assertInvoiceFinanceAuthority(tx, workspaceId, actorUserId, "workspace.manage", invoice);
    const blockers: string[] = [];
    if (invoice.allocations.length > 1000) blockers.push("REVIEW_SOURCE_LIMIT");
    if (invoice.allocations.some(a => a.payment.workspaceId !== workspaceId || a.allocatedAmountInCents <= BigInt(0) || (a.status === "ACTIVE" && a.payment.status !== "CONFIRMED"))) blockers.push("ALLOCATION_INTEGRITY_REQUIRED");
    const allocated = sum(invoice.allocations.filter(a => a.status === "ACTIVE" && a.payment.status === "CONFIRMED").map(a => a.allocatedAmountInCents));
    const paid = invoice.openingPaidAmountInCents + allocated;
    if (invoice.totalInCents < BigInt(0) || invoice.subtotalInCents - invoice.discountInCents !== invoice.totalInCents || invoice.discountInCents < BigInt(0) || allocated > invoice.totalInCents) blockers.push("INVOICE_AMOUNT_REVIEW_REQUIRED");
    if (["CANCELLED", "REFUNDED", "DRAFT"].includes(invoice.status)) blockers.push("INVOICE_TRANSITION_REQUIRED");
    return { unitId, snapshot: json({ invoice: { id: invoice.id, updatedAt: invoice.updatedAt, status: invoice.status, totalInCents: invoice.totalInCents, paidAmountInCents: invoice.paidAmountInCents, balanceRemainingInCents: invoice.balanceRemainingInCents, openingPaidAmountInCents: invoice.openingPaidAmountInCents, billingId: invoice.billingId, providerSubscriptionId: invoice.providerSubscriptionId }, allocations: invoice.allocations.map(a => ({ id: a.id, paymentId: a.paymentId, allocatedAmountInCents: a.allocatedAmountInCents, status: a.status, payment: a.payment })), allocatedInCents: allocated }), proposed: json({ paidAmountInCents: paid, balanceRemainingInCents: invoice.totalInCents - paid, status: paid === invoice.totalInCents ? "PAID" : paid === BigInt(0) ? "OPEN" : "PARTIALLY_PAID" }), blockers };
  }
  const account = await tx.gymFinancialAccount.findFirst({ where: { id: resourceId, workspaceId } });
  if (!account) fail("Conta não encontrada nesta academia.", "RESOURCE_NOT_FOUND", 404);
  await assertGymFinanceAuthority(tx, workspaceId, actorUserId, "workspace.manage", account.unitId);
  // Aggregates include inactive accounts: closing an account does not remove historical facts.
  const [receipts, expenses, incoming, outgoing, cash, foreignPayments, foreignExpenses, foreignTransfers, unidentifiedReceipts, legacyExpenses] = await Promise.all([
    tx.gymPayment.aggregate({ where: { workspaceId, status: "CONFIRMED", OR: [{ financialAccountId: resourceId }, { financialAccountId: null, cashDrawerSession: { workspaceId, financialAccountId: resourceId } }] }, _sum: { amountInCents: true }, _count: true }),
    tx.gymExpensePayment.aggregate({ where: { financialAccountId: resourceId, expense: { workspaceId }, reversedAt: null }, _sum: { amountInCents: true }, _count: true }),
    tx.gymAccountTransfer.aggregate({ where: { workspaceId, toAccountId: resourceId }, _sum: { amountInCents: true }, _count: true }),
    tx.gymAccountTransfer.findMany({ where: { workspaceId, fromAccountId: resourceId }, select: { id: true, referenceId: true, amountInCents: true }, orderBy: { id: "asc" }, take: 5001 }),
    tx.gymCashDrawerMovement.findMany({ where: { session: { financialAccountId: resourceId }, movementType: { in: ["SUPPLY", "BLEED"] } }, select: { id: true, accountTransferId: true, standaloneReviewedAt: true, accountTransfer: { select: { workspaceId: true, fromAccountId: true, toAccountId: true, amountInCents: true } }, idempotencyKey: true, movementType: true, amountInCents: true, description: true, session: { select: { workspaceId: true } } }, orderBy: { id: "asc" }, take: 5001 }),
    tx.gymPayment.count({ where: { financialAccountId: resourceId, workspaceId: { not: workspaceId } } }),
    tx.gymExpensePayment.count({ where: { financialAccountId: resourceId, expense: { workspaceId: { not: workspaceId } } } }),
    tx.gymAccountTransfer.count({ where: { OR: [{ fromAccountId: resourceId }, { toAccountId: resourceId }], workspaceId: { not: workspaceId } } }),
    tx.gymPayment.count({ where: { workspaceId, status: "CONFIRMED", financialAccountId: null, cashDrawerSessionId: null } }),
    tx.gymExpense.count({ where: { workspaceId, paidAmountInCents: { gt: BigInt(0) }, OR: [{ financialAccountId: resourceId }, { financialAccountId: null }], payments: { none: { reversedAt: null } } } }),
  ]);
  const blockers: string[] = [];
  if (outgoing.length > 5000 || cash.length > 5000) blockers.push("REVIEW_SOURCE_LIMIT");
  if (unidentifiedReceipts || legacyExpenses) blockers.push("LEGACY_ACCOUNT_FACTS_REVIEW_REQUIRED");
  if (account.accountType === "GATEWAY_ONLINE") blockers.push("EXTERNAL_ACCOUNT_REVIEW_REQUIRED");
  if (foreignPayments || foreignExpenses || foreignTransfers || cash.some(m => m.session.workspaceId !== workspaceId)) blockers.push("ACCOUNT_TENANT_REVIEW_REQUIRED");
  if (cash.some(m => m.accountTransfer && (m.accountTransfer.workspaceId !== workspaceId || m.accountTransfer.amountInCents !== m.amountInCents || (m.movementType === "BLEED" ? m.accountTransfer.fromAccountId : m.accountTransfer.toAccountId) !== resourceId))) blockers.push("CASH_TRANSFER_LINK_REVIEW_REQUIRED");
  const linked = new Set(outgoing.map(t => t.referenceId).filter(Boolean));
  // Old transfer movements lack an exact backlink. Never guess from free-text descriptions.
  const standalone = cash.filter(m => !m.accountTransferId && !linked.has(m.id));
  if (standalone.some(m => !m.idempotencyKey && !m.standaloneReviewedAt)) blockers.push("UNLINKED_CASH_MOVEMENT_REVIEW_REQUIRED");
  const movementNet = sum(standalone.filter(m => m.idempotencyKey || m.standaloneReviewedAt).map(m => m.movementType === "SUPPLY" ? m.amountInCents : -m.amountInCents));
  const activity = (receipts._sum.amountInCents || BigInt(0)) - (expenses._sum.amountInCents || BigInt(0)) + (incoming._sum.amountInCents || BigInt(0)) - sum(outgoing.map(t => t.amountInCents)) + movementNet;
  return { unitId: account.unitId, snapshot: json({ account: { id: account.id, name: account.name, accountType: account.accountType, balanceInCents: account.balanceInCents, initialBalanceInCents: account.initialBalanceInCents, updatedAt: account.updatedAt }, receipts, expenses, incoming, outgoing, cash, unidentifiedReceipts, legacyExpenses, activityInCents: activity }), proposed: json({ balanceInCents: account.initialBalanceInCents + activity }), blockers };
}

export async function previewGymAdministrativeReview(workspaceId: string, actorUserId: string, kind: GymReviewKind, resourceId: string) {
  return serializableTransaction(async tx => { const result = await preview(tx, workspaceId, actorUserId, kind, resourceId); return { ...result, digest: hash(result.snapshot) }; });
}

export async function commitGymAdministrativeReview(input: z.infer<typeof gymReviewSchema> & { actorUserId: string; kind: GymReviewKind; resourceId: string }) {
  const { actorUserId, kind, resourceId, ...request } = input;
  const parsed = gymReviewSchema.safeParse(request);
  if (!parsed.success || !gymReviewKind.safeParse(kind).success) fail("Confirme a revisão, justificativa e referência documental.", "INVALID_REQUEST", 400);
  const data = parsed.data, fingerprint = hash({ ...data, actorUserId, kind, resourceId });
  return idempotentSerializableTransaction(async tx => {
    const previous = await tx.gymAdministrativeReview.findUnique({ where: { workspaceId_requestKey: { workspaceId: data.workspaceId, requestKey: data.requestKey } } });
    if (previous) {
      await assertGymFinanceAuthority(tx, data.workspaceId, actorUserId, "workspace.manage", previous.unitId);
      if (previous.requestFingerprint !== fingerprint) fail("Tentativa já utilizada em outra decisão.", "IDEMPOTENCY_CONFLICT");
      return { reviewId: previous.id, result: previous.afterSnapshot };
    }
    if (kind === "CONTRACT") await lockGymEnrollment(tx, data.workspaceId, resourceId);
    const current = await preview(tx, data.workspaceId, actorUserId, kind, resourceId);
    if (hash(current.snapshot) !== data.previewDigest) fail("Os fatos mudaram. Reabra a revisão antes de aprovar.", "REVIEW_STALE");
    if (current.blockers.length) fail(`Revise os fatos individuais antes de ajustar: ${current.blockers.join(", ")}.`);
    let result: Prisma.InputJsonValue;
    if (kind !== "CASH_LINK" && (data.cashMovementDisposition || data.transferId)) fail("Classificação de caixa exige revisão do movimento individual.", "INVALID_REQUEST", 400);
    if (kind === "CASH_LINK") {
      if (data.openingAmountInCents !== undefined || data.externalSubscriptionClosed || data.externalChargesReviewed || data.creditDisposition || data.cancelLegacyPlanSchedule || data.nextDueDate || data.completedCycles !== undefined) fail("Opções incompatíveis com a classificação do movimento.", "INVALID_REQUEST", 400);
      const snapshot = current.snapshot as { movement: { movementType: "SUPPLY" | "BLEED" }; transfers: { id: string }[] };
      if (!data.cashMovementDisposition || (data.cashMovementDisposition === "INTERNAL_TRANSFER" ? !data.transferId || !snapshot.transfers.some(t => t.id === data.transferId) : Boolean(data.transferId))) fail("Selecione a transferência comprovada ou confirme o movimento avulso.", "INVALID_REQUEST", 400);
      await tx.gymCashDrawerMovement.update({ where: { id: resourceId }, data: data.cashMovementDisposition === "INTERNAL_TRANSFER" ? { accountTransferId: data.transferId } : { standaloneReviewedAt: new Date() } });
      result = json({ disposition: data.cashMovementDisposition, transferId: data.transferId || null, amountUnchanged: true, noNewReceipt: true });
    } else if (kind === "CONTRACT") {
      if (data.openingAmountInCents !== undefined) fail("Contrato não recebe saldo de abertura.", "INVALID_REQUEST", 400);
      const e = await tx.gymEnrollment.findUniqueOrThrow({ where: { id: resourceId } });
      const external = Boolean(e.providerSubscriptionId || e.recurrenceMode === "PROVIDER");
      if (!external && e.creditBalanceInCents === BigInt(0) && !e.scheduledPlanVersionId) fail("Não há pendência legada neste contrato.");
      if (external && (!data.externalSubscriptionClosed || !data.externalChargesReviewed)) fail("Confira manualmente o encerramento externo e todas as cobranças pendentes. Esta ação não contata o provedor.", "EXTERNAL_REVIEW_REQUIRED");
      if (external && data.completedCycles === undefined) fail("Confira quantos ciclos já foram emitidos antes de continuar.", "CYCLE_REVIEW_REQUIRED");
      const highestCycle = await tx.gymInvoice.aggregate({ where: { workspaceId: data.workspaceId, enrollmentId: resourceId }, _max: { cycleNumber: true } });
      const cycleCount = data.completedCycles ?? e.cycleCount;
      if (cycleCount < e.cycleCount || cycleCount < (highestCycle._max.cycleNumber || 0)) fail("O número de ciclos não pode reduzir o histórico já registrado.", "CYCLE_REVIEW_REQUIRED");
      if (e.creditBalanceInCents !== BigInt(0) && !data.creditDisposition) fail("Informe a destinação comprovada do crédito legado.", "CREDIT_REVIEW_REQUIRED");
      if (e.scheduledPlanVersionId && !data.cancelLegacyPlanSchedule) fail("Confirme a retirada do agendamento legado. Uma nova troca exige outro aceite.", "PLAN_SCHEDULE_REVIEW_REQUIRED");
      if (e.retiredProviderSubscriptionId && e.providerSubscriptionId && e.retiredProviderSubscriptionId !== e.providerSubscriptionId) fail("Existem duas referências externas. Revise-as individualmente.");
      const timezone = await tx.gymSettings.findUnique({ where: { workspaceId: data.workspaceId }, select: { timezone: true } });
      const due = data.nextDueDate ? gymCalendarInstant(data.nextDueDate, timezone?.timezone || "America/Sao_Paulo") : null;
      if (due && (due <= new Date() || (e.cancellationEffectiveDate && due >= e.cancellationEffectiveDate) || (e.endDate && !e.autoRenew && due > e.endDate) || ["CANCELLED", "EXPIRED"].includes(e.status))) fail("Escolha um próximo vencimento futuro dentro da vigência admitida.", "INVALID_REQUEST", 400);
      if (due && await tx.gymInvoice.findFirst({ where: { workspaceId: data.workspaceId, enrollmentId: resourceId, dueDate: { gte: due } }, select: { id: true } })) fail("Já existe obrigação nesse vencimento ou depois dele. Revise o calendário antes de reiniciar.", "CYCLE_REVIEW_REQUIRED");
      await tx.gymEnrollment.update({ where: { id: resourceId }, data: { cycleCount, retiredProviderSubscriptionId: e.providerSubscriptionId || e.retiredProviderSubscriptionId, providerSubscriptionId: null, recurrenceMode: "LOCAL", subscriptionStatus: ["CANCELLED", "EXPIRED"].includes(e.status) ? "CANCELLED" : due ? "ACTIVE" : "INACTIVE", nextDueDate: due, nextCycleBillingDate: due, billingType: "UNDEFINED", checkoutUrl: null, creditCardToken: null, creditCardBrand: null, creditCardLast4: null, creditBalanceInCents: BigInt(0), scheduledPlanVersionId: null } });
      result = json({ ...current.proposed as object, cycleCount, nextDueDate: due, subscriptionStatus: ["CANCELLED", "EXPIRED"].includes(e.status) ? "CANCELLED" : due ? "ACTIVE" : "INACTIVE", externalClosure: external ? "MANUALLY_ATTESTED" : "NOT_APPLICABLE", creditDisposition: data.creditDisposition || null });
      await tx.gymEnrollmentEvent.create({ data: { enrollmentId: resourceId, workspaceId: data.workspaceId, fromStatus: e.status, toStatus: e.status, actorId: actorUserId, reason: "LEGACY_CONTRACT_ADMINISTRATIVELY_REVIEWED:receivablesPreserved" } });
    } else if (kind === "INVOICE") {
      if (data.externalSubscriptionClosed || data.externalChargesReviewed || data.creditDisposition || data.cancelLegacyPlanSchedule || data.nextDueDate || data.completedCycles !== undefined) fail("Opções contratuais incompatíveis com uma fatura.", "INVALID_REQUEST", 400);
      const invoice = await tx.gymInvoice.findUniqueOrThrow({ where: { id: resourceId } });
      const opening = data.openingAmountInCents !== undefined ? BigInt(data.openingAmountInCents) : invoice.openingPaidAmountInCents;
      const allocations = await tx.gymPaymentAllocation.aggregate({ where: { invoiceId: resourceId, status: "ACTIVE", payment: { workspaceId: data.workspaceId, status: "CONFIRMED" } }, _sum: { allocatedAmountInCents: true } });
      const paid = opening + (allocations._sum.allocatedAmountInCents || BigInt(0));
      if (paid > invoice.totalInCents) fail("Saldos comprovados excedem o valor da obrigação.", "INVALID_AMOUNT");
      const status = paid === invoice.totalInCents ? "PAID" : paid === BigInt(0) ? "OPEN" : "PARTIALLY_PAID";
      const updated = await tx.gymInvoice.update({ where: { id: resourceId }, data: { openingPaidAmountInCents: opening, paidAmountInCents: paid, balanceRemainingInCents: invoice.totalInCents - paid, status, paidAt: status === "PAID" ? invoice.paidAt || new Date() : null } });
      result = json({ status: updated.status, openingPaidAmountInCents: opening, paidAmountInCents: paid, balanceRemainingInCents: updated.balanceRemainingInCents, newReceiptCreated: false });
    } else if (kind === "ACCOUNT") {
      if (data.externalSubscriptionClosed || data.externalChargesReviewed || data.creditDisposition || data.cancelLegacyPlanSchedule || data.nextDueDate || data.completedCycles !== undefined) fail("Opções contratuais incompatíveis com uma conta.", "INVALID_REQUEST", 400);
      const snapshot = current.snapshot as { account: { initialBalanceInCents: string }; activityInCents: string };
      const opening = BigInt(data.openingAmountInCents ?? snapshot.account.initialBalanceInCents);
      const balance = opening + BigInt(snapshot.activityInCents);
      if (balance < BigInt(0) || balance > BigInt("9223372036854775807")) fail("Saldo calculado fora do intervalo admitido. Revise os fatos individuais.", "INVALID_AMOUNT");
      await tx.gymFinancialAccount.update({ where: { id: resourceId }, data: { initialBalanceInCents: opening, balanceInCents: balance } });
      result = json({ initialBalanceInCents: opening, balanceInCents: balance, newReceiptCreated: false });
    } else return fail("Tipo de revisão inválido.", "INVALID_REQUEST", 400);
    const record = await tx.gymAdministrativeReview.create({ data: { workspaceId: data.workspaceId, unitId: current.unitId, resourceType: kind, resourceId, actorUserId, requestKey: data.requestKey, requestFingerprint: fingerprint, reason: data.reason, evidenceReference: data.evidenceReference, beforeSnapshot: current.snapshot, afterSnapshot: result } });
    await tx.auditLog.create({ data: { userId: actorUserId, entity: "GYM_ADMINISTRATIVE_REVIEW", entityId: record.id, action: `GYM_${kind}_REVIEW_COMMITTED:${resourceId}`, severity: "high" } });
    return { reviewId: record.id, result };
  });
}

export async function listGymAdministrativeReviewResources(workspaceId: string, actorUserId: string, kind: GymReviewKind, page = 1) {
  if (!Number.isSafeInteger(page) || page < 1 || page > 10000) fail("Página inválida.", "INVALID_REQUEST", 400);
  return serializableTransaction(async tx => {
    const scope = await getGymUnitAccess(tx, workspaceId, actorUserId, "workspace.manage");
    let includeUnassigned = scope.includeUnassigned;
    if (includeUnassigned) {
      try { await assertGymFinanceAuthority(tx, workspaceId, actorUserId, "workspace.manage", null); }
      catch (error) { if (error instanceof WorkspaceAccessError && error.statusCode === 403 && ["UNIT_REQUIRED", "INSUFFICIENT_PERMISSIONS"].includes(error.code)) includeUnassigned = false; else throw error; }
    }
    const units = { OR: [{ unitId: { in: scope.units.map(u => u.id) } }, ...(includeUnassigned ? [{ unitId: null }] : [])] };
    const pagination = { skip: (page - 1) * 20, take: 20, orderBy: { id: "asc" as const } };
    let rows: { id: string; label: string }[], total: number;
    let duplicateInventoryHasMore = false;
    if (kind === "CONTRACT") {
      const duplicates = await tx.gymEnrollment.groupBy({ by: ["studentMemberId"], where: { workspaceId, status: { in: ["ACTIVE", "PAUSED"] } }, _count: { id: true }, having: { id: { _count: { gt: 1 } } }, orderBy: { studentMemberId: "asc" }, take: 1000 });
      duplicateInventoryHasMore = duplicates.length === 1000;
      const where = { workspaceId, AND: [units, { OR: [{ providerSubscriptionId: { not: null } }, { recurrenceMode: "PROVIDER" as const }, { creditBalanceInCents: { not: BigInt(0) } }, { scheduledPlanVersionId: { not: null } }, { status: { in: ["ACTIVE" as const, "PAUSED" as const] }, studentMemberId: { in: duplicates.map(d => d.studentMemberId) } }] }] };
      const records = await tx.gymEnrollment.findMany({ where, ...pagination, select: { id: true, status: true, studentMember: { select: { user: { select: { name: true } } } } } });
      rows = records.map(e => ({ id: e.id, label: `${e.studentMember.user.name || "Aluno"} · ${e.status}` })); total = await tx.gymEnrollment.count({ where });
    } else if (kind === "INVOICE") {
      const where: Prisma.GymInvoiceWhereInput = { workspaceId, studentMember: { workspaceId }, OR: [{ enrollment: { workspaceId, ...units } }, { enrollmentId: null, studentMember: { workspaceId, ...units } }] };
      rows = (await tx.gymInvoice.findMany({ where, ...pagination, select: { id: true, invoiceNumber: true, title: true } })).map(e => ({ id: e.id, label: `${e.invoiceNumber} · ${e.title}` })); total = await tx.gymInvoice.count({ where });
    } else if (kind === "ACCOUNT") {
      const where = { workspaceId, ...units }; rows = (await tx.gymFinancialAccount.findMany({ where, ...pagination, select: { id: true, name: true } })).map(e => ({ id: e.id, label: e.name })); total = await tx.gymFinancialAccount.count({ where });
    } else {
      const where = { session: { workspaceId, ...units }, accountTransferId: null, standaloneReviewedAt: null, idempotencyKey: null, movementType: { in: ["SUPPLY" as const, "BLEED" as const] } };
      rows = (await tx.gymCashDrawerMovement.findMany({ where, ...pagination, select: { id: true, movementType: true, createdAt: true } })).map(m => ({ id: m.id, label: `${m.movementType === "SUPPLY" ? "Suprimento" : "Sangria"} · ${m.createdAt.toISOString().slice(0, 10)}` })); total = await tx.gymCashDrawerMovement.count({ where });
    }
    const historyWhere = { workspaceId, resourceType: kind, ...units };
    const history = await tx.gymAdministrativeReview.findMany({ where: historyWhere, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (page - 1) * 20, take: 20, select: { id: true, resourceId: true, reason: true, evidenceReference: true, actorUserId: true, createdAt: true, afterSnapshot: true } });
    const historyTotal = await tx.gymAdministrativeReview.count({ where: historyWhere });
    return { rows, page, pages: Math.ceil(Math.max(total, historyTotal) / 20), total, history, historyTotal, duplicateInventoryHasMore };
  });
}
