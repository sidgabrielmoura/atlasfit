import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Não autorizado. Por favor, faça login.", { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspaceId");

  if (!workspaceId) {
    return new NextResponse("O ID do workspace é obrigatório.", { status: 400 });
  }

  try {
    const member = await prisma.workspaceMember.findFirst({
      where: {
        userId: session.user.id,
        workspaceId,
      },
      include: {
        workspace: true,
      },
    });

    if (!member) {
      return new NextResponse("Workspace não encontrado ou acesso não autorizado.", { status: 403 });
    }

    const workspace = member.workspace;

    const realStudentsCount = await prisma.workspaceMember.count({
      where: {
        workspaceId,
        role: "STUDENT",
      },
    });

    const nameLower = workspace.name.toLowerCase();

    let baseMrr = 14280;
    let baseTicket = 297;
    let activePlans = 52;
    let completionRate = 87;
    let inactiveCount = 8;
    let churnRiskCount = 5;

    if (nameLower.includes("amanda")) {
      baseMrr = 9850;
      baseTicket = 245;
      activePlans = 40;
      completionRate = 92;
      inactiveCount = 4;
      churnRiskCount = 2;
    } else if (nameLower.includes("silva")) {
      baseMrr = 14280;
      baseTicket = 297;
      activePlans = 52;
      completionRate = 87;
      inactiveCount = 8;
      churnRiskCount = 5;
    } else {
      const hash = workspace.name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
      baseMrr = 3000 + (hash % 10) * 1200;
      baseTicket = 150 + (hash % 5) * 50;
      activePlans = Math.round(baseMrr / baseTicket);
      completionRate = 70 + (hash % 25);
      inactiveCount = 1 + (hash % 6);
      churnRiskCount = Math.max(1, Math.round(inactiveCount / 2));
    }

    const totalActive = realStudentsCount;

    const isAmanda = nameLower.includes("amanda");

    const revenueHistory = [
      { month: "Jan", current: Math.round(baseMrr * 0.7), previous: Math.round(baseMrr * 0.6) },
      { month: "Fev", current: Math.round(baseMrr * 0.75), previous: Math.round(baseMrr * 0.65) },
      { month: "Mar", current: Math.round(baseMrr * 0.8), previous: Math.round(baseMrr * 0.7) },
      { month: "Abr", current: Math.round(baseMrr * 0.9), previous: Math.round(baseMrr * 0.75) },
      { month: "Mai", current: Math.round(baseMrr * 0.95), previous: Math.round(baseMrr * 0.8) },
      { month: "Jun", current: baseMrr, previous: Math.round(baseMrr * 0.9) },
    ];

    const planDistribution = isAmanda ? [
      { plan: "Mensal", count: 15, revenue: 3000, fill: "var(--chart-1)" },
      { plan: "Trimestral", count: 12, revenue: 2940, fill: "var(--chart-2)" },
      { plan: "Semestral", count: 8, revenue: 2400, fill: "var(--chart-3)" },
      { plan: "Anual", count: 5, revenue: 1510, fill: "var(--chart-4)" },
    ] : [
      { plan: "Mensal", count: 18, revenue: 4500, fill: "var(--chart-1)" },
      { plan: "Trimestral", count: 15, revenue: 4950, fill: "var(--chart-2)" },
      { plan: "Semestral", count: 12, revenue: 3360, fill: "var(--chart-3)" },
      { plan: "Anual", count: 7, revenue: 1470, fill: "var(--chart-4)" },
    ];

    const topStudentsWeek = isAmanda ? [
      { id: 1, name: "Mariana Costa", sessions: 5, streak: 12, avatarFallback: "MC", progress: 78 },
      { id: 2, name: "Ana Beatriz", sessions: 5, streak: 18, avatarFallback: "AB", progress: 88 },
      { id: 3, name: "Fernanda Lima", sessions: 4, streak: 8, avatarFallback: "FL", progress: 85 },
      { id: 4, name: "Juliana Mendes", sessions: 4, streak: 6, avatarFallback: "JM", progress: 72 },
      { id: 5, name: "Lucas Santos", sessions: 3, streak: 5, avatarFallback: "LS", progress: 65 },
    ] : [
      { id: 1, name: "Lucas Almeida", sessions: 6, streak: 24, avatarFallback: "LA", progress: 95 },
      { id: 2, name: "Ana Beatriz", sessions: 5, streak: 18, avatarFallback: "AB", progress: 88 },
      { id: 3, name: "Pedro Henrique", sessions: 5, streak: 15, avatarFallback: "PH", progress: 82 },
      { id: 4, name: "Mariana Costa", sessions: 4, streak: 12, avatarFallback: "MC", progress: 78 },
      { id: 5, name: "Rafael Santos", sessions: 4, streak: 10, avatarFallback: "RS", progress: 75 },
    ];

    const inactiveStudents = isAmanda ? [
      { id: 1, name: "Juliana Mendes", daysInactive: 10, lastSession: "28/04", risk: "high" as const, avatarFallback: "JM" },
      { id: 2, name: "Carlos Eduardo", daysInactive: 8, lastSession: "30/04", risk: "medium" as const, avatarFallback: "CE" },
      { id: 3, name: "Fernanda Lima", daysInactive: 5, lastSession: "03/05", risk: "low" as const, avatarFallback: "FL" },
    ] : [
      { id: 1, name: "Carlos Eduardo", daysInactive: 14, lastSession: "24/04", risk: "high" as const, avatarFallback: "CE" },
      { id: 2, name: "Juliana Mendes", daysInactive: 10, lastSession: "28/04", risk: "high" as const, avatarFallback: "JM" },
      { id: 3, name: "Thiago Oliveira", daysInactive: 7, lastSession: "01/05", risk: "medium" as const, avatarFallback: "TO" },
      { id: 4, name: "Fernanda Lima", daysInactive: 5, lastSession: "03/05", risk: "medium" as const, avatarFallback: "FL" },
      { id: 5, name: "Bruno Martins", daysInactive: 4, lastSession: "04/05", risk: "low" as const, avatarFallback: "BM" },
    ];

    const trainingFeedback = isAmanda ? [
      { difficulty: "Muito Fácil", count: 8, fill: "var(--chart-5)" },
      { difficulty: "Fácil", count: 20, fill: "var(--chart-4)" },
      { difficulty: "Adequado", count: 50, fill: "var(--chart-1)" },
      { difficulty: "Difícil", count: 12, fill: "var(--chart-2)" },
      { difficulty: "Muito Difícil", count: 3, fill: "var(--chart-3)" },
    ] : [
      { difficulty: "Muito Fácil", count: 12, fill: "var(--chart-5)" },
      { difficulty: "Fácil", count: 28, fill: "var(--chart-4)" },
      { difficulty: "Adequado", count: 45, fill: "var(--chart-1)" },
      { difficulty: "Difícil", count: 18, fill: "var(--chart-2)" },
      { difficulty: "Muito Difícil", count: 7, fill: "var(--chart-3)" },
    ];

    const loadEvolution = isAmanda ? [
      { week: "Sem 1", avg: 38, benchmark: 35 },
      { week: "Sem 2", avg: 39, benchmark: 36 },
      { week: "Sem 3", avg: 41, benchmark: 37 },
      { week: "Sem 4", avg: 42, benchmark: 38 },
      { week: "Sem 5", avg: 44, benchmark: 39 },
      { week: "Sem 6", avg: 45, benchmark: 40 },
      { week: "Sem 7", avg: 47, benchmark: 41 },
      { week: "Sem 8", avg: 49, benchmark: 42 },
    ] : [
      { week: "Sem 1", avg: 42, benchmark: 40 },
      { week: "Sem 2", avg: 44, benchmark: 41 },
      { week: "Sem 3", avg: 43, benchmark: 42 },
      { week: "Sem 4", avg: 47, benchmark: 43 },
      { week: "Sem 5", avg: 49, benchmark: 44 },
      { week: "Sem 6", avg: 51, benchmark: 45 },
      { week: "Sem 7", avg: 50, benchmark: 46 },
      { week: "Sem 8", avg: 54, benchmark: 47 },
    ];

    const personalRecords = isAmanda ? [
      { id: 1, student: "Mariana Costa", exercise: "Leg Press", value: "280kg", date: "04/05", previousBest: "260kg", avatarFallback: "MC" },
      { id: 2, student: "Ana Beatriz", exercise: "Agachamento", value: "95kg", date: "06/05", previousBest: "90kg", avatarFallback: "AB" },
      { id: 3, student: "Fernanda Lima", exercise: "Stiff", value: "70kg", date: "07/05", previousBest: "65kg", avatarFallback: "FL" },
    ] : [
      { id: 1, student: "Lucas Almeida", exercise: "Supino Reto", value: "120kg", date: "07/05", previousBest: "115kg", avatarFallback: "LA" },
      { id: 2, student: "Ana Beatriz", exercise: "Agachamento", value: "95kg", date: "06/05", previousBest: "90kg", avatarFallback: "AB" },
      { id: 3, student: "Pedro Henrique", exercise: "Terra", value: "180kg", date: "05/05", previousBest: "170kg", avatarFallback: "PH" },
      { id: 4, student: "Mariana Costa", exercise: "Leg Press", value: "280kg", date: "04/05", previousBest: "260kg", avatarFallback: "MC" },
    ];

    const weeklyFrequencyData = isAmanda ? [
      { day: "Seg", count: 20 },
      { day: "Ter", count: 18 },
      { day: "Qua", count: 22 },
      { day: "Qui", count: 15 },
      { day: "Sex", count: 25 },
      { day: "Sáb", count: 12 },
      { day: "Dom", count: 4 },
    ] : [
      { day: "Seg", count: 32 },
      { day: "Ter", count: 28 },
      { day: "Qua", count: 35 },
      { day: "Qui", count: 30 },
      { day: "Sex", count: 38 },
      { day: "Sáb", count: 22 },
      { day: "Dom", count: 8 },
    ];

    const trainingConsistency = {
      overall: completionRate,
      trending: "up" as const,
      weeklyData: isAmanda ? [
        { week: "Sem 1", rate: 85 },
        { week: "Sem 2", rate: 87 },
        { week: "Sem 3", rate: 88 },
        { week: "Sem 4", rate: 90 },
        { week: "Sem 5", rate: 92 },
        { week: "Sem 6", rate: 91 },
      ] : [
        { week: "Sem 1", rate: 78 },
        { week: "Sem 2", rate: 80 },
        { week: "Sem 3", rate: 79 },
        { week: "Sem 4", rate: 83 },
        { week: "Sem 5", rate: 85 },
        { week: "Sem 6", rate: 82 },
      ],
    };

    const recentActivity = isAmanda ? [
      { id: 1, student: "Mariana Costa", action: "Completou treino de Pernas", time: "Há 4 horas", type: "workout" as const, avatarFallback: "MC" },
      { id: 2, student: "Ana Beatriz", action: "Novo PR: Agachamento 95kg", time: "Há 1 hora", type: "record" as const, avatarFallback: "AB" },
      { id: 3, student: "Juliana Mendes", action: "Não treinou hoje (10 dias inativa)", time: "Há 2 horas", type: "alert" as const, avatarFallback: "JM" },
    ] : [
      { id: 1, student: "Lucas Almeida", action: "Completou treino de Peito", time: "Há 15 min", type: "workout" as const, avatarFallback: "LA" },
      { id: 2, student: "Ana Beatriz", action: "Novo PR: Agachamento 95kg", time: "Há 1 hora", type: "record" as const, avatarFallback: "AB" },
      { id: 3, student: "Carlos Eduardo", action: "Não treinou hoje (14 dias inativo)", time: "Há 2 horas", type: "alert" as const, avatarFallback: "CE" },
      { id: 4, student: "Pedro Henrique", action: "Avaliou treino: Adequado ⭐", time: "Há 3 horas", type: "feedback" as const, avatarFallback: "PH" },
      { id: 5, student: "Mariana Costa", action: "Completou treino de Pernas", time: "Há 4 horas", type: "workout" as const, avatarFallback: "MC" },
    ];

    const payload = {
      studentsMetrics: {
        totalActive,
        totalActiveChange: isAmanda ? 5.2 : 12.5,
        inactive: inactiveCount,
        inactiveChange: isAmanda ? -1 : -2,
        churnRisk: churnRiskCount,
        avgWeeklyFrequency: isAmanda ? 4.1 : 3.8,
        frequencyChange: isAmanda ? 6.1 : 5.2,
        completionRate,
        completionChange: isAmanda ? 4.2 : 3.1,
        avgEvolution: isAmanda ? 15 : 12,
        evolutionChange: isAmanda ? 3.0 : 2.4,
      },
      financialMetrics: {
        mrr: baseMrr,
        mrrChange: isAmanda ? 10.4 : 8.3,
        avgTicket: baseTicket,
        ticketChange: isAmanda ? 5.2 : 4.1,
        activePlans,
        plansChange: isAmanda ? 4 : 6,
        financialChurn: isAmanda ? 3.1 : 4.2,
        churnChange: isAmanda ? -0.8 : -1.3,
        revenueProjection: Math.round(baseMrr * 1.15),
        projectionChange: isAmanda ? 18.2 : 15.5,
      },
      revenueHistory,
      planDistribution,
      topStudentsWeek,
      inactiveStudents,
      trainingFeedback,
      loadEvolution,
      personalRecords,
      weeklyFrequencyData,
      trainingConsistency,
      recentActivity,
    };

    return NextResponse.json(payload);
  } catch (error) {
    console.error("Dashboard API Error:", error);
    return new NextResponse("Erro Interno do Servidor", { status: 500 });
  }
}
