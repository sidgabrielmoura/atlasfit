import { NextResponse } from "next/server";
import { z } from "zod";
import { readJsonRequest, JsonRequestError } from "@/lib/http/read-json";
import { requireGymWorkspaceAccess, handleWorkspaceAccessError } from "./guard";
import { WorkspaceContextService } from "./context-service";
import { WorkspaceAccessError } from "../domain/types";

export function parseGymStaffRequest<T>(schema: z.ZodType<T>, raw: unknown): T {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) throw new WorkspaceAccessError(400, "INVALID_REQUEST", parsed.error.issues[0]?.message || "Requisição inválida.");
  return parsed.data;
}
export async function gymStaffBody(request: Request) { return readJsonRequest(request, 16_384); }
export async function gymStaffContext(request: Request, bodyWorkspaceId?: string) {
  const url = new URL(request.url);
  const supplied = [bodyWorkspaceId, url.searchParams.get("workspaceId"), request.headers.get("x-workspace-id")].filter(value => value !== undefined && value !== null && value !== "");
  if (new Set(supplied).size > 1) throw new WorkspaceAccessError(409, "WORKSPACE_CONTEXT_MISMATCH", "Identificadores de academia divergentes.");
  const workspaceId = supplied[0] || await WorkspaceContextService.getActiveWorkspaceIdFromCookie();
  if (!workspaceId) throw new WorkspaceAccessError(400, "WORKSPACE_REQUIRED", "Selecione a academia.");
  return requireGymWorkspaceAccess({ workspaceId });
}
export function gymStaffHttpError(error: unknown) {
  const access = handleWorkspaceAccessError(error); if (access) return access;
  if (error instanceof JsonRequestError) return NextResponse.json({ error: { code: "INVALID_REQUEST", message: error.message } }, { status: error.statusCode });
  console.error("[GYM_STAFF_OPERATION_FAILED]", { errorType: error instanceof Error ? error.name : "UnknownError" });
  return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Não foi possível concluir a operação da equipe." } }, { status: 500 });
}
