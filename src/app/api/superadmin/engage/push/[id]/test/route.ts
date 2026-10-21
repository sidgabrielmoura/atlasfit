import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { EngagePushService } from "@/lib/engage/push-service";
import { logAuditEvent, logSystemError } from "@/lib/logger";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "SUPERADMIN") {
      return new NextResponse("Acesso não autorizado.", { status: 403 });
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const targetUserId = body.targetUserId || session.user.id;
    const variant = body.variant === "B" ? "B" : "A";

    const res = await EngagePushService.sendTestPush({
      notificationId: id,
      targetUserId,
      variant,
      adminUserId: session.user.id
    });

    if (!res.success) {
      return new NextResponse(res.error || "Falha ao enviar notificação de teste.", { status: 400 });
    }

    await logAuditEvent({
      userId: session.user.id,
      action: "SEND_TEST_ENGAGE_PUSH",
      entity: "ENGAGE_PUSH_NOTIFICATION",
      entityId: id,
      severity: "info"
    });

    return NextResponse.json({
      success: true,
      message: "Notificação registrada. Os envios estão na fila de entrega.",
      devicesCount: res.devicesCount || 0,
      pushSent: res.pushSent || false,
      dispatchId: res.dispatchId,
      deliveryStatus: res.deliveryStatus,
      inAppDelivered: res.inAppDelivered || false,
      user: res.user,
      logId: res.logId
    });
  } catch (error: any) {
    console.error("Error in test push route:", error);
    await logSystemError({ action: "POST_ENGAGE_PUSH_TEST", error, entity: "ENGAGE_PUSH_NOTIFICATION" });
    return new NextResponse(error.message || "Erro ao processar teste.", { status: 500 });
  }
}
