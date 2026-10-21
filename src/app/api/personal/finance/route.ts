import type { Prisma } from "@prisma/client";
import { personalPaymentSummary } from "@/lib/personal-payment-summary";
import { withRequestMemo } from "@/lib/request-memo";
import { personalCommercialContextResponse } from "@/lib/personal-commercial-context";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

import {
  requirePersonalWorkspaceAccess as requireWorkspaceAccess,
  handleWorkspaceAccessError,
} from "@/modules/workspaces";

async function handleGET(req: Request) {
  const restricted = await personalCommercialContextResponse(); if (restricted) return restricted;
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspaceId");

  if (!workspaceId) {
    return new NextResponse("O ID do workspace é obrigatório.", { status: 400 });
  }

  try {
    // Verify workspace membership, active status, and financial capability
    const context = await requireWorkspaceAccess({
      workspaceId,
      anyCapability: ["reports.finance", "invoices.read"],
    });

    const now = new Date();
    const { mrr, avgTicket, churnRate, months, statusCounts } = await personalPaymentSummary(workspaceId, now);
    const activePlansCount = await prisma.workspaceMember.count({ where: { workspaceId, role: "STUDENT", isActive: true } });
    const rawPage = searchParams.get("paymentsPage") || "1";
    if (!/^[1-9]\d{0,3}$/.test(rawPage) || Number(rawPage) > 1000) return new NextResponse("Página inválida.", { status: 400 });
    const page = Number(rawPage);
    const search = (searchParams.get("search") || "").trim().slice(0, 100);
    const status = searchParams.get("status");
    const where: Prisma.WorkspacePaymentWhereInput = { workspaceId, ...(status && ["pago", "pendente", "atrasado"].includes(status) ? { status } : {}), ...(search ? { OR: [{ studentName: { contains: search, mode: "insensitive" } }, { planName: { contains: search, mode: "insensitive" } }] } : {}) };
    const payments = await prisma.workspacePayment.findMany({ where, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 51, skip: (page - 1) * 50, select: { id: true, studentName: true, planName: true, amount: true, status: true, method: true, createdAt: true, billingOrigin: true, billingMode: true, isAutomaticBilled: true } });
    const paymentsHasMore = payments.length > 50;
    if (paymentsHasMore) payments.pop();
    const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const alerts = await prisma.workspacePayment.findMany({ where: { workspaceId, status: { in: ["pendente", "atrasado"] } }, take: 5, orderBy: [{ status: "asc" }, { createdAt: "asc" }, { id: "asc" }], select: { id: true, studentName: true, planName: true, amount: true, status: true, method: true, createdAt: true, billingOrigin: true, billingMode: true, isAutomaticBilled: true } });
    const chartData = months.slice(1).map(month => ({ name: monthNames[month.start.getMonth()], revenue: month.revenue }));

    // 6.5. Fetch all students to return their recurrence configs
    const rawRecurrencePage = searchParams.get("recurrencesPage") || "1";
    if (!/^[1-9]\d{0,3}$/.test(rawRecurrencePage) || Number(rawRecurrencePage) > 1000) return new NextResponse("Página inválida.", { status: 400 });
    const recurrencePage = Number(rawRecurrencePage);
    const recurrenceMembers = searchParams.get("includeRecurrences") === "1" ? await prisma.workspaceMember.findMany({
      where: {
        workspaceId,
        role: "STUDENT",
        isActive: true,
        ...(search ? { user: { name: { contains: search, mode: "insensitive" } } } : {}),
      },
      select: { id: true, userId: true, billingControlType: true, billingPrice: true, billingPeriodicity: true, billingCustomIntervalCount: true, billingCustomIntervalUnit: true, billingDueDay: true, billingFirstDueDate: true, billingStartDate: true, billingDescription: true, billingCategory: true, billingPaymentMethod: true, billingIsActive: true, planEndDate: true, billingNextDueDate: true, user: { select: { name: true, email: true } } },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 51, skip: (recurrencePage - 1) * 50,
    }) : [];
    const recurrencesHasMore = recurrenceMembers.length > 50;
    if (recurrencesHasMore) recurrenceMembers.pop();

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
      statusCounts,
      billingAlerts: alerts.map(p => ({ id: p.id, student: p.studentName, plan: p.planName, amount: p.amount, status: p.status, method: p.method, date: p.createdAt.toISOString() })),
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
      recurrencesPagination: { page: recurrencePage, pageSize: 50, hasMore: recurrencesHasMore },
      paymentsPagination: { page, pageSize: 50, hasMore: paymentsHasMore },
    };

    return NextResponse.json(payload);
  } catch (error) {
    const accessError = handleWorkspaceAccessError(error);
    if (accessError) return accessError;

    console.error("GET finance overview error:", error);
    return new NextResponse("Erro interno do servidor.", { status: 500 });
  }
}
export const GET = withRequestMemo(handleGET);
