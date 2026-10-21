import { personalTrainingSummary } from "@/lib/personal-training-summary";
import { personalPaymentSummary } from "@/lib/personal-payment-summary";
import { withRequestMemo } from "@/lib/request-memo";
import { personalCommercialContextResponse } from "@/lib/personal-commercial-context";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { requirePersonalWorkspaceAccess, handleWorkspaceAccessError } from "@/modules/workspaces/application/guard";

async function handleGET(req: Request) {
  const restricted = await personalCommercialContextResponse(); if (restricted) return restricted;
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
    await requirePersonalWorkspaceAccess({ workspaceId, allowedRoles: ["OWNER", "MANAGER", "TRAINER", "ASSISTANT", "FINANCE"] });
    const now = new Date();

    const tenDaysAgo = new Date(now.getTime() - 10 * 86400000);
    const fiveDaysAgo = new Date(now.getTime() - 5 * 86400000);
    const [students] = await prisma.$queryRaw<Array<{ total: number; active: number; inactive: number; risk: number; progress: number }>>`
      SELECT count(*)::int AS total, count(*) FILTER (WHERE "isActive")::int AS active,
        count(*) FILTER (WHERE "lastActive" IS NULL OR "lastActive"<${tenDaysAgo} OR NOT "isActive")::int AS inactive,
        count(*) FILTER (WHERE "isActive" AND ("lastActive" IS NULL OR ("lastActive">${tenDaysAgo} AND "lastActive"<=${fiveDaysAgo})))::int AS risk,
        COALESCE(avg(progress),0)::float8 AS progress FROM "WorkspaceMember" WHERE "workspaceId"=${workspaceId} AND role='STUDENT'
    `;
    const totalActive = students.active, inactiveCount = students.inactive, churnRiskCount = students.risk;
    const completionRate = Math.round(students.progress), avgEvolution = completionRate;
    const inactiveMembers = await prisma.workspaceMember.findMany({ where: { workspaceId, role: "STUDENT", OR: [{ lastActive: null }, { lastActive: { lt: tenDaysAgo } }, { isActive: false }] }, select: { id: true, lastActive: true, user: { select: { name: true } } }, orderBy: [{ lastActive: { sort: "asc", nulls: "first" } }, { id: "asc" }], take: 5 });
    const { mrr, avgTicket, allTimeChurn: financialChurn, months } = await personalPaymentSummary(workspaceId, now);

    const formattedInactiveStudents = inactiveMembers.slice(0, 5).map((m) => {
      const days = m.lastActive
        ? Math.floor((now.getTime() - m.lastActive.getTime()) / (1000 * 60 * 60 * 24))
        : 15;
      const lastSessionDateStr = m.lastActive
        ? `${m.lastActive.getDate().toString().padStart(2, '0')}/${(m.lastActive.getMonth() + 1).toString().padStart(2, '0')}`
        : "N/A";
      
      return {
        id: m.id,
        name: m.user.name || "Sem Nome",
        daysInactive: days,
        lastSession: lastSessionDateStr,
        risk: (days > 15 ? "high" : days > 7 ? "medium" : "low") as "high" | "medium" | "low",
        avatarFallback: m.user.name ? m.user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) : "AL",
      };
    });

    const plans = await prisma.workspaceMember.groupBy({ by: ["plan"], where: { workspaceId, role: "STUDENT", isActive: true }, _count: { _all: true } });
    const plansCount: Record<string, number> = {};
    for (const plan of plans) plansCount[plan.plan || "Mensal"] = (plansCount[plan.plan || "Mensal"] || 0) + plan._count._all;

    const planDistribution = Object.entries(plansCount).map(([plan, count], idx) => {
      let planPrice = 150;
      if (plan.toLowerCase().includes("trime")) planPrice = 130;
      else if (plan.toLowerCase().includes("seme")) planPrice = 110;
      else if (plan.toLowerCase().includes("anual") || plan.toLowerCase().includes("ano")) planPrice = 100;
      
      return {
        plan,
        count,
        revenue: count * planPrice,
        fill: `var(--chart-${(idx % 5) + 1})`,
      };
    });

    const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const revenueHistory = months.slice(1).map((month, i) => ({ month: monthNames[month.start.getMonth()], current: month.revenue, previous: months[i].revenue }));

    // 8. Top Students based on streak and progress
    const sortedStudents = await prisma.workspaceMember.findMany({ where: { workspaceId, role: "STUDENT" }, select: { id: true, streak: true, progress: true, user: { select: { name: true } } }, orderBy: [{ streak: "desc" }, { progress: "desc" }, { id: "asc" }], take: 5 });

    const topStudentsWeek = sortedStudents.map((m, idx) => ({
      id: idx + 1,
      name: m.user.name || "Sem Nome",
      sessions: m.streak > 0 ? Math.min(5, m.streak) : 0,
      streak: m.streak,
      avatarFallback: m.user.name ? m.user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) : "AL",
      progress: m.progress || 0,
    }));

    // 9. Recent activity feed gathered from dynamic database events
    const recentEvals = await prisma.physicalEvaluation.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, createdAt: true, student: { select: { name: true } }, type: true },
    });

    const recentPhotos = await prisma.studentProgressPhoto.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, createdAt: true, student: { select: { name: true } } },
    });

    const recentProgLogs = await prisma.studentProgress.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, createdAt: true, student: { select: { name: true } }, weight: true },
    });

    interface UnifiedActivity {
      id: string;
      student: string;
      action: string;
      time: string;
      type: "workout" | "record" | "alert" | "feedback";
      avatarFallback: string;
      rawDate: Date;
    }

    const activitiesList: UnifiedActivity[] = [];

    recentEvals.forEach((ev) => {
      activitiesList.push({
        id: `eval-${ev.id}`,
        student: ev.student.name || "Sem Nome",
        action: `Registrou uma nova avaliação física (${ev.type})`,
        time: formatTimeAgo(ev.createdAt),
        type: "feedback",
        avatarFallback: ev.student.name ? ev.student.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) : "AL",
        rawDate: ev.createdAt,
      });
    });

    recentPhotos.forEach((ph) => {
      activitiesList.push({
        id: `photo-${ph.id}`,
        student: ph.student.name || "Sem Nome",
        action: `Adicionou uma nova foto de progresso visual`,
        time: formatTimeAgo(ph.createdAt),
        type: "record",
        avatarFallback: ph.student.name ? ph.student.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) : "AL",
        rawDate: ph.createdAt,
      });
    });

    recentProgLogs.forEach((pl) => {
      activitiesList.push({
        id: `prog-${pl.id}`,
        student: pl.student.name || "Sem Nome",
        action: `Registrou uma nova medida de progresso (${pl.weight ? pl.weight + "kg" : "medidas"})`,
        time: formatTimeAgo(pl.createdAt),
        type: "workout",
        avatarFallback: pl.student.name ? pl.student.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) : "AL",
        rawDate: pl.createdAt,
      });
    });

    inactiveMembers.slice(0, 3).forEach((im) => {
      activitiesList.push({
        id: `inactive-${im.id}`,
        student: im.user.name || "Sem Nome",
        action: "Está inativo(a) há mais de 10 dias",
        time: im.lastActive ? formatTimeAgo(im.lastActive) : "Nunca ativo",
        type: "alert",
        avatarFallback: im.user.name ? im.user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) : "AL",
        rawDate: im.lastActive || new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      });
    });

    activitiesList.sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime());
    const recentActivity = activitiesList.slice(0, 5);

    function formatTimeAgo(date: Date) {
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 60) {
        return `Há ${Math.max(1, diffMins)} min`;
      } else if (diffHours < 24) {
        return `Há ${diffHours} ${diffHours === 1 ? "hora" : "horas"}`;
      } else {
        return `Há ${diffDays} ${diffDays === 1 ? "dia" : "dias"}`;
      }
    }

    const training = await personalTrainingSummary(workspaceId, now);
    const labels = ["Muito Fácil", "Fácil", "Adequado", "Difícil", "Muito Difícil"];
    const trainingFeedback = labels.map((difficulty, i) => ({ difficulty, count: training.feedback.find(row => row.effortScore === i + 1)?._count._all || 0, fill: `var(--chart-${[5,4,1,2,3][i]})` }));
    const evolution = Array.from({ length: 6 }, (_, i) => ({ week: `Sem ${i + 1}`, avg: training.evolution.find(row => row.week === i)?.average || 0 }));
    const activeWeeks = evolution.filter(row => row.avg > 0);
    const overallAvg = activeWeeks.reduce((sum, row) => sum + row.avg, 0) / (activeWeeks.length || 1);
    const loadEvolution = activeWeeks.length ? evolution.map((row, i) => ({ ...row, benchmark: Math.round(overallAvg * (0.88 + i * 0.02)) })) : [];
    const personalRecords = training.records.map((record, i) => ({ id: i + 1, student: record.studentName, exercise: record.exerciseName, value: `${record.maxLoad}kg`, date: `${String(record.date.getDate()).padStart(2, "0")}/${String(record.date.getMonth() + 1).padStart(2, "0")}`, previousBest: `${Math.round(record.maxLoad * 0.9)}kg`, avatarFallback: record.studentName.split(" ").map(name => name[0]).join("").toUpperCase().slice(0, 2) }));
    const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    const weeklyFrequencyData = [1,2,3,4,5,6,0].map(day => ({ day: days[day], count: training.frequency.find(row => row.day === day)?.count || 0 }));

    const trainingConsistency = {
      overall: completionRate,
      trending: "up" as const,
      weeklyData: students.total > 0 ? [
        { week: "Sem 1", rate: Math.max(0, completionRate - 8) },
        { week: "Sem 2", rate: Math.max(0, completionRate - 5) },
        { week: "Sem 3", rate: Math.max(0, completionRate - 3) },
        { week: "Sem 4", rate: completionRate },
      ] : [],
    };

    const payload = {
      studentsMetrics: {
        totalActive,
        totalActiveChange: 0.0,
        inactive: inactiveCount,
        inactiveChange: 0.0,
        churnRisk: churnRiskCount,
        avgWeeklyFrequency: totalActive > 0 ? 3.8 : 0.0,
        frequencyChange: 0.0,
        completionRate,
        completionChange: 0.0,
        avgEvolution,
        evolutionChange: 0.0,
      },
      financialMetrics: {
        mrr,
        mrrChange: 0.0,
        avgTicket,
        ticketChange: 0.0,
        activePlans: totalActive,
        plansChange: 0.0,
        financialChurn,
        churnChange: 0.0,
        revenueProjection: Math.round(mrr * 1.1),
        projectionChange: 0.0,
      },
      revenueHistory,
      planDistribution,
      topStudentsWeek,
      inactiveStudents: formattedInactiveStudents,
      trainingFeedback,
      loadEvolution,
      personalRecords,
      weeklyFrequencyData,
      trainingConsistency,
      recentActivity,
    };

    return NextResponse.json(payload);
  } catch (error) {
    const access = handleWorkspaceAccessError(error);
    if (access) return access;
    console.error("Dashboard API Error:", error);
    return new NextResponse("Erro Interno do Servidor", { status: 500 });
  }
}
export const GET = withRequestMemo(handleGET);
