import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { NotificationService } from "@/lib/notifications/service";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Não autorizado.", { status: 401 });
  }

  try {
    const prefs = await NotificationService.getUserPreferences(session.user.id);
    return NextResponse.json(prefs);
  } catch (error) {
    console.error("GET preferences error:", error);
    return new NextResponse("Erro interno.", { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Não autorizado.", { status: 401 });
  }

  try {
    const body = await req.json();
    const prefs = await NotificationService.updatePreferences(session.user.id, body);
    return NextResponse.json(prefs);
  } catch (error) {
    console.error("PATCH preferences error:", error);
    return new NextResponse("Erro interno.", { status: 500 });
  }
}
