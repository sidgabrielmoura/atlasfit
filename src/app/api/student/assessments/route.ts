import { withRequestMemo } from "@/lib/request-memo";
import { authorizeGymStudent } from "@/modules/workspaces/application/student-authority";
import { handleWorkspaceAccessError } from "@/modules/workspaces/application/guard";
import { getStudentWorkspaceMember } from "@/lib/student-auth";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

async function handleGET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Não autorizado. Por favor, faça login.", { status: 401 });
  }

  try {
    // 1. Localizar membro ativo para identificar o workspace e o aluno
    const member = await getStudentWorkspaceMember(session.user.id);

    if (!member) {
      return new NextResponse("Membro ativo do workspace não encontrado.", { status: 404 });
    }

    const workspaceId = member.workspaceId;
    if (member.workspace.type === "GYM") await authorizeGymStudent(workspaceId, member.id, session.user.id, "health.read.assigned", { allowSelf: true });

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
    const denied = handleWorkspaceAccessError(error); if (denied) return denied;
    console.error("Student Assessments API GET Error:", { errorType: error instanceof Error ? error.name : "UnknownError" });
    return new NextResponse("Erro Interno do Servidor", { status: 500 });
  }
}
export const GET = withRequestMemo(handleGET);
