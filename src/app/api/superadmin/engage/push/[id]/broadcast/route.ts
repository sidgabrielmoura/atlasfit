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
    const result = await EngagePushService.sendBroadcastPush(id);

    await logAuditEvent({
      action: "ENGAGE_PUSH_BROADCAST",
      userId: session.user.id,
      entity: "ENGAGE_PUSH_NOTIFICATION",
      entityId: id,
      severity: "warning",
    });

    return NextResponse.json({
      message: `Disparo em massa concluído: ${result.sentCount} enviados com sucesso, ${result.errors} falhas.`,
      ...result
    });
  } catch (error: any) {
    await logSystemError({ action: "POST_ENGAGE_PUSH_BROADCAST", error, entity: "ENGAGE_PUSH_NOTIFICATION" });
    return new NextResponse(error.message || "Erro ao disparar broadcast.", { status: 500 });
  }
}
