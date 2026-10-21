import { isAllowedOrigin } from "@/lib/auth/application-origin";
import { readJsonRequest } from "@/lib/http/read-json";
import { WorkspaceAccessError } from "@/modules/workspaces/domain/types";
export async function readPrivacyJsonRequest(request: Request, maximumBytes: number) {
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") throw new WorkspaceAccessError(400, "INVALID_REQUEST", "Corpo application/json obrigatório.");
  const origin = request.headers.get("origin");
  if (request.headers.get("sec-fetch-site") === "cross-site" || (origin && !isAllowedOrigin(origin))) throw new WorkspaceAccessError(403, "FORBIDDEN_RESOURCE", "Origem da solicitação inválida.");
  return readJsonRequest(request, maximumBytes);
}

