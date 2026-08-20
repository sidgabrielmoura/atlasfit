import prisma from "@/lib/prisma";
import { storageService } from "@/lib/storage.service";
import { FinancialAccountStatus } from "@prisma/client";

export interface ErasureResult {
  success: boolean;
  targetUserId: string;
  deletedFilesCount: number;
  deletedWorkspacesCount: number;
  deletedStudentsCount: number;
  errors: string[];
}

export class ErasureService {
  /**
   * Executes a complete, multi-phase account erasure (R2 Storage + PostgreSQL DB + Audit Logging)
   */
  static async executeCompleteErasure(targetUserId: string, actorUserId?: string): Promise<ErasureResult> {
    const errors: string[] = [];
    let deletedFilesCount = 0;
    let deletedWorkspacesCount = 0;
    let deletedStudentsCount = 0;

    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      include: {
        workspaces: {
          include: {
            workspace: true,
          },
        },
      },
    });

    if (!user) {
      throw new Error(`Usuário ${targetUserId} não encontrado para exclusão.`);
    }

    // 1. Find all workspaces owned by this user
    const ownedWorkspaces = await prisma.workspace.findMany({
      where: { ownerId: targetUserId },
      select: { id: true, logoKey: true, watermarkKey: true, workoutCoverKey: true },
    });
    const ownedWorkspaceIds = ownedWorkspaces.map((w) => w.id);

    // 2. Discover and collect all storage keys associated with the user and owned workspaces
    const storageKeysToDelete = new Set<string>();

    if (user.imageKey) storageKeysToDelete.add(user.imageKey);

    for (const w of ownedWorkspaces) {
      if (w.logoKey) storageKeysToDelete.add(w.logoKey);
      if (w.watermarkKey) storageKeysToDelete.add(w.watermarkKey);
      if (w.workoutCoverKey) storageKeysToDelete.add(w.workoutCoverKey);
    }

    if (ownedWorkspaceIds.length > 0) {
      // Collect StudentFiles
      const studentFiles = await prisma.studentFile.findMany({
        where: { workspaceId: { in: ownedWorkspaceIds } },
        select: { objectKey: true },
      });
      for (const f of studentFiles) {
        if (f.objectKey) storageKeysToDelete.add(f.objectKey);
      }

      // Collect StudentProgressPhotos
      const progressPhotos = await prisma.studentProgressPhoto.findMany({
        where: { workspaceId: { in: ownedWorkspaceIds } },
        select: { objectKey: true },
      });
      for (const p of progressPhotos) {
        if (p.objectKey) storageKeysToDelete.add(p.objectKey);
      }

      // Collect TrainerVideos
      const trainerVideos = await prisma.trainerVideo.findMany({
        where: { trainerId: targetUserId },
        select: { storageKey: true },
      });
      for (const v of trainerVideos) {
        if (v.storageKey) storageKeysToDelete.add(v.storageKey);
      }

      // Collect LeadFiles
      const leadFiles = await prisma.leadFile.findMany({
        where: { lead: { workspaceId: { in: ownedWorkspaceIds } } },
        select: { objectKey: true },
      });
      for (const lf of leadFiles) {
        if (lf.objectKey) storageKeysToDelete.add(lf.objectKey);
      }
    } else {
      // If single student, collect their personal photos and files
      const studentFiles = await prisma.studentFile.findMany({
        where: { studentId: targetUserId },
        select: { objectKey: true },
      });
      for (const f of studentFiles) {
        if (f.objectKey) storageKeysToDelete.add(f.objectKey);
      }

      const progressPhotos = await prisma.studentProgressPhoto.findMany({
        where: { studentId: targetUserId },
        select: { objectKey: true },
      });
      for (const p of progressPhotos) {
        if (p.objectKey) storageKeysToDelete.add(p.objectKey);
      }
    }

    // 3. Delete each physical object from Cloudflare R2 bucket
    for (const key of storageKeysToDelete) {
      try {
        await storageService.deleteObject(key);
        deletedFilesCount++;
      } catch (err: any) {
        console.warn(`[ErasureService] Failed to delete R2 object "${key}":`, err.message);
        errors.push(`R2 delete failed: ${key} (${err.message})`);
      }
    }

    // 4. Update and close payment subaccount if present
    try {
      await prisma.paymentProviderAccount.updateMany({
        where: { personalUserId: targetUserId },
        data: {
          status: FinancialAccountStatus.CLOSED,
          closedAt: new Date(),
          deletedAt: new Date(),
        },
      });
    } catch (err: any) {
      errors.push(`Failed to close payment provider account: ${err.message}`);
    }

    // 5. Cascade delete students belonging exclusively to this trainer
    if (ownedWorkspaceIds.length > 0) {
      const studentMemberships = await prisma.workspaceMember.findMany({
        where: {
          workspaceId: { in: ownedWorkspaceIds },
          role: "STUDENT",
        },
        select: { userId: true },
      });

      const candidateStudentUserIds = Array.from(new Set(studentMemberships.map((m) => m.userId)));

      for (const studentId of candidateStudentUserIds) {
        const otherMemberships = await prisma.workspaceMember.count({
          where: {
            userId: studentId,
            workspaceId: { notIn: ownedWorkspaceIds },
          },
        });

        if (otherMemberships === 0) {
          try {
            await prisma.user.delete({ where: { id: studentId } });
            deletedStudentsCount++;
          } catch (e: any) {
            errors.push(`Failed to delete student ${studentId}: ${e.message}`);
          }
        }
      }

      // Delete all owned workspaces
      const deletedWorkspaces = await prisma.workspace.deleteMany({
        where: { ownerId: targetUserId },
      });
      deletedWorkspacesCount = deletedWorkspaces.count;
    }

    // 6. Delete DataDeletionRequests & DataSubjectRequests
    await prisma.dataDeletionRequest.deleteMany({ where: { userId: targetUserId } }).catch(() => {});
    await prisma.dataSubjectRequest.deleteMany({ where: { requesterUserId: targetUserId } }).catch(() => {});

    // 7. Delete the User record
    await prisma.user.delete({ where: { id: targetUserId } });

    // 8. Register Audit Log
    await prisma.auditLog.create({
      data: {
        userId: actorUserId || targetUserId,
        action: "COMPLETE_DATA_ERASURE",
        entity: "USER",
        entityId: targetUserId,
        severity: "critical",
        ip: "System Erasure Service",
      },
    });

    return {
      success: true,
      targetUserId,
      deletedFilesCount,
      deletedWorkspacesCount,
      deletedStudentsCount,
      errors,
    };
  }
}
