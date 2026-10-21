import { z } from "zod";
import { WorkspaceAccessError } from "../domain/types";
import { gymPublicUserSelect } from "../domain/public-user";
import { assertActorAuthority } from "./actor-authority";
import { serializableTransaction } from "./transaction";
import type { CancelEnrollmentInput } from "./enrollment-service";
import { lockGymEnrollment } from "./enrollment-lock";
import { closeGymCancellationDependents } from "./enrollment-cancellation-effects";

const id = z.string().trim().min(1).max(100);
export const cancelGymEnrollmentSchema = z.object({ workspaceId: id, reason: z.string().trim().min(1).max(2000), immediate: z.boolean().default(true) }).strict();
export async function cancelGymEnrollment(input: CancelEnrollmentInput) {
  const { actorUserId, enrollmentId, ...request } = input;
  const parsed = cancelGymEnrollmentSchema.safeParse(request);
  if (!parsed.success) throw new WorkspaceAccessError(400, "INVALID_REQUEST", "Informe motivo e momento do cancelamento.");
  return serializableTransaction(async tx => {
    await lockGymEnrollment(tx, parsed.data.workspaceId, enrollmentId);
    const enrollment = await tx.gymEnrollment.findFirst({ where: { id: enrollmentId, workspaceId: parsed.data.workspaceId }, omit: { creditCardToken: true }, include: { planVersion: { include: { plan: true } }, studentMember: { include: { user: { select: gymPublicUserSelect } } } } });
    if (!enrollment) throw new WorkspaceAccessError(404, "ENROLLMENT_NOT_FOUND", "Matrícula não encontrada nesta academia.");
    await assertActorAuthority(tx, parsed.data.workspaceId, actorUserId, "enrollments.manage", enrollment.unitId);
    if (enrollment.providerSubscriptionId || enrollment.recurrenceMode === "PROVIDER") throw new WorkspaceAccessError(409, "LEGACY_SUBSCRIPTION_REVIEW_REQUIRED", "Reconcilie a assinatura externa antes de cancelar. Nenhuma operação externa foi executada.");
    if (enrollment.status === "CANCELLED") return enrollment;
    if (enrollment.status === "EXPIRED") throw new WorkspaceAccessError(409, "INVALID_TRANSITION", "Matrícula já encerrada por expiração.");
    const now = new Date();
    const { immediate, reason } = parsed.data;
    if (!immediate && (!enrollment.endDate || enrollment.endDate <= now || !["ACTIVE", "PAUSED"].includes(enrollment.status))) throw new WorkspaceAccessError(409, "INVALID_STATUS", "O cancelamento programado exige matrícula ativa ou pausada com vigência futura. Utilize cancelamento imediato para os demais estados.");
    if (!immediate && enrollment.cancellationEffectiveDate?.getTime() === enrollment.endDate?.getTime() && enrollment.cancellationReason === reason) return enrollment;
    const effectiveDate = immediate ? now : enrollment.endDate;
    if (!effectiveDate) throw new WorkspaceAccessError(409, "INVALID_STATUS", "Defina a vigência antes de programar o cancelamento.");
    const updated = await tx.gymEnrollment.update({ where: { id: enrollment.id }, data: { autoRenew: false, cancellationReason: reason, cancellationEffectiveDate: effectiveDate, ...(immediate ? { status: "CANCELLED", cancelledAt: now, accessGranted: false, subscriptionStatus: "CANCELLED" } : {}) }, omit: { creditCardToken: true }, include: { planVersion: { include: { plan: true } }, studentMember: { include: { user: { select: gymPublicUserSelect } } } } });
    if (immediate) await closeGymCancellationDependents(tx, parsed.data.workspaceId, enrollment.id, actorUserId, effectiveDate);
    await tx.gymEnrollmentEvent.create({ data: { enrollmentId: enrollment.id, workspaceId: parsed.data.workspaceId, fromStatus: enrollment.status, toStatus: immediate ? "CANCELLED" : enrollment.status, reason: `${immediate ? "CANCELLED" : "CANCELLATION_SCHEDULED"}:${reason}`, actorId: actorUserId, effectiveDate } });
    await tx.auditLog.create({ data: { userId: actorUserId, action: `GYM_ENROLLMENT_${immediate ? "CANCELLED" : "CANCELLATION_SCHEDULED"}:${enrollment.id}:${effectiveDate?.toISOString()}:${reason}`, entity: "GYM_ENROLLMENT", entityId: enrollment.id, severity: "warning" } });
    return updated;
  });
}

export const withdrawGymCancellationSchema = z.object({ workspaceId: id, reason: z.string().trim().min(5).max(2000) }).strict();
export async function withdrawGymCancellation(input: { workspaceId: string; enrollmentId: string; actorUserId: string; reason: string }) {
  const { actorUserId, enrollmentId, ...request } = input;
  const parsed = withdrawGymCancellationSchema.safeParse(request);
  if (!parsed.success) throw new WorkspaceAccessError(400, "INVALID_REQUEST", "Justifique a retirada do cancelamento.");
  return serializableTransaction(async tx => {
    await lockGymEnrollment(tx, request.workspaceId, enrollmentId);
    const e = await tx.gymEnrollment.findFirst({ where: { id: enrollmentId, workspaceId: request.workspaceId }, omit: { creditCardToken: true } });
    if (!e) throw new WorkspaceAccessError(404, "ENROLLMENT_NOT_FOUND", "Matrícula não encontrada nesta academia.");
    await assertActorAuthority(tx, request.workspaceId, actorUserId, "enrollments.manage", e.unitId);
    if (e.providerSubscriptionId || e.recurrenceMode === "PROVIDER") throw new WorkspaceAccessError(409, "LEGACY_SUBSCRIPTION_REVIEW_REQUIRED", "Revise a assinatura externa antes de alterar o encerramento.");
    if (!e.cancellationEffectiveDate || e.cancellationEffectiveDate <= new Date() || !["ACTIVE", "PAUSED"].includes(e.status)) throw new WorkspaceAccessError(409, "INVALID_TRANSITION", "Somente um cancelamento futuro pode ser retirado.");
    // Do not restart a separately stopped recurrence or silently restore automatic renewal.
    await tx.gymEnrollment.update({ where: { id: e.id }, data: { cancellationEffectiveDate: null, cancellationReason: null } });
    await tx.gymEnrollmentEvent.create({ data: { workspaceId: request.workspaceId, enrollmentId, fromStatus: e.status, toStatus: e.status, actorId: actorUserId, reason: `CANCELLATION_WITHDRAWN:${parsed.data.reason}` } });
    await tx.auditLog.create({ data: { userId: actorUserId, action: `GYM_CANCELLATION_WITHDRAWN:${enrollmentId}`, entity: "GYM_ENROLLMENT", entityId: enrollmentId } });
    return { enrollmentId, cancellationEffectiveDate: null, autoRenew: false, accessGranted: e.accessGranted };
  });
}
