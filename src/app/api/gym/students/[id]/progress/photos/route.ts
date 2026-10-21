import { withAuditedRequest } from "@/lib/audited-request";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireGymWorkspaceAccess, handleWorkspaceAccessError } from "@/modules/workspaces/application/guard";
import { authorizeGymStudent } from "@/modules/workspaces/application/student-authority";
import { serializableTransaction } from "@/modules/workspaces/application/transaction";

export const GET = withAuditedRequest(async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId");

    if (!workspaceId) {
      return NextResponse.json({ error: "O ID do workspace é obrigatório." }, { status: 400 });
    }

    const context = await requireGymWorkspaceAccess({
      workspaceId,
      anyCapability: ["health.read.assigned", "students.read", "workspace.manage"],
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

    await authorizeGymStudent(context.workspaceId, member.id, context.userId, "health.read.assigned");

    const photos = await prisma.studentProgressPhoto.findMany({
      where: {
        studentId: member.userId,
        workspaceId: context.workspaceId,
      },
      orderBy: {
        date: "asc",
      },
    });

    return NextResponse.json(photos);
  } catch (error) {
    const accessError = handleWorkspaceAccessError(error);
    if (accessError) return accessError;
    console.error("GET gym student photos error:", error);
    return NextResponse.json({ error: "Erro interno do servidor." }, { status: 500 });
  }
});

export const POST = withAuditedRequest(async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { workspaceId, photoUrl, date, comment, objectKey, mimeType, size } = body;

    if (!workspaceId || !photoUrl) {
      return NextResponse.json({ error: "Campos obrigatórios ausentes (workspaceId, photoUrl)." }, { status: 400 });
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

    const newPhoto = await serializableTransaction(async (tx) => {
      const photo = await tx.studentProgressPhoto.create({
        data: {
          studentId: member.userId,
          workspaceId: context.workspaceId,
          photoUrl,
          objectKey: objectKey || null,
          mimeType: mimeType || null,
          size: size ? Number(size) : null,
          uploadedBy: context.userId,
          date: date ? new Date(date) : new Date(),
          comment: comment?.trim() || null,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: context.userId,
          action: "GYM_STUDENT_PHOTO_UPLOADED",
          entity: "STUDENT_PROGRESS_PHOTO",
          entityId: photo.id,
          severity: "info",
        },
      });

      return photo;
    });

    return NextResponse.json(newPhoto, { status: 201 });
  } catch (error) {
    const accessError = handleWorkspaceAccessError(error);
    if (accessError) return accessError;
    console.error("POST gym student photo error:", error);
    return NextResponse.json({ error: "Erro interno do servidor ao adicionar foto." }, { status: 500 });
  }
});
