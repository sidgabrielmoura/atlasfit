import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET() {
  const session = await auth();

  if (session?.user?.role !== "SUPERADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const activeSubscriptions = await prisma.subscription.findMany({
      where: { status: { in: ["active", "ACTIVE"] } },
      include: { plan: true }
    });

    const mrr = activeSubscriptions.reduce((acc, sub) => acc + (sub.plan?.price || 0), 0);
    const arr = mrr * 12;

    const totalWorkspaces = await prisma.workspace.count();

    const approvedTransactions = await prisma.transaction.findMany({
      where: { status: { in: ["APPROVED", "approved"] } }
    });

    const totalRevenue = approvedTransactions.reduce((acc, tx) => acc + tx.amount, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todaysRevenue = approvedTransactions
      .filter(tx => new Date(tx.createdAt) >= today)
      .reduce((acc, tx) => acc + tx.amount, 0);

    const failedTransactions = await prisma.transaction.findMany({
      where: { status: { in: ["FAILED", "failed"] } }
    });
    const totalFailedRevenue = failedTransactions.reduce((acc, tx) => acc + tx.amount, 0);
    const ltv = totalWorkspaces > 0 ? totalRevenue / totalWorkspaces : 0;

    const totalSubscriptions = await prisma.subscription.count();
    const canceledSubscriptions = await prisma.subscription.count({
      where: { status: { in: ["canceled", "CANCELED"] } }
    });
    const churn = totalSubscriptions > 0 ? (canceledSubscriptions / totalSubscriptions) * 100 : 0;

    const recentTransactions = await prisma.transaction.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          include: {
            subscription: {
              include: { plan: true }
            }
          }
        }
      }
    });

    const formattedTransactions = recentTransactions.map((tx) => {
      const sub = tx.user?.subscription;
      return {
        ...tx,
        workspace: {
          name: tx.user?.name || "Conta de Personal",
          logo: tx.user?.name?.slice(0, 2).toUpperCase() || "CP",
          subscription: sub ? { ...sub, status: sub.status.toLowerCase() } : null
        }
      };
    });

    const recentUpgrades = await prisma.subscriptionActivity.findMany({
      where: { type: "UPGRADE" },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        user: true,
        plan: true
      }
    });

    const upgradesWithFrom = await Promise.all(
      recentUpgrades.map(async (upgrade) => {
        const prevActivity = await prisma.subscriptionActivity.findFirst({
          where: {
            userId: upgrade.userId,
            createdAt: { lt: upgrade.createdAt },
            type: { in: ["NEW_SUBSCRIPTION", "RENEWAL", "UPGRADE"] }
          },
          orderBy: { createdAt: "desc" },
          include: { plan: true }
        });

        return {
          id: upgrade.id,
          user: upgrade.user?.name || upgrade.user?.email || "Personal Trainer",
          to: upgrade.plan?.name || "Premium",
          from: prevActivity?.plan?.name || "Free Trial",
          date: upgrade.createdAt
        };
      })
    );

    const now = new Date();
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

    const mrrHistory = [];
    for (const m of months) {
      const endOfMonth = new Date(m.year, m.month + 1, 0, 23, 59, 59, 999);
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
      mrrHistory.push({
        month: m.name,
        mrr: mrrAtMonth
      });
    }

    return NextResponse.json({
      mrr,
      arr,
      totalRevenue,
      todaysRevenue,
      totalFailedRevenue,
      ltv,
      churn,
      recentTransactions: formattedTransactions,
      recentUpgrades: upgradesWithFrom,
      mrrHistory
    });

  } catch (error) {
    console.error("FINANCE_API_ERROR", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
