import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { EngagePushService } from "@/lib/engage/push-service";

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
    const res = await EngagePushService.sendTestPush(id, session.user.id);

    if (!res.success) {
      return new NextResponse(res.error || "Falha ao enviar notificação de teste.", { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: "Notificação push de teste enviada com sucesso para o seu dispositivo!",
      logId: res.logId
    });
  } catch (error: any) {
    console.error("Error in test push route:", error);
    return new NextResponse(error.message || "Erro ao processar teste.", { status: 500 });
  }
}
