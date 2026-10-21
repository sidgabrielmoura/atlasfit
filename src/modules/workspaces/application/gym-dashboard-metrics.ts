import { gymReportMemberSql } from "./gym-report-contract-aggregates";
import { Prisma } from "@prisma/client";
import { gymReportAuthority } from "./gym-report-authority";
import { reportReadTransaction } from "./transaction";
import { GymAnalyticsService, type GymAnalyticsOverview } from "./gym-analytics-service";
import { safeCentsNumber } from "../domain/money";

export interface GymDashboardData {
  overview: GymAnalyticsOverview;
  planDistribution: Array<{
    plan: string;
    count: number;
    revenue: number;
    percentage: number;
    fill: string;
  }>;
  revenueHistory: Array<{
    month: string;
    current: number;
    previous: number;
  }>;
  weeklyFrequencyData: Array<{
    day: string;
    count: number;
  }>;
  hourlyFlowData: Array<{
    hour: string;
    count: number;
    isPeak?: boolean;
  }>;
  contractLifecycleData: Array<{
    period: string;
    newEnrollments: number;
    renewals: number;
    cancellations: number;
  }>;
  paymentMethodsData: Array<{
    method: string;
    label: string;
    count: number;
    total: number;
    fill: string;
  }>;
  inactiveStudents: Array<{
    id: string;
    name: string;
    email: string | null;
    whatsapp: string | null;
    daysInactive: number;
    lastSession: string;
    risk: "high" | "medium" | "low";
    avatarFallback: string;
    planName: string;
  }>;
  recentActivity: Array<{
    id: string;
    title: string;
    subtitle: string;
    time: string;
    type: "access" | "enrollment" | "payment" | "alert";
    avatarFallback: string;
  }>;
  topStudentsWeek: Array<{
    id: string | number;
    name: string;
    sessions: number;
    streak: number;
    progress: number;
    avatarFallback: string;
  }>;
  upcomingRenewals: Array<{
    id: string;
    studentName: string;
    planName: string;
    endDate: string;
    daysRemaining: number;
    avatarFallback: string;
  }>;
  checkinsTodayCount: number;
}

const MONTH_NAMES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function formatTimeAgo(date: Date, now: Date): string {
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 60) {
    return `Há ${Math.max(1, diffMins)} min`;
  }
  if (diffHours < 24) {
    return `Há ${diffHours} ${diffHours === 1 ? "hora" : "horas"}`;
  }
  return `Há ${diffDays} ${diffDays === 1 ? "dia" : "dias"}`;
}

