import { withAuditedRequest } from "@/lib/audited-request";
import { NextResponse } from "next/server";
import { requireGymWorkspaceAccess, handleWorkspaceAccessError } from "@/modules/workspaces/application/guard";
import { gymAssessmentService } from "@/modules/workspaces/application/gym-assessment-service";

export const DELETE = withAuditedRequest(async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  try {
    const { fileId } = await params;
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId");

    if (!workspaceId) {
      return NextResponse.json({ error: "O ID do workspace é obrigatório." }, { status: 400 });
    }

    const context = await requireGymWorkspaceAccess({
      workspaceId,
      anyCapability: ["health.manage.assigned", "students.manage", "workspace.manage"],
    });

    const result = await gymAssessmentService.deleteStudentFile(
      context.workspaceId,
      fileId,
      context.userId
    );

    return NextResponse.json(result);
  } catch (error) {
    const accessError = handleWorkspaceAccessError(error);
    if (accessError) return accessError;
    console.error("DELETE gym student file error:", error);
    return NextResponse.json({ error: "Erro interno do servidor ao excluir arquivo." }, { status: 500 });
  }
});
