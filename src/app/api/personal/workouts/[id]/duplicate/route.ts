import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

// POST /api/personal/workouts/[id]/duplicate
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Não autorizado.", { status: 401 });
    }

    const { id } = await params;

    // Find the original workout with its exercises
    const originalWorkout = await prisma.workout.findFirst({
      where: {
        id,
        creatorId: session.user.id,
      },
      include: {
        exercises: {
          orderBy: {
            order: "asc",
          },
        },
      },
    });

    if (!originalWorkout) {
      return new NextResponse("Treino original não encontrado.", { status: 404 });
    }

    // Create a duplicate workout
    const duplicatedWorkout = await prisma.workout.create({
      data: {
        name: `Cópia de ${originalWorkout.name}`,
        goal: originalWorkout.goal,
        difficulty: originalWorkout.difficulty,
        duration: originalWorkout.duration,
        creatorId: session.user.id,
        exercises: {
          create: originalWorkout.exercises.map((ex) => ({
            exerciseId: ex.exerciseId,
            sets: ex.sets,
            reps: ex.reps,
            rest: ex.rest,
            order: ex.order,
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

    return NextResponse.json(duplicatedWorkout, { status: 201 });
  } catch (error) {
    console.error("Error duplicating workout:", error);
    return new NextResponse("Erro Interno do Servidor", { status: 500 });
  }
}
