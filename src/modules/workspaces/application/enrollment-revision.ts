import { createHash } from "node:crypto";
import { z } from "zod";
import { WorkspaceAccessError } from "../domain/types";
import { safeCentsNumber } from "../domain/money";
import { hasStudentMembership } from "../domain/student-membership";
import { assertGymFinanceAuthority } from "./manual-finance-authority";
import { lockGymEnrollment } from "./enrollment-lock";
import { serializableTransaction, type GymTransactionClient } from "./transaction";

const id = z.string().trim().min(1).max(100);
export const planChangePreviewSchema = z.object({ workspaceId: id, newPlanVersionId: id, mode: z.enum(["IMMEDIATE", "NEXT_CYCLE"]) }).strict();
export const planChangeSchema = planChangePreviewSchema.extend({
  requestKey: z.string().uuid(), reason: z.string().trim().min(5).max(2000),
  initialChargeInCents: z.number().int().safe().nonnegative(), financialAdjustmentApproved: z.literal(true),
}).strict();
export const renewalSchema = z.object({ workspaceId: id, requestKey: z.string().uuid() }).strict();

async function source(tx: GymTransactionClient, workspaceId: string, enrollmentId: string, actorUserId: string, kind: "PLAN_CHANGE" | "RENEWAL") {
  const enrollment = await tx.gymEnrollment.findFirst({ where: { id: enrollmentId, workspaceId }, omit: { creditCardToken: true }, include: { acceptance: true, planVersion: { include: { plan: true } }, workspace: { select: { type: true, isActive: true, subscription: { select: { status: true, endDate: true, trialEndsAt: true } } } }, studentMember: { include: { roleGrants: true, studentProfile: { select: { memberId: true } } } } } });
  if (!enrollment) throw new WorkspaceAccessError(404, "ENROLLMENT_NOT_FOUND", "Matrícula não encontrada nesta academia.");
  await assertGymFinanceAuthority(tx, workspaceId, actorUserId, "enrollments.manage", enrollment.unitId);
  if (enrollment.workspace.type !== "GYM" || !enrollment.workspace.isActive || enrollment.studentMember.workspaceId !== workspaceId || enrollment.unitId !== enrollment.studentMember.unitId || enrollment.planVersion.plan.workspaceId !== workspaceId || !hasStudentMembership(enrollment.studentMember) || !enrollment.studentMember.isActive) throw new WorkspaceAccessError(403, "TENANT_MISMATCH", "Academia, aluno e unidade devem estar ativos e compatíveis.");
  const license = enrollment.workspace.subscription; const now = new Date();
  if (!license || (license.endDate && license.endDate <= now) || !(license.status === "ACTIVE" || (license.status === "TRIAL" && license.trialEndsAt && license.trialEndsAt > now))) throw new WorkspaceAccessError(403, "INVALID_STATUS", "Licença da academia inativa ou expirada.");
  if (enrollment.providerSubscriptionId || enrollment.recurrenceMode === "PROVIDER" || enrollment.creditBalanceInCents !== BigInt(0) || enrollment.scheduledPlanVersionId) throw new WorkspaceAccessError(409, "LEGACY_SUBSCRIPTION_REVIEW_REQUIRED", "Reconcilie a assinatura, o crédito ou o agendamento legado antes de revisar o contrato.");
  if (!enrollment.acceptance || !enrollment.activatedAt || (kind === "PLAN_CHANGE" ? enrollment.status !== "ACTIVE" : !["ACTIVE", "EXPIRED"].includes(enrollment.status)) || enrollment.cancellationEffectiveDate) throw new WorkspaceAccessError(409, "INVALID_TRANSITION", "A revisão exige contrato previamente ativado, sem pausa ou cancelamento programado.");
  if (kind === "PLAN_CHANGE" && (!enrollment.accessGranted || (enrollment.endDate && enrollment.endDate <= new Date()))) throw new WorkspaceAccessError(409, "INVALID_STATUS", "A troca exige uma matrícula vigente.");
  if (await tx.gymEnrollmentPause.findFirst({ where: { enrollmentId, resumedAt: null }, select: { id: true } })) throw new WorkspaceAccessError(409, "INVALID_STATUS", "Conclua ou retire a pausa programada antes da revisão.");
  return enrollment;
}

