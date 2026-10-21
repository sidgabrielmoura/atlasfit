import { withRequestMemo } from "@/lib/request-memo";
import { recordGymWorkoutCompletion } from "@/modules/workspaces/application/gym-student-health-events";
import { readPrivacyJsonRequest } from "@/lib/privacy/request-body";
import { authorizeGymStudent } from "@/modules/workspaces/application/student-authority";
import { handleWorkspaceAccessError } from "@/modules/workspaces/application/guard";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { getStudentWorkspaceMember } from "@/lib/student-auth";
import { studentWorkoutScope, studentWorkoutCompletionSchema } from "@/lib/student-workout-scope";
import { calculateStreaks, verifyAndDecayWorkspaceMemberStreak } from "@/lib/streak-helper";
import { NotificationService } from "@/lib/notifications/service";
import { EngagePushService } from "@/lib/engage/push-service";


async function handleGET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Não autorizado. Por favor, faça login.", { status: 401 });
  }

  try {
    const member = await getStudentWorkspaceMember(session.user.id);
    if (!member) return new NextResponse("Selecione um vínculo estudantil ativo.", { status: 409 });

    const workspaceId = member.workspaceId;
    if (member.workspace.type === "GYM") await authorizeGymStudent(workspaceId, member.id, session.user.id, req.method === "GET" ? "workouts.read" : "workouts.manage.assigned", { allowSelf: true });
    const trainerOwnerId = member.workspace?.ownerId;

    const workouts = await prisma.workout.findMany({
      where: {
        ...studentWorkoutScope(workspaceId, member.workspace.type, session.user.id)
      },
      include: {
        exercises: {
          include: {
            exercise: {
              include: {
                muscleGroup: true,
                trainerVideoLinks: {
                  where: {
                    video: member.workspace.type === "GYM" ? { workspaceId } : {
                      OR: [
                        { workspaceId },
                        ...(trainerOwnerId ? [{ trainerId: trainerOwnerId }] : []),
                        { trainer: { workspaces: { some: { workspaceId } } } },
                      ],
                    },
                  },
                  include: {
                    video: true,
                  },
                  orderBy: {
                    createdAt: "desc",
                  },
                },
              },
            },
            group: true,
          },
          orderBy: {
            order: "asc",
          }
        },
        exerciseGroups: true,
      },
      orderBy: {
        dayOfWeek: "asc",
      }
    });

    const formattedWorkouts = workouts.map((w) => ({
      ...w,
      exercises: w.exercises.map((we) => {
        const trainerLink = we.exercise?.trainerVideoLinks?.[0];
        const customVideoUrl = trainerLink?.video?.videoUrl;
        return {
          ...we,
          exercise: we.exercise
            ? {
                ...we.exercise,
                videoUrl: customVideoUrl || we.exercise.videoUrl,
                isCustomTrainerVideo: Boolean(customVideoUrl),
                trainerVideoTitle: trainerLink?.video?.title,
              }
            : null,
        };
      }),
    }));

    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const logs = await prisma.workoutLog.findMany({
      where: {
        studentId: session.user.id,
        workspaceId,
        workout: { workspaceId },
      },
      include: {
        workout: {
          select: {
            id: true,
            name: true,
            muscleGroupLabel: true,
            dayOfWeek: true,
          }
        }
      },
      orderBy: {
        completedAt: "desc",
      },
    });

    await verifyAndDecayWorkspaceMemberStreak(member, logs.map(l => l.completedAt));

    return NextResponse.json({
      workspaceId,
      workouts: formattedWorkouts,
      logs,
      canDoAnyWorkoutDay: member.canDoAnyWorkoutDay ?? false,
      startOfWeek: startOfWeek.toISOString(),
      endOfWeek: endOfWeek.toISOString(),
    });
  } catch (error) {
    const denied = handleWorkspaceAccessError(error); if (denied) return denied;
    console.error("Student Workouts API GET Error:", { errorType: error instanceof Error ? error.name : "UnknownError" });
    return new NextResponse("Erro Interno do Servidor", { status: 500 });
  }
}
export const GET = withRequestMemo(handleGET);

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Não autorizado. Por favor, faça login.", { status: 401 });
  }

  try {
    const parsed = studentWorkoutCompletionSchema.safeParse(await readPrivacyJsonRequest(req, 64 * 1024));
    if (!parsed.success) return new NextResponse("Registro de treino inválido.", { status: 400 });
    const { workoutId, feedback, effortScore, loads, reps, restTimes, skippedExercises } = parsed.data;
    const member = await getStudentWorkspaceMember(session.user.id);
    if (!member) return new NextResponse("Selecione um vínculo estudantil ativo.", { status: 409 });
    const targetWorkout = await prisma.workout.findFirst({ where: { id: workoutId, ...studentWorkoutScope(member.workspaceId, member.workspace.type, session.user.id) }, select: { dayOfWeek: true, exercises: { select: { id: true } } } });
    if (!targetWorkout) return new NextResponse("Treino não disponível neste vínculo.", { status: 404 });
    const exerciseIds = new Set(targetWorkout.exercises.map(exercise => exercise.id));
    if ([loads, reps, restTimes, skippedExercises].some(records => records && Object.keys(records).some(id => !exerciseIds.has(id)))) return new NextResponse("Registro contém exercício de outro treino.", { status: 400 });

    // 2. Validate day restriction if personal configured strict day execution
    if (member.canDoAnyWorkoutDay === false) {
      const todayDayOfWeek = new Date().getDay();
      if (
        targetWorkout?.dayOfWeek !== null &&
        targetWorkout?.dayOfWeek !== undefined &&
        targetWorkout.dayOfWeek !== todayDayOfWeek
      ) {
        return new NextResponse(
          "Seu personal trainer configurou para que você realize apenas o treino do dia atual.",
          { status: 403 }
        );
      }

      // Check if already completed today in restricted mode
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

      const alreadyCompletedToday = await prisma.workoutLog.findFirst({
        where: {
          studentId: session.user.id,
          workoutId,
          workspaceId: member.workspaceId,
          completedAt: {
            gte: todayStart,
            lte: todayEnd,
          },
        },
      });

      if (alreadyCompletedToday) {
        return new NextResponse(
          "No modo restrito, o treino já foi concluído hoje e não permite repetição.",
          { status: 403 }
        );
      }
    }

    const workspaceId = member.workspaceId;
    if (member.workspace.type === "GYM") await authorizeGymStudent(workspaceId, member.id, session.user.id, req.method === "GET" ? "workouts.read" : "workouts.manage.assigned", { allowSelf: true });

    if (member.workspace.type === "GYM") return NextResponse.json(await recordGymWorkoutCompletion(workspaceId, member.id, session.user.id, parsed.data));

    // 3. Create the completed workout log record
    const log = await prisma.workoutLog.create({
      data: {
        studentId: session.user.id,
        workoutId,
        workspaceId,
        feedback: feedback || null,
        effortScore: effortScore ?? null,
        loads,
        reps,
        restTimes,
        skippedExercises,
        completedAt: new Date(),
      },
    });

    // Notify trainer about completed workout
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { ownerId: true }
    });
    const completedWorkout = await prisma.workout.findUnique({
      where: { id: workoutId },
      select: { name: true }
    });
    if (workspace?.ownerId) {
      await NotificationService.sendNotification({
        userId: workspace.ownerId,
        type: "TRAINING_COMPLETED",
        category: "TRAINING",
        title: "Treino Concluído! 🏆",
        description: `O aluno "${session.user.name || "Aluno"}" concluiu o treino "${completedWorkout?.name || "Treino"}".`,
        deepLink: `/personal/clients/${session.user.id}/workout-logs`,
        source: "TRAINING",
        workspaceId
      });
    }

    // 2.1. Track Push Notification Conversion (if student received an Engage push within the last 6 hours)
    EngagePushService.trackPushConversion(session.user.id).catch((err) => {
      console.warn("[EngagePush] Error tracking workout conversion:", { errorType: err instanceof Error ? err.name : "UnknownError" });
    });

    // 3. Calculate and update streak and progress dynamically from all history
    const allLogs = await prisma.workoutLog.findMany({
      where: {
        studentId: session.user.id,
        workspaceId,
      },
      select: {
        completedAt: true,
      },
    });

    const { streak: newStreak, bestStreak: newBestStreak } = calculateStreaks(
      allLogs.map(l => l.completedAt)
    );

    // Calculate weekly compliance (progress)
    // Find workouts scheduled for the week
    const weeklyWorkoutsCount = await prisma.workout.count({
      where: {
        ...studentWorkoutScope(workspaceId, member.workspace.type, session.user.id),
        dayOfWeek: { not: null },
      }
    });

    // Count completions this week (from Monday)
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);

    const weeklyCompletionsCount = await prisma.workoutLog.count({
      where: {
        studentId: session.user.id,
        workspaceId,
        completedAt: {
          gte: startOfWeek,
        }
      }
    });

    const targetFrequency = weeklyWorkoutsCount || 4; // fallback 4 workouts a week
    const newProgress = Math.min(100, Math.round((weeklyCompletionsCount / targetFrequency) * 100));

    // Update member details
    await prisma.workspaceMember.update({
      where: {
        id: member.id,
      },
      data: {
        streak: newStreak,
        bestStreak: newBestStreak,
        progress: newProgress,
        lastActive: now,
      }
    });

    return NextResponse.json({
      success: true,
      log,
      streak: newStreak,
      bestStreak: newBestStreak,
      progress: newProgress,
    });
  } catch (error) {
    const denied = handleWorkspaceAccessError(error); if (denied) return denied;
    if (error instanceof SyntaxError) return new NextResponse("JSON inválido.", { status: 400 });
    console.error("[StudentWorkoutCompletion]", { errorType: error instanceof Error ? error.name : "UnknownError" });
    return new NextResponse("Erro Interno do Servidor", { status: 500 });
  }
}
