import prisma from "@/lib/prisma";

export class DataExportService {
  /**
   * Generates a structured, sanitized data portability package for a given user.
   * Strips out passwords, internal secrets, and cross-tenant private data.
   */
  static async generateUserDataPackage(userId: string) {
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
            rightThigh: true,
            leftThigh: true,
            rightCalf: true,
            leftCalf: true,
            notes: true,
          },
        },
        studentFiles: {
          select: {
            id: true,
            name: true,
            category: true,
            type: true,
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
    };
  }
}
