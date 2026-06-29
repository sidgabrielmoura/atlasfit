import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NotificationService } from "@/lib/notifications/service";


export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Não autorizado. Por favor, faça login.", { status: 401 });
  }

  const userId = session.user.id;

  try {
    // 1. Fetch active workspace member details to get workspaceId
    const member = await prisma.workspaceMember.findFirst({
      where: {
        userId,
        role: "STUDENT",
        isActive: true,
      },
    });

    if (!member) {
      return NextResponse.json({
        hasActiveWorkspace: false,
        todayFeedback: null,
        averages: { energy: 0, fatigue: 0, humor: 0 },
        recentObservations: [],
      });
    }

    const workspaceId = member.workspaceId;

    // 2. Check if a feedback was logged today
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const todayFeedback = await prisma.dailyFeedback.findFirst({
      where: {
        studentId: userId,
        workspaceId,
        date: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
    });

    // 3. Get 7-day average metrics
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const recentFeedbacks = await prisma.dailyFeedback.findMany({
      where: {
        studentId: userId,
        workspaceId,
        date: {
          gte: sevenDaysAgo,
        },
      },
    });

    const averages = {
      energy: 0,
      fatigue: 0,
      humor: 0,
    };

    if (recentFeedbacks.length > 0) {
      const sum = recentFeedbacks.reduce(
        (acc: { energy: number; fatigue: number; humor: number }, curr) => {
          acc.energy += curr.energy;
          acc.fatigue += curr.fatigue;
          acc.humor += curr.humor;
          return acc;
        },
        { energy: 0, fatigue: 0, humor: 0 }
      );

      averages.energy = Math.round(sum.energy / recentFeedbacks.length);
      averages.fatigue = Math.round(sum.fatigue / recentFeedbacks.length);
      averages.humor = Math.round(sum.humor / recentFeedbacks.length);
    }

    // 4. Fetch the last 5 completed WorkoutLogs that have non-null, non-empty feedback
    const recentLogs = await prisma.workoutLog.findMany({
      where: {
        studentId: userId,
        workspaceId,
        feedback: {
          not: null,
        },
      },
      orderBy: {
        completedAt: "desc",
      },
      take: 5,
      select: {
        id: true,
        completedAt: true,
        feedback: true,
        workout: {
          select: {
            name: true,
          },
        },
      },
    });

    // Filter out empty feedback strings just in case
    const recentObservations = recentLogs
      .filter((log) => log.feedback && log.feedback.trim() !== "")
      .map((log) => ({
        id: log.id,
        date: log.completedAt,
        text: log.feedback,
        workoutName: log.workout?.name || "Treino",
      }));

    return NextResponse.json({
      hasActiveWorkspace: true,
      todayFeedback: todayFeedback
        ? {
            energy: todayFeedback.energy,
            fatigue: todayFeedback.fatigue,
            humor: todayFeedback.humor,
          }
        : null,
      averages,
      recentObservations,
    });
  } catch (error) {
    console.error("GET student feedbacks error:", error);
    return new NextResponse("Erro Interno do Servidor", { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Não autorizado. Por favor, faça login.", { status: 401 });
  }

  const userId = session.user.id;

  try {
    const body = await req.json();
    const { energy, fatigue, humor } = body;

    // Validation
    if (
      typeof energy !== "number" ||
      typeof fatigue !== "number" ||
      typeof humor !== "number" ||
      energy < 0 ||
      energy > 100 ||
      fatigue < 0 ||
      fatigue > 100 ||
      humor < 0 ||
      humor > 100
    ) {
      return new NextResponse("Dados inválidos. Os valores devem ser de 0 a 100.", { status: 400 });
    }

    // Resolve student's workspaceId
    const member = await prisma.workspaceMember.findFirst({
      where: {
        userId,
        role: "STUDENT",
        isActive: true,
      },
    });

    if (!member) {
      return new NextResponse("Inscrição de aluno não encontrada ou inativa neste workspace.", {
        status: 400,
      });
    }

    const workspaceId = member.workspaceId;

    // Notify personal trainer about daily feedback
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { ownerId: true }
    });
    if (workspace?.ownerId) {
      await NotificationService.sendNotification({
        userId: workspace.ownerId,
        type: "DAILY_FEEDBACK_RECEIVED",
        category: "CRM",
        title: "Feedback Diário Recebido 📋",
        description: `O aluno "${session.user.name || "Aluno"}" preencheu o feedback diário: Energia ${energy}%, Fadiga ${fatigue}%, Humor ${humor}%.`,
        deepLink: `/personal/clients/${userId}`,
        source: "CRM"
      });
    }

    // Check if feedback already exists for today
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const existingFeedback = await prisma.dailyFeedback.findFirst({
      where: {
        studentId: userId,
        workspaceId,
        date: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
    });

    if (existingFeedback) {
      // Update
      const updated = await prisma.dailyFeedback.update({
        where: { id: existingFeedback.id },
        data: {
          energy,
          fatigue,
          humor,
        },
      });
      return NextResponse.json({ success: true, updated, action: "update" });
    } else {
      // Create
      const created = await prisma.dailyFeedback.create({
        data: {
          studentId: userId,
          workspaceId,
          energy,
          fatigue,
          humor,
          date: new Date(),
        },
      });
      return NextResponse.json({ success: true, created, action: "create" });
    }
  } catch (error) {
    console.error("POST student feedback error:", error);
    return new NextResponse("Erro Interno do Servidor", { status: 500 });
  }
}
