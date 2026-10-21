import { assertGymOperationalWorkspace, gymOperationalWorkspaceWhere } from "./gym-license";
import prisma from "@/lib/prisma";
import { serializableTransaction } from "./transaction";
import { processScheduledGymPauses } from "./enrollment-pause";
import { lockGymEnrollment } from "./enrollment-lock";
import { closeGymCancellationDependents } from "./enrollment-cancellation-effects";

/** Only local, active GYM contracts; external subscriptions remain in legacy reconciliation. */
export async function processLocalEnrollmentClosures(workspaceId?: string, now = new Date()) {
  // Resume before testing expiration: an effective pause may extend the existing term.
  const pauses = await processScheduledGymPauses(workspaceId, now);
  const scope = { ...(workspaceId ? { workspaceId } : {}), workspace: gymOperationalWorkspaceWhere(now), status: { notIn: ["CANCELLED" as const, "EXPIRED" as const] } };
  const due = { OR: [{ cancellationEffectiveDate: { lte: now } }, { status: { in: ["ACTIVE" as const, "PAUSED" as const] }, endDate: { lte: now }, autoRenew: false }] };
  const legacyPendingCount = await prisma.gymEnrollment.count({ where: { ...scope, AND: [due, { OR: [{ providerSubscriptionId: { not: null } }, { recurrenceMode: "PROVIDER" }] }] } });
  const candidates = await prisma.gymEnrollment.findMany({ where: { ...scope, ...due, providerSubscriptionId: null, recurrenceMode: "LOCAL" }, select: { id: true, workspaceId: true }, orderBy: [{ updatedAt: "asc" }, { id: "asc" }], take: 500 });
  let cancelledCount = 0, expiredCount = 0;
  for (const candidate of candidates) {
    const result = await serializableTransaction(async tx => {
      await assertGymOperationalWorkspace(candidate.workspaceId, tx, now);
      await lockGymEnrollment(tx, candidate.workspaceId, candidate.id);
      const enrollment = await tx.gymEnrollment.findFirst({ where: { id: candidate.id, ...scope, providerSubscriptionId: null, recurrenceMode: "LOCAL" }, select: { id: true, workspaceId: true, status: true, cancellationEffectiveDate: true, endDate: true, autoRenew: true } });
      if (!enrollment) return null;
      const cancel = enrollment.cancellationEffectiveDate !== null && enrollment.cancellationEffectiveDate <= now;
      const expire = !enrollment.autoRenew && enrollment.endDate !== null && enrollment.endDate <= now && ["ACTIVE", "PAUSED"].includes(enrollment.status);
      if (!cancel && !expire) return null;
      const status = cancel ? "CANCELLED" : "EXPIRED";
      const effectiveDate = cancel ? enrollment.cancellationEffectiveDate : enrollment.endDate;
      if (!effectiveDate) return null;
      await tx.gymEnrollment.update({ where: { id: enrollment.id }, data: { status, accessGranted: false, subscriptionStatus: "CANCELLED", autoRenew: false, ...(cancel ? { cancelledAt: now } : {}) } });
      if (cancel) await closeGymCancellationDependents(tx, enrollment.workspaceId, enrollment.id, null, effectiveDate);
      await tx.gymEnrollmentEvent.create({ data: { workspaceId: enrollment.workspaceId, enrollmentId: enrollment.id, fromStatus: enrollment.status, toStatus: status, effectiveDate, actorId: "SYSTEM_CRON", reason: cancel ? "SCHEDULED_CANCELLATION_EFFECTED" : "ENROLLMENT_EXPIRED" } });
      await tx.auditLog.create({ data: { userId: null, action: `GYM_${status}:enrollment=${enrollment.id}:job=local-lifecycle`, entity: "GYM_ENROLLMENT", entityId: enrollment.id } });
      return status;
    });
    if (result === "CANCELLED") cancelledCount++;
    if (result === "EXPIRED") expiredCount++;
  }
  return { cancelledCount, expiredCount, totalProcessed: cancelledCount + expiredCount, hasMore: candidates.length === 500 || pauses.hasMore, legacyPendingCount, pauses };
}
