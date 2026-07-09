import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NotificationService } from "@/lib/notifications/service";


// GET /api/personal/clients/[id]/workouts
// Retorna os treinos atribuídos ao aluno ordenados por dia da semana (dayOfWeek)
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Não autorizado.", { status: 401 });
  }

  const { id: studentId } = await params;
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspaceId");

  if (!workspaceId) {
    return new NextResponse("O ID do workspace é obrigatório.", { status: 400 });
  }

  try {
    // Validar workspace
    const memberCheck = await prisma.workspaceMember.findFirst({
      where: {
        userId: session.user.id,
        workspaceId,
      },
    });

    if (!memberCheck) {
      return new NextResponse("Acesso negado a este workspace.", { status: 403 });
    }

    // Buscar treinos individuais vinculados ao aluno
    const workouts = await prisma.workout.findMany({
      where: {
        studentId,
        workspaceId,
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
        dayOfWeek: "asc",
      },
    });

    return NextResponse.json(workouts);
  } catch (error) {
    console.error("GET student workouts error:", error);
    return new NextResponse("Erro interno do servidor.", { status: 500 });
  }
}

// POST /api/personal/clients/[id]/workouts
// Cria um treino exclusivo para o aluno do zero OU clona um treino pronto do workspace para o aluno
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Não autorizado.", { status: 401 });
  }

  const { id: studentId } = await params;
  
  try {
    const body = await req.json();
    const {
      workspaceId,
      dayOfWeek,
      cloneFromWorkoutId, // Se fornecido, clona este treino pronto
      name,
      goal,
      difficulty,
      duration,
      muscleGroupLabel,
      restBetweenExercises,
      exercises, // Array opcional [{ exerciseId, sets, reps, rest, methodType, methodConfig, groupId }] para criação do zero
      groups, // Array opcional para grupos [{ id, type, config }]
    } = body;

    if (!workspaceId || dayOfWeek === undefined) {
      return new NextResponse("Campos obrigatórios ausentes (workspaceId, dayOfWeek).", { status: 400 });
    }

    // Validar se o personal trainer logado é membro do workspace
    const memberCheck = await prisma.workspaceMember.findFirst({
      where: {
        userId: session.user.id,
        workspaceId,
      },
    });

    if (!memberCheck) {
      return new NextResponse("Acesso negado a este workspace.", { status: 403 });
    }

    // Validar se o aluno informado existe no workspace
    const studentCheck = await prisma.workspaceMember.findFirst({
      where: {
        userId: studentId,
        workspaceId,
        role: "STUDENT",
      },
    });

    if (!studentCheck) {
      return new NextResponse("Aluno não encontrado neste workspace.", { status: 404 });
    }

    let createdWorkout;

    // Caso 1: Clonar um treino existente do workspace
    if (cloneFromWorkoutId) {
      const templateWorkout = await prisma.workout.findUnique({
        where: { id: cloneFromWorkoutId },
        include: {
          exercises: {
            orderBy: {
              order: "asc",
            },
          },
          exerciseGroups: true,
        },
      });

      if (!templateWorkout) {
        return new NextResponse("Treino de modelo não encontrado.", { status: 404 });
      }

      // Evitar clonagem cross-tenant de modelos de treino
      if (templateWorkout.workspaceId !== workspaceId && templateWorkout.creatorId !== session.user.id) {
        return new NextResponse("Não autorizado a clonar este treino.", { status: 403 });
      }

      createdWorkout = await prisma.$transaction(async (tx) => {
        const workout = await tx.workout.create({
          data: {
            name: `${templateWorkout.name}`,
            goal: templateWorkout.goal,
            difficulty: templateWorkout.difficulty,
            duration: templateWorkout.duration,
            muscleGroupLabel: templateWorkout.muscleGroupLabel || "Geral",
            restBetweenExercises: templateWorkout.restBetweenExercises,
            creatorId: session.user.id,
            workspaceId,
            studentId,
            dayOfWeek: Number(dayOfWeek),
          },
        });

        // Clonar grupos de exercícios do modelo
        const groupMap: Record<string, string> = {};
        if (templateWorkout.exerciseGroups && templateWorkout.exerciseGroups.length > 0) {
          for (const g of templateWorkout.exerciseGroups) {
            const dbGroup = await tx.workoutExerciseGroup.create({
              data: {
                workoutId: workout.id,
                type: g.type,
                config: (g.config || undefined) as any,
              },
            });
            groupMap[g.id] = dbGroup.id;
          }
        }

        // Clonar exercícios do modelo
        if (templateWorkout.exercises && templateWorkout.exercises.length > 0) {
          for (const ex of templateWorkout.exercises) {
            const dbGroupId = ex.groupId ? groupMap[ex.groupId] : null;
            await tx.workoutExercise.create({
              data: {
                workoutId: workout.id,
                exerciseId: ex.exerciseId,
                sets: ex.sets,
                reps: ex.reps,
                rest: ex.rest,
                load: ex.load || "",
                order: ex.order,
                methodType: ex.methodType || "NONE",
                methodConfig: (ex.methodConfig || undefined) as any,
                groupId: dbGroupId,
              },
            });
          }
        }

        const finalWorkout = await tx.workout.findUnique({
          where: { id: workout.id },
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

        // Recalcular uso de todos os exercícios adicionados
        const exerciseIds = templateWorkout.exercises.map(ex => ex.exerciseId).filter(Boolean);
        for (const exId of Array.from(new Set(exerciseIds)) as string[]) {
          const count = await tx.workoutExercise.count({ where: { exerciseId: exId } });
          await tx.exercise.update({ where: { id: exId }, data: { usage: count } });
        }

        return finalWorkout;
      });
    } else {
      // Caso 2: Criar do zero um treino exclusivo do aluno
      if (!name || !goal || !difficulty || !duration) {
        return new NextResponse("Dados de treino incompleto para criação do zero.", { status: 400 });
      }

      createdWorkout = await prisma.$transaction(async (tx) => {
        const workout = await tx.workout.create({
          data: {
            name,
            goal,
            difficulty,
            duration,
            muscleGroupLabel: muscleGroupLabel || "Geral",
            restBetweenExercises: restBetweenExercises || "2 min",
            creatorId: session.user.id,
            workspaceId,
            studentId,
            dayOfWeek: Number(dayOfWeek),
          },
        });

        // Criar grupos
        const groupMap: Record<string, string> = {};
        if (groups && groups.length > 0) {
          for (const g of groups) {
            const dbGroup = await tx.workoutExerciseGroup.create({
              data: {
                workoutId: workout.id,
                type: g.type,
                config: g.config || null,
              },
            });
            groupMap[g.id] = dbGroup.id;
          }
        }

        // Criar exercícios
        if (exercises && exercises.length > 0) {
          for (let index = 0; index < exercises.length; index++) {
            const ex = exercises[index];
            const dbGroupId = ex.groupId ? groupMap[ex.groupId] : null;
            await tx.workoutExercise.create({
              data: {
                workoutId: workout.id,
                exerciseId: ex.exerciseId,
                sets: Number(ex.sets) || 4,
                reps: String(ex.reps) || "10",
                rest: String(ex.rest) || "60s",
                load: ex.load ? String(ex.load) : "",
                order: index,
                methodType: ex.methodType || "NONE",
                methodConfig: ex.methodConfig || null,
                groupId: dbGroupId,
              },
            });
          }
        }

        const finalWorkout = await tx.workout.findUnique({
          where: { id: workout.id },
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

        // Recalcular uso de todos os exercícios adicionados
        const exerciseIds = (exercises || []).map((ex: any) => ex.exerciseId).filter(Boolean);
        for (const exId of Array.from(new Set(exerciseIds)) as string[]) {
          const count = await tx.workoutExercise.count({ where: { exerciseId: exId } });
          await tx.exercise.update({ where: { id: exId }, data: { usage: count } });
        }

        return finalWorkout;
      });
    }
    if (createdWorkout) {
      await NotificationService.sendNotification({
        userId: studentId,
        type: "TRAINING_CREATED",
        category: "TRAINING",
        title: "Novo Treino Prescrito! 🏋️‍♂️",
        description: `Seu personal trainer prescreveu o treino "${createdWorkout.name}".`,
        deepLink: "/student/workouts",
        source: "TRAINING",
        workspaceId
      });
    }

    return NextResponse.json(createdWorkout, { status: 201 });
  } catch (error) {
    console.error("POST student workouts error:", error);
    return new NextResponse("Erro interno do servidor.", { status: 500 });
  }
}