export async function getGymDashboardMetrics(input: {
  workspaceId: string;
  actorUserId: string;
}): Promise<GymDashboardData> {
  return reportReadTransaction(async tx => {
  const { workspaceId, actorUserId } = input;
  const scope = await gymReportAuthority(tx, workspaceId, actorUserId);
  const settings = await tx.gymSettings.findUnique({ where: { workspaceId }, select: { timezone: true } });
  const timezone = settings?.timezone || "America/Sao_Paulo";
  const accessWhere: Prisma.GymAccessLogWhereInput = { workspaceId, unitId: { in: scope.units.map(unit => unit.id) }, OR: [{ studentMember: scope.portfolio }, { studentMemberId: null, unitId: { in: scope.units.filter(unit => unit.canManageStudents).map(unit => unit.id) } }] };
  const now = new Date();

  // 1. Períodos e Overview Auditados Reais
  const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
  const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
  const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

  const overview = await GymAnalyticsService.getOverviewInTransaction(tx, { workspaceId, actorUserId, startDate: startOfCurrentMonth, endDate: now }, scope, timezone);
  const prevMonthOverview = await GymAnalyticsService.getOverviewInTransaction(tx, { workspaceId, actorUserId, startDate: startOfPrevMonth, endDate: endOfPrevMonth, includeFinancial: false }, scope, timezone);

  // 2. Matrículas Ativas e Distribuição de Planos Reais
  const enrollmentGroups = await tx.gymEnrollment.groupBy({ by: ["planVersionId"], where: { AND: [scope.enrollmentWhere], status: "ACTIVE" }, _count: { _all: true }, _sum: { priceInCents: true } });
  const versions = enrollmentGroups.length ? await tx.gymPlanVersion.findMany({ where: { id: { in: enrollmentGroups.map(group => group.planVersionId) }, plan: { workspaceId } }, select: { id: true, name: true, plan: { select: { name: true } } } }) : [];
  const versionMap = new Map(versions.map(version => [version.id, version]));
  const enrollments = enrollmentGroups.map(group => ({ count: group._count._all, priceInCents: group._sum.priceInCents || BigInt(0), planVersion: versionMap.get(group.planVersionId) }));

  const planStats: Record<string, { count: number; revenueInCents: number }> = {};
  for (const en of enrollments) {
    const planName = en.planVersion?.plan?.name || en.planVersion?.name || "Geral";
    if (!planStats[planName]) {
      planStats[planName] = { count: 0, revenueInCents: 0 };
    }
    planStats[planName].count += en.count;
    planStats[planName].revenueInCents += scope.financial ? safeCentsNumber(en.priceInCents) : 0;
  }

  const totalActive = Math.max(enrollments.reduce((sum, group) => sum + group.count, 0), overview.executive.activeStudentsCount);
  const chartColors = [
    "var(--chart-1)",
    "var(--chart-2)",
    "var(--chart-3)",
    "var(--chart-4)",
    "var(--chart-5)",
  ];

  let planDistribution = Object.entries(planStats).map(([plan, stat], idx) => ({
    plan,
    count: stat.count,
    revenue: Math.round(stat.revenueInCents / 100),
    percentage: totalActive > 0 ? Math.round((stat.count / totalActive) * 100) : 0,
    fill: chartColors[idx % chartColors.length],
  }));

  if (planDistribution.length === 0) {
    const configuredPlans = await tx.gymPlan.findMany({
      where: { workspaceId, isActive: true },
      take: 5,
      select: { name: true },
    });
    if (configuredPlans.length > 0) {
      planDistribution = configuredPlans.map((cp, idx) => ({
        plan: cp.name,
        count: 0,
        revenue: 0,
        percentage: 0,
        fill: chartColors[idx % chartColors.length],
      }));
    } else {
      planDistribution = [];
    }
  }

  // 3. Faturamento Mensal Real (Últimos 6 meses)
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1, 0, 0, 0);
  // Seven aggregate rows include the previous bucket of the first displayed month.
  // Attribute split receipts by allocation to authorized invoices, never by payment total.
  const confirmedPayments: Array<{ amountInCents: bigint; paidAt: Date }> = [];
  if (scope.financial) for (let i = 6; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const total = await tx.gymPaymentAllocation.aggregate({ where: { invoice: scope.invoiceWhere, payment: { workspaceId, status: "CONFIRMED", paidAt: { gte: start, lt: end } } }, _sum: { allocatedAmountInCents: true } });
    confirmedPayments.push({ paidAt: start, amountInCents: total._sum.allocatedAmountInCents ?? BigInt(0) });
  }

  const revenueHistory: Array<{ month: string; current: number; previous: number }> = [];
  for (let i = 5; i >= 0; i--) {
    const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const startOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1, 0, 0, 0);
    const endOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0, 23, 59, 59, 999);

    const startOfPrevMonthBucket = new Date(targetDate.getFullYear(), targetDate.getMonth() - 1, 1, 0, 0, 0);
    const endOfPrevMonthBucket = new Date(targetDate.getFullYear(), targetDate.getMonth(), 0, 23, 59, 59, 999);

    const currentCents = confirmedPayments
      .filter((p) => p.paidAt && p.paidAt >= startOfMonth && p.paidAt <= endOfMonth)
      .reduce((sum, p) => sum + safeCentsNumber(p.amountInCents), 0);

    const prevCents = confirmedPayments
      .filter((p) => p.paidAt && p.paidAt >= startOfPrevMonthBucket && p.paidAt <= endOfPrevMonthBucket)
      .reduce((sum, p) => sum + safeCentsNumber(p.amountInCents), 0);

    revenueHistory.push({
      month: MONTH_NAMES[targetDate.getMonth()],
      current: Math.round(currentCents / 100),
      previous: Math.round(prevCents / 100),
    });
  }

  // 4. Frequência Semanal e Check-ins Hoje
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const unitIds = scope.units.map(unit => unit.id);
  const managedUnitIds = scope.units.filter(unit => unit.canManageStudents).map(unit => unit.id);
  const accessLogs = await tx.$queryRaw<Array<{ createdAt: Date; count: number }>>(Prisma.sql`
    SELECT date_trunc('hour',l."createdAt") AS "createdAt",count(*)::int AS count FROM "GymAccessLog" l
    WHERE l."workspaceId"=${workspaceId} AND l."createdAt">=${sevenDaysAgo}
      AND ${unitIds.length ? Prisma.sql`l."unitId" IN (${Prisma.join(unitIds)})` : Prisma.sql`FALSE`}
      AND (EXISTS (SELECT 1 FROM "WorkspaceMember" m WHERE m.id=l."studentMemberId" AND m."workspaceId"=${workspaceId} AND ${gymReportMemberSql(scope)})
        OR (l."studentMemberId" IS NULL AND ${managedUnitIds.length ? Prisma.sql`l."unitId" IN (${Prisma.join(managedUnitIds)})` : Prisma.sql`FALSE`}))
    GROUP BY 1
  `);
  const checkinsTodayCount = accessLogs.filter(log => log.createdAt >= startOfToday && log.createdAt <= endOfToday).reduce((sum, log) => sum + log.count, 0);

  const dayCounts: Record<string, number> = {
    Seg: 0,
    Ter: 0,
    Qua: 0,
    Qui: 0,
    Sex: 0,
    Sáb: 0,
    Dom: 0,
  };

  const dayMap: Record<number, string> = {
    0: "Dom",
    1: "Seg",
    2: "Ter",
    3: "Qua",
    4: "Qui",
    5: "Sex",
    6: "Sáb",
  };

  accessLogs.forEach((log) => {
    const dayKey = dayMap[log.createdAt.getDay()];
    if (dayKey) {
      dayCounts[dayKey] = (dayCounts[dayKey] || 0) + log.count;
    }
  });

  const weeklyFrequencyData = [
    { day: "Seg", count: dayCounts.Seg },
    { day: "Ter", count: dayCounts.Ter },
    { day: "Qua", count: dayCounts.Qua },
    { day: "Qui", count: dayCounts.Qui },
    { day: "Sex", count: dayCounts.Sex },
    { day: "Sáb", count: dayCounts.Sáb },
    { day: "Dom", count: dayCounts.Dom },
  ];

  // 5. Fluxo por Horário / Ocupação da Academia (06h às 22h)
  const hourCounts: Record<number, number> = {};
  for (let h = 6; h <= 22; h++) {
    hourCounts[h] = 0;
  }

  accessLogs.forEach((log) => {
    const h = log.createdAt.getHours();
    if (h >= 6 && h <= 22) {
      hourCounts[h] = (hourCounts[h] || 0) + log.count;
    }
  });

  const maxAccessCount = Math.max(...Object.values(hourCounts), 0);
  const hourlyFlowData = Object.entries(hourCounts).map(([hStr, count]) => {
    const h = parseInt(hStr, 10);
    const isPeak = maxAccessCount > 0 && count === maxAccessCount;
    return {
      hour: `${h.toString().padStart(2, "0")}h`,
      count,
      isPeak,
    };
  });

  // 6. Ciclo de Matrículas & Retenção Reais (Auditoria Contábil por Período)
  const contractLifecycleData = [
    {
      period: "Mês Anterior",
      newEnrollments: prevMonthOverview.executive.newEnrollmentsCount,
      renewals: prevMonthOverview.executive.renewalsCount,
      cancellations: prevMonthOverview.executive.cancelledEnrollmentsCount,
    },
    {
      period: "Mês Atual",
      newEnrollments: overview.executive.newEnrollmentsCount,
      renewals: overview.executive.renewalsCount,
      cancellations: overview.executive.cancelledEnrollmentsCount,
    },
  ];

  // 7. Formas de Pagamento Reais
  const paymentMethodsLabels: Record<string, string> = {
    PIX: "PIX",
    CREDIT_CARD: "Cartão de Crédito",
    DEBIT_CARD: "Cartão de Débito",
    BOLETO: "Boleto",
    CASH: "Dinheiro / Espécie",
    BANK_TRANSFER: "Transferência",
  };

  const paymentMethodsData = (overview.cashFlow.paymentsByMethod || []).map((m, idx) => ({
    method: m.method,
    label: paymentMethodsLabels[m.method] || m.method,
    count: m.count,
    total: Math.round(m.totalInCents / 100),
    fill: chartColors[idx % chartColors.length],
  }));

  // 8. Alunos Inativos / Risco de Evasão (> 10 dias sem acesso)
  const studentMembers = await tx.workspaceMember.findMany({
    where: {
      AND: [scope.portfolio],
      workspaceId,
      role: "STUDENT",
      isActive: true,
    },
    select: {
      id: true,
      lastActive: true,
      createdAt: true,
      streak: true,
      progress: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          whatsapp: true,
        },
      },
      gymEnrollments: {
        where: { AND: [scope.enrollmentWhere], status: "ACTIVE" },
        take: 1,
        select: {
          id: true,
          endDate: true,
          planVersion: {
            select: {
              name: true,
              plan: { select: { name: true } },
            },
          },
        },
      },
      accessLogs: {
        where: accessWhere,
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { createdAt: true },
      },
    },
    take: 120,
  });

  const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);

  const inactiveList = studentMembers.filter((m) => {
    const lastSessionDate = m.accessLogs[0]?.createdAt || m.lastActive;
    if (!lastSessionDate) {
      return m.gymEnrollments.length > 0 && m.createdAt < tenDaysAgo;
    }
    return lastSessionDate < tenDaysAgo;
  });

  const inactiveStudents = inactiveList.slice(0, 5).map((m) => {
    const lastDate = m.accessLogs[0]?.createdAt || m.lastActive;
    const days = lastDate
      ? Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
      : Math.floor((now.getTime() - m.createdAt.getTime()) / (1000 * 60 * 60 * 24));

    const lastSessionStr = lastDate
      ? `${lastDate.getDate().toString().padStart(2, "0")}/${(lastDate.getMonth() + 1).toString().padStart(2, "0")}`
      : "Nunca acessou";

    const planName =
      m.gymEnrollments[0]?.planVersion?.plan?.name ||
      m.gymEnrollments[0]?.planVersion?.name ||
      "Sem matrícula ativa";

    const studentName = m.user.name || m.user.email?.split("@")[0] || "Aluno";

    return {
      id: m.id,
      name: studentName,
      email: m.user.email,
      whatsapp: m.user.whatsapp,
      daysInactive: Math.max(0, days),
      lastSession: lastSessionStr,
      risk: (days > 20 ? "high" : days > 12 ? "medium" : "low") as "high" | "medium" | "low",
      avatarFallback: studentName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2),
      planName,
    };
  });

  // 9. Atividade Recente Real (Acessos, Matrículas, Pagamentos)
  const [recentLogs, recentEnrollments, recentPayments] = await Promise.all([
    tx.gymAccessLog.findMany({
      where: accessWhere,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 4,
      include: {
        studentMember: {
          include: { user: { select: { name: true, email: true } } },
        },
        device: { select: { name: true } },
      },
    }),
    tx.gymEnrollment.findMany({
      where: scope.enrollmentWhere,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 3,
      include: {
        studentMember: {
          include: { user: { select: { name: true, email: true } } },
        },
        planVersion: { select: { name: true, plan: { select: { name: true } } } },
      },
    }),
    scope.financial ? tx.gymPayment.findMany({
      where: { workspaceId, status: "CONFIRMED", allocations: { some: { invoice: scope.invoiceWhere } } },
      orderBy: { paidAt: "desc" },
      take: 3,
      include: {
        allocations: {
          where: { invoice: scope.invoiceWhere },
          take: 1,
          include: {
            invoice: {
              include: {
                studentMember: {
                  include: { user: { select: { name: true, email: true } } },
                },
              },
            },
          },
        },
      },
    }) : Promise.resolve([]),
  ]);

  const scopedAmounts = recentPayments.length ? await tx.gymPaymentAllocation.groupBy({ by: ["paymentId"], where: { paymentId: { in: recentPayments.map(payment => payment.id) }, invoice: scope.invoiceWhere }, _sum: { allocatedAmountInCents: true } }) : [];
  const paymentAmounts = new Map(scopedAmounts.map(amount => [amount.paymentId, amount._sum.allocatedAmountInCents || BigInt(0)]));

  interface TimelineItem {
    id: string;
    title: string;
    subtitle: string;
    time: string;
    type: "access" | "enrollment" | "payment" | "alert";
    avatarFallback: string;
    rawDate: Date;
  }

  const activities: TimelineItem[] = [];

  recentLogs.forEach((l) => {
    const studentName = l.studentMember?.user?.name || l.studentMember?.user?.email?.split("@")[0] || "Aluno identificado";
    activities.push({
      id: `access-${l.id}`,
      title: studentName,
      subtitle: `Check-in realizado (${l.device?.name || "Portaria Principal"})`,
      time: formatTimeAgo(l.createdAt, now),
      type: "access",
      avatarFallback: studentName.slice(0, 2).toUpperCase(),
      rawDate: l.createdAt,
    });
  });

  recentEnrollments.forEach((e) => {
    const studentName = e.studentMember?.user?.name || e.studentMember?.user?.email?.split("@")[0] || "Novo Aluno";
    const planName = e.planVersion?.plan?.name || e.planVersion?.name || "Plano";
    activities.push({
      id: `enr-${e.id}`,
      title: studentName,
      subtitle: `Matrícula confirmada no ${planName}`,
      time: formatTimeAgo(e.createdAt, now),
      type: "enrollment",
      avatarFallback: studentName.slice(0, 2).toUpperCase(),
      rawDate: e.createdAt,
    });
  });

  recentPayments.forEach((p) => {
    if (p.paidAt) {
      const student = p.allocations[0]?.invoice?.studentMember?.user;
      const studentName = student?.name || student?.email?.split("@")[0] || "Aluno";
      const amountStr = (safeCentsNumber(paymentAmounts.get(p.id) || BigInt(0)) / 100).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      });
      const methodStr = paymentMethodsLabels[p.paymentMethod] || p.paymentMethod;
      activities.push({
        id: `pay-${p.id}`,
        title: studentName,
        subtitle: `Pagamento recebido de ${amountStr} via ${methodStr}`,
        time: formatTimeAgo(p.paidAt, now),
        type: "payment",
        avatarFallback: studentName.slice(0, 2).toUpperCase(),
        rawDate: p.paidAt,
      });
    }
  });

  activities.sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime());
  const recentActivity = activities.slice(0, 5).map(({ rawDate, ...rest }) => rest);

  // 10. Top Alunos da Semana / Mês (Constância e Presença Baseada em Acessos Reais)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const studentCheckinCounts = await tx.gymAccessLog.groupBy({
    by: ["studentMemberId"],
    where: {
      ...accessWhere,
      createdAt: { gte: thirtyDaysAgo },
      studentMemberId: { not: null },
    },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: 5,
  });

  const rankedMemberIds = studentCheckinCounts
    .map((sc) => sc.studentMemberId)
    .filter((id): id is string => Boolean(id));

  let topStudentsWeek: GymDashboardData["topStudentsWeek"] = [];

  if (rankedMemberIds.length > 0) {
    const rankedMembers = await tx.workspaceMember.findMany({
      where: { id: { in: rankedMemberIds }, AND: [scope.portfolio] },
      select: {
        id: true,
        streak: true,
        progress: true,
        user: { select: { name: true, email: true } },
      },
    });
    const memberMap = new Map(rankedMembers.map((m) => [m.id, m]));

    topStudentsWeek = studentCheckinCounts
      .map((sc) => {
        const m = sc.studentMemberId ? memberMap.get(sc.studentMemberId) : undefined;
        if (!m) return null;
        const name = m.user.name || m.user.email?.split("@")[0] || "Aluno";
        return {
          id: m.id,
          name,
          sessions: sc._count.id,
          streak: m.streak || 0,
          progress: m.progress || 0,
          avatarFallback: name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2),
        };
      })
      .filter((s): s is NonNullable<typeof s> => s !== null);
  } else {
    // Se não há check-ins no período, exibir apenas alunos com streak real registrada
    const activeWithStreak = studentMembers.filter((m) => m.streak > 0).slice(0, 5);
    topStudentsWeek = activeWithStreak.map((m) => {
      const name = m.user.name || m.user.email?.split("@")[0] || "Aluno";
      return {
        id: m.id,
        name,
        sessions: 0,
        streak: m.streak,
        progress: m.progress || 0,
        avatarFallback: name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2),
      };
    });
  }

  // 11. Próximos Vencimentos de Contrato Reais (Próximos 15 dias)
  const fifteenDaysAhead = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);
  const expiringEnrollments = await tx.gymEnrollment.findMany({
    where: {
      AND: [scope.enrollmentWhere],
      status: "ACTIVE",
      endDate: {
        gte: now,
        lte: fifteenDaysAhead,
      },
    },
    take: 5,
    orderBy: { endDate: "asc" },
    include: {
      studentMember: {
        include: { user: { select: { name: true, email: true } } },
      },
      planVersion: { select: { name: true, plan: { select: { name: true } } } },
    },
  });

  const upcomingRenewals = expiringEnrollments.map((e) => {
    const studentName = e.studentMember?.user?.name || e.studentMember?.user?.email?.split("@")[0] || "Aluno";
    const planName = e.planVersion?.plan?.name || e.planVersion?.name || "Plano";
    const daysRemaining = e.endDate
      ? Math.max(0, Math.ceil((e.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      : 0;

    const endDateStr = e.endDate
      ? `${e.endDate.getDate().toString().padStart(2, "0")}/${(e.endDate.getMonth() + 1).toString().padStart(2, "0")}`
      : "A vencer";

    return {
      id: e.id,
      studentName,
      planName,
      endDate: endDateStr,
      daysRemaining,
      avatarFallback: studentName.slice(0, 2).toUpperCase(),
    };
  });

  return {
    overview,
    planDistribution,
    revenueHistory,
    weeklyFrequencyData,
    hourlyFlowData,
    contractLifecycleData,
    paymentMethodsData,
    inactiveStudents,
    recentActivity,
    topStudentsWeek,
    upcomingRenewals,
    checkinsTodayCount,
  };
  });
}
