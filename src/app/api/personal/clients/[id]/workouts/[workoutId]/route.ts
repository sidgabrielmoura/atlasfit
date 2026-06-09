import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

// PATCH /api/personal/clients/[id]/workouts/[workoutId]
// Atualiza metadados e os exercícios vinculados ao treino do aluno de forma transacional e atômica.
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; workoutId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse("Não autorizado.", { status: 401 });
  }

  const { id: studentId, workoutId } = await params;

  try {
    const body = await req.json();
    const { name, goal, difficulty, duration, muscleGroupLabel, restBetweenExercises, dayOfWeek, exercises } = body;

    // Verificar se o treino existe e pertence ao aluno e foi criado pelo personal trainer
    const existingWorkout = await prisma.workout.findFirst({
      where: {
        id: workoutId,
        studentId,
        creatorId: session.user.id,
      },
    });

    if (!existingWorkout) {
      return new NextResponse("Treino não encontrado ou não autorizado.", { status: 404 });
    }

    // Transação atômica para limpar exercícios antigos e registrar os novos
    const updatedWorkout = await prisma.$transaction(async (tx) => {
      // 1. Limpar relações de exercícios antigas caso o array de exercícios tenha sido fornecido
      if (exercises) {
        await tx.workoutExercise.deleteMany({
          where: {
            workoutId,
          },
        });
      }

      // 2. Atualizar os dados gerais do treino do aluno
      const dataToUpdate: any = {};
      if (name !== undefined) dataToUpdate.name = name;
      if (goal !== undefined) dataToUpdate.goal = goal;
      if (difficulty !== undefined) dataToUpdate.difficulty = difficulty;
      if (duration !== undefined) dataToUpdate.duration = duration;
      if (muscleGroupLabel !== undefined) dataToUpdate.muscleGroupLabel = muscleGroupLabel;
      if (restBetweenExercises !== undefined) dataToUpdate.restBetweenExercises = restBetweenExercises;
      if (dayOfWeek !== undefined) dataToUpdate.dayOfWeek = Number(dayOfWeek);

      if (exercises) {
        dataToUpdate.exercises = {
          create: exercises.map((ex: any, index: number) => ({
            exerciseId: ex.exerciseId,
            sets: Number(ex.sets) || 4,
            reps: String(ex.reps) || "10",
            rest: String(ex.rest) || "60s",
            load: ex.load ? String(ex.load) : "",
            order: index,
          })),
        };
      }

      return await tx.workout.update({
        where: {
          id: workoutId,
        },
        data: dataToUpdate,
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
    console.error("PATCH student workout error:", error);
    return new NextResponse("Erro Interno do Servidor", { status: 500 });
  }
}

// DELETE /api/personal/clients/[id]/workouts/[workoutId]
// Deleta completamente o treino exclusivo/atribuído ao aluno.
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; workoutId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse("Não autorizado.", { status: 401 });
  }

  const { id: studentId, workoutId } = await params;

  try {
    // Verificar se o treino pertence a este aluno e foi criado pelo personal trainer
    const existingWorkout = await prisma.workout.findFirst({
      where: {
        id: workoutId,
        studentId,
        creatorId: session.user.id,
      },
    });

    if (!existingWorkout) {
      return new NextResponse("Treino não encontrado ou não autorizado.", { status: 404 });
    }

    // Excluir o treino (os exercícios associados em WorkoutExercise serão deletados em cascata pelo banco)
    await prisma.workout.delete({
      where: {
        id: workoutId,
      },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("DELETE student workout error:", error);
    return new NextResponse("Erro Interno do Servidor", { status: 500 });
  }
}
