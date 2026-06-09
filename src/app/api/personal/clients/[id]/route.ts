import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

// GET /api/personal/clients/[id]
// Busca informações de um aluno específico dentro do escopo do workspace ativo.
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Não autorizado.", { status: 401 });
  }

  const { id: studentId } = await params;
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspaceId");

  if (!workspaceId) {
    return new NextResponse("O ID do workspace é obrigatório.", { status: 400 });
  }

  try {
    // Verificar se o personal trainer logado pertence ao workspace informado
    const trainerMember = await prisma.workspaceMember.findFirst({
      where: {
        userId: session.user.id,
        workspaceId,
      },
    });

    if (!trainerMember) {
      return new NextResponse("Acesso negado a este workspace.", { status: 403 });
    }

    const studentMember = await prisma.workspaceMember.findFirst({
      where: {
        userId: studentId,
        workspaceId,
        role: "STUDENT",
      },
      include: {
        user: true,
      },
    });

    if (!studentMember) {
      return new NextResponse("Aluno não encontrado neste workspace.", { status: 404 });
    }

    // Formatar fallback do avatar
    const nameParts = studentMember.user.name?.split(" ") || [];
    const avatarFallback = nameParts.length > 1
      ? `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase()
      : (studentMember.user.name?.[0] || studentMember.user.email?.[0] || "A").toUpperCase();

    const formattedStudent = {
      id: studentMember.user.id,
      name: studentMember.user.name || "Sem Nome",
      email: studentMember.user.email || "",
      whatsapp: studentMember.user.whatsapp || "",
      isActive: studentMember.isActive,
      plan: studentMember.plan,
      streak: studentMember.streak,
      bestStreak: studentMember.bestStreak,
      progress: studentMember.progress,
      avatarFallback,
      image: studentMember.user.image,
      lastActive: studentMember.lastActive
        ? new Date(studentMember.lastActive).toLocaleDateString("pt-BR")
        : "Não acessou",
    };

    return NextResponse.json(formattedStudent);
  } catch (error) {
    console.error("GET student by ID error:", error);
    return new NextResponse("Erro interno do servidor.", { status: 500 });
  }
}
