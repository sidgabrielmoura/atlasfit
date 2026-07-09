import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

import { processRecurringPayments } from "@/lib/recurrence";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Não autorizado.", { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspaceId");

  if (!workspaceId) {
    return new NextResponse("O ID do workspace é obrigatório.", { status: 400 });
  }

  try {
    // Verify that the logged-in trainer belongs to this workspace
    const memberCheck = await prisma.workspaceMember.findFirst({
      where: {
        userId: session.user.id,
        workspaceId,
      },
    });

    if (!memberCheck) {
      return new NextResponse("Acesso negado a este workspace.", { status: 403 });
    }

    // Process all active recurrence subscriptions for the workspace
    await processRecurringPayments(workspaceId);

    // 1. Fetch active students to calculate active plan counts
    const activeStudents = await prisma.workspaceMember.findMany({
      where: {
        workspaceId,
        role: "STUDENT",
        isActive: true,
      },
    });

    const activePlansCount = activeStudents.length;

    // 2. Fetch payments for the workspace (strictly real records)
    const payments = await prisma.workspacePayment.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
    });

    // 3. Compute MRR dynamically based on current calendar month payments with "pago" status
    const now = new Date();
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const paidCurrentMonthPayments = payments.filter(
      (p) => p.status === "pago" && p.createdAt >= startOfCurrentMonth && p.createdAt <= endOfCurrentMonth
    );
    const mrr = paidCurrentMonthPayments.reduce((sum, p) => sum + p.amount, 0);

    // 4. Calculate dynamic churn / inadimplência rate based on "atrasado" payments
    const currentMonthPayments = payments.filter(
      (p) => p.createdAt >= startOfCurrentMonth && p.createdAt <= endOfCurrentMonth
    );
    const totalPaymentsCount = currentMonthPayments.length || payments.length;
    const unpaidPaymentsCount = currentMonthPayments.length
      ? currentMonthPayments.filter((p) => p.status === "atrasado").length
      : payments.filter((p) => p.status === "atrasado").length;

    const churnRate = totalPaymentsCount > 0
      ? parseFloat(((unpaidPaymentsCount / totalPaymentsCount) * 100).toFixed(1))
      : 0.0;

    // 5. Calculate Average Ticket based on current month paid transactions, or overall paid transactions fallback
    const avgTicket = paidCurrentMonthPayments.length > 0
      ? mrr / paidCurrentMonthPayments.length
      : (payments.filter((p) => p.status === "pago").reduce((sum, p) => sum + p.amount, 0) / (payments.filter((p) => p.status === "pago").length || 1) || 0.0);

    // 6. Calculate 6-month monthly revenue evolution chart data
    const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const chartData = [];

    for (let i = 5; i >= 0; i--) {
      const targetMonth = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const startOfMonth = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 1);
      const endOfMonth = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0, 23, 59, 59);

      const monthlySum = payments
        .filter((p) => p.status === "pago" && p.createdAt >= startOfMonth && p.createdAt <= endOfMonth)
        .reduce((sum, p) => sum + p.amount, 0);

      const monthLabel = monthNames[targetMonth.getMonth()];

      chartData.push({
        name: monthLabel,
        revenue: monthlySum,
      });
    }

    // 6.5. Fetch all students to return their recurrence configs
    const recurrenceMembers = await prisma.workspaceMember.findMany({
      where: {
        workspaceId,
        role: "STUDENT",
        isActive: true,
      },
      include: {
        user: true,
      },
    });

    const recurrences = recurrenceMembers.map((m) => ({
      id: m.id,
      studentId: m.userId,
      studentName: m.user.name || "Sem Nome",
      studentEmail: m.user.email || "",
      billingControlType: m.billingControlType,
      billingPrice: m.billingPrice,
      billingPeriodicity: m.billingPeriodicity,
      billingCustomIntervalCount: m.billingCustomIntervalCount,
      billingCustomIntervalUnit: m.billingCustomIntervalUnit,
      billingDueDay: m.billingDueDay,
      billingFirstDueDate: m.billingFirstDueDate ? m.billingFirstDueDate.toISOString() : null,
      billingStartDate: m.billingStartDate ? m.billingStartDate.toISOString() : null,
      billingDescription: m.billingDescription,
      billingCategory: m.billingCategory,
      billingPaymentMethod: m.billingPaymentMethod,
      billingIsActive: m.billingIsActive,
      planEndDate: m.planEndDate ? m.planEndDate.toISOString() : null,
      billingNextDueDate: m.billingNextDueDate ? m.billingNextDueDate.toISOString() : null,
    }));

    // 7. Build the response payload
    const payload = {
      metrics: {
        mrr,
        mrrChange: 0.0,
        avgTicket,
        ticketChange: 0.0,
        activePlans: activePlansCount,
        plansChange: 0.0,
        financialChurn: churnRate,
        churnChange: 0.0,
      },
      chartData,
      recentPayments: payments.map((p) => ({
        id: p.id,
        student: p.studentName,
        plan: p.planName,
        amount: p.amount,
        status: p.status,
        method: p.method,
        date: p.createdAt.toISOString(),
        billingOrigin: p.billingOrigin,
        billingMode: p.billingMode,
        isAutomaticBilled: p.isAutomaticBilled,
      })),
      recurrences,
    };

    return NextResponse.json(payload);
  } catch (error) {
    console.error("GET finance overview error:", error);
    return new NextResponse("Erro interno do servidor.", { status: 500 });
  }
}
