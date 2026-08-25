import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { EngagePushService } from "@/lib/engage/push-service";
import { logAuditEvent, logSystemError } from "@/lib/logger";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "SUPERADMIN") {
      return new NextResponse("Acesso não autorizado.", { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const trigger = searchParams.get("trigger");
    const status = searchParams.get("status");

    const where: any = {};
    if (trigger && trigger !== "all") {
      where.triggerType = trigger;
    }
    if (status && status !== "all") {
      where.isActive = status === "active";
    }

    const [notifications, metrics] = await Promise.all([
      prisma.engagePushNotification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
          creator: {
            select: { id: true, name: true, email: true }
          },
          _count: {
            select: { logs: true }
          }
        }
      }),
      EngagePushService.getPushDashboardMetrics()
    ]);

    return NextResponse.json({
      notifications,
      metrics
    });
  } catch (error: any) {
    console.error("Error in GET /api/superadmin/engage/push:", error);
    return new NextResponse(error.message || "Erro interno do servidor.", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "SUPERADMIN") {
      return new NextResponse("Acesso não autorizado.", { status: 403 });
    }

    const body = await req.json();
    const {
      title,
      body: pushBody,
      titleB,
      bodyB,
      imageUrl,
      targetRole = "ALL",
      targetPlan = "ALL",
      triggerType = "SCHEDULED",
      deepLink = "/student/workouts",
      category = "TRAINING",
      scheduleTime,
      daysOfWeek,
      inactivityDays,
      isActive = true,
      priority = "HIGH"
    } = body;

    if (!title?.trim() || !pushBody?.trim()) {
      return new NextResponse("Título e mensagem da notificação são obrigatórios.", { status: 400 });
    }

    const notification = await prisma.engagePushNotification.create({
      data: {
        title: title.trim(),
        body: pushBody.trim(),
        titleB: titleB?.trim() || null,
        bodyB: bodyB?.trim() || null,
        imageUrl: imageUrl || null,
        targetRole,
        targetPlan,
        triggerType,
        deepLink: deepLink || "/student/workouts",
        category,
        scheduleTime: scheduleTime || null,
        daysOfWeek: daysOfWeek || null,
        inactivityDays: inactivityDays ? parseInt(inactivityDays) : null,
        isActive: Boolean(isActive),
        priority,
        creatorId: session.user.id
      }
    });

    await logAuditEvent({
      action: "ENGAGE_PUSH_CREATE",
      userId: session.user.id,
      entity: "ENGAGE_PUSH_NOTIFICATION",
      entityId: notification.id,
      severity: "info",
    });

    return NextResponse.json(notification);
  } catch (error: any) {
    await logSystemError({ action: "POST_ENGAGE_PUSH_CREATE", error, entity: "ENGAGE_PUSH_NOTIFICATION" });
    return new NextResponse(error.message || "Erro ao criar chamado de notificação.", { status: 500 });
  }
}
