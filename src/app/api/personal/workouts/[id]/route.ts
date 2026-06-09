import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

// GET /api/personal/workouts/[id]
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Não autorizado.", { status: 401 });
    }

    const { id } = await params;

    const workout = await prisma.workout.findFirst({
      where: {
        id,
        creatorId: session.user.id,
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

    if (!workout) {
      return new NextResponse("Treino não encontrado.", { status: 404 });
    }

    return NextResponse.json(workout);
  } catch (error) {
    console.error("Error fetching workout details:", error);
    return new NextResponse("Erro Interno do Servidor", { status: 500 });
  }
}

// PUT /api/personal/workouts/[id]
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Não autorizado.", { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { name, goal, difficulty, duration, muscleGroupLabel, restBetweenExercises, exercises } = body;

    if (!name || !goal || !difficulty || !duration) {
      return new NextResponse("Campos obrigatórios ausentes.", { status: 400 });
    }

    // Verify ownership
    const existingWorkout = await prisma.workout.findFirst({
      where: {
        id,
        creatorId: session.user.id,
      },
    });

    if (!existingWorkout) {
      return new NextResponse("Treino não encontrado ou não autorizado.", { status: 404 });
    }

    // Perform atomic transaction to delete old exercises and create new ones
    const updatedWorkout = await prisma.$transaction(async (tx) => {
      // 1. Delete all old workout exercises
      await tx.workoutExercise.deleteMany({
        where: {
          workoutId: id,
        },
      });

      // 2. Update general workout info and create new exercise associations
      return await tx.workout.update({
        where: {
          id,
        },
        data: {
          name,
          goal,
          difficulty,
          duration,
          muscleGroupLabel: muscleGroupLabel || null,
          restBetweenExercises: restBetweenExercises || "2 min",
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
    });

    return NextResponse.json(updatedWorkout);
  } catch (error) {
    console.error("Error updating workout:", error);
    return new NextResponse("Erro Interno do Servidor", { status: 500 });
  }
}

// DELETE /api/personal/workouts/[id]
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Não autorizado.", { status: 401 });
    }

    const { id } = await params;

    // Verify ownership
    const existingWorkout = await prisma.workout.findFirst({
      where: {
        id,
        creatorId: session.user.id,
      },
    });

    if (!existingWorkout) {
      return new NextResponse("Treino não encontrado ou não autorizado.", { status: 404 });
    }

    await prisma.workout.delete({
      where: {
        id,
      },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Error deleting workout:", error);
    return new NextResponse("Erro Interno do Servidor", { status: 500 });
  }
}
