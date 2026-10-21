import { withAuditedRequest } from "@/lib/audited-request";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireGymWorkspaceAccess, handleWorkspaceAccessError } from "@/modules/workspaces/application/guard";
import { authorizeGymStudent } from "@/modules/workspaces/application/student-authority";
import { serializableTransaction } from "@/modules/workspaces/application/transaction";
import { WorkspaceAccessError } from "@/modules/workspaces/domain/types";

export const GET = withAuditedRequest(async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId");

    if (!workspaceId) {
      return NextResponse.json({ error: "O ID do workspace é obrigatório." }, { status: 400 });
    }

    const context = await requireGymWorkspaceAccess({
      workspaceId,
      anyCapability: ["workouts.read", "students.read", "workspace.manage"],
    });

    // Resolve member by id or userId
    const member = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId: context.workspaceId,
        OR: [{ id }, { userId: id }],
      },
    });

    if (!member) {
      return NextResponse.json({ error: "Aluno não encontrado nesta academia." }, { status: 404 });
    }

    await authorizeGymStudent(context.workspaceId, member.id, context.userId, "workouts.read");

    const workouts = await prisma.workout.findMany({
      where: {
        workspaceId: context.workspaceId,
        studentId: member.userId,
        isActive: true,
      },
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
          orderBy: {
            order: "asc",
          },
        },
        exerciseGroups: true,
      },
      orderBy: [{ dayOfWeek: "asc" }, { createdAt: "desc" }],
    });

    return NextResponse.json(workouts);
  } catch (error) {
    const accessError = handleWorkspaceAccessError(error);
    if (accessError) return accessError;
    console.error("GET gym student workouts error:", error);
    return NextResponse.json({ error: "Erro interno do servidor." }, { status: 500 });
  }
});

export const POST = withAuditedRequest(async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const {
      workspaceId,
      dayOfWeek,
      cloneFromWorkoutId,
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
    } = body;

    if (!workspaceId || dayOfWeek === undefined) {
      return NextResponse.json({ error: "Campos obrigatórios ausentes (workspaceId, dayOfWeek)." }, { status: 400 });
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

    const createdWorkout = await serializableTransaction(async (tx) => {
      let workout;

      if (cloneFromWorkoutId) {
        const template = await tx.workout.findFirst({
          where: {
            id: cloneFromWorkoutId,
            workspaceId: context.workspaceId,
            studentId: null,
            isActive: true,
          },
          include: {
            exercises: {
              orderBy: { order: "asc" },
            },
            exerciseGroups: true,
          },
        });

        if (!template) {
          throw new WorkspaceAccessError(404, "TEMPLATE_NOT_FOUND", "Modelo de treino não encontrado nesta academia.");
        }

        workout = await tx.workout.create({
          data: {
            workspaceId: context.workspaceId,
            studentId: member.userId,
            creatorId: context.userId,
            name: template.name,
            goal: template.goal,
            difficulty: template.difficulty,
            duration: template.duration,
            muscleGroupLabel: template.muscleGroupLabel,
            restBetweenExercises: template.restBetweenExercises,
            dayOfWeek: Number(dayOfWeek),
            allowRepsModification: template.allowRepsModification,
            allowCompleteView: template.allowCompleteView,
            allowSkipExercises: template.allowSkipExercises,
          },
        });

        const groupMap: Record<string, string> = {};
        for (const g of template.exerciseGroups) {
          const newG = await tx.workoutExerciseGroup.create({
            data: {
              workoutId: workout.id,
              type: g.type,
              config: g.config ?? undefined,
            },
          });
          groupMap[g.id] = newG.id;
        }

        for (let i = 0; i < template.exercises.length; i++) {
          const ex = template.exercises[i];
          const newGroupId = ex.groupId ? groupMap[ex.groupId] ?? null : null;
          await tx.workoutExercise.create({
            data: {
              workoutId: workout.id,
              exerciseId: ex.exerciseId,
              sets: ex.sets,
              reps: ex.reps,
              rest: ex.rest,
              load: ex.load,
              description: ex.description,
              order: ex.order ?? i,
              methodType: ex.methodType || "NONE",
              methodConfig: ex.methodConfig ?? undefined,
              groupId: newGroupId,
              allowRepsModification: ex.allowRepsModification,
            },
          });
        }
      } else {
        if (!name?.trim()) {
          throw new WorkspaceAccessError(400, "INVALID_NAME", "Nome do treino é obrigatório.");
        }

        workout = await tx.workout.create({
          data: {
            workspaceId: context.workspaceId,
            studentId: member.userId,
            creatorId: context.userId,
            name: name.trim(),
            goal: goal || "Hipertrofia",
            difficulty: difficulty || "Intermediário",
            duration: duration || "60 min",
            muscleGroupLabel: muscleGroupLabel || null,
            restBetweenExercises: restBetweenExercises || "02:00",
            dayOfWeek: Number(dayOfWeek),
            allowRepsModification: allowRepsModification ?? true,
            allowCompleteView: allowCompleteView ?? false,
            allowSkipExercises: allowSkipExercises ?? false,
          },
        });

        const groupMap: Record<string, string> = {};
        if (Array.isArray(groups)) {
          for (const g of groups) {
            const newG = await tx.workoutExerciseGroup.create({
              data: {
                workoutId: workout.id,
                type: g.type,
                config: g.config ?? undefined,
              },
            });
            groupMap[g.id] = newG.id;
          }
        }

        if (Array.isArray(exercises) && exercises.length > 0) {
          for (let i = 0; i < exercises.length; i++) {
            const ex = exercises[i];
            const mappedGroupId = ex.groupId ? groupMap[ex.groupId] ?? null : null;
            await tx.workoutExercise.create({
              data: {
                workoutId: workout.id,
                exerciseId: ex.exerciseId,
                sets: Math.max(1, Number(ex.sets) || 1),
                reps: String(ex.reps || "10"),
                rest: String(ex.rest || "60s"),
                load: ex.load ? String(ex.load) : "",
                description: ex.description || null,
                order: i,
                methodType: ex.methodType || "NONE",
                methodConfig: ex.methodConfig ?? undefined,
                groupId: mappedGroupId,
                allowRepsModification: ex.allowRepsModification ?? true,
              },
            });
          }
        }
      }

      await tx.auditLog.create({
        data: {
          userId: context.userId,
          action: "GYM_STUDENT_WORKOUT_ASSIGNED",
          entity: "WORKOUT",
          entityId: workout.id,
          severity: "info",
        },
      });

      return workout;
    });

    return NextResponse.json(createdWorkout, { status: 201 });
  } catch (error) {
    const accessError = handleWorkspaceAccessError(error);
    if (accessError) return accessError;
    console.error("POST gym student workouts error:", error);
    return NextResponse.json({ error: "Erro interno do servidor ao criar treino." }, { status: 500 });
  }
});
