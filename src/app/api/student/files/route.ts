import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Não autorizado. Por favor, faça login.", { status: 401 });
  }

  try {
    // 1. Fetch active student membership
    const member = await prisma.workspaceMember.findFirst({
      where: {
        userId: session.user.id,
        role: "STUDENT",
        isActive: true,
      },
    });

    if (!member) {
      return new NextResponse("Membro do workspace ativo não encontrado.", { status: 404 });
    }

    const workspaceId = member.workspaceId;

    // 2. Fetch all files shared with this student in the workspace
    const files = await prisma.studentFile.findMany({
      where: {
        studentId: session.user.id,
        workspaceId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(files);
  } catch (error) {
    console.error("GET student files error:", error);
    return new NextResponse("Erro interno do servidor.", { status: 500 });
  }
}
