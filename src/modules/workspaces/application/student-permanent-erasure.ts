import prisma from "@/lib/prisma";
import { storageService, StorageConfigurationError } from "@/lib/storage.service";
import { gymAttachmentKeys } from "./gym-storage";
import { WorkspaceAccessError } from "../domain/types";
import { withCommandAudit } from "@/lib/audit-context";

export interface PurgeStudentInput {
  workspaceId: string;
  studentIdentifier: string; // Member ID or User ID
  actorUserId: string;
}

export interface PurgeStudentResult {
  success: boolean;
  studentMemberId: string;
  studentUserId: string;
  studentName: string;
  deletedWorkoutsCount: number;
  deletedFilesCount: number;
  deletedEvaluationsCount: number;
  purgedR2KeysCount: number;
  userDeleted: boolean;
  errors?: string[];
}

/**
 * Permanently deletes a student from a workspace, purges all their files from Cloudflare R2,
 * deletes all workouts assigned exclusively to them, and all other student-specific records.
 */
export async function purgeStudentFromWorkspace(input: PurgeStudentInput): Promise<PurgeStudentResult> {
  const { workspaceId, studentIdentifier, actorUserId } = input;

  if (!workspaceId || !studentIdentifier) {
    throw new WorkspaceAccessError(400, "INVALID_REQUEST", "Workspace e identificador do aluno são obrigatórios.");
  }

  // 1. Locate the WorkspaceMember representing the student
  const targetMember = await prisma.workspaceMember.findFirst({
    where: {
      workspaceId,
      OR: [
        { id: studentIdentifier },
        { userId: studentIdentifier },
      ],
    },
    include: {
      user: true,
      studentProfile: true,
      workspace: { select: { id: true, ownerId: true } },
    },
  });

  if (!targetMember) {
    throw new WorkspaceAccessError(404, "STUDENT_NOT_FOUND", "Aluno não encontrado neste workspace.");
  }

  if (targetMember.userId === targetMember.workspace.ownerId) {
    throw new WorkspaceAccessError(400, "INVALID_REQUEST", "O proprietário do workspace não pode ser excluído.");
  }

  const studentUserId = targetMember.userId;
  const studentMemberId = targetMember.id;
  const studentName = targetMember.user?.name || "Aluno";

  // 2. Discover and collect all R2 storage keys tied to this student in this workspace
  const storageKeys = new Set<string>();

  // A. StudentFiles
  const studentFiles = await prisma.studentFile.findMany({
    where: { workspaceId, studentId: studentUserId },
    select: { id: true, objectKey: true, url: true },
  });
  for (const f of studentFiles) {
    if (f.objectKey) storageKeys.add(f.objectKey);
    gymAttachmentKeys(f.url).forEach((k) => storageKeys.add(k));
  }

  // B. StudentProgressPhoto
  const progressPhotos = await prisma.studentProgressPhoto.findMany({
    where: { workspaceId, studentId: studentUserId },
    select: { id: true, objectKey: true, photoUrl: true },
  });
  for (const p of progressPhotos) {
    if (p.objectKey) storageKeys.add(p.objectKey);
    gymAttachmentKeys(p.photoUrl).forEach((k) => storageKeys.add(k));
  }

  // C. PhysicalEvaluation attachments
  const evaluations = await prisma.physicalEvaluation.findMany({
    where: { workspaceId, studentId: studentUserId },
  });
  for (const ev of evaluations) {
    gymAttachmentKeys(ev).forEach((k) => storageKeys.add(k));
  }

  // D. GymStorageObject
  const gymStorageObjects = await prisma.gymStorageObject.findMany({
    where: {
      workspaceId,
      OR: [
        { actorUserId: studentUserId },
        { objectKey: { in: Array.from(storageKeys) } },
      ],
    },
    select: { objectKey: true },
  });
  for (const gso of gymStorageObjects) {
    storageKeys.add(gso.objectKey);
  }

  // E. Check if the user belongs to any other workspace or owns a workspace
  const otherMembershipsCount = await prisma.workspaceMember.count({
    where: {
      userId: studentUserId,
      workspaceId: { not: workspaceId },
    },
  });
  const ownedWorkspacesCount = await prisma.workspace.count({
    where: { ownerId: studentUserId },
  });

  const willDeleteUser = otherMembershipsCount === 0 && ownedWorkspacesCount === 0;
  if (willDeleteUser && targetMember.user?.imageKey) {
    storageKeys.add(targetMember.user.imageKey);
  }

  // 3. Database Deletion within an audited Transaction
  let deletedWorkoutsCount = 0;
  let deletedEvaluationsCount = 0;

  await withCommandAudit(async () => {
    await prisma.$transaction(
      async (tx) => {
        // A. Workouts assigned exclusively to this student in this workspace
        const studentWorkouts = await tx.workout.findMany({
          where: { workspaceId, studentId: studentUserId },
          select: { id: true },
        });
        const workoutIds = studentWorkouts.map((w) => w.id);
        deletedWorkoutsCount = workoutIds.length;

        if (workoutIds.length > 0) {
          await tx.workoutExercise.deleteMany({ where: { workoutId: { in: workoutIds } } });
          await tx.workoutExerciseGroup.deleteMany({ where: { workoutId: { in: workoutIds } } });
          await tx.workoutLog.deleteMany({ where: { workoutId: { in: workoutIds } } });
          await tx.workout.deleteMany({ where: { id: { in: workoutIds } } });
        }

        // Also delete any other workout logs by this student in this workspace
        await tx.workoutLog.deleteMany({ where: { workspaceId, studentId: studentUserId } });

        // B. Evaluations, Progress, Photos & Student Files
        const evalsDeleted = await tx.physicalEvaluation.deleteMany({
          where: { workspaceId, studentId: studentUserId },
        });
        deletedEvaluationsCount = evalsDeleted.count;

        await tx.studentProgressPhoto.deleteMany({ where: { workspaceId, studentId: studentUserId } });
        await tx.studentProgress.deleteMany({ where: { workspaceId, studentId: studentUserId } });
        await tx.studentFile.deleteMany({ where: { workspaceId, studentId: studentUserId } });
        await tx.dailyFeedback.deleteMany({ where: { workspaceId, studentId: studentUserId } });
        await tx.trainerTask.deleteMany({ where: { workspaceId, studentId: studentUserId } });

        // C. Exercise Adjustment Requests
        const adjustmentReqs = await tx.exerciseAdjustmentRequest.findMany({
          where: { requesterId: studentUserId },
          select: { id: true },
        });
        if (adjustmentReqs.length > 0) {
          const reqIds = adjustmentReqs.map((r) => r.id);
          await tx.adjustmentMessage.deleteMany({ where: { requestId: { in: reqIds } } });
          await tx.exerciseAdjustmentRequest.deleteMany({ where: { id: { in: reqIds } } });
        }

        // D. PendingStudent record if any exists with the student's email
        if (targetMember.user?.email) {
          await tx.pendingStudent.deleteMany({
            where: { workspaceId, email: targetMember.user.email },
          });
        }

        // E. Gym-specific models
        await tx.gymClassBooking.deleteMany({ where: { studentMemberId } });
        await tx.gymClassWaitlist.deleteMany({ where: { studentMemberId } });
        await tx.gymAccessGrant.deleteMany({ where: { studentMemberId } });
        await tx.gymAccessOverride.deleteMany({ where: { studentMemberId } });
        await tx.gymAccessDecisionLog.deleteMany({ where: { studentMemberId } });
        await tx.gymAccessLog.deleteMany({ where: { studentMemberId } });
        await tx.gymAccessReconciliationDivergence.deleteMany({ where: { studentMemberId } });
        await tx.gymGuardian.deleteMany({ where: { studentMemberId } });

        // Enrollments & related events, pauses, and contract acceptances
        const enrollments = await tx.gymEnrollment.findMany({
          where: { studentMemberId },
          select: { id: true },
        });
        const enrollmentIds = enrollments.map((e) => e.id);
        if (enrollmentIds.length > 0) {
          await tx.gymContractAcceptance.deleteMany({
            where: { enrollmentId: { in: enrollmentIds } },
          });
          await tx.gymEnrollmentEvent.deleteMany({
            where: { enrollmentId: { in: enrollmentIds } },
          });
          await tx.gymEnrollmentPause.deleteMany({
            where: { enrollmentId: { in: enrollmentIds } },
          });
        }

        // Gym Invoices
        const invoices = await tx.gymInvoice.findMany({
          where: {
            workspaceId,
            OR: [{ studentMemberId }, { studentUserId }],
          },
          select: { id: true },
        });
        if (invoices.length > 0) {
          const invIds = invoices.map((i) => i.id);
          await tx.gymPaymentAllocation.deleteMany({ where: { invoiceId: { in: invIds } } });
          await tx.gymInvoiceItem.deleteMany({ where: { invoiceId: { in: invIds } } });
          await tx.gymInvoice.deleteMany({ where: { id: { in: invIds } } });
        }

        if (enrollmentIds.length > 0) {
          await tx.gymEnrollment.deleteMany({ where: { id: { in: enrollmentIds } } });
        }

        await tx.gymStudentProfile.deleteMany({ where: { memberId: studentMemberId } });
        await tx.gymStaffProfile.deleteMany({ where: { memberId: studentMemberId } });

        // GymStorageObjects in this workspace
        if (storageKeys.size > 0) {
          await tx.gymStorageObject.deleteMany({
            where: {
              workspaceId,
              OR: [
                { actorUserId: studentUserId },
                { objectKey: { in: Array.from(storageKeys) } },
              ],
            },
          });
        }

        // F. Student Billings
        const billings = await tx.studentBilling.findMany({
          where: { workspaceId, studentUserId },
          select: { id: true },
        });
        if (billings.length > 0) {
          const billingIds = billings.map((b) => b.id);
          await tx.walletLedgerEntry.deleteMany({ where: { billingId: { in: billingIds } } });
          await tx.paymentSplit.deleteMany({ where: { billingId: { in: billingIds } } });
          await tx.paymentAttempt.deleteMany({ where: { billingId: { in: billingIds } } });
          await tx.activationFeeRecoveryOperation.deleteMany({ where: { billingId: { in: billingIds } } });
          await tx.studentBilling.deleteMany({ where: { id: { in: billingIds } } });
        }

        // G. Disconnect Member references
        await tx.workspaceMember.updateMany({
          where: { assignedStaffId: studentMemberId },
          data: { assignedStaffId: null },
        });
        await tx.gymClassSession.updateMany({
          where: { substituteInstructorStaffId: studentMemberId },
          data: { substituteInstructorStaffId: null },
        });

        // H. Delete Role Grants and WorkspaceMember
        await tx.workspaceRoleGrant.deleteMany({ where: { memberId: studentMemberId } });
        await tx.workspaceMember.delete({ where: { id: studentMemberId } });

        // I. If User has no remaining presence in any workspace and does not own any workspace, delete User
        if (willDeleteUser) {
          await tx.session.deleteMany({ where: { userId: studentUserId } });
          await tx.account.deleteMany({ where: { userId: studentUserId } });
          await tx.userTotpDevice.deleteMany({ where: { userId: studentUserId } });
          await tx.notificationDevice.deleteMany({ where: { userId: studentUserId } });
          await tx.notification.deleteMany({ where: { userId: studentUserId } });
          await tx.notificationPreference.deleteMany({ where: { userId: studentUserId } });
          await tx.legalAcceptance.deleteMany({
            where: { OR: [{ userId: studentUserId }, { representedUserId: studentUserId }] },
          });
          await tx.privacyConsent.deleteMany({ where: { userId: studentUserId } });
          await tx.dataSubjectRequest.deleteMany({ where: { requesterUserId: studentUserId } });
          await tx.gymContractAcceptance.deleteMany({
            where: { OR: [{ signerUserId: studentUserId }, { representedUserId: studentUserId }] },
          });
          await tx.creditPurchase.deleteMany({ where: { userId: studentUserId } });
          await tx.message.deleteMany({ where: { senderId: studentUserId } });
          await tx.conversationParticipant.deleteMany({ where: { userId: studentUserId } });
          await tx.user.delete({ where: { id: studentUserId } });
        }

        // J. Audit Log
        await tx.auditLog.create({
          data: {
            userId: actorUserId,
            entity: "WORKSPACE_MEMBER",
            entityId: studentMemberId,
            action: "STUDENT_PERMANENTLY_PURGED",
            severity: "high",
            metadata: {
              workspaceId,
              studentMemberId,
              studentUserId,
              studentName,
              deletedWorkoutsCount,
              deletedFilesCount: studentFiles.length,
              deletedPhotosCount: progressPhotos.length,
              purgedR2KeysCount: storageKeys.size,
              userDeleted: willDeleteUser,
            },
          },
        });
      },
      { maxWait: 10_000, timeout: 60_000 }
    );
  });

  // 4. Physical R2 Purge (outside the DB transaction to ensure resilience)
  const errors: string[] = [];
  let purgedR2KeysCount = 0;

  for (const key of storageKeys) {
    try {
      await storageService.deleteObject(key);
      purgedR2KeysCount++;
    } catch (err: any) {
      if (err instanceof StorageConfigurationError) {
        // R2 not configured in this environment (e.g. dev/test without credentials)
        console.warn(`[StudentPurge] Storage not configured, skipping key: ${key}`);
      } else {
        console.warn(`[StudentPurge] Failed to delete R2 object "${key}":`, err?.message || err);
        errors.push(`R2 purge failed for ${key}: ${err?.message || "unknown"}`);
      }
    }
  }

  return {
    success: true,
    studentMemberId,
    studentUserId,
    studentName,
    deletedWorkoutsCount,
    deletedFilesCount: studentFiles.length,
    deletedEvaluationsCount,
    purgedR2KeysCount,
    userDeleted: willDeleteUser,
    ...(errors.length > 0 ? { errors } : {}),
  };
}
