import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { calculateStreaks, verifyAndDecayWorkspaceMemberStreak } from "@/lib/streak-helper";
import { NotificationService } from "@/lib/notifications/service";


export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Não autorizado. Por favor, faça login.", { status: 401 });
  }

  try {
    // 1. Get active student workspace member profile
    const member = await prisma.workspaceMember.findFirst({
      where: {
        userId: session.user.id,
        role: "STUDENT",
        isActive: true,
      },
    });

    if (!member) {
      return new NextResponse("Membro ativo do workspace não encontrado.", { status: 404 });
    }

    const workspaceId = member.workspaceId;

    // 2. Fetch all workouts assigned to the student (or general workspace templates)
    const workouts = await prisma.workout.findMany({
      where: {
        workspaceId,
        OR: [
          { studentId: session.user.id },
          { studentId: null }
        ]
      },
      include: {
        exercises: {
          include: {
            exercise: true,
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

    // 3. Fetch completed workouts history (WorkoutLog)
    const logs = await (prisma as any).workoutLog.findMany({
      where: {
        studentId: session.user.id,
        workspaceId,
      },
      include: {
        workout: {
          select: {
            name: true,
            muscleGroupLabel: true,
          }
        }
      },
      orderBy: {
        completedAt: "desc",
      },
    });

    // Verify and decay streak in case of inactivity
    await verifyAndDecayWorkspaceMemberStreak(member, logs.map((l: any) => l.completedAt));

    return NextResponse.json({
      workouts,
      logs,
    });
  } catch (error) {
    console.error("Student Workouts API GET Error:", error);
    return new NextResponse("Erro Interno do Servidor", { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Não autorizado. Por favor, faça login.", { status: 401 });
  }

  try {
    const body = await req.json();
    const { workoutId, feedback, effortScore, loads, reps } = body;

    if (!workoutId) {
      return new NextResponse("ID do treino é obrigatório.", { status: 400 });
    }

    // 1. Get student active membership
    const member = await prisma.workspaceMember.findFirst({
      where: {
        userId: session.user.id,
        role: "STUDENT",
        isActive: true,
      },
    });

    if (!member) {
      return new NextResponse("Membro ativo do workspace não encontrado.", { status: 404 });
    }

    const workspaceId = member.workspaceId;

    // 2. Create the completed workout log record
    const log = await (prisma as any).workoutLog.create({
      data: {
        studentId: session.user.id,
        workoutId,
        workspaceId,
        feedback: feedback || null,
        effortScore: effortScore ? parseInt(effortScore) : null,
        loads: loads || null,
        reps: reps || null,
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
        source: "TRAINING"
      });
    }


    // 3. Calculate and update streak and progress dynamically from all history
    const allLogs = await (prisma as any).workoutLog.findMany({
      where: {
        studentId: session.user.id,
        workspaceId,
      },
      select: {
        completedAt: true,
      },
    });

    const { streak: newStreak, bestStreak: newBestStreak } = calculateStreaks(
      allLogs.map((l: any) => l.completedAt)
    );

    // Calculate weekly compliance (progress)
    // Find workouts scheduled for the week
    const weeklyWorkoutsCount = await prisma.workout.count({
      where: {
        workspaceId,
        dayOfWeek: { not: null },
        OR: [
          { studentId: session.user.id },
          { studentId: null }
        ]
      }
    });

    // Count completions this week (from Monday)
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);

    const weeklyCompletionsCount = await (prisma as any).workoutLog.count({
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
    console.error("Student Workouts API POST Error:", error);
    return new NextResponse("Erro Interno do Servidor", { status: 500 });
  }
}
