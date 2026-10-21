import { withRequestMemo } from "@/lib/request-memo";
import { personalCommercialContextResponse } from "@/lib/personal-commercial-context";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyAndDecayWorkspaceMemberStreak } from "@/lib/streak-helper";
import {
  requirePersonalWorkspaceAccess as requireWorkspaceAccess,
  handleWorkspaceAccessError,
  sanitizeStudentDetail,
} from "@/modules/workspaces";

// GET /api/personal/clients/[id]
// Busca informações de um aluno específico dentro do escopo do workspace ativo.
async function handleGET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const restricted = await personalCommercialContextResponse(); if (restricted) return restricted;
  const { id: studentId } = await params;
  if (!studentId || studentId === "pending") {
    return new NextResponse("ID do aluno inválido.", { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspaceId");

  if (!workspaceId) {
    return new NextResponse("O ID do workspace é obrigatório.", { status: 400 });
  }

  try {
    // Verificar autenticação, vínculo com workspace e permissão (students.read ou próprio aluno)
    const context = await requireWorkspaceAccess({
      workspaceId,
      capability: "students.read",
      resourceOwnerId: studentId,
    });

    // Buscar aluno no escopo rigoroso do tenant verificado
    const studentMember = await prisma.workspaceMember.findFirst({
      where: {
        userId: studentId,
        workspaceId: context.workspaceId,
        role: "STUDENT",
      },
      include: {
        user: true,
      },
    });

    if (!studentMember) {
      return new NextResponse("Aluno não encontrado neste workspace.", { status: 404 });
    }

    // Verify and decay client streak dynamically
    const { streak: freshStreak, bestStreak: freshBestStreak } =
      await verifyAndDecayWorkspaceMemberStreak(studentMember);

    // Sanitizar dados para DTO seguro (sem tokens, senhas ou segredos)
    const sanitized = sanitizeStudentDetail({
      ...studentMember,
      streak: freshStreak,
      bestStreak: freshBestStreak,
    });

    return NextResponse.json(sanitized);
  } catch (error) {
    const accessError = handleWorkspaceAccessError(error);
    if (accessError) return accessError;

    console.error("GET student by ID error:", error);
    return new NextResponse("Erro interno do servidor.", { status: 500 });
  }
}
export const GET = withRequestMemo(handleGET);

// PATCH /api/personal/clients/[id]
// Atualiza configurações específicas do aluno no workspace ativo (ex: regras de treinos).
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const restricted = await personalCommercialContextResponse(); if (restricted) return restricted;
  const { id: studentId } = await params;
  if (!studentId || studentId === "pending") {
    return new NextResponse("ID do aluno inválido.", { status: 400 });
  }

  try {
    const body = await req.json();
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId") || body.workspaceId;

    if (!workspaceId) {
      return new NextResponse("O ID do workspace é obrigatório.", { status: 400 });
    }

    // Exige capacidade students.manage no workspace verificado
    const context = await requireWorkspaceAccess({
      workspaceId,
      capability: "students.manage",
    });

    // Localizar aluno exclusivamente dentro do workspace verificado
    const studentMember = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId: context.workspaceId,
        OR: [
          { userId: studentId },
          { id: studentId },
        ],
      },
    });

    if (!studentMember) {
      return new NextResponse("Aluno não encontrado neste workspace.", { status: 404 });
    }

    const updateData: any = {};
    if (typeof body.canDoAnyWorkoutDay === "boolean") {
      updateData.canDoAnyWorkoutDay = body.canDoAnyWorkoutDay;
    }

    const updated = await prisma.workspaceMember.update({
      where: {
        id: studentMember.id,
      },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      canDoAnyWorkoutDay: updated.canDoAnyWorkoutDay,
    });
  } catch (error) {
    const accessError = handleWorkspaceAccessError(error);
    if (accessError) return accessError;

    console.error("PATCH student settings error:", error);
    return new NextResponse("Erro interno do servidor ao atualizar configurações.", { status: 500 });
  }
}
