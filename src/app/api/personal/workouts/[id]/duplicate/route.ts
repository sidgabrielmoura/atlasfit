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
        exerciseGroups: true,
      },
    });

    if (!originalWorkout) {
      return new NextResponse("Treino original não encontrado.", { status: 404 });
    }

    // Create a duplicate workout
    const duplicatedWorkout = await prisma.$transaction(async (tx) => {
      const workout = await tx.workout.create({
        data: {
          name: `Cópia de ${originalWorkout.name}`,
          goal: originalWorkout.goal,
          difficulty: originalWorkout.difficulty,
          duration: originalWorkout.duration,
          muscleGroupLabel: originalWorkout.muscleGroupLabel,
          restBetweenExercises: originalWorkout.restBetweenExercises,
          creatorId: session.user.id,
          workspaceId: originalWorkout.workspaceId,
        },
      });

      const groupMap: Record<string, string> = {};
      if (originalWorkout.exerciseGroups && originalWorkout.exerciseGroups.length > 0) {
        for (const g of originalWorkout.exerciseGroups) {
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

      if (originalWorkout.exercises && originalWorkout.exercises.length > 0) {
        for (const ex of originalWorkout.exercises) {
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

      // Recalcular uso de todos os exercícios copiados
      const exerciseIds = originalWorkout.exercises.map((ex) => ex.exerciseId).filter(Boolean);
      for (const exId of Array.from(new Set(exerciseIds)) as string[]) {
        const count = await tx.workoutExercise.count({ where: { exerciseId: exId } });
        await tx.exercise.update({ where: { id: exId }, data: { usage: count } });
      }

      return finalWorkout;
    });

    return NextResponse.json(duplicatedWorkout, { status: 201 });
  } catch (error) {
    console.error("Error duplicating workout:", error);
    return new NextResponse("Erro Interno do Servidor", { status: 500 });
  }
}
