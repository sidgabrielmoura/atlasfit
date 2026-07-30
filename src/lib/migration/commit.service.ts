import prisma from "@/lib/prisma";
import bcryptjs from "bcryptjs";
import crypto from "crypto";

export interface CommitPreviewResult {
  jobId: string;
  commitVersion: number;
  newStudentsCount: number;
  updateStudentsCount: number;
  ignoredStudentsCount: number;
  workoutsCount: number;
  exercisesCount: number;
  assessmentsCount: number;
  measurementsCount: number;
  readyToCommit: boolean;
  warnings: string[];
}

/**
 * Validates review state and generates a server-authoritative preview for the current commitVersion.
 */
export async function generateCommitPreview(jobId: string, workspaceId: string): Promise<CommitPreviewResult> {
  const job = await prisma.importJob.findUnique({
    where: { id: jobId },
    include: {
      records: true,
    },
  });

  if (!job) throw new Error("Job de migração não encontrado.");

  const studentRecords = job.records.filter((r) => r.entityType === "STUDENT" && r.status !== "SKIPPED");
  const workoutRecords = job.records.filter((r) => r.entityType === "WORKOUT" && r.status !== "SKIPPED");
  const assessmentRecords = job.records.filter((r) => r.entityType === "ASSESSMENT" && r.status !== "SKIPPED");
  const measurementRecords = job.records.filter((r) => r.entityType === "MEASUREMENT" && r.status !== "SKIPPED");

  let newStudentsCount = 0;
  let updateStudentsCount = 0;
  let ignoredStudentsCount = job.records.filter((r) => r.entityType === "STUDENT" && r.status === "SKIPPED").length;
  let totalExercises = 0;
  const warnings: string[] = [];

  for (const sr of studentRecords) {
    if (sr.matchedEntityId) {
      // Verify matched entity exists in this workspace
      const member = await prisma.workspaceMember.findFirst({
        where: {
          userId: sr.matchedEntityId,
          workspaceId,
          role: "STUDENT",
        },
      });

      if (member) {
        updateStudentsCount++;
      } else {
        newStudentsCount++;
        warnings.push(`Aluno "${(sr.normalizedData as any)?.name}" teve correspondência inválida e será criado como novo.`);
      }
    } else {
      newStudentsCount++;
    }
  }

  for (const wr of workoutRecords) {
    const norm = wr.normalizedData as any;
    if (norm && norm.exercises) {
      totalExercises += norm.exercises.length;
    }
  }

  // Mark job as previewValidated = true for the current commitVersion
  await prisma.importJob.update({
    where: { id: jobId },
    data: {
      previewValidated: true,
    },
  });

  return {
    jobId,
    commitVersion: job.commitVersion,
    newStudentsCount,
    updateStudentsCount,
    ignoredStudentsCount,
    workoutsCount: workoutRecords.length,
    exercisesCount: totalExercises,
    assessmentsCount: assessmentRecords.length,
    measurementsCount: measurementRecords.length,
    readyToCommit: true,
    warnings,
  };
}

/**
 * Idempotently commits an ImportJob into the AtlasFit database inside a Prisma $transaction.
 */
