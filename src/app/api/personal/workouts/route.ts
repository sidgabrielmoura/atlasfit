import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

// GET /api/personal/workouts
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Não autorizado. Por favor, faça login.", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId");

    const whereClause: any = {
      creatorId: session.user.id,
      studentId: null,
    };

    if (workspaceId) {
      whereClause.workspaceId = workspaceId;
    }

    const workouts = await prisma.workout.findMany({
      where: whereClause,
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
        createdAt: "desc",
      },
    });

    return NextResponse.json(workouts);
  } catch (error) {
    console.error("Error fetching workouts:", error);
    return new NextResponse("Erro Interno do Servidor", { status: 500 });
  }
}

// POST /api/personal/workouts
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Não autorizado. Por favor, faça login.", { status: 401 });
    }

    const body = await req.json();
    const { name, goal, difficulty, duration, muscleGroupLabel, restBetweenExercises, exercises, workspaceId } = body;

    if (!name || !goal || !difficulty || !duration) {
      return new NextResponse("Campos obrigatórios ausentes.", { status: 400 });
    }

    if (workspaceId) {
      const workspaceMember = await prisma.workspaceMember.findFirst({
        where: {
          userId: session.user.id,
          workspaceId,
        },
      });

      if (!workspaceMember) {
        return new NextResponse("Acesso negado ao workspace informado.", { status: 403 });
      }
    }

    const workout = await prisma.$transaction(async (tx) => {
      const created = await tx.workout.create({
        data: {
          name,
          goal,
          difficulty,
          duration,
          muscleGroupLabel: muscleGroupLabel || null,
          restBetweenExercises: restBetweenExercises || "2 min",
          creatorId: session.user.id,
          workspaceId: workspaceId || null,
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

      // Recalcular uso para todos os exercícios associados
      const exerciseIds = (exercises || []).map((ex: any) => ex.exerciseId).filter(Boolean);
      for (const id of Array.from(new Set(exerciseIds)) as string[]) {
        const count = await tx.workoutExercise.count({ where: { exerciseId: id } });
        await tx.exercise.update({ where: { id }, data: { usage: count } });
      }

      return created;
    });

    return NextResponse.json(workout, { status: 201 });
  } catch (error) {
    console.error("Error creating workout:", error);
    return new NextResponse("Erro Interno do Servidor", { status: 500 });
  }
}