async function target(tx: GymTransactionClient, workspaceId: string, versionId: string) {
  const version = await tx.gymPlanVersion.findFirst({ where: { id: versionId, isActive: true, plan: { workspaceId, isActive: true } } });
  if (!version) throw new WorkspaceAccessError(404, "PLAN_INACTIVE", "Plano ou versão indisponível nesta academia.");
  safeCentsNumber(version.priceInCents);
  if (version.priceInCents < BigInt(0) || !version.termsText.trim() || !Number.isSafeInteger(version.durationDays) || version.durationDays < 1 || version.durationDays > 36500) throw new WorkspaceAccessError(409, "INVALID_STATUS", "Revise as condições e a vigência do plano.");
  return version;
}

export async function previewGymPlanChange(input: z.infer<typeof planChangePreviewSchema> & { enrollmentId: string; actorUserId: string }) {
  const { enrollmentId, actorUserId, ...request } = input;
  const parsed = planChangePreviewSchema.safeParse(request);
  if (!parsed.success) throw new WorkspaceAccessError(400, "INVALID_REQUEST", "Revise o plano e a modalidade de troca.");
  return serializableTransaction(async tx => {
    const current = await source(tx, request.workspaceId, enrollmentId, actorUserId, "PLAN_CHANGE");
    const next = await target(tx, request.workspaceId, request.newPlanVersionId);
    if (next.id === current.planVersionId) throw new WorkspaceAccessError(409, "INVALID_STATUS", "Selecione uma versão de plano diferente.");
    const paid = await tx.gymInvoice.aggregate({ where: { workspaceId: request.workspaceId, enrollmentId }, _sum: { paidAmountInCents: true } });
    const effectiveDate = request.mode === "IMMEDIATE" ? new Date() : current.nextDueDate || current.endDate;
    if (!effectiveDate || (request.mode === "NEXT_CYCLE" && effectiveDate <= new Date())) throw new WorkspaceAccessError(409, "INVALID_STATUS", "Regularize o próximo vencimento antes de programar a troca.");
    return { effectiveDate, newPlan: { id: next.id, name: next.name, priceInCents: safeCentsNumber(next.priceInCents) }, receivedInCents: (paid._sum.paidAmountInCents || BigInt(0)).toString(), automaticCreditInCents: 0, requiresNewAcceptance: true, requiresManagementApproval: true };
  });
}

