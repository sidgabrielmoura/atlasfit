import { withAuditedRequest } from "@/lib/audited-request";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireGymWorkspaceAccess, handleWorkspaceAccessError } from "@/modules/workspaces/application/guard";
import { authorizeGymStudent } from "@/modules/workspaces/application/student-authority";
import { NotificationService } from "@/lib/notifications/service";

export const POST = withAuditedRequest(async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { workspaceId } = body;

    if (!workspaceId) {
      return NextResponse.json({ error: "O ID do workspace é obrigatório." }, { status: 400 });
    }

    const context = await requireGymWorkspaceAccess({
      workspaceId,
      anyCapability: ["health.manage.assigned", "workspace.manage"],
    });

    const member = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId: context.workspaceId,
        OR: [{ id }, { userId: id }],
      },
    });

    if (!member) {
      return NextResponse.json({ error: "Aluno não encontrado nesta academia." }, { status: 404 });
    }

    await authorizeGymStudent(context.workspaceId, member.id, context.userId, "health.manage.assigned");

    await NotificationService.sendNotification({
      userId: member.userId,
      type: "PHOTO_REQUEST",
      category: "ASSESSMENT",
      title: "Solicitação de Foto de Evolução 📷",
      description: "A equipe da academia solicitou uma nova foto de progresso para acompanhar sua evolução.",
      priority: "HIGH",
      deepLink: "/student/evolution?tab=photos",
      workspaceId: context.workspaceId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const accessError = handleWorkspaceAccessError(error);
    if (accessError) return accessError;
    console.error("POST gym student request photo error:", error);
    return NextResponse.json({ error: "Erro interno do servidor ao solicitar foto." }, { status: 500 });
  }
});
