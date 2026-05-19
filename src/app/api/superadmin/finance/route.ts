import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET() {
  const session = await auth();

  if (session?.user?.role !== "SUPERADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    // 1. Fetch Subscriptions to calculate MRR and ARR
    const activeSubscriptions = await prisma.subscription.findMany({
      where: { status: "active" },
      include: { plan: true }
    });

    const mrr = activeSubscriptions.reduce((acc, sub) => acc + (sub.plan?.price || 0), 0);
    const arr = mrr * 12;

    // 2. Fetch all Workspaces to calculate LTV
    const totalWorkspaces = await prisma.workspace.count();

    // 3. Fetch Transactions to calculate Total Revenue and Today's metrics
    const approvedTransactions = await prisma.transaction.findMany({
      where: { status: "APPROVED" }
    });
    
    const totalRevenue = approvedTransactions.reduce((acc, tx) => acc + tx.amount, 0);
    
    // Calcula receita apenas de hoje
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todaysRevenue = approvedTransactions
      .filter(tx => new Date(tx.createdAt) >= today)
      .reduce((acc, tx) => acc + tx.amount, 0);

    // Calcula Inadimplência
    const failedTransactions = await prisma.transaction.findMany({
      where: { status: "FAILED" }
    });
    const totalFailedRevenue = failedTransactions.reduce((acc, tx) => acc + tx.amount, 0);

    // LTV (Lifetime Value) Estimado = Receita Total / Workspaces Ativos
    const ltv = totalWorkspaces > 0 ? totalRevenue / totalWorkspaces : 0;

    // Churn estimado (Cancelados / Total de Assinaturas)
    const totalSubscriptions = await prisma.subscription.count();
    const canceledSubscriptions = await prisma.subscription.count({
      where: { status: "canceled" }
    });
    const churn = totalSubscriptions > 0 ? (canceledSubscriptions / totalSubscriptions) * 100 : 0;

    // Últimas 10 transações para a tabela
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
      return {
        ...tx,
        workspace: {
          name: tx.user?.name || "Conta de Personal",
          logo: tx.user?.name?.slice(0, 2).toUpperCase() || "CP",
          subscription: tx.user?.subscription || null
        }
      };
    });

    return NextResponse.json({
      mrr,
      arr,
      totalRevenue,
      todaysRevenue,
      totalFailedRevenue,
      ltv,
      churn,
      recentTransactions: formattedTransactions
    });

  } catch (error) {
    console.error("FINANCE_API_ERROR", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
