import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { areWorkoutsIdentical } from "@/lib/workout-duplicate-checker";
import { NotificationService } from "@/lib/notifications/service";

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

    // Parse JSON body if present
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const {
      targetType = body.targetStudentId ? "STUDENT" : "TEMPLATE",
      targetStudentId = null,
      dayOfWeek = null,
      includeObservations = true,
      name = null,
      goal = null,
      difficulty = null,
      duration = null,
      muscleGroupLabel = null,
      restBetweenExercises = null,
      allowRepsModification = null,
      allowCompleteView = null,
      allowSkipExercises = null,
      excludedExerciseIds = [],
      exerciseConfigs = {},
    } = body;

    // Find original workout with exercises and groups
    const originalWorkout = await prisma.workout.findFirst({
      where: {
        id,
        creatorId: session.user.id,
      },
      include: {
        exercises: {
          include: {
            exercise: true,
          },
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

    // Verify workspace access if workspaceId is present
    if (originalWorkout.workspaceId) {
      const workspaceMember = await prisma.workspaceMember.findFirst({
        where: {
          userId: session.user.id,
          workspaceId: originalWorkout.workspaceId,
        },
      });

      if (!workspaceMember) {
        return new NextResponse("Acesso negado a este workspace.", { status: 403 });
      }
    }

    // Process exercises with customizations and sanitization
    const excludedSet = new Set(Array.isArray(excludedExerciseIds) ? excludedExerciseIds : []);
    const exercisesToCopy = originalWorkout.exercises
      .filter((ex) => !excludedSet.has(ex.id))
      .map((ex) => {
        const cfg = exerciseConfigs[ex.id];
        if (!cfg) return ex;

        const rawSets = cfg.sets !== undefined && cfg.sets !== "" ? Number(cfg.sets) : ex.sets;
        const boundedSets = isNaN(rawSets) ? ex.sets : Math.max(1, Math.min(100, rawSets));
        const cleanReps = cfg.reps !== undefined && cfg.reps !== "" ? String(cfg.reps).slice(0, 50) : ex.reps;
        const cleanLoad = cfg.load !== undefined ? String(cfg.load).slice(0, 100) : (ex.load || "");
        const cleanRest = cfg.rest !== undefined && cfg.rest !== "" ? String(cfg.rest).slice(0, 50) : ex.rest;
        const cleanDescription = cfg.description !== undefined ? String(cfg.description).slice(0, 500) : ex.description;

        return {
          ...ex,
          sets: boundedSets,
          reps: cleanReps,
          load: cleanLoad,
          rest: cleanRest,
          description: cleanDescription,
        };
      });

    // Determine target student ID and day of week
    let finalStudentId: string | null = null;
    let finalDayOfWeek: number | null = null;
    let targetStudentName: string | null = null;

    if (targetType === "STUDENT" && targetStudentId) {
      // Validate that the target student exists
      const studentUser = await prisma.user.findUnique({
        where: { id: targetStudentId },
        select: { id: true, name: true },
      });
      if (!studentUser) {
        return new NextResponse("Aluno de destino não encontrado.", { status: 404 });
      }

      // If workspace is set, verify student is in the same workspace (Tenant Isolation)
      if (originalWorkout.workspaceId) {
        const studentMember = await prisma.workspaceMember.findFirst({
          where: {
            userId: targetStudentId,
            workspaceId: originalWorkout.workspaceId,
          },
        });
        if (!studentMember) {
          return new NextResponse("Aluno não pertence ao workspace do treino.", { status: 403 });
        }
      }

      finalStudentId = studentUser.id;
      targetStudentName = studentUser.name || "Aluno";

      // Validate & bound dayOfWeek (0 to 6)
      const parsedDay = typeof dayOfWeek === "number" ? dayOfWeek : parseInt(String(dayOfWeek));
      finalDayOfWeek = !isNaN(parsedDay) && parsedDay >= 0 && parsedDay <= 6
        ? parsedDay
        : (originalWorkout.dayOfWeek ?? 1);

      // Verificação rigorosa de duplicidade por dia, nome e exercícios
      const existingWorkoutsOnDay = await prisma.workout.findMany({
        where: {
          studentId: finalStudentId,
          workspaceId: originalWorkout.workspaceId,
          dayOfWeek: finalDayOfWeek,
        },
        include: {
          exercises: {
            include: {
              exercise: true,
            },
          },
        },
      });

      const targetWorkoutName = name || originalWorkout.name || `Cópia de ${originalWorkout.name}`;

      const isDuplicate = existingWorkoutsOnDay.some((existing) =>
        areWorkoutsIdentical(
          {
            name: targetWorkoutName,
            exercises: exercisesToCopy,
          },
          existing
        )
      );

      if (isDuplicate) {
        return new NextResponse(
          "Este mesmo treino já existe no dia selecionado para este aluno.",
          { status: 400 }
        );
      }
    } else {
      finalStudentId = null;
      finalDayOfWeek = null;
    }

    // Duplicate workout within transaction
    const duplicatedWorkout = await prisma.$transaction(async (tx) => {
      const newWorkout = await tx.workout.create({
        data: {
          name: name ? String(name).slice(0, 150) : (targetType === "TEMPLATE" ? `${originalWorkout.name} (Modelo)` : `Cópia de ${originalWorkout.name}`),
          goal: goal ? String(goal).slice(0, 100) : originalWorkout.goal,
          difficulty: difficulty ? String(difficulty).slice(0, 50) : originalWorkout.difficulty,
          duration: duration ? String(duration).slice(0, 50) : originalWorkout.duration,
          muscleGroupLabel: muscleGroupLabel !== null ? (muscleGroupLabel ? String(muscleGroupLabel).slice(0, 100) : null) : originalWorkout.muscleGroupLabel,
          restBetweenExercises: restBetweenExercises !== null ? (restBetweenExercises ? String(restBetweenExercises).slice(0, 50) : null) : originalWorkout.restBetweenExercises,
          creatorId: session.user.id,
          workspaceId: originalWorkout.workspaceId,
          studentId: finalStudentId,
          dayOfWeek: finalDayOfWeek,
          allowRepsModification: allowRepsModification !== null ? allowRepsModification : (originalWorkout.allowRepsModification ?? true),
          allowCompleteView: allowCompleteView !== null ? allowCompleteView : (originalWorkout.allowCompleteView ?? false),
          allowSkipExercises: allowSkipExercises !== null ? allowSkipExercises : (originalWorkout.allowSkipExercises ?? false),
        },
      });

      const groupMap: Record<string, string> = {};
      if (originalWorkout.exerciseGroups && originalWorkout.exerciseGroups.length > 0) {
        for (const g of originalWorkout.exerciseGroups) {
          const dbGroup = await tx.workoutExerciseGroup.create({
            data: {
              workoutId: newWorkout.id,
              type: g.type,
              config: (g.config || undefined) as any,
            },
          });
          groupMap[g.id] = dbGroup.id;
        }
      }

      if (exercisesToCopy.length > 0) {
        for (const ex of exercisesToCopy) {
          const dbGroupId = ex.groupId ? groupMap[ex.groupId] : null;
          const cfg = exerciseConfigs[ex.id];

          const rawSets = cfg?.sets !== undefined && cfg.sets !== "" ? Number(cfg.sets) : ex.sets;
          const finalSets = isNaN(rawSets) ? ex.sets : Math.max(1, Math.min(100, rawSets));
          const finalReps = cfg?.reps !== undefined && cfg.reps !== "" ? String(cfg.reps).slice(0, 50) : ex.reps;
          const finalRest = cfg?.rest !== undefined && cfg.rest !== "" ? String(cfg.rest).slice(0, 50) : ex.rest;
          const finalLoad = cfg?.load !== undefined ? String(cfg.load).slice(0, 100) : (ex.load || "");
          const finalDescription = cfg?.description !== undefined
            ? String(cfg.description).slice(0, 500)
            : (includeObservations ? ex.description : null);

          await tx.workoutExercise.create({
            data: {
              workoutId: newWorkout.id,
              exerciseId: ex.exerciseId,
              sets: finalSets,
              reps: finalReps,
              rest: finalRest,
              load: finalLoad,
              description: finalDescription,
              order: ex.order,
              methodType: ex.methodType || "NONE",
              methodConfig: (ex.methodConfig || undefined) as any,
              groupId: dbGroupId,
            },
          });
        }
      }

      const finalWorkout = await tx.workout.findUnique({
        where: { id: newWorkout.id },
        include: {
          student: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
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

      // Recalculate usage count for exercises
      const exerciseIds = exercisesToCopy.map((ex) => ex.exerciseId).filter(Boolean);
      for (const exId of Array.from(new Set(exerciseIds)) as string[]) {
        const count = await tx.workoutExercise.count({ where: { exerciseId: exId } });
        await tx.exercise.update({ where: { id: exId }, data: { usage: count } });
      }

      return finalWorkout;
    });

    // Send notification to student when duplicating workout
    if (finalStudentId && duplicatedWorkout) {
      try {
        await NotificationService.sendNotification({
          userId: finalStudentId,
          type: "TRAINING_CREATED",
          category: "TRAINING",
          title: "Novo Treino Prescrito! 🏋️‍♂️",
          description: `Seu personal trainer prescreveu o treino "${duplicatedWorkout.name}".`,
          deepLink: "/student/workouts",
          source: "TRAINING",
          workspaceId: originalWorkout.workspaceId || undefined,
        });
      } catch (notifErr) {
        console.error("Error sending notification for duplicated workout:", notifErr);
      }
    }

    return NextResponse.json({
      workout: duplicatedWorkout,
      targetType,
      studentId: finalStudentId,
      studentName: targetStudentName,
    }, { status: 201 });
  } catch (error: any) {
    console.error("Error duplicating workout:", error);
    return new NextResponse(error.message || "Erro Interno do Servidor", { status: 500 });
  }
}
