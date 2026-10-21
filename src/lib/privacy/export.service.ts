import { collectGymArchiveAttachments, PRIVACY_ARCHIVE_MAX_BYTES } from "@/modules/workspaces/application/gym-privacy-archive";
import { WorkspaceAccessError } from "@/modules/workspaces/domain/types";
import { gymAttachmentKeys } from "@/modules/workspaces/application/gym-storage";
import { permitsOwnAccount } from "@/lib/auth/account-eligibility";
import prisma from "@/lib/prisma";

export class DataExportService {
  /**
   * Generates a structured, sanitized data portability package for a given user.
   * Strips out passwords, internal secrets, and cross-tenant private data.
   */
  static async generateUserDataPackage(userId: string) {
    if (!await permitsOwnAccount(userId)) throw new Error("Conta sem elegibilidade para exportação própria.");
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        objective: true,
        gender: true,
        birthDate: true,
        cpfCnpj: true,
        experienceLevel: true,
        medicalConditions: true,
        weight: true,
        height: true,
        bio: true,
        specialty: true,
        whatsapp: true,
        instagram: true,
        city: true,
        experience: true,
        cref: true,
        createdAt: true,
        updatedAt: true,
        workspaces: {
          select: {
            role: true,
            studentProfile: { select: { registrationNumber: true, healthData: true, onboardedAt: true, medicalClearance: true, medicalClearanceExpiresAt: true, emergencyContactName: true, emergencyContactPhone: true, notes: true } },
            plan: true,
            modality: true,
            streak: true,
            bestStreak: true,
            progress: true,
            createdAt: true,
            workspace: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
        legalAcceptances: {
          select: {
            documentType: true,
            documentVersion: true,
            documentHash: true,
            acceptanceType: true,
            acceptedAt: true,
            source: true,
          },
        },
        privacyConsents: {
          select: {
            purpose: true,
            grantedAt: true,
            revokedAt: true,
            documentVersion: true,
          },
        },
        studentWorkouts: {
          select: {
            workspaceId: true,
            id: true,
            name: true,
            goal: true,
            difficulty: true,
            duration: true,
            dayOfWeek: true,
            muscleGroupLabel: true,
            createdAt: true,
            exercises: {
              select: {
                sets: true,
                reps: true,
                load: true,
                rest: true,
                description: true,
                exercise: {
                  select: {
                    name: true,
                    muscleGroupId: true,
                  },
                },
              },
            },
          },
        },
        workoutLogs: {
          select: {
            workspaceId: true,
            completedAt: true,
            feedback: true,
            effortScore: true,
            loads: true,
            reps: true,
            restTimes: true,
            skippedExercises: true,
          },
        },
        physicalEvaluations: {
          select: {
            id: true,
            workspaceId: true,
            date: true,
            type: true,
            weight: true,
            height: true,
            bodyFat: true,
            muscleMass: true,
            dobras: true,
            anamnese: true,
            circunferencias: true,
            postural: true,
            dorMobilidade: true,
            testesFisicos: true,
            notes: true,
          },
        },
        progressHistory: {
          select: {
            workspaceId: true,
            date: true,
            weight: true,
            height: true,
            bodyFat: true,
            muscleMass: true,
            chest: true,
            waist: true,
            abdomen: true,
            hips: true,
            rightArm: true,
            leftArm: true,
            rightForearm: true, leftForearm: true,
            rightThigh: true,
            leftThigh: true,
            rightCalf: true,
            leftCalf: true,
            notes: true,
          },
        },
        progressPhotos: { select: { id: true, workspaceId: true, objectKey: true, photoUrl: true, date: true, comment: true, trainerLiked: true } },
        studentFiles: {
          select: {
            id: true,
            name: true,
            category: true,
            type: true,
            workspaceId: true, objectKey: true, mimeType: true, size: true,
            fileName: true,
            fileSize: true,
            url: true,
            notes: true,
            createdAt: true,
          },
        },
      },
    });

    if (!user) {
      throw new Error("Usuário não encontrado para exportação.");
    }

