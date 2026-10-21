import { withAuditedRequest } from "@/lib/audited-request";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireGymWorkspaceAccess, handleWorkspaceAccessError } from "@/modules/workspaces/application/guard";
import { authorizeGymStudent } from "@/modules/workspaces/application/student-authority";
import { serializableTransaction } from "@/modules/workspaces/application/transaction";

export const GET = withAuditedRequest(async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId");

    if (!workspaceId) {
      return NextResponse.json({ error: "O ID do workspace é obrigatório." }, { status: 400 });
    }

    const context = await requireGymWorkspaceAccess({
      workspaceId,
      anyCapability: ["invoices.read", "students.read", "workspace.manage"],
    });

    const member = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId: context.workspaceId,
        OR: [{ id }, { userId: id }],
      },
      include: {
        user: true,
      },
    });

    if (!member) {
      return NextResponse.json({ error: "Aluno não encontrado nesta academia." }, { status: 404 });
    }

    await authorizeGymStudent(context.workspaceId, member.id, context.userId, "invoices.read");

    const studentName = member.user?.name || "Sem Nome";

    const payments = await prisma.workspacePayment.findMany({
      where: {
        workspaceId: context.workspaceId,
        studentName,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const totalReceived = payments
      .filter((p) => p.status === "pago")
      .reduce((sum, p) => sum + p.amount, 0);

    const totalPending = payments
      .filter((p) => p.status === "pendente")
      .reduce((sum, p) => sum + p.amount, 0);

    const totalOverdue = payments
      .filter((p) => p.status === "atrasado")
      .reduce((sum, p) => sum + p.amount, 0);

    const recurrence = {
      billingControlType: member.billingControlType || "MANUAL",
      billingPrice: member.billingPrice || 0,
      billingPeriodicity: member.billingPeriodicity || "MENSAL",
      billingCustomIntervalCount: member.billingCustomIntervalCount || 1,
      billingCustomIntervalUnit: member.billingCustomIntervalUnit || "meses",
      billingDueDay: member.billingDueDay || 10,
      billingFirstDueDate: member.billingFirstDueDate?.toISOString().split("T")[0] || null,
      billingStartDate: member.billingStartDate?.toISOString().split("T")[0] || null,
      billingDescription: member.billingDescription || "Mensalidade da Academia",
      billingCategory: member.billingCategory || "Mensalidade",
      billingPaymentMethod: member.billingPaymentMethod || "PIX",
      billingIsActive: member.billingIsActive ?? true,
      billingSource: member.billingSource || "MANUAL",
      billingCreatedAt: member.billingCreatedAt?.toISOString() || null,
    };

    return NextResponse.json({
      payments,
      metrics: {
        totalReceived,
        totalPending,
        totalOverdue,
      },
      recurrence,
      summary: {
        totalReceived,
        pendingCount: payments.filter((p) => p.status === "pendente").length,
        paidCount: payments.filter((p) => p.status === "pago").length,
        currentPlan: member.plan || "Mensal",
        ...recurrence,
      },
    });
  } catch (error) {
    const accessError = handleWorkspaceAccessError(error);
    if (accessError) return accessError;
    console.error("GET gym student finance error:", error);
    return NextResponse.json({ error: "Erro interno do servidor ao carregar financeiro." }, { status: 500 });
  }
});

