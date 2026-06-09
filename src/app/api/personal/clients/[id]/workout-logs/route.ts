import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Não autorizado. Por favor, faça login.", { status: 401 });
  }

  const { id: studentId } = await params;
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspaceId");

  if (!workspaceId) {
    return new NextResponse("O ID do workspace é obrigatório.", { status: 400 });
  }

  try {
    // 1. Verify trainer permissions inside the active workspace
    const trainerMember = await prisma.workspaceMember.findFirst({
      where: {
        userId: session.user.id,
        workspaceId,
        role: { in: ["OWNER", "TRAINER", "ASSISTANT"] },
        isActive: true,
      },
    });

    if (!trainerMember) {
      return new NextResponse("Acesso não autorizado ao workspace.", { status: 403 });
    }

    // 2. Fetch workout logs for this student in this workspace
    const logs = await (prisma as any).workoutLog.findMany({
      where: {
        studentId,
        workspaceId,
      },
      include: {
        workout: {
          select: {
            name: true,
            muscleGroupLabel: true,
            goal: true,
            difficulty: true,
          }
        }
      },
      orderBy: {
        completedAt: "desc",
      },
    });

    // 3. Fetch recent daily well-being feedbacks
    const dailyFeedbacks = await prisma.dailyFeedback.findMany({
      where: {
        studentId,
        workspaceId,
      },
      orderBy: {
        date: "desc",
      },
      take: 30, // Last 30 entries for historical trends
    });

    return NextResponse.json({
      logs,
      dailyFeedbacks,
    });
  } catch (error) {
    console.error("Trainer Get Student Workout Logs and Feedbacks Error:", error);
    return new NextResponse("Erro Interno do Servidor", { status: 500 });
  }
}
