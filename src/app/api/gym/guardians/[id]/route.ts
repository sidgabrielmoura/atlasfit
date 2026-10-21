import { withAuditedRequest } from "@/lib/audited-request";
import { NextResponse } from "next/server";
import { updateGymGuardianSchema } from "@/modules/workspaces/application/guardian-commands";
import {
  requireGymWorkspaceAccess as requireWorkspaceAccess,
  handleWorkspaceAccessError,
  minorService,
} from "@/modules/workspaces";

// PATCH: Update guardian details or powers
export const PATCH = withAuditedRequest(async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: guardianId } = await params;
    const parsed = updateGymGuardianSchema.omit({ actorUserId: true, guardianId: true }).safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: { code: "INVALID_REQUEST", message: "Dados do responsável inválidos." } }, { status: 400 });
    const body = parsed.data;
    const { workspaceId } = body;

    if (!workspaceId) {
      return NextResponse.json(
        { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } },
        { status: 400 }
      );
    }

    const context = await requireWorkspaceAccess({
      workspaceId,
    });

    const updated = await minorService.updateGuardian({
      ...body,
      workspaceId: context.workspaceId,
      guardianId,
      actorUserId: context.userId,
    });

    return NextResponse.json(updated);
  } catch (error) {
    const accessError = handleWorkspaceAccessError(error);
    if (accessError) return accessError;

    console.error("PATCH /api/gym/guardians/[id] error:", { errorType: error instanceof Error ? error.name : "unknown" });
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Erro ao atualizar responsável." } },
      { status: error instanceof SyntaxError ? 400 : 500 }
    );
  }
});

// DELETE: Revoke guardian representation
export const DELETE = withAuditedRequest(async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: guardianId } = await params;
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId");
    const reason = searchParams.get("reason") || undefined;

    if (!workspaceId) {
      return NextResponse.json(
        { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } },
        { status: 400 }
      );
    }

    const context = await requireWorkspaceAccess({
      workspaceId,
    });

    const result = await minorService.revokeGuardian(
      context.workspaceId,
      guardianId,
      context.userId,
      reason
    );

    return NextResponse.json(result);
  } catch (error) {
    const accessError = handleWorkspaceAccessError(error);
    if (accessError) return accessError;

    console.error("DELETE /api/gym/guardians/[id] error:", { errorType: error instanceof Error ? error.name : "UnknownError" });
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Erro ao revogar responsável." } },
      { status: 500 }
    );
  }
});
