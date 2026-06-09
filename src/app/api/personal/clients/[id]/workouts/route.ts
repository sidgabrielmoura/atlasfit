import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

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
          },
          orderBy: {
            order: "asc",
          },
        },
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
      exercises, // Array opcional [{ exerciseId, sets, reps, rest }] para criação do zero
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
        },
      });

      if (!templateWorkout) {
        return new NextResponse("Treino de modelo não encontrado.", { status: 404 });
      }

      createdWorkout = await prisma.workout.create({
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
          exercises: {
            create: templateWorkout.exercises.map((ex, index) => ({
              exerciseId: ex.exerciseId,
              sets: ex.sets,
              reps: ex.reps,
              rest: ex.rest,
              load: ex.load || "",
              order: index,
            })),
          },
        },
        include: {
          exercises: {
            include: {
              exercise: {
                include: {
                  muscleGroup: true,
                },
              },
            },
            orderBy: {
              order: "asc",
            },
          },
        },
      });
    } else {
      // Caso 2: Criar do zero um treino exclusivo do aluno
      if (!name || !goal || !difficulty || !duration) {
        return new NextResponse("Dados de treino incompleto para criação do zero.", { status: 400 });
      }

      createdWorkout = await prisma.workout.create({
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
          exercises: {
            create: (exercises || []).map((ex: any, index: number) => ({
              exerciseId: ex.exerciseId,
              sets: Number(ex.sets) || 4,
              reps: String(ex.reps) || "10",
              rest: String(ex.rest) || "60s",
              load: ex.load ? String(ex.load) : "",
              order: index,
            })),
          },
        },
        include: {
          exercises: {
            include: {
              exercise: {
                include: {
                  muscleGroup: true,
                },
              },
            },
            orderBy: {
              order: "asc",
            },
          },
        },
      });
    }

    return NextResponse.json(createdWorkout, { status: 201 });
  } catch (error) {
    console.error("POST student workouts error:", error);
    return new NextResponse("Erro interno do servidor.", { status: 500 });
  }
}
