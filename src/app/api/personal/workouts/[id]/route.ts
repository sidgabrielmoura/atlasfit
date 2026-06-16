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
      // Buscar os exercícios antigos para recalcular o uso depois
      const oldExercises = await tx.workoutExercise.findMany({
        where: { workoutId: id },
        select: { exerciseId: true }
      });
      const oldExerciseIds = oldExercises.map((oe: any) => oe.exerciseId);

      // 1. Delete all old workout exercises
      await tx.workoutExercise.deleteMany({
        where: {
          workoutId: id,
        },
      });

      // 2. Update general workout info and create new exercise associations
      const updated = await tx.workout.update({
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

      // Recalcular uso de todos os exercícios afetados (antigos e novos)
      const newExerciseIds = (exercises || []).map((ex: any) => ex.exerciseId).filter(Boolean);
      const affectedIds = Array.from(new Set([...oldExerciseIds, ...newExerciseIds])) as string[];
      for (const exId of affectedIds) {
        const count = await tx.workoutExercise.count({ where: { exerciseId: exId } });
        await tx.exercise.update({ where: { id: exId }, data: { usage: count } });
      }

      return updated;
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
      include: {
        exercises: {
          select: { exerciseId: true }
        }
      }
    });

    if (!existingWorkout) {
      return new NextResponse("Treino não encontrado ou não autorizado.", { status: 404 });
    }

    const exerciseIds = existingWorkout.exercises.map(ex => ex.exerciseId);

    await prisma.$transaction(async (tx) => {
      await tx.workout.delete({
        where: {
          id,
        },
      });

      // Recalcular uso de todos os exercícios que estavam neste treino
      for (const exId of exerciseIds) {
        const count = await tx.workoutExercise.count({ where: { exerciseId: exId } });
        await tx.exercise.update({ where: { id: exId }, data: { usage: count } });
      }
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Error deleting workout:", error);
    return new NextResponse("Erro Interno do Servidor", { status: 500 });
  }
}
