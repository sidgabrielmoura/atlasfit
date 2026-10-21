import { withRequestMemo } from "@/lib/request-memo";
import { personalCommercialContextResponse } from "@/lib/personal-commercial-context";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { processRecurringPaymentsForMember } from "@/lib/recurrence";
import {
  requirePersonalWorkspaceAccess as requireWorkspaceAccess,
  handleWorkspaceAccessError,
} from "@/modules/workspaces";

interface RouteParams {
  params: Promise<{ id: string }>;
}

async function handleGET(req: Request, { params }: RouteParams) {
  const restricted = await personalCommercialContextResponse(); if (restricted) return restricted;
  const { id: studentId } = await params;
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspaceId");

  if (!workspaceId) {
    return new NextResponse("O ID do workspace é obrigatório.", { status: 400 });
  }

  try {
    // 1. Verify workspace access and capability (or student accessing their own finance)
    const context = await requireWorkspaceAccess({
      workspaceId,
      capability: "invoices.read",
      resourceOwnerId: studentId,
    });

    // 2. Fetch the student profile & member details in verified workspace
    let studentMember = await prisma.workspaceMember.findFirst({
      where: {
        userId: studentId,
        workspaceId: context.workspaceId,
        role: "STUDENT",
      },
      include: {
        user: true,
      },
    });

    if (!studentMember) {
      return new NextResponse("Aluno não encontrado neste workspace.", { status: 404 });
    }

    const studentName = studentMember.user.name || "Sem Nome";
    const studentPlan = studentMember.plan || "Mensal";

    // 3. Find payments matching student's name in this workspace
    let payments = await prisma.workspacePayment.findMany({
      where: {
        workspaceId: context.workspaceId,
        studentName,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // 4. Compute metric summaries for the student
    const totalReceived = payments
      .filter((p) => p.status === "pago")
      .reduce((sum, p) => sum + p.amount, 0);

    const pendingCount = payments.filter((p) => p.status === "pendente").length;
    const paidCount = payments.filter((p) => p.status === "pago").length;

    return NextResponse.json({
      summary: {
        totalReceived,
        pendingCount,
        paidCount,
        currentPlan: studentPlan,
        billingControlType: studentMember.billingControlType || "MANUAL",
        billingPrice: studentMember.billingPrice || 0.0,
        billingPeriodicity: studentMember.billingPeriodicity || "MENSAL",
        billingDueDay: studentMember.billingDueDay || 10,
        billingStartDate: studentMember.billingStartDate,
        billingNextDueDate: studentMember.billingNextDueDate,
        billingDescription: studentMember.billingDescription,
        billingCategory: studentMember.billingCategory,
        billingPaymentMethod: studentMember.billingPaymentMethod,
        billingIsActive: studentMember.billingIsActive ?? true,
        billingSource: studentMember.billingSource || "MANUAL",
        asaasSubscriptionId: studentMember.asaasSubscriptionId,
        planEndDate: studentMember.planEndDate,
      },
      payments: payments.map((p) => ({
        id: p.id,
        planName: p.planName,
        amount: p.amount,
        status: p.status,
        method: p.method,
        createdAt: p.createdAt,
        billingOrigin: p.billingOrigin,
        billingMode: p.billingMode,
        isAutomaticBilled: p.isAutomaticBilled,
      })),
    });
  } catch (error) {
    const accessError = handleWorkspaceAccessError(error);
    if (accessError) return accessError;

    console.error("GET student finance history error:", error);
    return new NextResponse("Erro interno do servidor.", { status: 500 });
  }
}
export const GET = withRequestMemo(handleGET);

export async function POST(req: Request, { params }: RouteParams) {
  const restricted = await personalCommercialContextResponse(); if (restricted) return restricted;
  const { id: studentId } = await params;

  try {
    const body = await req.json();
    const { workspaceId, planName, amount, status, method, createdAt } = body;

    if (!workspaceId || !planName || amount === undefined || !status || !method) {
      return new NextResponse("Campos obrigatórios ausentes.", { status: 400 });
    }

    // Verify workspace access and capability
    const context = await requireWorkspaceAccess({
      workspaceId,
      capability: "invoices.issue",
    });

    // Fetch student's name strictly in verified workspace
    const studentMember = await prisma.workspaceMember.findFirst({
      where: {
        userId: studentId,
        workspaceId: context.workspaceId,
        role: "STUDENT",
      },
      include: {
        user: true,
      },
    });

    if (!studentMember) {
      return new NextResponse("Aluno não encontrado neste workspace.", { status: 404 });
    }

    const studentName = studentMember.user.name || "Sem Nome";

    const newPayment = await prisma.workspacePayment.create({
      data: {
        workspaceId: context.workspaceId,
        studentName,
        planName,
        amount: parseFloat(amount),
        status,
        method,
        createdAt: createdAt ? new Date(createdAt) : new Date(),
      },
    });

    return NextResponse.json(newPayment, { status: 201 });
  } catch (error) {
    const accessError = handleWorkspaceAccessError(error);
    if (accessError) return accessError;

    console.error("POST student payment error:", error);
    return new NextResponse("Erro interno do servidor.", { status: 500 });
  }
}

export async function PUT(req: Request, { params }: RouteParams) {
  const restricted = await personalCommercialContextResponse(); if (restricted) return restricted;
  const { id: studentId } = await params;

  try {
    const body = await req.json();
    const {
      workspaceId,
      billingControlType,
      billingPrice,
      billingPeriodicity,
      billingCustomIntervalCount,
      billingCustomIntervalUnit,
      billingDueDay,
      billingFirstDueDate,
      billingStartDate,
      billingDescription,
      billingCategory,
      billingPaymentMethod,
      billingIsActive,
      billingSource,
      asaasSubscriptionId,
      billingCreatedAt,
      planEndDate,
    } = body;

    if (!workspaceId) {
      return new NextResponse("ID do workspace é obrigatório.", { status: 400 });
    }

    // Verify workspace access and capability
    const context = await requireWorkspaceAccess({
      workspaceId,
      capability: "invoices.issue",
    });

    const studentMember = await prisma.workspaceMember.findFirst({
      where: {
        userId: studentId,
        workspaceId: context.workspaceId,
        role: "STUDENT",
      },
    });

    if (!studentMember) {
      return new NextResponse("Aluno não encontrado neste workspace.", { status: 404 });
    }

    const updateData: any = { billingRetryAt: null, billingFailureCount: 0 };
    if (billingControlType !== undefined) updateData.billingControlType = billingControlType;
    if (billingPrice !== undefined) updateData.billingPrice = parseFloat(billingPrice);
    if (billingPeriodicity !== undefined) updateData.billingPeriodicity = billingPeriodicity;
    if (billingCustomIntervalCount !== undefined) updateData.billingCustomIntervalCount = parseInt(billingCustomIntervalCount);
    if (billingCustomIntervalUnit !== undefined) updateData.billingCustomIntervalUnit = billingCustomIntervalUnit;
    if (billingDueDay !== undefined) updateData.billingDueDay = parseInt(billingDueDay);
    
    if (billingFirstDueDate !== undefined) {
      updateData.billingFirstDueDate = billingFirstDueDate ? new Date(billingFirstDueDate) : null;
    }
    if (billingStartDate !== undefined) {
      updateData.billingStartDate = billingStartDate ? new Date(billingStartDate) : null;
    }
    if (billingDescription !== undefined) updateData.billingDescription = billingDescription;
    if (billingCategory !== undefined) updateData.billingCategory = billingCategory;
    if (billingPaymentMethod !== undefined) updateData.billingPaymentMethod = billingPaymentMethod;
    if (billingIsActive !== undefined) updateData.billingIsActive = billingIsActive;
    if (billingSource !== undefined) updateData.billingSource = billingSource;
    if (asaasSubscriptionId !== undefined) updateData.asaasSubscriptionId = asaasSubscriptionId;
    if (billingCreatedAt !== undefined) updateData.billingCreatedAt = billingCreatedAt ? new Date(billingCreatedAt) : new Date();
    
    if (planEndDate !== undefined) {
      updateData.planEndDate = planEndDate ? new Date(planEndDate) : null;
    }

    // Also update billingNextDueDate if first due date changed or next due date is empty
    if (updateData.billingFirstDueDate && (!studentMember.billingNextDueDate || billingFirstDueDate !== studentMember.billingFirstDueDate?.toISOString())) {
      updateData.billingNextDueDate = updateData.billingFirstDueDate;
    }

    const updatedMember = await prisma.workspaceMember.update({
      where: { id: studentMember.id },
      data: updateData,
    });

    // Log the recurrence configuration change
    let actionLog = `Configuração de recorrência financeira alterada para o aluno ${studentMember.id}. Modo: ${billingControlType}`;
    if (billingIsActive === false) {
      actionLog = `Recorrência financeira encerrada para o aluno ${studentMember.id}.`;
    }
    await prisma.auditLog.create({
      data: {
        action: actionLog,
        entity: "Recurrence",
        entityId: studentMember.id,
        userId: context.userId,
        severity: "info",
      },
    });

    // Automatically trigger processing to catch up if needed
    if (billingControlType !== "MANUAL" && billingIsActive !== false) {
      await processRecurringPaymentsForMember(studentMember.id);
    }

    return NextResponse.json(updatedMember);
  } catch (error) {
    const accessError = handleWorkspaceAccessError(error);
    if (accessError) return accessError;

    console.error("PUT student recurrence error:", error);
    return new NextResponse("Erro interno do servidor.", { status: 500 });
  }
}
