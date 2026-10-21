import { withAuditedRequest } from "@/lib/audited-request";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireGymWorkspaceAccess, handleWorkspaceAccessError } from "@/modules/workspaces/application/guard";
import { authorizeGymStudent } from "@/modules/workspaces/application/student-authority";

export const GET = withAuditedRequest(async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId");

    if (!workspaceId) {
      return NextResponse.json({ error: "O ID do workspace é obrigatório." }, { status: 400 });
    }

    const context = await requireGymWorkspaceAccess({
      workspaceId,
      anyCapability: ["workouts.read", "students.read", "workspace.manage"],
    });

    const member = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId: context.workspaceId,
        OR: [{ id }, { userId: id }],
      },
    });

    if (!member) {
      return NextResponse.json({ error: "Aluno não encontrado nesta academia." }, { status: 404 });
    }

    await authorizeGymStudent(context.workspaceId, member.id, context.userId, "workouts.read");

    const logs = await prisma.workoutLog.findMany({
      where: {
        studentId: member.userId,
        workspaceId: context.workspaceId,
      },
      include: {
        workout: {
          include: {
            exercises: {
              include: {
                exercise: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        completedAt: "desc",
      },
    });

    const dailyFeedbacks = await prisma.dailyFeedback.findMany({
      where: {
        studentId: member.userId,
        workspaceId: context.workspaceId,
      },
      orderBy: {
        date: "desc",
      },
      take: 30,
    });

    return NextResponse.json({
      logs,
      dailyFeedbacks,
    });
  } catch (error) {
    const accessError = handleWorkspaceAccessError(error);
    if (accessError) return accessError;
    console.error("GET gym student workout logs error:", error);
    return NextResponse.json({ error: "Erro interno do servidor ao carregar registros de treinos." }, { status: 500 });
  }
});
