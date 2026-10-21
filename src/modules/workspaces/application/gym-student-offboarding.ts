import { z } from "zod";
import { serializableTransaction } from "./transaction";
import { assertActorAuthority } from "./actor-authority";
import { WorkspaceAccessError } from "../domain/types";

const inputSchema = z.object({ workspaceId: z.string().min(1), studentMemberId: z.string().min(1), actorUserId: z.string().min(1), reason: z.string().trim().min(1).max(2000), immediate: z.boolean().default(true).refine(value => value, "Use a matrícula para cancelamento futuro.") }).strict();
export type CancelGymStudentInput = z.input<typeof inputSchema>;

/** Local offboarding preserves obligations, receipts and global identity. */
export async function cancelGymStudent(raw: CancelGymStudentInput) {
  const parsed = inputSchema.safeParse(raw);
  if (!parsed.success) throw new WorkspaceAccessError(400, "INVALID_REQUEST", "Informe um motivo. Para cancelamento futuro, utilize a matrícula específica.");
  const input = parsed.data;
  return serializableTransaction(async tx => {
    const student = await tx.workspaceMember.findFirst({ where: { id: input.studentMemberId, workspaceId: input.workspaceId }, select: { id: true, userId: true, unitId: true, studentProfile: { select: { status: true } } } });
    if (!student?.studentProfile) throw new WorkspaceAccessError(404, "STUDENT_NOT_FOUND", "Aluno não encontrado nesta academia.");
    await assertActorAuthority(tx, input.workspaceId, input.actorUserId, "students.manage", student.unitId);
    await assertActorAuthority(tx, input.workspaceId, input.actorUserId, "enrollments.manage", student.unitId);
    const enrollments = await tx.gymEnrollment.findMany({ where: { workspaceId: input.workspaceId, studentMemberId: student.id, status: { notIn: ["CANCELLED", "EXPIRED"] } }, select: { id: true, status: true, unitId: true, providerSubscriptionId: true } });
    for (const enrollment of enrollments) {
      await assertActorAuthority(tx, input.workspaceId, input.actorUserId, "enrollments.manage", enrollment.unitId);
      if (enrollment.providerSubscriptionId) throw new WorkspaceAccessError(409, "INVALID_STATUS", "Existe assinatura externa legada. Reconcilie sua situação antes de encerrar o vínculo; nenhuma operação externa foi executada.");
    }
    if (student.studentProfile.status === "CANCELLED" && !enrollments.length) return { success: true, studentMemberId: student.id, cancelledEnrollmentsCount: 0, alreadyCancelled: true };
    const now = new Date();
    for (const enrollment of enrollments) {
      await tx.gymEnrollment.update({ where: { id: enrollment.id }, data: { status: "CANCELLED", cancelledAt: now, cancellationEffectiveDate: now, cancellationReason: input.reason, autoRenew: false, accessGranted: false, subscriptionStatus: "INACTIVE" } });
      await tx.gymEnrollmentEvent.create({ data: { workspaceId: input.workspaceId, enrollmentId: enrollment.id, fromStatus: enrollment.status, toStatus: "CANCELLED", effectiveDate: now, reason: input.reason, actorId: input.actorUserId } });
    }
    await tx.gymStudentProfile.update({ where: { memberId: student.id }, data: { status: "CANCELLED" } });
    await tx.workspaceRoleGrant.updateMany({ where: { memberId: student.id, role: "STUDENT", revokedAt: null }, data: { revokedAt: now, revokedBy: input.actorUserId } });
    const staffGrant = await tx.workspaceRoleGrant.findFirst({ where: { memberId: student.id, role: { not: "STUDENT" }, revokedAt: null }, select: { role: true } });
    const member = await tx.workspaceMember.findUniqueOrThrow({ where: { id: student.id }, select: { role: true, roleGrants: { select: { id: true } } } });
    const legacyStaff = member.role !== "STUDENT" && member.roleGrants.length === 0;
    const workspace = await tx.workspace.findUniqueOrThrow({ where: { id: input.workspaceId }, select: { ownerId: true } });
    const isOwner = workspace.ownerId === student.userId;
    await tx.workspaceMember.update({ where: { id: student.id }, data: { isActive: isOwner || Boolean(staffGrant) || legacyStaff, ...(isOwner ? { role: "OWNER" } : staffGrant ? { role: staffGrant.role } : {}) } });
    await tx.auditLog.create({ data: { userId: input.actorUserId, entity: "WORKSPACE_MEMBER", entityId: student.id, action: `GYM_STUDENT_CANCELLED:${enrollments.length}:${input.reason}`, severity: "high" } });
    return { success: true, studentMemberId: student.id, cancelledEnrollmentsCount: enrollments.length, alreadyCancelled: false };
  });
}
