import { withRequestMemo } from "@/lib/request-memo";
import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { NotificationService } from "@/lib/notifications/service";
import { readPrivacyJsonRequest } from "@/lib/privacy/request-body";
import { JsonRequestError } from "@/lib/http/read-json";
import { handleWorkspaceAccessError } from "@/modules/workspaces/application/guard";
import { ZodError } from "zod";
import { notificationPreferencesPatchSchema, type NotificationPreferencesPatch } from "@/lib/notifications/preferences";

async function handleGET() {
  const session = await auth();
  if (!session?.user?.id) return new NextResponse("Não autorizado.", { status: 401 });
  return NextResponse.json(await NotificationService.getUserPreferences(session.user.id), { headers: { "Cache-Control": "private, no-store" } });
}
export const GET = withRequestMemo(handleGET);
export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return new NextResponse("Não autorizado.", { status: 401 });
  try {
    const patch = notificationPreferencesPatchSchema.parse(await readPrivacyJsonRequest(request, 8192)) as NotificationPreferencesPatch;
    return NextResponse.json(await NotificationService.updatePreferences(session.user.id, patch));
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: { code: "INVALID_REQUEST", message: "Preferências inválidas." } }, { status: 400 });
    if (error instanceof JsonRequestError) return NextResponse.json({ error: { code: "INVALID_REQUEST", message: error.message } }, { status: error.statusCode });
    const denied = handleWorkspaceAccessError(error); if (denied) return denied;
    throw error;
  }
}
