import { auth } from "@/auth";
import { WorkspaceContextService } from "@/modules/workspaces/application/context-service";
import { requireWorkspaceAccess } from "@/modules/workspaces/application/guard";
import { WorkspaceAccessError } from "@/modules/workspaces/domain/types";
import { isAllowedOrigin } from "@/lib/auth/application-origin";

export async function notificationRequestScope(request: Request) {
  const session = await auth();
  if (!session?.user?.id) throw new WorkspaceAccessError(401, "UNAUTHORIZED", "Sessão não autenticada.");
  if (request.method !== "GET") {
    const origin = request.headers.get("origin");
    if (request.headers.get("sec-fetch-site") === "cross-site" || (origin && !isAllowedOrigin(origin))) throw new WorkspaceAccessError(403, "FORBIDDEN_RESOURCE", "Origem da solicitação inválida.");
  }
  const query = new URL(request.url).searchParams;
  if (query.getAll("workspaceId").length > 1 || (query.has("workspaceId") && !query.get("workspaceId")?.trim())) throw new WorkspaceAccessError(400, "INVALID_REQUEST", "Contexto inválido.");
  const selected = await WorkspaceContextService.getActiveWorkspaceIdFromCookie();
  const workspaceId = query.get("workspaceId")?.trim() || selected || null;
  if (workspaceId) await requireWorkspaceAccess({ workspaceId, requireActiveContext: true });
  return { userId: session.user.id, workspaceId };
}
