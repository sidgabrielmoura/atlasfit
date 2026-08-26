import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { NotificationService } from "@/lib/notifications/service";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Não autorizado. Faça login para registrar dispositivo.", { status: 401 });
    }

    const body = await req.json();
    const token = body.token || body.firebaseToken;
    const platform = body.platform || body.device || "WEB";
    const browser = body.browser || null;

    if (!token || typeof token !== "string") {
      return new NextResponse("Token de registro do Firebase é obrigatório.", { status: 400 });
    }

    const device = await NotificationService.registerDevice({
      userId: session.user.id,
      firebaseToken: token.trim(),
      platform,
      browser,
    });

    return NextResponse.json({
      success: true,
      deviceId: device.id,
      userId: session.user.id,
      message: "Dispositivo registrado com sucesso para notificações push.",
    });
  } catch (error: any) {
    console.error("[FCM Device Registration Error]:", error);
    return new NextResponse(error.message || "Erro ao registrar token do dispositivo.", { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Não autorizado.", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token) {
      return new NextResponse("Token é obrigatório para cancelamento de registro.", { status: 400 });
    }

    await NotificationService.unregisterDevice(token);

    return NextResponse.json({ success: true, message: "Dispositivo desvinculado com sucesso." });
  } catch (error: any) {
    console.error("[FCM Device Unregister Error]:", error);
    return new NextResponse(error.message || "Erro ao desvincular dispositivo.", { status: 500 });
  }
}
