import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { logSystemError } from "@/lib/logger";
import { z } from "zod";

const mergeExercisesSchema = z.object({
  sourceExerciseId: z.string().trim().min(1, "Exercício de origem é obrigatório."),
  targetExerciseId: z.string().trim().min(1, "Exercício de destino é obrigatório."),
});

export async function POST(req: Request) {
  const session = await auth();

  if (session?.user?.role !== "SUPERADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const json = await req.json();
    const parsed = mergeExercisesSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message || "Dados inválidos para mesclagem." },
        { status: 400 }
      );
    }

    const { sourceExerciseId, targetExerciseId } = parsed.data;

    if (sourceExerciseId === targetExerciseId) {
      return NextResponse.json(
        { message: "O exercício de origem e de destino não podem ser o mesmo." },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch both exercises
      const [sourceExercise, targetExercise] = await Promise.all([
        tx.exercise.findUnique({
          where: { id: sourceExerciseId },
          include: { muscleGroup: true },
        }),
        tx.exercise.findUnique({
          where: { id: targetExerciseId },
          include: { muscleGroup: true },
        }),
      ]);

      if (!sourceExercise) {
        throw new Error("EXERCISE_SOURCE_NOT_FOUND");
      }
      if (!targetExercise) {
        throw new Error("EXERCISE_TARGET_NOT_FOUND");
      }

      // 2. Transfer WorkoutExercises from source to target
      const updatedWorkouts = await tx.workoutExercise.updateMany({
        where: { exerciseId: sourceExerciseId },
        data: { exerciseId: targetExerciseId },
      });

      // 3. Transfer TrainerVideoExercises (handle unique constraint videoId + exerciseId)
      const sourceVideoLinks = await tx.trainerVideoExercise.findMany({
        where: { exerciseId: sourceExerciseId },
      });

      for (const link of sourceVideoLinks) {
        const existingTargetLink = await tx.trainerVideoExercise.findUnique({
          where: {
            videoId_exerciseId: {
              videoId: link.videoId,
              exerciseId: targetExerciseId,
            },
          },
        });

        if (existingTargetLink) {
          // Target already has this video link, remove redundant source link
          await tx.trainerVideoExercise.delete({ where: { id: link.id } });
        } else {
          // Migrate video link to target
          await tx.trainerVideoExercise.update({
            where: { id: link.id },
            data: { exerciseId: targetExerciseId },
          });
        }
      }

      // 4. Transfer ExerciseAdjustmentRequests
      await tx.exerciseAdjustmentRequest.updateMany({
        where: { exerciseId: sourceExerciseId },
        data: { exerciseId: targetExerciseId },
      });

      // 5. Recalculate usage for target exercise
      const newTargetUsage = await tx.workoutExercise.count({
        where: { exerciseId: targetExerciseId },
      });

      const updatedTarget = await tx.exercise.update({
        where: { id: targetExerciseId },
        data: { usage: newTargetUsage },
        include: {
          muscleGroup: true,
          muscleGroups: true,
        },
      });

      // 6. Safely delete the source exercise
      await tx.exercise.delete({
        where: { id: sourceExerciseId },
      });

      // 7. Create Audit Log
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: "EXERCISE_MERGED",
          entity: "EXERCISE",
          entityId: targetExerciseId,
          severity: "warning",
          metadata: {
            sourceExerciseId,
            sourceExerciseName: sourceExercise.name,
            sourcePreviousUsage: sourceExercise.usage,
            targetExerciseId,
            targetExerciseName: targetExercise.name,
            targetPreviousUsage: targetExercise.usage,
            transferredWorkouts: updatedWorkouts.count,
            newUsage: newTargetUsage,
          },
        },
      });

      return {
        sourceName: sourceExercise.name,
        targetName: targetExercise.name,
        transferredWorkouts: updatedWorkouts.count,
        newUsage: newTargetUsage,
        targetExercise: updatedTarget,
      };
    });

    return NextResponse.json({
      success: true,
      message: `Exercício "${result.sourceName}" foi mesclado com sucesso em "${result.targetName}". Foram transferidos ${result.transferredWorkouts} treinos.`,
      transferredWorkouts: result.transferredWorkouts,
      newUsage: result.newUsage,
      targetExercise: result.targetExercise,
    });
  } catch (error: any) {
    if (error?.message === "EXERCISE_SOURCE_NOT_FOUND") {
      return NextResponse.json({ message: "Exercício de origem não encontrado." }, { status: 404 });
    }
    if (error?.message === "EXERCISE_TARGET_NOT_FOUND") {
      return NextResponse.json({ message: "Exercício de destino não encontrado." }, { status: 404 });
    }
    console.error("[EXERCISE_MERGE_ERROR]", error);
    await logSystemError({ action: "MERGE_EXERCISE", error, entity: "EXERCISE" });
    return NextResponse.json({ message: "Erro interno ao mesclar exercícios." }, { status: 500 });
  }
}
