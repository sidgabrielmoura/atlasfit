import { withAuditedRequest } from "@/lib/audited-request";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireGymWorkspaceAccess, handleWorkspaceAccessError } from "@/modules/workspaces/application/guard";
import { authorizeGymStudent } from "@/modules/workspaces/application/student-authority";
import { serializableTransaction } from "@/modules/workspaces/application/transaction";
import { NotificationService } from "@/lib/notifications/service";

export const PATCH = withAuditedRequest(async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; photoId: string }> }
) {
  try {
    const { id, photoId } = await params;
    const body = await req.json();
    const { trainerLiked, comment } = body;

    const photo = await prisma.studentProgressPhoto.findUnique({
      where: { id: photoId },
    });

    if (!photo) {
      return NextResponse.json({ error: "Foto não encontrada." }, { status: 404 });
    }

    const context = await requireGymWorkspaceAccess({
      workspaceId: photo.workspaceId,
      anyCapability: ["health.manage.assigned", "workspace.manage"],
    });

    const member = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId: context.workspaceId,
        OR: [{ id }, { userId: id }, { userId: photo.studentId }],
      },
    });

    if (!member) {
      return NextResponse.json({ error: "Aluno não encontrado." }, { status: 404 });
    }

    await authorizeGymStudent(context.workspaceId, member.id, context.userId, "health.manage.assigned");

    const updateData: any = {};
    if (typeof trainerLiked === "boolean") updateData.trainerLiked = trainerLiked;
    if (typeof comment === "string" || comment === null) updateData.comment = comment;

    const updated = await serializableTransaction(async (tx) => {
      const p = await tx.studentProgressPhoto.update({
        where: { id: photoId },
        data: updateData,
      });

      await tx.auditLog.create({
        data: {
          userId: context.userId,
          action: "GYM_STUDENT_PHOTO_UPDATED",
          entity: "STUDENT_PROGRESS_PHOTO",
          entityId: photoId,
          severity: "info",
        },
      });

      return p;
    });

    if (typeof trainerLiked === "boolean" && trainerLiked && !photo.trainerLiked) {
      await NotificationService.sendNotification({
        userId: member.userId,
        type: "BADGE_UNLOCKED",
        category: "ASSESSMENT",
        title: "Sua foto de evolução foi curtida! ❤️",
        description: "A equipe da academia curtiu a foto de progresso que você enviou.",
        deepLink: "/student/evolution",
        source: "ASSESSMENT",
        workspaceId: photo.workspaceId,
      });
    }

    return NextResponse.json(updated);
  } catch (error) {
    const accessError = handleWorkspaceAccessError(error);
    if (accessError) return accessError;
    console.error("PATCH gym student photo error:", error);
    return NextResponse.json({ error: "Erro interno do servidor ao atualizar foto." }, { status: 500 });
  }
});

export const DELETE = withAuditedRequest(async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; photoId: string }> }
) {
  try {
    const { id, photoId } = await params;
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId");

    const photo = await prisma.studentProgressPhoto.findUnique({
      where: { id: photoId },
    });

    if (!photo) {
      return NextResponse.json({ error: "Foto não encontrada." }, { status: 404 });
    }

    const targetWorkspaceId = workspaceId || photo.workspaceId;

    const context = await requireGymWorkspaceAccess({
      workspaceId: targetWorkspaceId,
      anyCapability: ["health.manage.assigned", "workspace.manage"],
    });

    const member = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId: context.workspaceId,
        OR: [{ id }, { userId: id }, { userId: photo.studentId }],
      },
    });

    if (!member) {
      return NextResponse.json({ error: "Aluno não encontrado." }, { status: 404 });
    }

    await authorizeGymStudent(context.workspaceId, member.id, context.userId, "health.manage.assigned");

    await serializableTransaction(async (tx) => {
      await tx.studentProgressPhoto.delete({
        where: { id: photoId },
      });

      await tx.auditLog.create({
        data: {
          userId: context.userId,
          action: "GYM_STUDENT_PHOTO_DELETED",
          entity: "STUDENT_PROGRESS_PHOTO",
          entityId: photoId,
          severity: "info",
        },
      });
    });

    return NextResponse.json({ success: true, message: "Foto removida com sucesso." });
  } catch (error) {
    const accessError = handleWorkspaceAccessError(error);
    if (accessError) return accessError;
    console.error("DELETE gym student photo error:", error);
    return NextResponse.json({ error: "Erro interno do servidor ao excluir foto." }, { status: 500 });
  }
});