    const archives = [];
    const grouped = new Map<string, { key: string; resourceId: string; name: string }[]>();
    for (const file of user.studentFiles) if (file.type === "file") {
      const key = file.objectKey || gymAttachmentKeys(file.url)[0]; if (!key) throw new Error("Arquivo legado requer reconciliação antes da exportação.");
      grouped.set(file.workspaceId, [...(grouped.get(file.workspaceId) || []), { key, resourceId: file.id, name: file.fileName || file.name }]);
    }
    for (const photo of user.progressPhotos) {
      const key = photo.objectKey || gymAttachmentKeys(photo.photoUrl)[0]; if (!key) throw new Error("Foto legada requer reconciliação antes da exportação.");
      grouped.set(photo.workspaceId, [...(grouped.get(photo.workspaceId) || []), { key, resourceId: photo.id, name: "Foto de evolução" }]);
    }
    const ownMessages = await prisma.message.findMany({ where: { senderId: userId }, select: { id: true, content: true, type: true, attachment: true, createdAt: true, conversation: { select: { workspaceId: true } } } });
    for (const evaluation of user.physicalEvaluations) for (const key of gymAttachmentKeys(evaluation)) {
      if (!(grouped.get(evaluation.workspaceId) || []).some(source => source.key === key)) throw new WorkspaceAccessError(409, "STORAGE_RECONCILIATION_REQUIRED", "Anexo de avaliação sem vínculo verificável com o titular.");
    }
    for (const message of ownMessages) for (const key of gymAttachmentKeys(message.attachment)) {
      const workspaceId = message.conversation.workspaceId;
      if (!workspaceId || !key.startsWith(`workspace/${workspaceId}/chat/${userId}/`)) throw new WorkspaceAccessError(409, "STORAGE_RECONCILIATION_REQUIRED", "Anexo de mensagem sem autoria verificável.");
      grouped.set(workspaceId, [...(grouped.get(workspaceId) || []), { key, resourceId: message.id, name: "Anexo de mensagem própria" }]);
    }
    let remainingBytes = PRIVACY_ARCHIVE_MAX_BYTES; let totalFiles = 0;
    for (const [workspaceId, sources] of grouped) {
      totalFiles += new Set(sources.map(source => source.key)).size;
      if (totalFiles > 1000) throw new WorkspaceAccessError(413, "EXPORT_LIMIT_EXCEEDED", "Pacote acima de 1.000 anexos. Solicite exportação assistida em lotes.");
      const archive = await collectGymArchiveAttachments(workspaceId, sources, remainingBytes);
      remainingBytes -= archive.attachmentManifest.totalBytes;
      archives.push({ workspaceId, ...archive });
    }
    const invoices = await prisma.gymInvoice.findMany({ where: { studentUserId: userId }, select: { workspaceId: true, invoiceNumber: true, title: true, status: true, dueDate: true, competenceMonth: true, totalInCents: true, paidAmountInCents: true, balanceRemainingInCents: true } });
    const enrollments = await prisma.gymEnrollment.findMany({ where: { studentMember: { userId } }, select: { workspaceId: true, status: true, startDate: true, endDate: true, priceInCents: true, enrollmentFeeInCents: true, planVersion: { select: { name: true, version: true, termsText: true, termsVersion: true } }, acceptance: { select: { signedAt: true, termsSnapshot: true, termsVersion: true, representationRole: true } }, events: { select: { fromStatus: true, toStatus: true, createdAt: true } } } });
    // Register Audit Log
    await prisma.auditLog.create({
      data: {
        userId,
        action: "DATA_EXPORT_REQUESTED",
        entity: "USER",
        entityId: userId,
        severity: "info",
        ip: "Portability Engine",
      },
    });

    return {
      exportMetadata: {
        system: "AtlasFit Data Portability Engine",
        generatedAt: new Date().toISOString(),
        lgpdArticle: "Art. 18, V (Lei 13.709/2018)",
        userId,
      },
      userData: user,
      ownMessages: ownMessages.map(({ conversation, ...message }) => ({ ...message, workspaceId: conversation.workspaceId })),
      archives,
      financialRecords: JSON.parse(JSON.stringify(invoices, (_key, value) => typeof value === "bigint" ? value.toString() : value)),
      contracts: JSON.parse(JSON.stringify(enrollments, (_key, value) => typeof value === "bigint" ? value.toString() : value)),
    };
  }
}
