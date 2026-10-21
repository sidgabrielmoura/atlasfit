import { withAuditedRequest } from "@/lib/audited-request";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { gymStudentUpdateSchema } from "@/modules/workspaces/application/gym-student-commands";
import {
  requireGymWorkspaceAccess as requireWorkspaceAccess,
  handleWorkspaceAccessError,
  gymStudentService,
} from "@/modules/workspaces";

// GET: Single student details
export const GET = withAuditedRequest(async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: memberId } = await params;
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId");

    if (!workspaceId) {
      return NextResponse.json(
        { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } },
        { status: 400 }
      );
    }

    const context = await requireWorkspaceAccess({
      workspaceId,
      // Reading is authorized for the resource's actual unit and assignment.
    });

    const student = await gymStudentService.getStudentById(
      context.workspaceId,
      memberId,
      context
    );

    return NextResponse.json(student);
  } catch (error) {
    const accessError = handleWorkspaceAccessError(error);
    if (accessError) return accessError;

    console.error("GET /api/gym/students/[id] error:", { errorType: error instanceof Error ? error.name : "UnknownError" });
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Erro ao obter detalhes do aluno." } },
      { status: 500 }
    );
  }
});

// PATCH: Update student local profile or gym assignment
export const PATCH = withAuditedRequest(async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: memberId } = await params;
    const parsed = gymStudentUpdateSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: { code: "INVALID_REQUEST", message: "Dados da ficha local inválidos." } }, { status: 400 });
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
      // Resource-scoped authority is re-read inside the command transaction.
    });

    const result = await gymStudentService.updateStudent({
      ...body,
      workspaceId: context.workspaceId,
      memberId,
      actorContext: context,
    });

    return NextResponse.json(result);
  } catch (error) {
    const accessError = handleWorkspaceAccessError(error);
    if (accessError) return accessError;

    console.error("PATCH /api/gym/students/[id] error:", { errorType: error instanceof Error ? error.name : "unknown" });
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Erro ao atualizar dados do aluno." } },
      { status: error instanceof SyntaxError ? 400 : 500 }
    );
  }
});

// DELETE: Delete student from gym workspace
export const DELETE = withAuditedRequest(async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: memberId } = await params;
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId");

    if (!workspaceId) {
      return NextResponse.json(
        { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } },
        { status: 400 }
      );
    }

    const context = await requireWorkspaceAccess({
      workspaceId,
      capability: "students.manage",
    });

    const targetMember = await prisma.workspaceMember.findFirst({
      where: {
        id: memberId,
        workspaceId: context.workspaceId,
      },
      include: {
        user: true,
      },
    });

    if (!targetMember) {
      return NextResponse.json(
        { error: { code: "STUDENT_NOT_FOUND", message: "Aluno não encontrado ou não pode ser excluído." } },
        { status: 404 }
      );
    }

    const userId = targetMember.userId;

    await prisma.$transaction(async (tx) => {
      // 1. Delete workspace member (cascades to studentProfile, enrollments, etc.)
      await tx.workspaceMember.delete({
        where: { id: memberId },
      });

      // 2. Check if user belongs to any other workspace
      const otherMemberships = await tx.workspaceMember.count({
        where: { userId },
      });

      if (otherMemberships === 0) {
        await tx.user.delete({
          where: { id: userId },
        });
      }

      await tx.auditLog.create({
        data: {
          userId: context.userId,
          action: `GYM_STUDENT_DELETED:${memberId}`,
          entity: "WORKSPACE",
          entityId: context.workspaceId,
        },
      });
    });

    return NextResponse.json({ success: true, message: "Aluno excluído com sucesso." });
  } catch (error) {
    const accessError = handleWorkspaceAccessError(error);
    if (accessError) return accessError;

    console.error("DELETE /api/gym/students/[id] error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Erro ao excluir aluno." } },
      { status: 500 }
    );
  }
});

