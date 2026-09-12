import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { verifyAndDecayWorkspaceMemberStreak } from "@/lib/streak-helper";

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
  if (!studentId || studentId === "pending") {
    return new NextResponse("ID do aluno inválido.", { status: 400 });
  }

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

    // Verify and decay client streak dynamically
    const { streak: freshStreak, bestStreak: freshBestStreak } = await verifyAndDecayWorkspaceMemberStreak(studentMember);

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
      streak: freshStreak,
      bestStreak: freshBestStreak,
      progress: studentMember.progress,
      avatarFallback,
      image: studentMember.user.image,
      lastActive: studentMember.lastActive
        ? new Date(studentMember.lastActive).toLocaleDateString("pt-BR")
        : "Não acessou",
      gender: studentMember.user.gender || null,
      birthDate: studentMember.user.birthDate || null,
      height: studentMember.user.height || null,
      weight: studentMember.user.weight || null,
      objective: studentMember.user.objective || null,
      canDoAnyWorkoutDay: studentMember.canDoAnyWorkoutDay ?? false,
    };

    return NextResponse.json(formattedStudent);
  } catch (error) {
    console.error("GET student by ID error:", error);
    return new NextResponse("Erro interno do servidor.", { status: 500 });
  }
}

// PATCH /api/personal/clients/[id]
// Atualiza configurações específicas do aluno no workspace ativo (ex: regras de treinos).
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Não autorizado.", { status: 401 });
  }

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
        workspaceId,
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
    console.error("PATCH student settings error:", error);
    return new NextResponse("Erro interno do servidor ao atualizar configurações.", { status: 500 });
  }
}
