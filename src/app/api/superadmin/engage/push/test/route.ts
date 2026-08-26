import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { EngagePushService } from "@/lib/engage/push-service";
import { logAuditEvent, logSystemError } from "@/lib/logger";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "SUPERADMIN") {
      return new NextResponse("Acesso não autorizado.", { status: 403 });
    }

    const body = await req.json();
    const {
      targetUserId,
      title,
      body: contentBody,
      imageUrl,
      deepLink,
      category,
      priority,
      notificationId,
      variant
    } = body;

    const resolvedTargetUserId = targetUserId || session.user.id;

    const res = await EngagePushService.sendTestPush({
      notificationId,
      targetUserId: resolvedTargetUserId,
      variant: variant === "B" ? "B" : "A",
      adminUserId: session.user.id,
      customPayload: {
        title: title || "Notificação de Teste",
        body: contentBody || "Esta é uma notificação de teste enviada pelo AtlasFit Engage.",
        imageUrl: imageUrl || null,
        deepLink: deepLink || "/student/workouts",
        category: category || "TRAINING",
        priority: priority || "HIGH"
      }
    });

    if (!res.success) {
      return new NextResponse(res.error || "Falha ao enviar notificação de teste.", { status: 400 });
    }

    await logAuditEvent({
      userId: session.user.id,
      action: "SEND_CUSTOM_TEST_ENGAGE_PUSH",
      entity: "ENGAGE_PUSH_NOTIFICATION",
      entityId: notificationId || "DIRECT_TEST",
      severity: "info"
    });

    return NextResponse.json({
      success: true,
      message: `Notificação push de teste emitida com sucesso para ${res.user?.name || res.user?.email || "o usuário"}!`,
      devicesCount: res.devicesCount || 0,
      pushSent: res.pushSent || false,
      inAppDelivered: res.inAppDelivered || false,
      user: res.user,
      logId: res.logId
    });
  } catch (error: any) {
    console.error("Error in custom test push route:", error);
    await logSystemError({ action: "POST_CUSTOM_ENGAGE_PUSH_TEST", error, entity: "ENGAGE_PUSH_NOTIFICATION" });
    return new NextResponse(error.message || "Erro ao processar teste.", { status: 500 });
  }
}
