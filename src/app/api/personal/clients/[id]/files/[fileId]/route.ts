import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string; fileId: string }>;
}

export async function DELETE(req: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Não autorizado.", { status: 401 });
  }

  const { id: studentId, fileId } = await params;

  try {
    // Find the file to confirm workspace and student
    const fileRecord = await prisma.studentFile.findUnique({
      where: { id: fileId }
    });

    if (!fileRecord) {
      return new NextResponse("Arquivo não encontrado.", { status: 404 });
    }

    if (fileRecord.studentId !== studentId) {
      return new NextResponse("Este arquivo não pertence a este aluno.", { status: 400 });
    }

    // Verify trainer is member of the workspace
    const trainerCheck = await prisma.workspaceMember.findFirst({
      where: {
        userId: session.user.id,
        workspaceId: fileRecord.workspaceId
      }
    });

    if (!trainerCheck) {
      return new NextResponse("Acesso negado a este workspace.", { status: 403 });
    }

    await prisma.studentFile.delete({
      where: { id: fileId }
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("DELETE student file error:", error);
    return new NextResponse("Erro interno do servidor.", { status: 500 });
  }
}
