import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NotificationService } from "@/lib/notifications/service";


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
    const { name, goal, difficulty, duration, muscleGroupLabel, restBetweenExercises, dayOfWeek, exercises, groups } = body;

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
      let affectedExerciseIds: string[] = [];

      if (exercises) {
        // Obter os exercícios antigos para poder recalcular seu uso depois
        const oldExercises = await tx.workoutExercise.findMany({
          where: { workoutId },
          select: { exerciseId: true }
        });
        const oldIds = oldExercises.map(ex => ex.exerciseId);
        const newIds = exercises.map((ex: any) => ex.exerciseId).filter(Boolean);
        affectedExerciseIds = Array.from(new Set([...oldIds, ...newIds])) as string[];

        // 1. Limpar relações de exercícios e grupos antigas caso o array de exercícios tenha sido fornecido
        await tx.workoutExercise.deleteMany({
          where: {
            workoutId,
          },
        });
        await tx.workoutExerciseGroup.deleteMany({
          where: {
            workoutId,
          },
        });

        // 2. Criar novos grupos
        const groupMap: Record<string, string> = {};
        if (groups && groups.length > 0) {
          for (const g of groups) {
            const dbGroup = await tx.workoutExerciseGroup.create({
              data: {
                workoutId,
                type: g.type,
                config: g.config || null,
              },
            });
            groupMap[g.id] = dbGroup.id;
          }
        }

        // 3. Criar novos exercícios com IDs de grupo mapeados
        for (let index = 0; index < exercises.length; index++) {
          const ex = exercises[index];
          const dbGroupId = ex.groupId ? groupMap[ex.groupId] : null;
          await tx.workoutExercise.create({
            data: {
              workoutId,
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

      // 4. Atualizar os dados gerais do treino do aluno
      const dataToUpdate: any = {};
      if (name !== undefined) dataToUpdate.name = name;
      if (goal !== undefined) dataToUpdate.goal = goal;
      if (difficulty !== undefined) dataToUpdate.difficulty = difficulty;
      if (duration !== undefined) dataToUpdate.duration = duration;
      if (muscleGroupLabel !== undefined) dataToUpdate.muscleGroupLabel = muscleGroupLabel;
      if (restBetweenExercises !== undefined) dataToUpdate.restBetweenExercises = restBetweenExercises;
      if (dayOfWeek !== undefined) dataToUpdate.dayOfWeek = Number(dayOfWeek);

      const updated = await tx.workout.update({
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
              group: true,
            },
            orderBy: {
              order: "asc",
            },
          },
          exerciseGroups: true,
        },
      });

      // 5. Recalcular a utilização dos exercícios afetados
      if (exercises && affectedExerciseIds.length > 0) {
        for (const exId of affectedExerciseIds) {
          const count = await tx.workoutExercise.count({ where: { exerciseId: exId } });
          await tx.exercise.update({ where: { id: exId }, data: { usage: count } });
        }
      }

      return updated;
    });

    if (updatedWorkout) {
      await NotificationService.sendNotification({
        userId: studentId,
        type: "TRAINING_UPDATED",
        category: "TRAINING",
        title: "Treino Atualizado 🔄",
        description: `Seu treino "${updatedWorkout.name}" foi atualizado pelo personal.`,
        deepLink: "/student/workouts",
        source: "TRAINING",
        workspaceId: updatedWorkout.workspaceId || undefined
      });
    }

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
      include: {
        exercises: {
          select: {
            exerciseId: true
          }
        }
      }
    });

    if (!existingWorkout) {
      return new NextResponse("Treino não encontrado ou não autorizado.", { status: 404 });
    }

    const exerciseIds = existingWorkout.exercises.map(ex => ex.exerciseId);

    // Excluir o treino e recalcular o uso de todos os exercícios que estavam vinculados a ele na mesma transação
    await prisma.$transaction(async (tx) => {
      await tx.workout.delete({
        where: {
          id: workoutId,
        },
      });

      for (const exId of exerciseIds) {
        const count = await tx.workoutExercise.count({ where: { exerciseId: exId } });
        await tx.exercise.update({ where: { id: exId }, data: { usage: count } });
      }
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("DELETE student workout error:", error);
    return new NextResponse("Erro Interno do Servidor", { status: 500 });
  }
}
