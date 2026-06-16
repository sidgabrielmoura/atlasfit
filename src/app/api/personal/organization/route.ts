import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { batchVerifyAndDecayStreaks } from "@/lib/streak-helper";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Não autorizado. Por favor, faça login.", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId");

    if (!workspaceId) {
      return new NextResponse("O ID do workspace é obrigatório.", { status: 400 });
    }

    const memberCheck = await prisma.workspaceMember.findFirst({
      where: {
        userId: session.user.id,
        workspaceId,
      },
    });

    if (!memberCheck) {
      return new NextResponse("Acesso negado a este workspace.", { status: 403 });
    }

    // Verify and decay streaks in batch before loading dashboard stats
    await batchVerifyAndDecayStreaks(workspaceId);

    const pendingStudents = await prisma.pendingStudent.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
    });

    const studentMembers = await prisma.workspaceMember.findMany({
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
            whatsapp: true,
            studentWorkouts: {
              where: {
                workspaceId,
              },
              select: {
                id: true,
              },
            },
          },
        },
      },
      orderBy: {
        lastActive: "desc",
      },
    });
    const now = new Date();

    const alerts = [];

    studentMembers.forEach((member) => {
      if (!member.lastActive) {
        alerts.push({
          id: `alt_never_${member.id}`,
          type: "warning",
          title: `${member.user.name || "Aluno Novo"} ainda não realizou o primeiro acesso ao app.`,
          action: "Cobrar Aluno",
          whatsapp: member.user.whatsapp || null,
        });
        return;
      }

      const diffTime = Math.abs(now.getTime() - new Date(member.lastActive).getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays >= 7) {
        alerts.push({
          id: `alt_inactive_${member.id}`,
          type: "danger",
          title: `${member.user.name || "Aluno"} está há ${diffDays} dias sem treinar.`,
          action: "Mandar Mensagem",
          whatsapp: member.user.whatsapp || null,
        });
      } else if (member.progress < 40 && member.streak === 0) {
        alerts.push({
          id: `alt_freq_${member.id}`,
          type: "warning",
          title: `${member.user.name || "Aluno"} teve queda de rendimento nesta semana (${member.progress}% de progresso).`,
          action: "Analisar Treino",
          whatsapp: member.user.whatsapp || null,
        });
      }
    });

    if (pendingStudents.length > 0) {
      alerts.push({
        id: "alt_pending_students",
        type: "warning",
        title: `Você tem ${pendingStudents.length} ${pendingStudents.length === 1 ? "aluno aguardando" : "alunos aguardando"} aprovação do link de captação.`,
        action: "Ver Solicitações",
      });
    }


    if (alerts.length === 0) {
      alerts.push({
        id: "alt_default",
        type: "success",
        title: "Tudo sob controle! Nenhum alerta operacional importante detectado hoje.",
        action: "Ver Alunos",
      });
    }

    const dateParam = searchParams.get("date"); // e.g. "2026-05-20"
    // Calculate "today" in America/Sao_Paulo (UTC-3) timezone
    const nowLocal = new Date(Date.now() - 3 * 60 * 60 * 1000);
    const todayStr = nowLocal.toISOString().split("T")[0];
    const targetDateStr = dateParam || todayStr;

    const startDate = new Date(`${targetDateStr}T00:00:00.000Z`);
    const endDate = new Date(`${targetDateStr}T23:59:59.999Z`);

    // Fetch Trainer Tasks from DB for the specific date or range fallback
    let dailyAgenda = await prisma.trainerTask.findMany({
      where: {
        workspaceId,
        OR: [
          { scheduledDate: targetDateStr },
          {
            scheduledDate: null,
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
        ],
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [
        { time: "asc" },
        { createdAt: "asc" }
      ]
    });

    const newStudentsWithoutWorkout = studentMembers.filter(
      (m) => m.streak === 0 && m.progress === 0 && (!m.user.studentWorkouts || m.user.studentWorkouts.length === 0)
    ).length;
    const pendingApprovalCount = pendingStudents.length;
    const assessmentsPendingCount = studentMembers.filter(m => m.progress >= 75).length;

    const pendingTasks = [
      { id: "pt_1", title: "Alunos sem treino / Aguardando novo treino", count: newStudentsWithoutWorkout, icon: "Dumbbell" },
      { id: "pt_2", title: "Alunos aguardando aprovação (Link de Captação)", count: pendingApprovalCount, icon: "UserPlus" },
      { id: "pt_3", title: "Avaliações físicas pendentes de análise", count: assessmentsPendingCount, icon: "ClipboardList" },
    ];

    const intelligentStudentsList = studentMembers.map((member) => {
      let priority = "Baixa";
      let priorityScore = 1;
      let visualStatus = "🔥";
      let statusText = "Ativo e consistente";

      const daysInactive = member.lastActive
        ? Math.ceil(Math.abs(now.getTime() - new Date(member.lastActive).getTime()) / (1000 * 60 * 60 * 24))
        : 999;

      if (daysInactive >= 7) {
        priority = "Alta";
        priorityScore = 3;
        visualStatus = "⚠";
        statusText = `Sem acessar há ${daysInactive} dias`;
      } else if (member.streak === 0 && member.progress === 0) {
        const hasWorkouts = member.user.studentWorkouts && member.user.studentWorkouts.length > 0;
        if (hasWorkouts) {
          priority = "Média";
          priorityScore = 2;
          visualStatus = "📈";
          statusText = "Treino já atribuído (Ainda sem realizar)";
        } else {
          priority = "Alta";
          priorityScore = 3;
          visualStatus = "😴";
          statusText = "Aguardando primeiro treino";
        }
      } else if (daysInactive >= 4) {
        priority = "Média";
        priorityScore = 2;
        visualStatus = "😴";
        statusText = `Inativo há ${daysInactive} dias`;
      } else if (member.progress < 40) {
        priority = "Média";
        priorityScore = 2;
        visualStatus = "📉";
        statusText = `Baixa frequência semanal (${member.progress}% progresso)`;
      } else {
        visualStatus = member.streak > 15 ? "🔥" : "📈";
        statusText = member.streak > 0 ? `Rendimento excelente (Streak de ${member.streak} dias)` : "Ativo recentemente";
      }

      return {
        id: member.user.id,
        name: member.user.name || "Sem Nome",
        priority,
        priorityScore,
        visualStatus,
        statusText,
        plan: member.plan,
        whatsapp: member.user.whatsapp,
      };
    });

    intelligentStudentsList.sort((a, b) => b.priorityScore - a.priorityScore);

    return NextResponse.json({
      alerts,
      dailyAgenda,
      pendingTasks,
      intelligentStudentsList,
    });
  } catch (error) {
    console.error("GET organization operational metrics error:", error);
    return new NextResponse("Erro Interno do Servidor", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Não autorizado", { status: 401 });
    }

    const body = await req.json();
    const { workspaceId, title, time, type, date, studentId } = body;

    if (!workspaceId || !title || !time || !type) {
      return new NextResponse("Campos obrigatórios ausentes", { status: 400 });
    }

    const memberCheck = await prisma.workspaceMember.findFirst({
      where: {
        userId: session.user.id,
        workspaceId,
      },
    });

    if (!memberCheck) {
      return new NextResponse("Acesso negado", { status: 403 });
    }

    const nowLocal = new Date(Date.now() - 3 * 60 * 60 * 1000);
    const todayStr = nowLocal.toISOString().split("T")[0];
    const targetDateStr = date || todayStr;

    const createdAt = date ? new Date(`${date}T12:00:00.000Z`) : new Date();

    const newTask = await prisma.trainerTask.create({
      data: {
        workspaceId,
        title,
        time,
        type,
        completed: false,
        scheduledDate: targetDateStr,
        studentId: studentId || null,
        createdAt,
      },
    });

    return NextResponse.json(newTask);
  } catch (error) {
    console.error("POST trainer task error:", error);
    return new NextResponse("Erro Interno do Servidor", { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Não autorizado", { status: 401 });
    }

    const body = await req.json();
    const { taskId, workspaceId, completed, title, time, type, date, studentId } = body;

    if (!taskId || !workspaceId) {
      return new NextResponse("ID da tarefa e ID do workspace são obrigatórios", { status: 400 });
    }

    const memberCheck = await prisma.workspaceMember.findFirst({
      where: {
        userId: session.user.id,
        workspaceId,
      },
    });

    if (!memberCheck) {
      return new NextResponse("Acesso negado", { status: 403 });
    }

    const updateData: any = {};
    if (typeof completed === "boolean") {
      updateData.completed = completed;
    }
    if (typeof title === "string") {
      updateData.title = title;
    }
    if (typeof time === "string") {
      updateData.time = time;
    }
    if (typeof type === "string") {
      updateData.type = type;
    }
    if (typeof date === "string") {
      updateData.createdAt = new Date(`${date}T12:00:00.000Z`);
      updateData.scheduledDate = date;
    }
    if (body.hasOwnProperty("studentId")) {
      updateData.studentId = studentId || null;
    }

    const updatedTask = await prisma.trainerTask.update({
      where: {
        id: taskId,
        workspaceId,
      },
      data: updateData,
    });

    return NextResponse.json(updatedTask);
  } catch (error) {
    console.error("PATCH trainer task error:", error);
    return new NextResponse("Erro Interno do Servidor", { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Não autorizado", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get("taskId");
    const workspaceId = searchParams.get("workspaceId");

    if (!taskId || !workspaceId) {
      return new NextResponse("Campos obrigatórios ausentes", { status: 400 });
    }

    const memberCheck = await prisma.workspaceMember.findFirst({
      where: {
        userId: session.user.id,
        workspaceId,
      },
    });

    if (!memberCheck) {
      return new NextResponse("Acesso negado", { status: 403 });
    }

    await prisma.trainerTask.delete({
      where: {
        id: taskId,
        workspaceId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE trainer task error:", error);
    return new NextResponse("Erro Interno do Servidor", { status: 500 });
  }
}
