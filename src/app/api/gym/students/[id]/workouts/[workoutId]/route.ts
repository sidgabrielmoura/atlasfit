import { withAuditedRequest } from "@/lib/audited-request";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireGymWorkspaceAccess, handleWorkspaceAccessError } from "@/modules/workspaces/application/guard";
import { authorizeGymStudent } from "@/modules/workspaces/application/student-authority";
import { serializableTransaction } from "@/modules/workspaces/application/transaction";
import { WorkspaceAccessError } from "@/modules/workspaces/domain/types";

export const PATCH = withAuditedRequest(async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; workoutId: string }> }
) {
  try {
    const { id, workoutId } = await params;
    const body = await req.json();
    const {
      workspaceId: bodyWorkspaceId,
      name,
      goal,
      difficulty,
      duration,
      muscleGroupLabel,
      restBetweenExercises,
      dayOfWeek,
      exercises,
      groups,
      allowRepsModification,
      allowCompleteView,
      allowSkipExercises,
    } = body;

    const { searchParams } = new URL(req.url);
    const workspaceId = bodyWorkspaceId || searchParams.get("workspaceId");

    if (!workspaceId) {
      return NextResponse.json({ error: "O ID do workspace é obrigatório." }, { status: 400 });
    }

    const context = await requireGymWorkspaceAccess({
      workspaceId,
      anyCapability: ["workouts.manage.assigned", "workspace.manage"],
    });

    const member = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId: context.workspaceId,
        OR: [{ id }, { userId: id }],
      },
    });

    if (!member) {
      return NextResponse.json({ error: "Aluno não encontrado nesta academia." }, { status: 404 });
    }

    await authorizeGymStudent(context.workspaceId, member.id, context.userId, "workouts.manage.assigned");

    const existingWorkout = await prisma.workout.findFirst({
      where: {
        id: workoutId,
        workspaceId: context.workspaceId,
        studentId: member.userId,
      },
    });

    if (!existingWorkout) {
      return NextResponse.json({ error: "Treino não encontrado ou não pertence a este aluno." }, { status: 404 });
    }

    const updated = await serializableTransaction(async (tx) => {
      const updateData: any = {};
      if (name !== undefined) updateData.name = name.trim();
      if (goal !== undefined) updateData.goal = goal;
      if (difficulty !== undefined) updateData.difficulty = difficulty;
      if (duration !== undefined) updateData.duration = duration;
      if (muscleGroupLabel !== undefined) updateData.muscleGroupLabel = muscleGroupLabel;
      if (restBetweenExercises !== undefined) updateData.restBetweenExercises = restBetweenExercises;
      if (dayOfWeek !== undefined) updateData.dayOfWeek = Number(dayOfWeek);
      if (allowRepsModification !== undefined) updateData.allowRepsModification = allowRepsModification;
      if (allowCompleteView !== undefined) updateData.allowCompleteView = allowCompleteView;
      if (allowSkipExercises !== undefined) updateData.allowSkipExercises = allowSkipExercises;

      const workout = await tx.workout.update({
        where: { id: workoutId },
        data: updateData,
      });

      if (Array.isArray(exercises)) {
        await tx.workoutExercise.deleteMany({ where: { workoutId } });
        await tx.workoutExerciseGroup.deleteMany({ where: { workoutId } });

        const groupMap: Record<string, string> = {};
        if (Array.isArray(groups)) {
          for (const g of groups) {
            const newG = await tx.workoutExerciseGroup.create({
              data: {
                workoutId,
                type: g.type,
                config: g.config ?? undefined,
              },
            });
            groupMap[g.id] = newG.id;
          }
        }

        for (let i = 0; i < exercises.length; i++) {
          const ex = exercises[i];
          const dbGroupId = ex.groupId ? groupMap[ex.groupId] ?? null : null;
          await tx.workoutExercise.create({
            data: {
              workoutId,
              exerciseId: ex.exerciseId,
              sets: Math.max(1, Number(ex.sets) || 1),
              reps: String(ex.reps || "10"),
              rest: String(ex.rest || "60s"),
              load: ex.load ? String(ex.load) : "",
              description: ex.description || null,
              order: i,
              methodType: ex.methodType || "NONE",
              methodConfig: ex.methodConfig ?? undefined,
              groupId: dbGroupId,
              allowRepsModification: ex.allowRepsModification ?? true,
            },
          });
        }
      }

      await tx.auditLog.create({
        data: {
          userId: context.userId,
          action: "GYM_STUDENT_WORKOUT_UPDATED",
          entity: "WORKOUT",
          entityId: workoutId,
          severity: "info",
        },
      });

      return workout;
    });

    return NextResponse.json(updated);
  } catch (error) {
    const accessError = handleWorkspaceAccessError(error);
    if (accessError) return accessError;
    console.error("PATCH gym student workout error:", error);
    return NextResponse.json({ error: "Erro interno do servidor ao atualizar treino." }, { status: 500 });
  }
});

export const DELETE = withAuditedRequest(async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; workoutId: string }> }
) {
  try {
    const { id, workoutId } = await params;
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId");

    const member = await prisma.workspaceMember.findFirst({
      where: {
        OR: [{ id }, { userId: id }],
        ...(workspaceId ? { workspaceId } : {}),
      },
    });

    if (!member) {
      return NextResponse.json({ error: "Aluno não encontrado." }, { status: 404 });
    }

    const targetWorkspaceId = workspaceId || member.workspaceId;

    const context = await requireGymWorkspaceAccess({
      workspaceId: targetWorkspaceId,
      anyCapability: ["workouts.manage.assigned", "workspace.manage"],
    });

    await authorizeGymStudent(context.workspaceId, member.id, context.userId, "workouts.manage.assigned");

    const existingWorkout = await prisma.workout.findFirst({
      where: {
        id: workoutId,
        workspaceId: context.workspaceId,
        studentId: member.userId,
      },
    });

    if (!existingWorkout) {
      return NextResponse.json({ error: "Treino não encontrado." }, { status: 404 });
    }

    await serializableTransaction(async (tx) => {
      await tx.workoutExercise.deleteMany({ where: { workoutId } });
      await tx.workoutExerciseGroup.deleteMany({ where: { workoutId } });
      await tx.workout.delete({ where: { id: workoutId } });

      await tx.auditLog.create({
        data: {
          userId: context.userId,
          action: "GYM_STUDENT_WORKOUT_DELETED",
          entity: "WORKOUT",
          entityId: workoutId,
          severity: "info",
        },
      });
    });

    return NextResponse.json({ success: true, message: "Treino removido com sucesso." });
  } catch (error) {
    const accessError = handleWorkspaceAccessError(error);
    if (accessError) return accessError;
    console.error("DELETE gym student workout error:", error);
    return NextResponse.json({ error: "Erro interno do servidor ao excluir treino." }, { status: 500 });
  }
});
