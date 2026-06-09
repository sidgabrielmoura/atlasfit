import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

// DELETE /api/personal/clients/[id]/progress/[progressId]
// Exclui um registro de medidas antropométricas específico
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; progressId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Não autorizado.", { status: 401 });
  }

  const { id: studentId, progressId } = await params;
  
  try {
    // Buscar o registro para validar propriedade
    const progress = await prisma.studentProgress.findUnique({
      where: { id: progressId },
    });

    if (!progress) {
      return new NextResponse("Registro não encontrado.", { status: 404 });
    }

    if (progress.studentId !== studentId) {
      return new NextResponse("Esse registro não pertence a este aluno.", { status: 400 });
    }

    // Validar se o personal pertence ao workspace correspondente
    const trainerMember = await prisma.workspaceMember.findFirst({
      where: {
        userId: session.user.id,
        workspaceId: progress.workspaceId,
      },
    });

    if (!trainerMember) {
      return new NextResponse("Acesso negado a este workspace.", { status: 403 });
    }

    // Excluir registro
    await prisma.studentProgress.delete({
      where: { id: progressId },
    });

    return new NextResponse("Registro excluído com sucesso.", { status: 200 });
  } catch (error) {
    console.error("DELETE progress log error:", error);
    return new NextResponse("Erro interno do servidor.", { status: 500 });
  }
}
