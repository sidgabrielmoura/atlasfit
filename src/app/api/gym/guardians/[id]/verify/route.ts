import { withAuditedRequest } from "@/lib/audited-request";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  requireGymWorkspaceAccess as requireWorkspaceAccess,
  handleWorkspaceAccessError,
  minorService,
} from "@/modules/workspaces";

// POST: Staff verification of presented documents
export const POST = withAuditedRequest(async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: guardianId } = await params;
    const parsed = z.object({ workspaceId: z.string().trim().min(1).max(100), notes: z.string().trim().min(10).max(2000) }).strict().safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: { code: "INVALID_REQUEST", message: "Registre a conferência de identidade e representação realizada." } }, { status: 400 });
    const body = parsed.data;
    const { workspaceId, notes } = body;

    if (!workspaceId) {
      return NextResponse.json(
        { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } },
        { status: 400 }
      );
    }

    const context = await requireWorkspaceAccess({
      workspaceId,
    });

    const verified = await minorService.verifyGuardian(
      context.workspaceId,
      guardianId,
      context.userId,
      notes
    );

    return NextResponse.json(verified);
  } catch (error) {
    const accessError = handleWorkspaceAccessError(error);
    if (accessError) return accessError;

    console.error("POST /api/gym/guardians/[id]/verify error:", { errorType: error instanceof Error ? error.name : "unknown" });
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Erro ao validar documentos do responsável." } },
      { status: error instanceof SyntaxError ? 400 : 500 }
    );
  }
});
