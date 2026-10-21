import { withAuditedRequest } from "@/lib/audited-request";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireGymWorkspaceAccess, handleWorkspaceAccessError } from "@/modules/workspaces/application/guard";

export const GET = withAuditedRequest(async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId");

    if (!workspaceId) {
      return NextResponse.json({ error: "O ID do workspace é obrigatório." }, { status: 400 });
    }

    const context = await requireGymWorkspaceAccess({
      workspaceId,
      anyCapability: ["workouts.read", "workspace.manage"],
    });

    const workouts = await prisma.workout.findMany({
      where: {
        workspaceId: context.workspaceId,
        studentId: null,
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
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(workouts);
  } catch (error) {
    const accessError = handleWorkspaceAccessError(error);
    if (accessError) return accessError;
    console.error("GET gym templates error:", error);
    return NextResponse.json({ error: "Erro interno do servidor ao carregar modelos." }, { status: 500 });
  }
});

export const POST = withAuditedRequest(async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      name,
      goal,
      difficulty,
      duration,
      muscleGroupLabel,
      restBetweenExercises,
      exercises,
      workspaceId,
      groups,
      allowRepsModification,
      allowCompleteView,
      allowSkipExercises,
    } = body;

    if (!name || !goal || !difficulty || !duration || !workspaceId) {
      return NextResponse.json({ error: "Campos obrigatórios ausentes." }, { status: 400 });
    }

    const context = await requireGymWorkspaceAccess({
      workspaceId,
      anyCapability: ["workouts.manage.assigned", "workspace.manage"],
    });

    const workout = await prisma.$transaction(async (tx) => {
      const created = await tx.workout.create({
        data: {
          name,
          goal,
          difficulty,
          duration,
          muscleGroupLabel: muscleGroupLabel || null,
          restBetweenExercises: restBetweenExercises || "02:00",
          creatorId: context.userId,
          workspaceId: context.workspaceId,
          allowRepsModification: allowRepsModification !== undefined ? Boolean(allowRepsModification) : true,
          allowCompleteView: allowCompleteView !== undefined ? Boolean(allowCompleteView) : false,
          allowSkipExercises: allowSkipExercises !== undefined ? Boolean(allowSkipExercises) : false,
        },
      });

      const groupMap: Record<string, string> = {};
      if (groups && groups.length > 0) {
        for (const g of groups) {
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

      if (exercises && exercises.length > 0) {
        for (let index = 0; index < exercises.length; index++) {
          const ex = exercises[index];
          const dbGroupId = ex.groupId ? groupMap[ex.groupId] : null;

          await tx.workoutExercise.create({
            data: {
              workoutId: created.id,
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
            orderBy: {
              order: "asc",
            },
          },
          exerciseGroups: true,
        },
      });

      // Recalcular uso dos exercícios
      const exerciseIds = (exercises || []).map((ex: any) => ex.exerciseId).filter(Boolean);
      for (const id of Array.from(new Set(exerciseIds)) as string[]) {
        const count = await tx.workoutExercise.count({ where: { exerciseId: id } });
        await tx.exercise.update({ where: { id }, data: { usage: count } });
      }

      await tx.auditLog.create({
        data: {
          userId: context.userId,
          entity: "WORKOUT",
          entityId: created.id,
          action: "GYM_TEMPLATE_CREATED",
          severity: "info",
        },
      });

      return finalWorkout;
    });

    return NextResponse.json(workout, { status: 201 });
  } catch (error) {
    const accessError = handleWorkspaceAccessError(error);
    if (accessError) return accessError;
    console.error("POST gym workout error:", error);
    return NextResponse.json({ error: "Erro interno do servidor ao criar treino." }, { status: 500 });
  }
});

