import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { NotificationService } from "@/lib/notifications/service";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Não autorizado.", { status: 401 });
  }

  try {
    const { token, device } = await req.json();
    if (!token) {
      return new NextResponse("Token é obrigatório.", { status: 400 });
    }

    const subscription = await NotificationService.registerDevice({
      userId: session.user.id,
      firebaseToken: token,
      platform: "PWA",
      browser: device || "Navegador"
    });

    return NextResponse.json(subscription);
  } catch (error) {
    console.error("POST notification token error:", error);
    return new NextResponse("Erro interno.", { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Não autorizado.", { status: 401 });
  }

  try {
    const { token } = await req.json();
    if (!token) {
      return new NextResponse("Token é obrigatório.", { status: 400 });
    }

    await NotificationService.unregisterDevice(token);

    return new NextResponse("Sucesso", { status: 200 });
  } catch (error) {
    console.error("DELETE notification token error:", error);
    return new NextResponse("Erro interno.", { status: 500 });
  }
}
