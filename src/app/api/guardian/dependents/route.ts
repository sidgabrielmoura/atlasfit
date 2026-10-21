import { handleWorkspaceAccessError } from "@/modules/workspaces/application/guard";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { minorService } from "@/modules/workspaces";

// GET: List minor dependents for authenticated guardian
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Não autorizado." } },
        { status: 401 }
      );
    }

    const dependents = await minorService.listDependentsForGuardian(session.user.id);
    return NextResponse.json(dependents);
  } catch (error: unknown) {
    const access = handleWorkspaceAccessError(error); if (access) return access;
    console.error("guardian dependents operation failed", { errorType: error instanceof Error ? error.name : "unknown" });
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Erro ao listar dependentes." } },
      { status: 500 }
    );
  }
}