type RevisionInput = { workspaceId: string; enrollmentId: string; actorUserId: string; requestKey: string; kind: "PLAN_CHANGE" | "RENEWAL"; newPlanVersionId?: string; mode?: "IMMEDIATE" | "NEXT_CYCLE"; reason?: string; initialChargeInCents?: number; financialAdjustmentApproved?: true };
export async function assertGymRevisionPredecessor(tx: GymTransactionClient, enrollment: { workspaceId: string; studentMemberId: string; unitId: string | null; supersedesEnrollmentId: string | null; changeKind: string | null }) {
  if (!enrollment.supersedesEnrollmentId) return null;
  const previous = await tx.gymEnrollment.findFirst({ where: { id: enrollment.supersedesEnrollmentId, workspaceId: enrollment.workspaceId } });
  if (!previous || previous.studentMemberId !== enrollment.studentMemberId || previous.unitId !== enrollment.unitId || !["ACTIVE", "EXPIRED"].includes(previous.status) || previous.providerSubscriptionId || previous.recurrenceMode !== "LOCAL" || previous.creditBalanceInCents !== BigInt(0) || previous.scheduledPlanVersionId || previous.cancellationEffectiveDate || (enrollment.changeKind !== "PLAN_CHANGE" && enrollment.changeKind !== "RENEWAL") || await tx.gymEnrollmentPause.findFirst({ where: { enrollmentId: previous.id, resumedAt: null }, select: { id: true } })) throw new WorkspaceAccessError(409, "INVALID_TRANSITION", "O contrato anterior mudou. Reconcilie a revisão antes de confirmar ou ativar.");
  return previous;
}
export async function requestGymEnrollmentRevision(input: RevisionInput) {
  const { workspaceId, enrollmentId, actorUserId, kind, requestKey } = input;
  const parsed = kind === "PLAN_CHANGE" ? planChangeSchema.safeParse({ workspaceId, requestKey, newPlanVersionId: input.newPlanVersionId, mode: input.mode, reason: input.reason, initialChargeInCents: input.initialChargeInCents, financialAdjustmentApproved: input.financialAdjustmentApproved }) : renewalSchema.safeParse({ workspaceId, requestKey });
  if (!parsed.success) throw new WorkspaceAccessError(400, "INVALID_REQUEST", "Confirme o ajuste financeiro, a justificativa e a nova contratação.");
  const key = createHash("sha256").update(`${workspaceId}:${requestKey}`).digest("hex");
  const fingerprint = createHash("sha256").update(JSON.stringify({ enrollmentId, actorUserId, kind, request: parsed.data })).digest("hex");
  return serializableTransaction(async tx => {
    await lockGymEnrollment(tx, workspaceId, enrollmentId);
    // Revalidar autoridade mesmo no retry de uma revisão já efetivada.
    const existing = await tx.gymEnrollment.findUnique({ where: { changeRequestKey: key }, omit: { creditCardToken: true }, include: { planVersion: { include: { plan: true } } } });
    if (existing) {
      await assertGymFinanceAuthority(tx, workspaceId, actorUserId, "enrollments.manage", existing.unitId);
      if (kind === "PLAN_CHANGE") await assertGymFinanceAuthority(tx, workspaceId, actorUserId, "workspace.manage", existing.unitId);
      if (existing.workspaceId !== workspaceId || existing.changeRequestFingerprint !== fingerprint) throw new WorkspaceAccessError(409, "IDEMPOTENCY_CONFLICT", "Esta tentativa já corresponde a outra contratação.");
      return existing;
    }
    const previous = await source(tx, workspaceId, enrollmentId, actorUserId, kind);
    await assertGymFinanceAuthority(tx, workspaceId, actorUserId, "invoices.issue", previous.unitId);
    if (kind === "PLAN_CHANGE") await assertGymFinanceAuthority(tx, workspaceId, actorUserId, "workspace.manage", previous.unitId);
    if (await tx.gymEnrollment.findFirst({ where: { supersedesEnrollmentId: enrollmentId, status: { notIn: ["CANCELLED", "EXPIRED"] } }, select: { id: true } })) throw new WorkspaceAccessError(409, "INVALID_STATUS", "Já existe uma revisão pendente ou efetivada para este contrato.");
    const version = await target(tx, workspaceId, input.newPlanVersionId || previous.planVersionId);
    if (kind === "PLAN_CHANGE" && version.id === previous.planVersionId) throw new WorkspaceAccessError(409, "INVALID_STATUS", "Selecione uma versão de plano diferente.");
    const now = new Date();
    const startDate = kind === "RENEWAL" ? (previous.endDate && previous.endDate > now ? previous.endDate : now) : input.mode === "NEXT_CYCLE" ? previous.nextDueDate || previous.endDate : now;
    if (!startDate || (input.mode === "NEXT_CYCLE" && startDate <= now)) throw new WorkspaceAccessError(409, "INVALID_STATUS", "Não há próximo vencimento futuro válido para a revisão.");
    const endDate = new Date(startDate.getTime() + version.durationDays * 86400000);
    const initialCharge = kind === "PLAN_CHANGE" && input.initialChargeInCents !== undefined ? BigInt(input.initialChargeInCents) : version.priceInCents;
    const next = await tx.gymEnrollment.create({ data: {
      workspaceId, studentMemberId: previous.studentMemberId, unitId: previous.unitId, planVersionId: version.id,
      supersedesEnrollmentId: previous.id, changeKind: kind, changeRequestKey: key, changeRequestFingerprint: fingerprint,
      initialChargeInCents: initialCharge, changeApprovedByUserId: kind === "PLAN_CHANGE" ? actorUserId : null, changeReason: input.reason || "Renovação nas condições da versão contratada.",
      status: "PENDING_ACCEPTANCE", startDate, endDate, priceInCents: version.priceInCents, enrollmentFeeInCents: BigInt(0), autoRenew: previous.autoRenew,
      billingPayerUserId: previous.billingPayerUserId, billingPayerGuardianId: previous.billingPayerGuardianId, billingPayerName: previous.billingPayerName, billingPayerCpf: previous.billingPayerCpf, billingPayerEmail: previous.billingPayerEmail, billingPayerPhone: previous.billingPayerPhone,
      recurrenceMode: "LOCAL", subscriptionStatus: "INACTIVE", accessGranted: false,
    }, omit: { creditCardToken: true }, include: { planVersion: { include: { plan: true } } } });
    await tx.gymEnrollmentEvent.create({ data: { enrollmentId: next.id, workspaceId, toStatus: "PENDING_ACCEPTANCE", actorId: actorUserId, reason: `${kind}:contratoAnterior=${previous.id}:primeiraObrigacaoCentavos=${initialCharge}:motivo=${next.changeReason}`, effectiveDate: startDate } });
    await tx.auditLog.create({ data: { userId: actorUserId, action: `GYM_${kind}_REQUESTED:${next.id}:previous=${previous.id}:initialChargeCents=${initialCharge}`, entity: "GYM_ENROLLMENT", entityId: next.id } });
    return next;
  });
}
