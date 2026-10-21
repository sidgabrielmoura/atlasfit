import { withRequestMemo } from "@/lib/request-memo";
import { personalCommercialContextResponse } from "@/lib/personal-commercial-context";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { NotificationService } from "@/lib/notifications/service";
import { ZodError } from "zod";

async function handleGET(req: Request) {
  const restricted = await personalCommercialContextResponse(); if (restricted) return restricted;
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
export const GET = withRequestMemo(handleGET);

export async function PATCH(req: Request) {
  const restricted = await personalCommercialContextResponse(); if (restricted) return restricted;
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Não autorizado.", { status: 401 });
  }

  try {
    const body = await req.json();
    const prefs = await NotificationService.updatePreferences(session.user.id, body);
    return NextResponse.json(prefs);
  } catch (error) {
    if (error instanceof ZodError || error instanceof SyntaxError) return NextResponse.json({ error: { code: "INVALID_REQUEST", message: "Preferências inválidas." } }, { status: 400 });
    console.error("PATCH preferences error:", { code: "PREFERENCES_UPDATE_FAILED" });
    return new NextResponse("Erro interno.", { status: 500 });
  }
}
