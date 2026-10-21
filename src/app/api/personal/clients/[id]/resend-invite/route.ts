import { personalCommercialContextResponse } from "@/lib/personal-commercial-context";
import { newSetupTokenExpiry } from "@/lib/auth/setup-token-policy";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import crypto from "crypto";
import { EmailService } from "@/lib/emails/service";
import {
  requirePersonalWorkspaceAccess as requireWorkspaceAccess,
  handleWorkspaceAccessError,
} from "@/modules/workspaces";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const restricted = await personalCommercialContextResponse(); if (restricted) return restricted;
  const { id: studentUserId } = await params;
  if (!studentUserId) {
    return new NextResponse("ID do aluno inválido.", { status: 400 });
  }

  try {
    const { searchParams } = new URL(req.url);
    let workspaceId = searchParams.get("workspaceId");

    if (!workspaceId) {
      try {
        const body = await req.clone().json();
        workspaceId = body.workspaceId;
      } catch {
        // body may be empty
      }
    }

    if (!workspaceId) {
      const session = await auth();
      if (!session?.user?.id) {
        return new NextResponse("Não autorizado.", { status: 401 });
      }
      // Infer workspace if caller has a single active workspace where they can manage students
      const member = await prisma.workspaceMember.findFirst({
        where: {
          userId: studentUserId,
          role: "STUDENT",
        },
        select: { workspaceId: true },
      });
      workspaceId = member?.workspaceId || null;
    }

    if (!workspaceId) {
      return new NextResponse("O ID do workspace é obrigatório.", { status: 400 });
    }

    // Verify workspace access and capability
    const context = await requireWorkspaceAccess({
      workspaceId,
      capability: "students.manage",
    });

    // Verify student exists strictly in this verified workspace
    const member = await prisma.workspaceMember.findFirst({
      where: {
        userId: studentUserId,
        workspaceId: context.workspaceId,
        role: "STUDENT",
      },
      include: {
        workspace: true,
        user: true,
      },
    });

    if (!member || !member.user) {
      return new NextResponse("Aluno não encontrado neste workspace.", { status: 404 });
    }

    const studentUser = member.user;
    if (!studentUser.email) {
      return new NextResponse("Aluno sem e-mail cadastrado.", { status: 400 });
    }

    if (studentUser.password) {
      return new NextResponse("Este aluno já possui uma senha configurada e acesso ativo.", {
        status: 400,
      });
    }

    let setupToken = studentUser.setupToken;
    if (!setupToken || !studentUser.setupTokenExpiresAt || studentUser.setupTokenExpiresAt <= new Date()) {
      setupToken = crypto.randomUUID();
      await prisma.user.update({
        where: { id: studentUser.id },
        data: { setupTokenExpiresAt: newSetupTokenExpiry(),
setupToken },
      });
    }

    const trainer = await prisma.user.findUnique({
      where: { id: context.userId },
      select: { name: true },
    });

    const workspaceName = member.workspace.name || "AtlasFit";
    const planName = member.plan || "Consultoria";

    const emailResult = await EmailService.sendStudentInvitation({
      to: studentUser.email,
      studentName: studentUser.name || "Aluno(a)",
      trainerName: trainer?.name || "Seu Personal",
      workspaceName,
      setupToken,
      planName,
    });

    if (!emailResult.success) {
      return NextResponse.json(
        { error: emailResult.error || "Falha ao enviar e-mail de convite." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Convite reenviado com sucesso para ${studentUser.email}.`,
    });
  } catch (error) {
    const accessError = handleWorkspaceAccessError(error);
    if (accessError) return accessError;

    console.error("Resend invite error:", error);
    return new NextResponse("Erro interno do servidor ao reenviar convite.", { status: 500 });
  }
}