export async function commitImportJob(
  jobId: string,
  workspaceId: string,
  commitVersion: number,
  idempotencyKey?: string
) {
  const job = await prisma.importJob.findUnique({
    where: { id: jobId },
    include: {
      records: true,
    },
  });

  if (!job) throw new Error("Job de migração não encontrado.");

  if (job.status === "COMPLETED") {
    return { success: true, alreadyCommitted: true, status: "COMPLETED" };
  }

  if (!job.previewValidated) {
    throw new Error("É necessário gerar o preview validado antes de confirmar a migração.");
  }

  if (job.commitVersion !== commitVersion) {
    throw new Error("A versão do review foi alterada. Por favor, gere um novo preview de confirmação.");
  }

  // Set state to IMPORTING
  await prisma.importJob.update({
    where: { id: jobId },
    data: {
      status: "IMPORTING",
      processingStep: "COMMITTING",
      idempotencyKey: idempotencyKey ?? `${jobId}_v${commitVersion}`,
    },
  });

  // Map temporary IDs to database entity IDs
  const studentIdMap: Record<string, string> = {}; // tempStudentId -> real User.id

  try {
    await prisma.$transaction(async (tx) => {
      const studentRecords = job.records.filter((r) => r.entityType === "STUDENT" && r.status !== "SKIPPED");
      const workoutRecords = job.records.filter((r) => r.entityType === "WORKOUT" && r.status !== "SKIPPED");
      const assessmentRecords = job.records.filter((r) => r.entityType === "ASSESSMENT" && r.status !== "SKIPPED");
      const measurementRecords = job.records.filter((r) => r.entityType === "MEASUREMENT" && r.status !== "SKIPPED");

      // 1. Commit Students
      for (const sr of studentRecords) {
        const norm = sr.normalizedData as any;
        let realStudentId: string;
        let actionTaken: "CREATED" | "UPDATED";

        if (sr.matchedEntityId) {
          // Verify workspace membership
          const existingMember = await tx.workspaceMember.findFirst({
            where: {
              userId: sr.matchedEntityId,
              workspaceId,
              role: "STUDENT",
            },
          });

          if (existingMember) {
            // Update existing student
            realStudentId = sr.matchedEntityId;
            actionTaken = "UPDATED";

            await tx.user.update({
              where: { id: realStudentId },
              data: {
                name: norm.name ?? undefined,
                objective: norm.objective ?? undefined,
                weight: norm.weight ?? undefined,
                height: norm.height ?? undefined,
                gender: norm.gender ?? undefined,
                birthDate: norm.birthDate ? new Date(norm.birthDate) : undefined,
              },
            });
          } else {
            // Create new user & membership
            actionTaken = "CREATED";
            const createdUser = await createStudentUser(tx, workspaceId, norm);
            realStudentId = createdUser.id;
          }
        } else {
          // Create new student
          actionTaken = "CREATED";
          const createdUser = await createStudentUser(tx, workspaceId, norm);
          realStudentId = createdUser.id;
        }

        studentIdMap[sr.temporaryEntityId] = realStudentId;

        await tx.importEntityResult.upsert({
          where: {
            importJobId_entityType_temporaryEntityId: {
              importJobId: jobId,
              entityType: "STUDENT",
              temporaryEntityId: sr.temporaryEntityId,
            },
          },
          update: {
            action: actionTaken,
            databaseEntityId: realStudentId,
          },
          create: {
            importJobId: jobId,
            action: actionTaken,
            entityType: "STUDENT",
            temporaryEntityId: sr.temporaryEntityId,
            databaseEntityId: realStudentId,
          },
        });
      }

      // 2. Commit Workouts & WorkoutExercises
      for (const wr of workoutRecords) {
        const norm = wr.normalizedData as any;
        const targetStudentId = studentIdMap[norm.temporaryStudentId] || null;

        const createdWorkout = await tx.workout.create({
          data: {
            name: norm.name || "Treino Migrado",
            goal: norm.goal || "Hipertrofia",
            difficulty: norm.difficulty || "Intermediário",
            duration: norm.duration || "60 min",
            workspaceId,
            studentId: targetStudentId,
            dayOfWeek: norm.dayOfWeek ?? null,
            muscleGroupLabel: norm.muscleGroupLabel ?? null,
            restBetweenExercises: norm.restBetweenExercises || "2 min",
            isActive: true,
          },
        });

        await tx.importEntityResult.upsert({
          where: {
            importJobId_entityType_temporaryEntityId: {
              importJobId: jobId,
              entityType: "WORKOUT",
              temporaryEntityId: wr.temporaryEntityId,
            },
          },
          update: {
            action: "CREATED",
            databaseEntityId: createdWorkout.id,
          },
          create: {
            importJobId: jobId,
            action: "CREATED",
            entityType: "WORKOUT",
            temporaryEntityId: wr.temporaryEntityId,
            databaseEntityId: createdWorkout.id,
          },
        });

        if (norm.exercises && Array.isArray(norm.exercises)) {
          for (let eIdx = 0; eIdx < norm.exercises.length; eIdx++) {
            const ex = norm.exercises[eIdx];
            let realExerciseId = ex.matchedExerciseId;

            if (!realExerciseId) {
              let defaultGroup = await tx.muscleGroup.findFirst({
                where: { name: "Geral" },
              });

              if (!defaultGroup) {
                defaultGroup = await tx.muscleGroup.create({
                  data: { name: "Geral" },
                });
              }

              const newEx = await tx.exercise.create({
                data: {
                  name: ex.name || "Exercício Personalizado",
                  muscleGroupId: defaultGroup.id,
                  isOfficial: false,
                  creatorId: job.createdByUserId,
                  status: ex.isRequestedOfficial ? "PENDING" : "APPROVED",
                },
              });
              realExerciseId = newEx.id;
            }

            await tx.workoutExercise.create({
              data: {
                workoutId: createdWorkout.id,
                exerciseId: realExerciseId,
                sets: ex.sets || 3,
                reps: ex.reps || "10-12",
                rest: ex.restSeconds ? `${ex.restSeconds}s` : "60s",
                load: ex.load ? `${ex.load}kg` : null,
                description: ex.notes ?? null,
                order: eIdx,
              },
            });
          }
        }
      }

      // 3. Commit Physical Evaluations
      for (const ar of assessmentRecords) {
        const norm = ar.normalizedData as any;
        const targetStudentId = studentIdMap[norm.temporaryStudentId];
        if (!targetStudentId) continue;

        const createdAss = await tx.physicalEvaluation.create({
          data: {
            studentId: targetStudentId,
            workspaceId,
            date: norm.date ? new Date(norm.date) : new Date(),
            type: norm.type || "Avaliação Física",
            weight: norm.weight || 70,
            height: norm.height || 170,
            bodyFat: norm.bodyFat ?? null,
            muscleMass: norm.muscleMass ?? null,
            notes: norm.notes ?? null,
          },
        });

        await tx.importEntityResult.upsert({
          where: {
            importJobId_entityType_temporaryEntityId: {
              importJobId: jobId,
              entityType: "ASSESSMENT",
              temporaryEntityId: ar.temporaryEntityId,
            },
          },
          update: {
            action: "CREATED",
            databaseEntityId: createdAss.id,
          },
          create: {
            importJobId: jobId,
            action: "CREATED",
            entityType: "ASSESSMENT",
            temporaryEntityId: ar.temporaryEntityId,
            databaseEntityId: createdAss.id,
          },
        });
      }

      // 4. Commit Student Progress Measurements
      for (const mr of measurementRecords) {
        const norm = mr.normalizedData as any;
        const targetStudentId = studentIdMap[norm.temporaryStudentId];
        if (!targetStudentId) continue;

        const createdMeas = await tx.studentProgress.create({
          data: {
            studentId: targetStudentId,
            workspaceId,
            date: norm.date ? new Date(norm.date) : new Date(),
            weight: norm.weight ?? null,
            height: norm.height ?? null,
            bodyFat: norm.bodyFat ?? null,
            muscleMass: norm.muscleMass ?? null,
            chest: norm.chest ?? null,
            waist: norm.waist ?? null,
            abdomen: norm.abdomen ?? null,
            hips: norm.hips ?? null,
            rightArm: norm.rightArm ?? null,
            leftArm: norm.leftArm ?? null,
            rightThigh: norm.rightThigh ?? null,
            leftThigh: norm.leftThigh ?? null,
            notes: norm.notes ?? null,
          },
        });

        await tx.importEntityResult.upsert({
          where: {
            importJobId_entityType_temporaryEntityId: {
              importJobId: jobId,
              entityType: "MEASUREMENT",
              temporaryEntityId: mr.temporaryEntityId,
            },
          },
          update: {
            action: "CREATED",
            databaseEntityId: createdMeas.id,
          },
          create: {
            importJobId: jobId,
            action: "CREATED",
            entityType: "MEASUREMENT",
            temporaryEntityId: mr.temporaryEntityId,
            databaseEntityId: createdMeas.id,
          },
        });
      }
    });

    // Mark job as COMPLETED
    await prisma.importJob.update({
      where: { id: jobId },
      data: {
        status: "COMPLETED",
        processingStep: "IDLE",
      },
    });

    return { success: true, status: "COMPLETED" };
  } catch (error: any) {
    await prisma.importJob.update({
      where: { id: jobId },
      data: {
        status: "FAILED",
        processingStep: "IDLE",
        errorCode: "COMMIT_FAILED",
        safeErrorMessage: "Ocorreu um erro durante a gravação dos dados no banco. Nenhuma alteração incompleta foi salva.",
      },
    });
    throw error;
  }
}

async function createStudentUser(tx: any, workspaceId: string, norm: any) {
  const generatedEmail = norm.email || `aluno.${crypto.randomBytes(4).toString("hex")}@atlasfit.internal`;
  const defaultPassword = await bcryptjs.hash("AtlasFit123!", 10);

  const newUser = await tx.user.create({
    data: {
      name: norm.name || "Aluno Importado",
      email: generatedEmail,
      whatsapp: norm.phone ?? null,
      birthDate: norm.birthDate ? new Date(norm.birthDate) : null,
      objective: norm.objective ?? null,
      weight: norm.weight ?? null,
      height: norm.height ?? null,
      gender: norm.gender ?? null,
      role: "STUDENT",
      password: defaultPassword,
    },
  });

  await tx.workspaceMember.create({
    data: {
      userId: newUser.id,
      workspaceId,
      role: "STUDENT",
      isActive: true,
      plan: "Mensal",
      modality: "PRESENCIAL",
    },
  });

  return newUser;
}
