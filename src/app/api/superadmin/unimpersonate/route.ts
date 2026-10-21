import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { issueImpersonationReturn } from "@/lib/auth/impersonation-service";
import { isAllowedOrigin } from "@/lib/auth/application-origin";
import { WorkspaceAccessError } from "@/modules/workspaces/domain/types";
import { logSystemError } from "@/lib/logger";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Sessão ausente ou revogada." }, { status: 401 });
  try {
    const origin = req.headers.get("origin");
    if (req.headers.get("sec-fetch-site") === "cross-site" || (origin && !isAllowedOrigin(origin))) throw new WorkspaceAccessError(403, "FORBIDDEN_RESOURCE", "Origem inválida.");
    return NextResponse.json(await issueImpersonationReturn(session.user), { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof WorkspaceAccessError) return NextResponse.json({ error: error.message }, { status: error.statusCode });
    await logSystemError({ action: "POST_UNIMPERSONATE", error, entity: "IMPERSONATION" });
    return NextResponse.json({ error: "Não foi possível retornar à conta administrativa." }, { status: 500 });
  }
}
