import type { GymTransactionClient } from "./transaction";

/** Cancel dependent proposals and schedules; preserve every acceptance, invoice and receipt. */
export async function closeGymCancellationDependents(tx: GymTransactionClient, workspaceId: string, enrollmentId: string, actorUserId: string | null, effectiveDate: Date) {
  await tx.gymEnrollmentPause.updateMany({ where: { enrollmentId, resumedAt: null }, data: { resumedAt: effectiveDate } });
  const proposals = await tx.gymEnrollment.findMany({ where: { workspaceId, supersedesEnrollmentId: enrollmentId, status: { in: ["PENDING_ACCEPTANCE", "PENDING_ACTIVATION", "DRAFT"] } }, select: { id: true, status: true }, orderBy: { id: "asc" } });
  for (const proposal of proposals) {
    await tx.gymEnrollment.update({ where: { id: proposal.id }, data: { status: "CANCELLED", accessGranted: false, autoRenew: false, subscriptionStatus: "CANCELLED", cancelledAt: effectiveDate, cancellationReason: `Contrato anterior ${enrollmentId} cancelado; obrigações preservadas.` } });
    await tx.gymEnrollmentEvent.create({ data: { workspaceId, enrollmentId: proposal.id, fromStatus: proposal.status, toStatus: "CANCELLED", actorId: actorUserId || "SYSTEM_CRON", effectiveDate, reason: `PREDECESSOR_CANCELLED:${enrollmentId}:receivablesPreserved` } });
    await tx.auditLog.create({ data: { userId: actorUserId, action: `GYM_PROPOSAL_CANCELLED_WITH_PREDECESSOR:${enrollmentId}`, entity: "GYM_ENROLLMENT", entityId: proposal.id } });
  }
}
