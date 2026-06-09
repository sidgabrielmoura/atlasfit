import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Não autorizado.", { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspaceId");

  if (!workspaceId) {
    return new NextResponse("O ID do workspace é obrigatório.", { status: 400 });
  }

  try {
    // 1. Verify trainer has access to workspace
    const trainerCheck = await prisma.workspaceMember.findFirst({
      where: {
        userId: session.user.id,
        workspaceId,
      },
    });

    if (!trainerCheck) {
      return new NextResponse("Acesso negado a este workspace.", { status: 403 });
    }

    // 2. Fetch all shared files in this workspace, including student info
    const files = await prisma.studentFile.findMany({
      where: {
        workspaceId,
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // 3. Fetch all active students in this workspace (for the upload dropdown)
    const members = await prisma.workspaceMember.findMany({
      where: {
        workspaceId,
        role: "STUDENT",
        isActive: true,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        user: {
          name: "asc",
        },
      },
    });

    const students = members.map((m) => m.user);

    return NextResponse.json({
      files,
      students,
    });
  } catch (error) {
    console.error("GET general trainer files error:", error);
    return new NextResponse("Erro interno do servidor.", { status: 500 });
  }
}
