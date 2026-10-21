import { Prisma } from "@prisma/client";
import { reportReadTransaction } from "@/modules/workspaces/application/transaction";
import { assertSuperadmin } from "@/modules/workspaces/application/gym-provisioning";
import { platformFinanceReference } from "@/modules/workspaces/application/superadmin-finance";

export async function getSuperAdminStats(actorUserId: string) {
  return reportReadTransaction(async prisma => {
    await assertSuperadmin(prisma, actorUserId);
    const now = new Date();
    const last30Days = new Date();
    last30Days.setDate(now.getDate() - 30);
    const last7Days = new Date();
    last7Days.setDate(now.getDate() - 7);

    const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const months = Array.from({ length: 6 }, (_, i) => ({ start: new Date(now.getFullYear(), now.getMonth() - 5 + i, 1), end: new Date(now.getFullYear(), now.getMonth() - 4 + i, 1) }));
    const historyColumns = months.map((month, i) => Prisma.sql`count(*) FILTER (WHERE "createdAt"<${month.end})::int AS ${Prisma.raw(`"month${i}"`)}`);
    const [userTotals] = await prisma.$queryRaw<Array<Record<string, number>>>(Prisma.sql`SELECT count(*)::int AS total, count(*) FILTER (WHERE "createdAt">=${last30Days})::int AS recent30, count(*) FILTER (WHERE "createdAt">=${last7Days})::int AS recent7, ${Prisma.join(historyColumns)} FROM "User"`);
    const [[sessions], totalWorkspaces, workspacesCreatedLast30, totalWorkouts, financial] = await Promise.all([
      prisma.$queryRaw<Array<{ count: number }>>`SELECT count(DISTINCT "userId")::int AS count FROM "Session" WHERE expires>${now}`,
      prisma.workspace.count(), prisma.workspace.count({ where: { createdAt: { gte: last30Days } } }), prisma.workoutLog.count(), platformFinanceReference(prisma, now),
    ]);
    const totalUsers = userTotals.total, usersCreatedLast30 = userTotals.recent30, newRecentUsers = userTotals.recent7, activeUsers = sessions.count;

    // Cálculos de crescimento da base (últimos 30 dias em relação à base anterior)
    const prevUsersBase = totalUsers - usersCreatedLast30;
    const userGrowth = prevUsersBase > 0 ? (usersCreatedLast30 / prevUsersBase) * 100 : (usersCreatedLast30 > 0 ? 100 : 0);

    const prevWorkspacesBase = totalWorkspaces - workspacesCreatedLast30;
    const workspaceGrowth = prevWorkspacesBase > 0 ? (workspacesCreatedLast30 / prevWorkspacesBase) * 100 : (workspacesCreatedLast30 > 0 ? 100 : 0);

    // Engajamento e Frequência
    const engagement = totalUsers > 0 ? (activeUsers / totalUsers) * 100 : 0;
    const avgFrequency = totalUsers > 0 ? (totalWorkouts / totalUsers) : 0;

    const userGrowthData = months.map((month, i) => ({ month: monthNames[month.start.getMonth()], total: userTotals[`month${i}`] }));
    const financialGrowthData: Array<{ month: string; mrr: number }> = [];

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
      financial,
      userGrowthData,
      financialGrowthData
    };
  });
}
