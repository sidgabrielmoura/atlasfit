import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { issueImpersonationStart } from "@/lib/auth/impersonation-service";
import { readPrivacyJsonRequest } from "@/lib/privacy/request-body";
import { JsonRequestError } from "@/lib/http/read-json";
import { WorkspaceAccessError } from "@/modules/workspaces/domain/types";
import { logSystemError } from "@/lib/logger";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "SUPERADMIN" || session.user.isImpersonated) return NextResponse.json({ error: "Entre na própria conta administrativa." }, { status: 401 });
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const limiter = await rateLimit(`impersonate:${session.user.id}:${ip}`, 10, 60000);
  if (!limiter.success) return NextResponse.json({ error: "Muitas requisições. Tente novamente mais tarde." }, { status: 429 });
  try {
    const body = await readPrivacyJsonRequest(req, 4096);
    return NextResponse.json(await issueImpersonationStart(session.user, body), { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof WorkspaceAccessError || error instanceof JsonRequestError) return NextResponse.json({ error: error.message }, { status: error.statusCode });
    await logSystemError({ action: "POST_IMPERSONATE_START", error, entity: "IMPERSONATION" });
    return NextResponse.json({ error: "Não foi possível iniciar a sessão de suporte." }, { status: 500 });
  }
}
