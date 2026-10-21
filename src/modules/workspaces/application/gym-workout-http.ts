import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { WorkspaceAccessError } from "../domain/types";
import { handleWorkspaceAccessError } from "./guard";
import { JsonRequestError, readJsonRequest } from "@/lib/http/read-json";

export async function workoutRequestBody(request: Request): Promise<unknown> {
  try { return await readJsonRequest(request, 262_144); }
  catch (error) {
    if (error instanceof JsonRequestError) throw new WorkspaceAccessError(error.statusCode, "INVALID_REQUEST", error.message);
    throw error;
  }
}
export function workoutHttpError(error: unknown, operation: string) {
  const access = handleWorkspaceAccessError(error);
  if (access) return access;
  const correlationId = randomUUID();
  console.error("[GYM_WORKOUT_ERROR]", { operation, correlationId, errorType: error instanceof Error ? error.name : "UnknownError" });
  return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Não foi possível concluir a operação de treino.", correlationId } }, { status: 500 });
}
