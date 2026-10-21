import { withAuditedRequest } from "@/lib/audited-request";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireGymWorkspaceAccess, handleWorkspaceAccessError } from "@/modules/workspaces/application/guard";

// POST /api/gym/workouts/[id]/duplicate
export const POST = withAuditedRequest(async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const originalWorkout = await prisma.workout.findUnique({
      where: { id },
      include: {
        exercises: {
          orderBy: { order: "asc" },
        },
        exerciseGroups: true,
      },
    });

    if (!originalWorkout || !originalWorkout.workspaceId) {
      return NextResponse.json({ error: "Treino original não encontrado." }, { status: 404 });
    }

    const context = await requireGymWorkspaceAccess({
      workspaceId: body.workspaceId || originalWorkout.workspaceId,
      anyCapability: ["workouts.manage.assigned", "workspace.manage"],
    });

    const targetName = body.name || `${originalWorkout.name} (Cópia)`;

    const duplicatedWorkout = await prisma.$transaction(async (tx) => {
      const created = await tx.workout.create({
        data: {
          name: targetName,
          goal: body.goal || originalWorkout.goal,
          difficulty: body.difficulty || originalWorkout.difficulty,
          duration: body.duration || originalWorkout.duration,
          muscleGroupLabel: body.muscleGroupLabel !== undefined ? body.muscleGroupLabel : originalWorkout.muscleGroupLabel,
          restBetweenExercises: body.restBetweenExercises !== undefined ? body.restBetweenExercises : originalWorkout.restBetweenExercises,
          creatorId: context.userId,
          workspaceId: context.workspaceId,
          allowRepsModification: originalWorkout.allowRepsModification ?? true,
          allowCompleteView: originalWorkout.allowCompleteView ?? false,
          allowSkipExercises: originalWorkout.allowSkipExercises ?? false,
        },
      });

      const groupMap: Record<string, string> = {};
      if (originalWorkout.exerciseGroups && originalWorkout.exerciseGroups.length > 0) {
        for (const g of originalWorkout.exerciseGroups) {
          const dbGroup = await tx.workoutExerciseGroup.create({
            data: {
              workoutId: created.id,
              type: g.type,
              config: (g.config || undefined) as any,
            },
          });
          groupMap[g.id] = dbGroup.id;
        }
      }

      if (originalWorkout.exercises && originalWorkout.exercises.length > 0) {
        for (let index = 0; index < originalWorkout.exercises.length; index++) {
          const ex = originalWorkout.exercises[index];
          const dbGroupId = ex.groupId ? groupMap[ex.groupId] : null;

          await tx.workoutExercise.create({
            data: {
              workoutId: created.id,
              exerciseId: ex.exerciseId,
              sets: ex.sets,
              reps: ex.reps,
              rest: ex.rest,
              load: ex.load,
              description: ex.description,
              order: index,
              methodType: ex.methodType,
              methodConfig: (ex.methodConfig || undefined) as any,
              groupId: dbGroupId,
              allowRepsModification: ex.allowRepsModification,
            },
          });
        }
      }

      const finalWorkout = await tx.workout.findUnique({
        where: { id: created.id },
        include: {
          exercises: {
            include: {
              exercise: {
                include: {
                  muscleGroup: true,
                },
              },
              group: true,
            },
            orderBy: { order: "asc" },
          },
          exerciseGroups: true,
        },
      });

      const exerciseIds = originalWorkout.exercises.map((ex) => ex.exerciseId);
      for (const exId of Array.from(new Set(exerciseIds))) {
        const count = await tx.workoutExercise.count({ where: { exerciseId: exId } });
        await tx.exercise.update({ where: { id: exId }, data: { usage: count } });
      }

      await tx.auditLog.create({
        data: {
          userId: context.userId,
          entity: "WORKOUT",
          entityId: created.id,
          action: "GYM_TEMPLATE_DUPLICATED",
          severity: "info",
        },
      });

      return finalWorkout;
    });

    return NextResponse.json(duplicatedWorkout, { status: 201 });
  } catch (error) {
    const accessError = handleWorkspaceAccessError(error);
    if (accessError) return accessError;
    console.error("Duplicate gym workout error:", error);
    return NextResponse.json({ error: "Erro interno do servidor ao duplicar treino." }, { status: 500 });
  }
});