export const POST = withAuditedRequest(async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { workspaceId, planName, amount, status, method, createdAt } = body;

    if (!workspaceId || !planName || amount === undefined || !status || !method) {
      return NextResponse.json({ error: "Campos obrigatórios ausentes." }, { status: 400 });
    }

    const context = await requireGymWorkspaceAccess({
      workspaceId,
      anyCapability: ["invoices.issue", "workspace.manage"],
    });

    const member = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId: context.workspaceId,
        OR: [{ id }, { userId: id }],
      },
      include: {
        user: true,
      },
    });

    if (!member) {
      return NextResponse.json({ error: "Aluno não encontrado nesta academia." }, { status: 404 });
    }

    await authorizeGymStudent(context.workspaceId, member.id, context.userId, "invoices.issue");

    const studentName = member.user?.name || "Sem Nome";

    const newPayment = await serializableTransaction(async (tx) => {
      const payment = await tx.workspacePayment.create({
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

      await tx.auditLog.create({
        data: {
          userId: context.userId,
          action: "GYM_STUDENT_PAYMENT_RECORDED",
          entity: "PAYMENT",
          entityId: payment.id,
          severity: "info",
        },
      });

      return payment;
    });

    return NextResponse.json(newPayment, { status: 201 });
  } catch (error) {
    const accessError = handleWorkspaceAccessError(error);
    if (accessError) return accessError;
    console.error("POST gym student payment error:", error);
    return NextResponse.json({ error: "Erro interno do servidor ao registrar pagamento." }, { status: 500 });
  }
});

export const PUT = withAuditedRequest(async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
      planEndDate,
    } = body;

    if (!workspaceId) {
      return NextResponse.json({ error: "O ID do workspace é obrigatório." }, { status: 400 });
    }

    const context = await requireGymWorkspaceAccess({
      workspaceId,
      anyCapability: ["invoices.issue", "workspace.manage"],
    });

    const member = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId: context.workspaceId,
        OR: [{ id }, { userId: id }],
      },
    });

    if (!member) {
      return NextResponse.json({ error: "Aluno não encontrado nesta academia." }, { status: 404 });
    }

    await authorizeGymStudent(context.workspaceId, member.id, context.userId, "invoices.issue");

    const updateData: any = {};
    if (billingControlType !== undefined) updateData.billingControlType = billingControlType;
    if (billingPrice !== undefined) updateData.billingPrice = parseFloat(billingPrice);
    if (billingPeriodicity !== undefined) updateData.billingPeriodicity = billingPeriodicity;
    if (billingCustomIntervalCount !== undefined) updateData.billingCustomIntervalCount = parseInt(billingCustomIntervalCount);
    if (billingCustomIntervalUnit !== undefined) updateData.billingCustomIntervalUnit = billingCustomIntervalUnit;
    if (billingDueDay !== undefined) updateData.billingDueDay = parseInt(billingDueDay);
    if (billingFirstDueDate !== undefined) updateData.billingFirstDueDate = billingFirstDueDate ? new Date(billingFirstDueDate) : null;
    if (billingStartDate !== undefined) updateData.billingStartDate = billingStartDate ? new Date(billingStartDate) : null;
    if (billingDescription !== undefined) updateData.billingDescription = billingDescription;
    if (billingCategory !== undefined) updateData.billingCategory = billingCategory;
    if (billingPaymentMethod !== undefined) updateData.billingPaymentMethod = billingPaymentMethod;
    if (billingIsActive !== undefined) updateData.billingIsActive = billingIsActive;
    if (billingSource !== undefined) updateData.billingSource = billingSource;
    if (planEndDate !== undefined) updateData.planEndDate = planEndDate ? new Date(planEndDate) : null;

    const updated = await serializableTransaction(async (tx) => {
      const m = await tx.workspaceMember.update({
        where: { id: member.id },
        data: updateData,
      });

      await tx.auditLog.create({
        data: {
          userId: context.userId,
          action: "GYM_STUDENT_RECURRENCE_CONFIGURED",
          entity: "RECURRENCE",
          entityId: member.id,
          severity: "info",
        },
      });

      return m;
    });

    return NextResponse.json(updated);
  } catch (error) {
    const accessError = handleWorkspaceAccessError(error);
    if (accessError) return accessError;
    console.error("PUT gym student recurrence error:", error);
    return NextResponse.json({ error: "Erro interno do servidor ao salvar recorrência." }, { status: 500 });
  }
});
