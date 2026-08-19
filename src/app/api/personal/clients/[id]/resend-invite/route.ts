import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import crypto from "crypto";
import { EmailService } from "@/lib/emails/service";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Não autorizado.", { status: 401 });
  }

  const { id: studentUserId } = await params;

  try {
    const studentUser = await prisma.user.findUnique({
      where: { id: studentUserId },
    });

    if (!studentUser || !studentUser.email) {
      return new NextResponse("Aluno não encontrado ou sem e-mail cadastrado.", { status: 404 });
    }

    if (studentUser.password) {
      return new NextResponse("Este aluno já possui uma senha configurada e acesso ativo.", {
        status: 400,
      });
    }

    const member = await prisma.workspaceMember.findFirst({
      where: { userId: studentUserId, role: "STUDENT" },
      include: { workspace: true },
    });

    let setupToken = studentUser.setupToken;
    if (!setupToken) {
      setupToken = crypto.randomUUID();
      await prisma.user.update({
        where: { id: studentUser.id },
        data: { setupToken },
      });
    }

    const trainer = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true },
    });

    const workspaceName = member?.workspace?.name || "AtlasFit";
    const planName = member?.plan || "Consultoria";

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
    console.error("Resend invite error:", error);
    return new NextResponse("Erro interno do servidor ao reenviar convite.", { status: 500 });
  }
}
