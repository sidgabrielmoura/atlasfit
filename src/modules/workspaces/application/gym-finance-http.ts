import { NextResponse } from "next/server";
import { handleWorkspaceAccessError } from "./guard";

export function gymFinanceHttpFailure(error: unknown) {
  const accessError = handleWorkspaceAccessError(error);
  if (accessError) return accessError;
  if (error instanceof SyntaxError) return NextResponse.json({ error: { code: "INVALID_REQUEST", message: "Requisição inválida." } }, { status: 400 });
  console.error("[GYM_FINANCE_OPERATION_FAILED]", { code: error instanceof Error ? error.name : "INTERNAL_ERROR" });
  return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Não foi possível concluir a operação financeira." } }, { status: 500 });
}
