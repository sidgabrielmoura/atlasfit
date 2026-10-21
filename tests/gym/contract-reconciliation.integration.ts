import { afterAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import prisma from "@/lib/prisma";
import { previewGymAdministrativeReview, commitGymAdministrativeReview, listGymAdministrativeReviewResources } from "@/modules/workspaces/application/gym-administrative-review";
import { cancelGymEnrollment, withdrawGymCancellation } from "@/modules/workspaces/application/enrollment-cancellation";
import { requestGymEnrollmentRevision } from "@/modules/workspaces/application/enrollment-revision";
import { processLocalEnrollmentClosures } from "@/modules/workspaces/application/enrollment-closure-job";
import { pauseGymEnrollment, resumeGymEnrollment } from "@/modules/workspaces/application/enrollment-pause";
import { generateLocalCycleInvoice, manualSubscriptionService } from "@/modules/workspaces/application/manual-subscription-service";
import { serializableTransaction } from "@/modules/workspaces/application/transaction";
import { resolveGymLegacyWebhookScope } from "@/modules/payments/webhooks/gym-legacy-scope";
import { manualFinanceService } from "@/modules/workspaces/application/manual-finance-service";
import { exportGymDataSubject } from "@/modules/workspaces/application/privacy-service";

const database = new URL(process.env.DATABASE_URL || "http://invalid");
if (database.hostname !== "127.0.0.1" || database.port !== "56432" || database.pathname !== "/atlasfit_gym_stabilization_20261001") throw new Error("Exige banco descartável específico.");
afterAll(async () => prisma.$disconnect());
const day = 86400000;
async function fixture() {
  const owner = await prisma.user.create({ data: { name: "Gestor sintético do passo 3" } });
  const student = await prisma.user.create({ data: { name: "Aluno sintético do passo 3", birthDate: new Date("1990-01-15") } });
  const workspace = await prisma.workspace.create({ data: { ownerId: owner.id, name: "GYM reconciliação sintética", slug: randomUUID(), type: "GYM", subscription: { create: { status: "ACTIVE" } }, members: { create: { userId: owner.id, role: "OWNER" } } } });
  const unit = await prisma.gymUnit.create({ data: { workspaceId: workspace.id, name: "Unidade original" } });
  const member = await prisma.workspaceMember.create({ data: { workspaceId: workspace.id, userId: student.id, role: "STUDENT", unitId: unit.id, studentProfile: { create: {} } } });
  const plan = await prisma.gymPlan.create({ data: { workspaceId: workspace.id, name: "Plano sintético", versions: { create: [{ version: 1, name: "Original", termsText: "Contrato original preservado", priceInCents: BigInt(10000), durationDays: 365 }, { version: 2, name: "Novo", termsText: "Novas condições", priceInCents: BigInt(15000), durationDays: 365 }] } }, include: { versions: { orderBy: { version: "asc" } } } });
  const enrollment = await prisma.gymEnrollment.create({ data: { workspaceId: workspace.id, unitId: unit.id, studentMemberId: member.id, planVersionId: plan.versions[0].id, status: "ACTIVE", priceInCents: BigInt(10000), enrollmentFeeInCents: BigInt(1000), cycleCount: 1, subscriptionStatus: "ACTIVE", accessGranted: true, startDate: new Date(Date.now() - day), endDate: new Date(Date.now() + 365 * day), activatedAt: new Date(), acceptance: { create: { workspaceId: workspace.id, signerUserId: student.id, termsVersion: "1", termsSnapshot: "Contrato original preservado" } } } });
  const invoice = await prisma.gymInvoice.create({ data: { workspaceId: workspace.id, studentMemberId: member.id, studentUserId: student.id, enrollmentId: enrollment.id, invoiceNumber: randomUUID(), title: "Obrigação preservada", dueDate: new Date(), subtotalInCents: BigInt(10000), totalInCents: BigInt(10000), balanceRemainingInCents: BigInt(10000), payerName: student.name!, createdByUserId: owner.id } });
  const account = await prisma.gymFinancialAccount.create({ data: { workspaceId: workspace.id, unitId: unit.id, name: "Conta interna sintética", accountType: "BANK_ACCOUNT", initialBalanceInCents: BigInt(200), balanceInCents: BigInt(200) } });
  const command = { workspaceId: workspace.id, enrollmentId: enrollment.id, actorUserId: owner.id };
  return { owner, student, workspace, unit, member, plan, enrollment, invoice, account, command };
}
async function review(f: Awaited<ReturnType<typeof fixture>>, kind: "CONTRACT" | "INVOICE" | "ACCOUNT" | "CASH_LINK", resourceId: string) {
  const shown = await previewGymAdministrativeReview(f.workspace.id, f.owner.id, kind, resourceId);
  return { ...f.command, enrollmentId: undefined, kind, resourceId, workspaceId: f.workspace.id, actorUserId: f.owner.id, requestKey: randomUUID(), previewDigest: shown.digest, reason: "Conferência exclusivamente sintética dos documentos", evidenceReference: "DOCUMENTO-SINTETICO-001", approved: true as const };
}
function clean(command: Awaited<ReturnType<typeof review>>) { const { enrollmentId, ...rest } = command; return rest; }

describe("Passo 3 — contratos, encerramento e reconciliação manual", () => {
  it("formulário de data permite pausa no mesmo dia da ativação sem aceitar dia anterior à vigência", async () => {
    const f = await fixture(), now = new Date(), start = new Date(now.getTime() - 1000);
    await prisma.gymEnrollment.update({ where: { id: f.enrollment.id }, data: { startDate: start } });
    const date = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
    const previousDay = new Date(new Date(`${date}T12:00:00Z`).getTime() - day).toISOString().slice(0, 10);
    await expect(pauseGymEnrollment({ ...f.command, startDate: previousDay, endDate: new Date(now.getTime() + day), reason: "Data anterior à vigência" }, now)).rejects.toMatchObject({ code: "INVALID_REQUEST" });
    expect(await prisma.gymEnrollmentPause.count({ where: { enrollmentId: f.enrollment.id } })).toBe(0);
    await pauseGymEnrollment({ ...f.command, startDate: date, endDate: new Date(now.getTime() + day), reason: "Pausa no dia da ativação" }, now);
    expect(await prisma.gymEnrollmentPause.findFirst({ where: { enrollmentId: f.enrollment.id } })).toMatchObject({ startDate: start, startedAt: now });
  });
  it("classifica caixa legado por evidência exata, sem duplicar transferência nem gerar receita", async () => {
    const f = await fixture();
    const cash = await prisma.gymFinancialAccount.create({ data: { workspaceId: f.workspace.id, unitId: f.unit.id, name: "Caixa legado sintético", accountType: "CASH", initialBalanceInCents: BigInt(5000), balanceInCents: BigInt(0) } });
    const session = await prisma.gymCashDrawerSession.create({ data: { workspaceId: f.workspace.id, unitId: f.unit.id, financialAccountId: cash.id, sessionNumber: randomUUID(), openedByUserId: f.owner.id, openingAmountInCents: BigInt(5000) } });
    const transfer = await prisma.gymAccountTransfer.create({ data: { workspaceId: f.workspace.id, fromAccountId: cash.id, toAccountId: f.account.id, amountInCents: BigInt(2500), performedByUserId: f.owner.id } });
    const bleed = await prisma.gymCashDrawerMovement.create({ data: { sessionId: session.id, movementType: "BLEED", amountInCents: BigInt(2500), performedByUserId: f.owner.id } });
    const blocked = await previewGymAdministrativeReview(f.workspace.id, f.owner.id, "ACCOUNT", cash.id);
    expect(blocked.blockers).toContain("UNLINKED_CASH_MOVEMENT_REVIEW_REQUIRED");
    await expect(commitGymAdministrativeReview(clean(await review(f, "ACCOUNT", cash.id)))).rejects.toMatchObject({ code: "REVIEW_REQUIRED" });
    const link = { ...clean(await review(f, "CASH_LINK", bleed.id)), cashMovementDisposition: "INTERNAL_TRANSFER" as const, transferId: transfer.id };
    await Promise.all([commitGymAdministrativeReview(link), commitGymAdministrativeReview(link)]);
    expect(await prisma.gymCashDrawerMovement.findUnique({ where: { id: bleed.id } })).toMatchObject({ accountTransferId: transfer.id });
    await commitGymAdministrativeReview(clean(await review(f, "ACCOUNT", cash.id)));
    expect(await prisma.gymFinancialAccount.findUnique({ where: { id: cash.id } })).toMatchObject({ balanceInCents: BigInt(2500) });
    const supply = await prisma.gymCashDrawerMovement.create({ data: { sessionId: session.id, movementType: "SUPPLY", amountInCents: BigInt(1000), performedByUserId: f.owner.id } });
    await commitGymAdministrativeReview({ ...clean(await review(f, "CASH_LINK", supply.id)), cashMovementDisposition: "STANDALONE_CASH" });
    await commitGymAdministrativeReview(clean(await review(f, "ACCOUNT", cash.id)));
    expect(await prisma.gymFinancialAccount.findUnique({ where: { id: cash.id } })).toMatchObject({ balanceInCents: BigInt(3500) });
    expect(await prisma.gymPayment.count({ where: { workspaceId: f.workspace.id } })).toBe(0);
  });
  it("revisão externa exige conferência completa, é idempotente e preserva referência para webhooks atrasados", async () => {
    const f = await fixture(), provider = `sub-synthetic-${randomUUID()}`;
    await prisma.gymEnrollment.update({ where: { id: f.enrollment.id }, data: { providerSubscriptionId: provider, recurrenceMode: "PROVIDER", creditBalanceInCents: BigInt(2500), scheduledPlanVersionId: f.plan.versions[1].id } });
    const base = clean(await review(f, "CONTRACT", f.enrollment.id));
    await expect(commitGymAdministrativeReview(base)).rejects.toMatchObject({ code: "EXTERNAL_REVIEW_REQUIRED" });
    await expect(commitGymAdministrativeReview({ ...base, externalSubscriptionClosed: true, externalChargesReviewed: true, completedCycles: 1 })).rejects.toMatchObject({ code: "CREDIT_REVIEW_REQUIRED" });
    const command = { ...base, externalSubscriptionClosed: true as const, externalChargesReviewed: true as const, completedCycles: 2, creditDisposition: "EXTERNALLY_SETTLED" as const, cancelLegacyPlanSchedule: true as const };
    const [one, two] = await Promise.all([commitGymAdministrativeReview(command), commitGymAdministrativeReview(command)]);
    expect(one.reviewId).toBe(two.reviewId);
    expect(await prisma.gymEnrollment.findUnique({ where: { id: f.enrollment.id } })).toMatchObject({ providerSubscriptionId: null, retiredProviderSubscriptionId: provider, recurrenceMode: "LOCAL", cycleCount: 2, subscriptionStatus: "INACTIVE", creditBalanceInCents: BigInt(0), scheduledPlanVersionId: null, status: "ACTIVE", accessGranted: true });
    expect(await prisma.gymInvoice.findUnique({ where: { id: f.invoice.id } })).toMatchObject({ status: "OPEN", balanceRemainingInCents: BigInt(10000) });
    expect(await prisma.gymContractAcceptance.findUnique({ where: { enrollmentId: f.enrollment.id } })).toMatchObject({ termsSnapshot: "Contrato original preservado" });
    const event: Parameters<typeof resolveGymLegacyWebhookScope>[0] = { providerEventId: randomUUID(), eventType: "PAYMENT_CONFIRMED", occurredAt: new Date(), resourceType: "PAYMENT", resourceId: randomUUID(), rawPayload: { payment: { subscription: provider } } };
    expect(await resolveGymLegacyWebhookScope(event)).toMatchObject({ workspaceId: f.workspace.id, reason: "GYM_LEGACY_RECONCILIATION_REQUIRED" });
    await expect(commitGymAdministrativeReview({ ...command, reason: "Mudança de decisão após o registro" })).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });
    expect(await prisma.gymAdministrativeReview.count({ where: { workspaceId: f.workspace.id } })).toBe(1);
    await expect(prisma.gymAdministrativeReview.update({ where: { id: one.reviewId }, data: { reason: "Alteração proibida" } })).rejects.toThrow();
    await expect(prisma.gymAdministrativeReview.delete({ where: { id: one.reviewId } })).rejects.toThrow();
    await cancelGymEnrollment({ ...f.command, immediate: true, reason: "Encerramento após comprovação manual" });
    expect(await prisma.gymEnrollment.findUnique({ where: { id: f.enrollment.id } })).toMatchObject({ status: "CANCELLED" });
  });
  it("reconcilia saldo inicial e alocações sem criar receita; estorno preserva saldo histórico", async () => {
    const f = await fixture();
    await manualFinanceService.recordPayment({ workspaceId: f.workspace.id, actorUserId: f.owner.id, amountInCents: 3000, allocations: [{ invoiceId: f.invoice.id, amountInCents: 3000 }], financialAccountId: f.account.id, paymentMethod: "BANK_TRANSFER_MANUAL", idempotencyKey: randomUUID() });
    await prisma.gymInvoice.update({ where: { id: f.invoice.id }, data: { paidAmountInCents: BigInt(9999), balanceRemainingInCents: BigInt(1), status: "PAID" } });
    const command = { ...clean(await review(f, "INVOICE", f.invoice.id)), openingAmountInCents: "2000" };
    await Promise.all([commitGymAdministrativeReview(command), commitGymAdministrativeReview(command)]);
    expect(await prisma.gymInvoice.findUnique({ where: { id: f.invoice.id } })).toMatchObject({ openingPaidAmountInCents: BigInt(2000), paidAmountInCents: BigInt(5000), balanceRemainingInCents: BigInt(5000), status: "PARTIALLY_PAID" });
    expect(await prisma.gymPayment.count({ where: { workspaceId: f.workspace.id } })).toBe(1);
    expect((await exportGymDataSubject({ workspaceId: f.workspace.id, targetUserId: f.student.id, actorUserId: f.owner.id })).administrativeReviews).toHaveLength(1);
    const payment = await prisma.gymPayment.findFirstOrThrow({ where: { workspaceId: f.workspace.id } });
    await manualFinanceService.reversePayment({ workspaceId: f.workspace.id, actorUserId: f.owner.id, paymentId: payment.id, reversalReason: "Estorno sintético do recebimento novo" });
    expect(await prisma.gymInvoice.findUnique({ where: { id: f.invoice.id } })).toMatchObject({ openingPaidAmountInCents: BigInt(2000), paidAmountInCents: BigInt(2000), balanceRemainingInCents: BigInt(8000), status: "PARTIALLY_PAID" });
  });
  it("recalcula saldo histórico sem receita fictícia; centavos BIGINT permanecem exatos", async () => {
    const f = await fixture(); const exact = "9007199254740993";
    await prisma.gymFinancialAccount.update({ where: { id: f.account.id }, data: { initialBalanceInCents: BigInt(exact), balanceInCents: BigInt(0) } });
    const command = clean(await review(f, "ACCOUNT", f.account.id));
    const result = await commitGymAdministrativeReview(command);
    expect(result.result).toMatchObject({ balanceInCents: exact, newReceiptCreated: false });
    expect(await prisma.gymFinancialAccount.findUnique({ where: { id: f.account.id } })).toMatchObject({ balanceInCents: BigInt(exact) });
    expect(await prisma.gymPayment.count({ where: { workspaceId: f.workspace.id } })).toBe(0);
    expect(JSON.stringify(result)).toContain(exact);
  });
  it("recusa preview obsoleto, valor acima da dívida, outra academia, escopo de unidade e retry após revogação", async () => {
    const f = await fixture(), other = await fixture();
    const command = clean(await review(f, "INVOICE", f.invoice.id));
    await prisma.gymInvoice.update({ where: { id: f.invoice.id }, data: { description: "Alteração concorrente sintética" } });
    await expect(commitGymAdministrativeReview(command)).rejects.toMatchObject({ code: "REVIEW_STALE" });
    await expect(commitGymAdministrativeReview({ ...clean(await review(f, "INVOICE", f.invoice.id)), openingAmountInCents: "10001" })).rejects.toMatchObject({ code: "INVALID_AMOUNT" });
    await expect(previewGymAdministrativeReview(other.workspace.id, other.owner.id, "INVOICE", f.invoice.id)).rejects.toMatchObject({ statusCode: 404 });
    const staff = await prisma.user.create({ data: { name: "Gestor limitado sintético" } });
    const anotherUnit = await prisma.gymUnit.create({ data: { workspaceId: f.workspace.id, name: "Outra unidade" } });
    const member = await prisma.workspaceMember.create({ data: { workspaceId: f.workspace.id, userId: staff.id, role: "MANAGER", roleGrants: { create: { role: "MANAGER", unitId: anotherUnit.id } } } });
    await expect(previewGymAdministrativeReview(f.workspace.id, staff.id, "INVOICE", f.invoice.id)).rejects.toMatchObject({ statusCode: 403 });
    expect((await listGymAdministrativeReviewResources(f.workspace.id, staff.id, "INVOICE")).rows).toEqual([]);
    await prisma.workspaceRoleGrant.updateMany({ where: { memberId: member.id }, data: { unitId: f.unit.id } });
    const shown = await previewGymAdministrativeReview(f.workspace.id, staff.id, "INVOICE", f.invoice.id);
    const authorized = { ...command, actorUserId: staff.id, previewDigest: shown.digest, requestKey: randomUUID() };
    await commitGymAdministrativeReview(authorized);
    await prisma.workspaceRoleGrant.updateMany({ where: { memberId: member.id }, data: { revokedAt: new Date() } });
    await expect(commitGymAdministrativeReview(authorized)).rejects.toMatchObject({ statusCode: 403 });
  });
  it("conta deriva saldo dos fatos confirmados e ignora recebimento e despesa estornados", async () => {
    const f = await fixture();
    await prisma.gymFinancialAccount.update({ where: { id: f.account.id }, data: { initialBalanceInCents: BigInt(5000), balanceInCents: BigInt(5000) } });
    const payment = await manualFinanceService.recordPayment({ workspaceId: f.workspace.id, actorUserId: f.owner.id, amountInCents: 3000, allocations: [{ invoiceId: f.invoice.id, amountInCents: 3000 }], financialAccountId: f.account.id, paymentMethod: "BANK_TRANSFER_MANUAL", idempotencyKey: randomUUID() });
    const other = await prisma.gymFinancialAccount.create({ data: { workspaceId: f.workspace.id, unitId: f.unit.id, name: "Outra conta", accountType: "BANK_ACCOUNT" } });
    await prisma.gymAccountTransfer.create({ data: { workspaceId: f.workspace.id, fromAccountId: f.account.id, toAccountId: other.id, amountInCents: BigInt(500), performedByUserId: f.owner.id } });
    await prisma.gymAccountTransfer.create({ data: { workspaceId: f.workspace.id, fromAccountId: other.id, toAccountId: f.account.id, amountInCents: BigInt(100), performedByUserId: f.owner.id } });
    const category = await prisma.gymExpenseCategory.create({ data: { workspaceId: f.workspace.id, name: "Despesa sintética" } });
    const expense = await prisma.gymExpense.create({ data: { workspaceId: f.workspace.id, unitId: f.unit.id, categoryId: category.id, title: "Despesa histórica", amountInCents: BigInt(1000), dueDate: new Date(), competenceMonth: "2026-10", createdByUserId: f.owner.id } });
    for (const reversed of [false, true]) await prisma.gymExpensePayment.create({ data: { expenseId: expense.id, financialAccountId: f.account.id, amountInCents: BigInt(1000), paidAt: new Date(), recordedByUserId: f.owner.id, idempotencyKey: randomUUID(), requestFingerprint: randomUUID(), reversedAt: reversed ? new Date() : null, reversedByUserId: reversed ? f.owner.id : null, reversalReason: reversed ? "Estorno sintético completo" : null } });
    await prisma.gymFinancialAccount.update({ where: { id: f.account.id }, data: { balanceInCents: BigInt(0) } });
    await commitGymAdministrativeReview(clean(await review(f, "ACCOUNT", f.account.id)));
    expect((await prisma.gymFinancialAccount.findUniqueOrThrow({ where: { id: f.account.id } })).balanceInCents).toBe(BigInt(6600));
    await manualFinanceService.reversePayment({ workspaceId: f.workspace.id, actorUserId: f.owner.id, paymentId: payment.id, reversalReason: "Estorno sintético" });
    const shown = await previewGymAdministrativeReview(f.workspace.id, f.owner.id, "ACCOUNT", f.account.id);
    expect(shown.proposed).toMatchObject({ balanceInCents: "3600" });
    await commitGymAdministrativeReview(clean(await review(f, "ACCOUNT", f.account.id)));
    await expect(commitGymAdministrativeReview({ ...clean(await review(f, "ACCOUNT", f.account.id)), openingAmountInCents: "0" })).rejects.toMatchObject({ code: "INVALID_AMOUNT" });
    await prisma.gymExpense.update({ where: { id: expense.id }, data: { financialAccountId: f.account.id, paidAmountInCents: BigInt(700) } });
    const legacy = await prisma.gymExpense.create({ data: { workspaceId: f.workspace.id, unitId: f.unit.id, financialAccountId: f.account.id, categoryId: category.id, title: "Despesa antiga sem lançamento individual", amountInCents: BigInt(700), paidAmountInCents: BigInt(700), dueDate: new Date(), competenceMonth: "2026-10", createdByUserId: f.owner.id } });
    expect((await previewGymAdministrativeReview(f.workspace.id, f.owner.id, "ACCOUNT", f.account.id)).blockers).toContain("LEGACY_ACCOUNT_FACTS_REVIEW_REQUIRED");
    await expect(commitGymAdministrativeReview(clean(await review(f, "ACCOUNT", f.account.id)))).rejects.toMatchObject({ code: "REVIEW_REQUIRED" });
    await prisma.gymExpense.update({ where: { id: legacy.id }, data: { paidAmountInCents: BigInt(0) } });
  });
  it("revisão aceita impede cobrança concorrente do contrato anterior; cancelar proposta desbloqueia o ciclo", async () => {
    const f = await fixture(), now = new Date();
    await prisma.gymEnrollment.update({ where: { id: f.enrollment.id }, data: { nextDueDate: now } });
    const proposal = await requestGymEnrollmentRevision({ ...f.command, kind: "PLAN_CHANGE", newPlanVersionId: f.plan.versions[1].id, mode: "IMMEDIATE", requestKey: randomUUID(), initialChargeInCents: 5000, reason: "Troca aprovada sintética", financialAdjustmentApproved: true });
    await prisma.gymEnrollment.update({ where: { id: proposal.id }, data: { status: "PENDING_ACTIVATION", startDate: now, acceptance: { create: { workspaceId: f.workspace.id, signerUserId: f.student.id, termsVersion: "2", termsSnapshot: "Nova versão aceita" } } } });
    await expect(serializableTransaction(tx => generateLocalCycleInvoice(tx, f.command, true, now))).rejects.toMatchObject({ code: "CONTRACT_REVISION_PENDING" });
    expect(await prisma.gymInvoice.count({ where: { enrollmentId: f.enrollment.id } })).toBe(1);
    await cancelGymEnrollment({ ...f.command, enrollmentId: proposal.id, immediate: true, reason: "Retirada da proposta" });
    await serializableTransaction(tx => generateLocalCycleInvoice(tx, f.command, true, now));
    expect(await prisma.gymInvoice.count({ where: { enrollmentId: f.enrollment.id } })).toBe(2);
  });
  it("fila identifica duplicidades sem escolher contrato e só desaparece após encerramento explícito", async () => {
    const f = await fixture();
    const duplicate = await prisma.gymEnrollment.create({ data: { workspaceId: f.workspace.id, unitId: f.unit.id, studentMemberId: f.member.id, planVersionId: f.plan.versions[0].id, status: "PAUSED", priceInCents: BigInt(10000), accessGranted: false, startDate: f.enrollment.startDate } });
    const shown = await listGymAdministrativeReviewResources(f.workspace.id, f.owner.id, "CONTRACT");
    expect(shown.rows.map(r => r.id).sort()).toEqual([duplicate.id, f.enrollment.id].sort());
    expect((await previewGymAdministrativeReview(f.workspace.id, f.owner.id, "CONTRACT", f.enrollment.id)).snapshot).toMatchObject({ liveContractsCount: 2 });
    await cancelGymEnrollment({ ...f.command, enrollmentId: duplicate.id, immediate: true, reason: "Revisão documental da duplicidade" });
    expect((await listGymAdministrativeReviewResources(f.workspace.id, f.owner.id, "CONTRACT")).rows).toEqual([]);
    expect((await prisma.gymEnrollment.findUniqueOrThrow({ where: { id: f.enrollment.id } })).status).toBe("ACTIVE");
  });
  it("cancelamento imediato fecha propostas e pausas, preserva dívidas e não permite reativação indireta", async () => {
    const f = await fixture();
    const proposal = await requestGymEnrollmentRevision({ ...f.command, kind: "PLAN_CHANGE", newPlanVersionId: f.plan.versions[1].id, mode: "IMMEDIATE", requestKey: randomUUID(), initialChargeInCents: 5000, reason: "Troca sintética aprovada", financialAdjustmentApproved: true });
    await pauseGymEnrollment({ ...f.command, startDate: new Date(), endDate: new Date(Date.now() + day), reason: "Pausa sintética" });
    await Promise.all([cancelGymEnrollment({ ...f.command, immediate: true, reason: "Encerramento solicitado" }), cancelGymEnrollment({ ...f.command, immediate: true, reason: "Encerramento solicitado" })]);
    expect(await prisma.gymEnrollment.findUnique({ where: { id: proposal.id } })).toMatchObject({ status: "CANCELLED", accessGranted: false });
    expect(await prisma.gymEnrollmentPause.count({ where: { enrollmentId: f.enrollment.id, resumedAt: null } })).toBe(0);
    expect(await prisma.gymInvoice.findUnique({ where: { id: f.invoice.id } })).toMatchObject({ status: "OPEN", totalInCents: BigInt(10000) });
    expect(await prisma.gymEnrollmentEvent.count({ where: { enrollmentId: proposal.id, toStatus: "CANCELLED" } })).toBe(1);
    await expect(resumeGymEnrollment(f.command)).rejects.toMatchObject({ statusCode: 409 });
  });
  it("cancelamento futuro pode ser retirado; job encerra uma vez na data e não apaga obrigações", async () => {
    const f = await fixture();
    await cancelGymEnrollment({ ...f.command, immediate: false, reason: "Programação sintética" });
    expect(await prisma.gymEnrollment.findUnique({ where: { id: f.enrollment.id } })).toMatchObject({ status: "ACTIVE", accessGranted: true, cancellationEffectiveDate: f.enrollment.endDate });
    await withdrawGymCancellation({ ...f.command, reason: "Retirada solicitada pelo aluno" });
    expect(await prisma.gymEnrollment.findUnique({ where: { id: f.enrollment.id } })).toMatchObject({ status: "ACTIVE", autoRenew: false, cancellationEffectiveDate: null });
    await cancelGymEnrollment({ ...f.command, immediate: false, reason: "Nova programação sintética" });
    const after = new Date(f.enrollment.endDate!.getTime() + day);
    await Promise.all([processLocalEnrollmentClosures(f.workspace.id, after), processLocalEnrollmentClosures(f.workspace.id, after)]);
    expect(await prisma.gymEnrollment.findUnique({ where: { id: f.enrollment.id } })).toMatchObject({ status: "CANCELLED", accessGranted: false, subscriptionStatus: "CANCELLED" });
    expect(await prisma.gymEnrollmentEvent.count({ where: { enrollmentId: f.enrollment.id, reason: "SCHEDULED_CANCELLATION_EFFECTED" } })).toBe(1);
    await expect(withdrawGymCancellation({ ...f.command, reason: "Não ressuscita matrícula encerrada" })).rejects.toMatchObject({ code: "INVALID_TRANSITION" });
  });
  it("pausa longa pula vencimentos suspensos, não altera fatura antiga e retry não duplica calendário", async () => {
    const f = await fixture(), start = new Date("2026-10-10T12:00:00Z"), end = new Date("2026-12-05T12:00:00Z");
    await prisma.gymEnrollment.update({ where: { id: f.enrollment.id }, data: { startDate: new Date("2026-10-01T12:00:00Z"), endDate: new Date("2027-10-01T12:00:00Z"), nextDueDate: new Date("2026-10-15T12:00:00Z") } });
    await pauseGymEnrollment({ ...f.command, startDate: start, endDate: end, reason: "Pausa longa sintética", billingResumePolicy: "SKIP" }, start);
    await Promise.all([resumeGymEnrollment(f.command, end), resumeGymEnrollment(f.command, end)]);
    const current = await prisma.gymEnrollment.findUniqueOrThrow({ where: { id: f.enrollment.id } });
    expect(current.nextDueDate).toEqual(new Date("2027-01-01T12:00:00Z"));
    expect(await prisma.gymInvoice.count({ where: { enrollmentId: f.enrollment.id } })).toBe(1);
    expect(await prisma.gymInvoice.findUnique({ where: { id: f.invoice.id } })).toMatchObject({ status: "OPEN", balanceRemainingInCents: BigInt(10000) });
  });
  it("cancelar pausa futura preserva calendário e não concede tempo ou acesso adicional", async () => {
    const f = await fixture(), due = new Date(Date.now() + 10 * day);
    await prisma.gymEnrollment.update({ where: { id: f.enrollment.id }, data: { nextDueDate: due } });
    await pauseGymEnrollment({ ...f.command, startDate: new Date(Date.now() + day), endDate: new Date(Date.now() + 20 * day), reason: "Agenda sintética futura" });
    await Promise.all([resumeGymEnrollment(f.command), resumeGymEnrollment(f.command)]);
    expect(await prisma.gymEnrollment.findUnique({ where: { id: f.enrollment.id } })).toMatchObject({ nextDueDate: due, endDate: f.enrollment.endDate, status: "ACTIVE" });
  });
  it("dívida anterior à pausa continua exigível, mas os ciclos suspensos alcançados depois são pulados", async () => {
    const f = await fixture(), start = new Date("2026-10-10T12:00:00Z"), end = new Date("2026-12-05T12:00:00Z");
    await prisma.gymEnrollment.update({ where: { id: f.enrollment.id }, data: { startDate: new Date("2026-10-01T12:00:00Z"), endDate: new Date("2027-10-01T12:00:00Z"), nextDueDate: new Date("2026-10-01T12:00:00Z") } });
    await pauseGymEnrollment({ ...f.command, startDate: start, endDate: end, reason: "Preserva dívida anterior", billingResumePolicy: "SKIP" }, start);
    await resumeGymEnrollment(f.command, end);
    const old = await serializableTransaction(tx => generateLocalCycleInvoice(tx, f.command, true, end)); expect(old.competenceMonth).toBe("2026-10");
    const next = await serializableTransaction(tx => generateLocalCycleInvoice(tx, f.command, true, end)); expect(next.competenceMonth).toBe("2027-01");
    expect(await prisma.gymInvoice.count({ where: { enrollmentId: f.enrollment.id, competenceMonth: { in: ["2026-11", "2026-12"] } } })).toBe(0);
  });
  it("job atrasado avança calendário suspenso sem emitir antecipadamente o próximo ciclo futuro", async () => {
    const f = await fixture(), end = new Date("2026-12-05T12:00:00Z");
    await prisma.gymEnrollment.update({ where: { id: f.enrollment.id }, data: { startDate: new Date("2026-10-01T12:00:00Z"), endDate: new Date("2027-10-01T12:00:00Z"), nextDueDate: new Date("2026-11-01T12:00:00Z") } });
    await prisma.gymEnrollmentPause.create({ data: { enrollmentId: f.enrollment.id, startDate: new Date("2026-10-10T12:00:00Z"), endDate: end, startedAt: new Date("2026-10-10T12:00:00Z"), resumedAt: end, billingResumePolicy: "SKIP" } });
    const result = await manualSubscriptionService.processDue(end, f.workspace.id);
    expect(result).toMatchObject({ processed: 0, deferredAfterPause: 1, failures: [] });
    expect(await prisma.gymEnrollment.findUnique({ where: { id: f.enrollment.id } })).toMatchObject({ nextDueDate: new Date("2027-01-01T12:00:00Z") });
    expect(await prisma.gymInvoice.count({ where: { enrollmentId: f.enrollment.id } })).toBe(1);
  });
  it("obrigações do contrato mantêm unidade original após transferência do aluno", async () => {
    const f = await fixture(); const otherUnit = await prisma.gymUnit.create({ data: { workspaceId: f.workspace.id, name: "Nova unidade" } });
    await prisma.workspaceMember.update({ where: { id: f.member.id }, data: { unitId: otherUnit.id } });
    const payment = await manualFinanceService.recordPayment({ workspaceId: f.workspace.id, actorUserId: f.owner.id, amountInCents: 1000, allocations: [{ invoiceId: f.invoice.id, amountInCents: 1000 }], financialAccountId: f.account.id, paymentMethod: "BANK_TRANSFER_MANUAL", idempotencyKey: randomUUID() });
    expect(payment).toBeTruthy();
    expect((await previewGymAdministrativeReview(f.workspace.id, f.owner.id, "INVOICE", f.invoice.id)).unitId).toBe(f.unit.id);
  });
});
