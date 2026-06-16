import prisma from "@/lib/prisma";

export async function getSuperAdminStats() {
  const now = new Date();
  const last30Days = new Date();
  last30Days.setDate(now.getDate() - 30);
  const last7Days = new Date();
  last7Days.setDate(now.getDate() - 7);

  const [
    totalUsers,
    activeSessionsData,
    usersCreatedLast30,
    newRecentUsers,
    totalWorkspaces,
    workspacesCreatedLast30,
    totalWorkouts,
    activeSubscriptions
  ] = await Promise.all([
    prisma.user.count(),
    prisma.session.findMany({ select: { userId: true }, where: { expires: { gt: now } }, distinct: ['userId'] }),
    prisma.user.count({ where: { createdAt: { gte: last30Days } } }),
    prisma.user.count({ where: { createdAt: { gte: last7Days } } }),
    prisma.workspace.count(),
    prisma.workspace.count({ where: { createdAt: { gte: last30Days } } }),
    prisma.workoutLog.count(),
    prisma.subscription.findMany({ 
      where: { status: { in: ["ACTIVE", "active"] } },
      include: { plan: true }
    })
  ]);

  const activeUsers = activeSessionsData.length;
  const mrr = activeSubscriptions.reduce((acc, sub) => acc + (sub.plan?.price || 0), 0);

  // Cálculos de crescimento da base (últimos 30 dias em relação à base anterior)
  const prevUsersBase = totalUsers - usersCreatedLast30;
  const userGrowth = prevUsersBase > 0 ? (usersCreatedLast30 / prevUsersBase) * 100 : (usersCreatedLast30 > 0 ? 100 : 0);

  const prevWorkspacesBase = totalWorkspaces - workspacesCreatedLast30;
  const workspaceGrowth = prevWorkspacesBase > 0 ? (workspacesCreatedLast30 / prevWorkspacesBase) * 100 : (workspacesCreatedLast30 > 0 ? 100 : 0);

  // Engajamento e Frequência
  const engagement = totalUsers > 0 ? (activeUsers / totalUsers) * 100 : 0;
  const avgFrequency = totalUsers > 0 ? (totalWorkouts / totalUsers) : 0;

  // Calculo de histórico real (últimos 6 meses)
  const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      name: monthNames[d.getMonth()],
      year: d.getFullYear(),
      month: d.getMonth(),
    });
  }

  const userGrowthData = [];
  const financialGrowthData = [];

  for (const m of months) {
    const endOfMonth = new Date(m.year, m.month + 1, 0, 23, 59, 59, 999);

    // Conta usuários registrados até o fim deste mês
    const totalUsersAtMonth = await prisma.user.count({
      where: {
        createdAt: { lte: endOfMonth }
      }
    });
    userGrowthData.push({
      month: m.name,
      total: totalUsersAtMonth
    });

    // Assinaturas ativas no fim deste mês
    const activeSubsAtMonth = await prisma.subscription.findMany({
      where: {
        startDate: { lte: endOfMonth },
        OR: [
          { endDate: null },
          { endDate: { gt: endOfMonth } }
        ],
        status: { in: ["ACTIVE", "active"] }
      },
      include: { plan: true }
    });

    const mrrAtMonth = activeSubsAtMonth.reduce((acc, sub) => acc + (sub.plan?.price || 0), 0);
    financialGrowthData.push({
      month: m.name,
      mrr: mrrAtMonth
    });
  }

  return {
    users: {
      total: totalUsers,
      active: activeUsers,
      growth: parseFloat(userGrowth.toFixed(1)),
      newRecent: newRecentUsers,
      engagement: parseFloat(engagement.toFixed(1))
    },
    workspaces: {
      total: totalWorkspaces,
      growth: parseFloat(workspaceGrowth.toFixed(1)),
    },
    workouts: {
      total: totalWorkouts,
      avgFrequency: parseFloat(avgFrequency.toFixed(1))
    },
    financial: {
      mrr,
      arr: mrr * 12,
    },
    userGrowthData,
    financialGrowthData
  };
}
