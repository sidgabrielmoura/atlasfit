import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Não autorizado. Por favor, faça login.", { status: 401 });
  }

  try {
    // 1. Localizar membro ativo para identificar o workspace e o aluno
    const member = await prisma.workspaceMember.findFirst({
      where: {
        userId: session.user.id,
        role: "STUDENT",
        isActive: true,
      },
    });

    if (!member) {
      return new NextResponse("Membro ativo do workspace não encontrado.", { status: 404 });
    }

    const workspaceId = member.workspaceId;

    // 2. Buscar histórico de avaliações físicas
    const evaluations = await prisma.physicalEvaluation.findMany({
      where: {
        studentId: session.user.id,
        workspaceId,
      },
      orderBy: { date: "desc" },
    });

    // 3. Buscar arquivos/dados clínicos liberados pelo personal (categoria "exames")
    const clinicalFiles = await prisma.studentFile.findMany({
      where: {
        studentId: session.user.id,
        workspaceId,
        category: "exames",
      },
      orderBy: { createdAt: "desc" },
    });

    // 4. Buscar objetivos registrados via treinos vinculados
    const workouts = await prisma.workout.findMany({
      where: {
        studentId: session.user.id,
        workspaceId,
        isActive: true,
      },
      select: {
        goal: true,
        difficulty: true,
      },
    });

    // Extrair objetivos únicos e dificuldades atribuídas
    const registeredGoals = Array.from(new Set(workouts.map((w) => w.goal))).filter(Boolean);
    const registeredDifficulties = Array.from(new Set(workouts.map((w) => w.difficulty))).filter(Boolean);

    return NextResponse.json({
      evaluations,
      clinicalFiles,
      goals: registeredGoals,
      difficulties: registeredDifficulties,
      plan: member.plan,
    });
  } catch (error) {
    console.error("Student Assessments API GET Error:", error);
    return new NextResponse("Erro Interno do Servidor", { status: 500 });
  }
}
