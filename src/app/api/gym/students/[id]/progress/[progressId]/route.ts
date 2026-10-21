import { withAuditedRequest } from "@/lib/audited-request";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireGymWorkspaceAccess, handleWorkspaceAccessError } from "@/modules/workspaces/application/guard";
import { authorizeGymStudent } from "@/modules/workspaces/application/student-authority";
import { serializableTransaction } from "@/modules/workspaces/application/transaction";

export const DELETE = withAuditedRequest(async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; progressId: string }> }
) {
  try {
    const { id, progressId } = await params;
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId");

    const progress = await prisma.studentProgress.findUnique({
      where: { id: progressId },
    });

    if (!progress) {
      return NextResponse.json({ error: "Registro não encontrado." }, { status: 404 });
    }

    const targetWorkspaceId = workspaceId || progress.workspaceId;

    const context = await requireGymWorkspaceAccess({
      workspaceId: targetWorkspaceId,
      anyCapability: ["health.manage.assigned", "workspace.manage"],
    });

    const member = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId: context.workspaceId,
        OR: [{ id }, { userId: id }, { userId: progress.studentId }],
      },
    });

    if (!member) {
      return NextResponse.json({ error: "Aluno não encontrado." }, { status: 404 });
    }

    await authorizeGymStudent(context.workspaceId, member.id, context.userId, "health.manage.assigned");

    await serializableTransaction(async (tx) => {
      await tx.studentProgress.delete({
        where: { id: progressId },
      });

      await tx.auditLog.create({
        data: {
          userId: context.userId,
          action: "GYM_STUDENT_PROGRESS_DELETED",
          entity: "STUDENT_PROGRESS",
          entityId: progressId,
          severity: "info",
        },
      });
    });

    return NextResponse.json({ success: true, message: "Registro excluído com sucesso." });
  } catch (error) {
    const accessError = handleWorkspaceAccessError(error);
    if (accessError) return accessError;
    console.error("DELETE gym student progress error:", error);
    return NextResponse.json({ error: "Erro interno do servidor ao excluir medidas." }, { status: 500 });
  }
});
