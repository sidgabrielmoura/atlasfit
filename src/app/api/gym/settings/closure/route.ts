import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { withAuditedRequest } from "@/lib/audited-request";
import { readJsonRequest, JsonRequestError } from "@/lib/http/read-json";
import { handleWorkspaceAccessError } from "@/modules/workspaces/application/guard";
import { WorkspaceContextService } from "@/modules/workspaces/application/context-service";
import { closeGymWorkspace, gymClosureSchema, previewGymClosure } from "@/modules/workspaces/application/gym-closure";
import { WorkspaceAccessError } from "@/modules/workspaces/domain/types";

async function actor(workspaceId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new WorkspaceAccessError(401, "UNAUTHORIZED", "Faça login para continuar.");
  if (session.user.isImpersonated) throw new WorkspaceAccessError(403, "INSUFFICIENT_PERMISSIONS", "Encerre a impersonação para realizar esta operação.");
  const selected = await WorkspaceContextService.getActiveWorkspaceIdFromCookie();
  if (!selected || selected !== workspaceId) throw new WorkspaceAccessError(409, "WORKSPACE_CONTEXT_MISMATCH", "Selecione a academia que deseja encerrar.");
  return session.user.id;
}
function failure(error: unknown) {
  const access = handleWorkspaceAccessError(error); if (access) return access;
  if (error instanceof JsonRequestError) return NextResponse.json({ error: { code: "INVALID_REQUEST", message: error.message } }, { status: error.statusCode });
  console.error("[GYM_CLOSURE_FAILED]", { errorType: error instanceof Error ? error.name : "UnknownError" });
  return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Não foi possível confirmar o encerramento. Consulte o estado antes de repetir." } }, { status: 500 });
}
export const GET = withAuditedRequest(async function GET(request: Request) {
  try {
    const workspaceId = new URL(request.url).searchParams.get("workspaceId") || "";
    if (!workspaceId || workspaceId.length > 100) throw new WorkspaceAccessError(400, "WORKSPACE_REQUIRED", "Identifique a academia.");
    return NextResponse.json({ data: await previewGymClosure(workspaceId, await actor(workspaceId)) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return failure(error); }
});
export const POST = withAuditedRequest(async function POST(request: Request) {
  try {
    const raw = await readJsonRequest(request, 16_384); const parsed = gymClosureSchema.safeParse(raw);
    if (!parsed.success) throw new WorkspaceAccessError(400, "INVALID_REQUEST", "Confirme academia, motivo e chave da solicitação.");
    return NextResponse.json({ data: await closeGymWorkspace(parsed.data, await actor(parsed.data.workspaceId)) });
  } catch (error) { return failure(error); }
});
