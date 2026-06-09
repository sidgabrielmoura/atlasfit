import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string; evalId: string }>;
}

export async function DELETE(req: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Não autorizado.", { status: 401 });
  }

  const { id: studentId, evalId } = await params;

  try {
    // Find the evaluation to confirm workspace and student
    const evaluation = await prisma.physicalEvaluation.findUnique({
      where: { id: evalId }
    });

    if (!evaluation) {
      return new NextResponse("Avaliação não encontrada.", { status: 404 });
    }

    if (evaluation.studentId !== studentId) {
      return new NextResponse("Essa avaliação não pertence a este aluno.", { status: 400 });
    }

    // Verify trainer is member of the workspace
    const trainerCheck = await prisma.workspaceMember.findFirst({
      where: {
        userId: session.user.id,
        workspaceId: evaluation.workspaceId
      }
    });

    if (!trainerCheck) {
      return new NextResponse("Acesso negado a este workspace.", { status: 403 });
    }

    await prisma.physicalEvaluation.delete({
      where: { id: evalId }
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("DELETE evaluation error:", error);
    return new NextResponse("Erro interno do servidor.", { status: 500 });
  }
}
