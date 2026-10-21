import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { readJsonRequest, JsonRequestError } from "@/lib/http/read-json";
import { reauthenticateMfaSettings } from "@/lib/auth/mfa-reauthentication";
import { WorkspaceAccessError } from "@/modules/workspaces/domain/types";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "SUPERADMIN" || session.user.isImpersonated || session.user.sessionVersion === undefined) return NextResponse.json({ error: "Entre na própria conta administrativa para confirmar." }, { status: 403 });
  try {
    return NextResponse.json(await reauthenticateMfaSettings(session.user.id, session.user.sessionVersion, await readJsonRequest(request, 4096)), { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof WorkspaceAccessError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode });
    if (error instanceof JsonRequestError) return NextResponse.json({ error: error.message }, { status: error.statusCode });
    return NextResponse.json({ error: "Não foi possível confirmar sua identidade." }, { status: 500 });
  }
}
