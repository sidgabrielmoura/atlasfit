import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

function getLocalDateStr(date: Date): string {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(date);
  const month = parts.find(p => p.type === "month")?.value || "";
  const day = parts.find(p => p.type === "day")?.value || "";
  const year = parts.find(p => p.type === "year")?.value || "";
  return `${year}-${month}-${day}`;
}

function getEventTime(date: Date): string {
  const hours = date.getUTCHours();
  const minutes = date.getUTCMinutes();
  if (hours === 0 && minutes === 0) {
    return "Horário Agendado";
  }
  
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return formatter.format(date);
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Não autorizado. Por favor, faça login.", { status: 401 });
  }

  try {
    // 1. Localizar membro ativo para identificar o workspace do aluno
    const member = await prisma.workspaceMember.findFirst({
      where: {
        userId: session.user.id,
        role: "STUDENT",
        isActive: true,
      },
      include: {
        workspace: {
          select: {
            name: true,
            slogan: true,
          },
        },
        user: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!member) {
      return new NextResponse("Membro do workspace não encontrado.", { status: 404 });
    }

    const workspaceId = member.workspaceId;
    const studentName = member.user.name || session.user.name || "Aluno";

    // 2. Buscar tarefas do personal no workspace especificamente marcadas para este aluno
    const trainerTasks = await prisma.trainerTask.findMany({
      where: {
        workspaceId,
        studentId: session.user.id,
      },
      orderBy: [
        { scheduledDate: "asc" },
        { time: "asc" },
      ],
    });

    // 3. Buscar avaliações físicas reais (que contam como eventos executados/agendados)
    const physicalEvaluations = await prisma.physicalEvaluation.findMany({
      where: {
        studentId: session.user.id,
        workspaceId,
      },
      orderBy: { date: "desc" },
    });

    // 4. Buscar treinos para construir a rotina semanal
    const workouts = await prisma.workout.findMany({
      where: {
        studentId: session.user.id,
        workspaceId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        dayOfWeek: true,
        muscleGroupLabel: true,
        difficulty: true,
        duration: true,
      },
    });

    // 5. Verificar se enviou fotos de progresso nos últimos 7 dias
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentPhoto = await prisma.studentProgressPhoto.findFirst({
      where: {
        studentId: session.user.id,
        workspaceId,
        createdAt: {
          gte: sevenDaysAgo,
        },
      },
    });
    const photoRequestActive = !recentPhoto;

    // 6. Verificar pagamentos pendentes ou atrasados para lembretes automáticos
    const payments = await prisma.workspacePayment.findMany({
      where: {
        workspaceId,
        studentName,
      },
    });

    let paymentStatus = "Em dia";
    const hasOverdue = payments.some((p) => p.status === "atrasado");
    const hasPending = payments.some((p) => p.status === "pendente");
    if (hasOverdue) {
      paymentStatus = "Expirado";
    } else if (hasPending) {
      paymentStatus = "Pendente";
    }

    // 7. Mapear e unificar os eventos para a agenda do aluno
    const events = [];

    // Adicionar as tarefas do personal
    for (const task of trainerTasks) {
      const dateStr = task.scheduledDate || getLocalDateStr(new Date(task.createdAt));
      events.push({
        id: task.id,
        title: task.title,
        date: dateStr,
        time: task.time,
        type: task.type === "avaliação" ? "Avaliação"
            : task.type === "check-in" ? "Check-in"
            : task.type === "lembrete" ? "Lembrete"
            : task.type === "financeiro" ? "Financeiro"
            : task.type === "aula" ? "Aula"
            : "Sessão",
        location: task.type === "avaliação" ? "Sala de Avaliação"
            : task.type === "check-in" ? "Atendimento Online"
            : task.type === "aula" ? "Área de Treino (Jardins)"
            : task.type === "lembrete" ? "Notificação Geral"
            : "Espaço Físico",
        completed: task.completed,
        personal: "Personal Trainer",
      });
    }

    // Adicionar as avaliações físicas como sessões realizadas
    for (const ev of physicalEvaluations) {
      const dateStr = getLocalDateStr(new Date(ev.date));
      events.push({
        id: ev.id,
        title: `Avaliação Física - ${ev.type}`,
        date: dateStr,
        time: getEventTime(new Date(ev.date)),
        type: ev.type,
        location: "Sala de Avaliação",
        completed: true,
        personal: "Personal Trainer",
      });
    }

    // Se a lista de eventos estiver vazia, vamos prover alguns eventos demonstrativos elegantes e contextualizados
    if (events.length === 0) {
      const todayStr = getLocalDateStr(new Date());
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 2);
      const tomorrowStr = getLocalDateStr(tomorrow);
      
      events.push(
        {
          id: "demo_1",
          title: "Avaliação Antropométrica & Pollock 7 Dobras",
          date: todayStr,
          time: "14:00",
          location: "Consultório de Fisioterapia",
          type: "Avaliação",
          completed: false,
          personal: "Gabriel Personal",
        },
        {
          id: "demo_2",
          title: "Mentoria Presencial e Alinhamento de Cargas",
          date: tomorrowStr,
          time: "09:00",
          location: "Unidade Jardins",
          type: "Personal",
          completed: false,
          personal: "Gabriel Personal",
        }
      );
    }

    // Ordenar eventos pela data
    events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Mapear tarefas brutas para checklist da aba correspondente
    const tasks = trainerTasks.map(task => ({
      id: task.id,
      title: task.title,
      time: task.time,
      type: task.type,
      completed: task.completed,
      scheduledDate: task.scheduledDate || getLocalDateStr(new Date(task.createdAt)),
    }));

    return NextResponse.json({
      events,
      tasks,
      workouts,
      photoRequestActive,
      paymentStatus,
      workspaceName: member.workspace.name,
    });
  } catch (error) {
    console.error("Student Agenda API GET Error:", error);
    return new NextResponse("Erro Interno do Servidor", { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Não autorizado. Por favor, faça login.", { status: 401 });
  }

  try {
    const { taskId, completed } = await req.json();
    if (!taskId) {
      return new NextResponse("O ID da tarefa é obrigatório.", { status: 400 });
    }

    // Atualizar o status da tarefa no banco
    const updatedTask = await prisma.trainerTask.update({
      where: {
        id: taskId,
        studentId: session.user.id,
      },
      data: {
        completed: !!completed,
      },
    });

    return NextResponse.json({
      success: true,
      task: updatedTask,
    });
  } catch (error) {
    console.error("Student Agenda API PATCH Error:", error);
    return new NextResponse("Erro ao atualizar o status do compromisso.", { status: 500 });
  }
}
