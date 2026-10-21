import { withAuditedRequest } from "@/lib/audited-request";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireGymWorkspaceAccess, handleWorkspaceAccessError } from "@/modules/workspaces/application/guard";

// GET /api/gym/workouts/[id]
export const GET = withAuditedRequest(async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const workspaceIdParam = searchParams.get("workspaceId");

    const workout = await prisma.workout.findUnique({
      where: { id },
      include: {
        exercises: {
          include: {
            exercise: {
              include: {
                muscleGroup: true,
                muscleGroups: true,
              },
            },
            group: true,
          },
          orderBy: {
            order: "asc",
          },
        },
        exerciseGroups: true,
      },
    });

    if (!workout || !workout.workspaceId) {
      return NextResponse.json({ error: "Treino não encontrado." }, { status: 404 });
    }

    await requireGymWorkspaceAccess({
      workspaceId: workspaceIdParam || workout.workspaceId,
      anyCapability: ["workouts.read", "workspace.manage"],
    });

    return NextResponse.json(workout);
  } catch (error) {
    const accessError = handleWorkspaceAccessError(error);
    if (accessError) return accessError;
    console.error("GET gym workout details error:", error);
    return NextResponse.json({ error: "Erro interno do servidor ao carregar treino." }, { status: 500 });
  }
});

// PUT /api/gym/workouts/[id]
export const PUT = withAuditedRequest(async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const {
      name,
      goal,
      difficulty,
      duration,
      muscleGroupLabel,
      restBetweenExercises,
      exercises,
      groups,
      allowRepsModification,
      allowCompleteView,
      allowSkipExercises,
      workspaceId,
    } = body;

    if (!name || !goal || !difficulty || !duration) {
      return NextResponse.json({ error: "Campos obrigatórios ausentes." }, { status: 400 });
    }

    const existingWorkout = await prisma.workout.findUnique({
      where: { id },
    });

    if (!existingWorkout || !existingWorkout.workspaceId) {
      return NextResponse.json({ error: "Treino não encontrado." }, { status: 404 });
    }

    const context = await requireGymWorkspaceAccess({
      workspaceId: workspaceId || existingWorkout.workspaceId,
      anyCapability: ["workouts.manage.assigned", "workspace.manage"],
    });

    const updatedWorkout = await prisma.$transaction(async (tx) => {
      const oldExercises = await tx.workoutExercise.findMany({
        where: { workoutId: id },
        select: { exerciseId: true },
      });
      const oldExerciseIds = oldExercises.map((oe) => oe.exerciseId);

      // 1. Remover exercícios e grupos antigos
      await tx.workoutExercise.deleteMany({ where: { workoutId: id } });
      await tx.workoutExerciseGroup.deleteMany({ where: { workoutId: id } });

      // 2. Criar novos grupos
      const groupMap: Record<string, string> = {};
      if (groups && groups.length > 0) {
        for (const g of groups) {
          const dbGroup = await tx.workoutExerciseGroup.create({
            data: {
              workoutId: id,
              type: g.type,
              config: (g.config || undefined) as any,
            },
          });
          groupMap[g.id] = dbGroup.id;
        }
      }

      // 3. Criar exercícios atualizados
      if (exercises && exercises.length > 0) {
        for (let index = 0; index < exercises.length; index++) {
          const ex = exercises[index];
          const dbGroupId = ex.groupId ? groupMap[ex.groupId] : null;

          await tx.workoutExercise.create({
            data: {
              workoutId: id,
              exerciseId: ex.exerciseId,
              sets: Number(ex.sets) || 4,
              reps: String(ex.reps) || "10",
              rest: String(ex.rest) || "01:00",
              load: ex.load ? String(ex.load) : "",
              description: ex.description || null,
              order: index,
              methodType: ex.methodType || "NONE",
              methodConfig: (ex.methodConfig || undefined) as any,
              groupId: dbGroupId,
              allowRepsModification: ex.allowRepsModification !== undefined && ex.allowRepsModification !== null
                ? Boolean(ex.allowRepsModification)
                : null,
            },
          });
        }
      }

      // 4. Atualizar cabeçalho do treino
      const updated = await tx.workout.update({
        where: { id },
        data: {
          name,
          goal,
          difficulty,
          duration,
          muscleGroupLabel: muscleGroupLabel || null,
          restBetweenExercises: restBetweenExercises || "02:00",
          allowRepsModification: allowRepsModification !== undefined ? Boolean(allowRepsModification) : true,
          allowCompleteView: allowCompleteView !== undefined ? Boolean(allowCompleteView) : false,
          allowSkipExercises: allowSkipExercises !== undefined ? Boolean(allowSkipExercises) : false,
        },
        include: {
          exercises: {
            include: {
              exercise: {
                include: {
                  muscleGroup: true,
                  muscleGroups: true,
                },
              },
              group: true,
            },
            orderBy: {
              order: "asc",
            },
          },
          exerciseGroups: true,
        },
      });

      // 5. Recalcular contagem de uso dos exercícios
      const newExerciseIds = (exercises || []).map((ex: any) => ex.exerciseId).filter(Boolean);
      const affectedIds = Array.from(new Set([...oldExerciseIds, ...newExerciseIds])) as string[];
      for (const exId of affectedIds) {
        const count = await tx.workoutExercise.count({ where: { exerciseId: exId } });
        await tx.exercise.update({ where: { id: exId }, data: { usage: count } });
      }

      await tx.auditLog.create({
        data: {
          userId: context.userId,
          entity: "WORKOUT",
          entityId: id,
          action: "GYM_TEMPLATE_UPDATED",
          severity: "info",
        },
      });

      return updated;
    });

    return NextResponse.json(updatedWorkout);
  } catch (error) {
    const accessError = handleWorkspaceAccessError(error);
    if (accessError) return accessError;
    console.error("PUT gym workout error:", error);
    return NextResponse.json({ error: "Erro interno do servidor ao atualizar treino." }, { status: 500 });
  }
});

// DELETE /api/gym/workouts/[id]
export const DELETE = withAuditedRequest(async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const workspaceIdParam = searchParams.get("workspaceId");

    const existingWorkout = await prisma.workout.findUnique({
      where: { id },
      include: {
        exercises: {
          select: { exerciseId: true },
        },
      },
    });

    if (!existingWorkout || !existingWorkout.workspaceId) {
      return NextResponse.json({ error: "Treino não encontrado." }, { status: 404 });
    }

    const context = await requireGymWorkspaceAccess({
      workspaceId: workspaceIdParam || existingWorkout.workspaceId,
      anyCapability: ["workouts.manage.assigned", "workspace.manage"],
    });

    const exerciseIds = existingWorkout.exercises.map((ex) => ex.exerciseId);

    await prisma.$transaction(async (tx) => {
      await tx.workout.delete({
        where: { id },
      });

      for (const exId of exerciseIds) {
        const count = await tx.workoutExercise.count({ where: { exerciseId: exId } });
        await tx.exercise.update({ where: { id: exId }, data: { usage: count } });
      }

      await tx.auditLog.create({
        data: {
          userId: context.userId,
          entity: "WORKOUT",
          entityId: id,
          action: "GYM_TEMPLATE_DELETED",
          severity: "warn",
        },
      });
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const accessError = handleWorkspaceAccessError(error);
    if (accessError) return accessError;
    console.error("DELETE gym workout error:", error);
    return NextResponse.json({ error: "Erro interno do servidor ao excluir treino." }, { status: 500 });
  }
});
