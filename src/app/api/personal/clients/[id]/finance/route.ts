import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { processRecurringPaymentsForMember } from "@/lib/recurrence";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Não autorizado.", { status: 401 });
  }

  const { id: studentId } = await params;
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspaceId");

  if (!workspaceId) {
    return new NextResponse("O ID do workspace é obrigatório.", { status: 400 });
  }

  try {
    // 1. Verify that the logged-in trainer belongs to this workspace
    const trainerMember = await prisma.workspaceMember.findFirst({
      where: {
        userId: session.user.id,
        workspaceId,
      },
    });

    if (!trainerMember) {
      return new NextResponse("Acesso negado a este workspace.", { status: 403 });
    }

    // 2. Fetch the student profile & member details to obtain name and active plan
    let studentMember = await prisma.workspaceMember.findFirst({
      where: {
        userId: studentId,
        workspaceId,
        role: "STUDENT",
      },
      include: {
        user: true,
      },
    });

    if (!studentMember) {
      return new NextResponse("Aluno não encontrado neste workspace.", { status: 404 });
    }

    // Process recurring payments for this member before rendering history
    await processRecurringPaymentsForMember(studentMember.id);

    // Re-fetch member to have the latest configuration and planEndDate
    const updatedMember = await prisma.workspaceMember.findUnique({
      where: { id: studentMember.id },
      include: {
        user: true,
      }
    });
    if (updatedMember) {
      studentMember = updatedMember;
    }

    const studentName = studentMember.user.name || "Sem Nome";
    const studentPlan = studentMember.plan || "Mensal";

    // 3. Find payments matching student's name
    let payments = await prisma.workspacePayment.findMany({
      where: {
        workspaceId,
        studentName,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // 4. If payments are empty, do not seed anymore to keep database clean.

    // 5. Compute metric summaries for the student
    const totalReceived = payments
      .filter((p) => p.status === "pago")
      .reduce((sum, p) => sum + p.amount, 0);

    const totalPending = payments
      .filter((p) => p.status === "pendente")
      .reduce((sum, p) => sum + p.amount, 0);

    const totalOverdue = payments
      .filter((p) => p.status === "atrasado")
      .reduce((sum, p) => sum + p.amount, 0);

    return NextResponse.json({
      metrics: {
        totalReceived,
        totalPending,
        totalOverdue,
      },
      recurrence: {
        billingControlType: studentMember.billingControlType,
        billingPrice: studentMember.billingPrice,
        billingPeriodicity: studentMember.billingPeriodicity,
        billingCustomIntervalCount: studentMember.billingCustomIntervalCount,
        billingCustomIntervalUnit: studentMember.billingCustomIntervalUnit,
        billingDueDay: studentMember.billingDueDay,
        billingFirstDueDate: studentMember.billingFirstDueDate ? studentMember.billingFirstDueDate.toISOString().split("T")[0] : null,
        billingStartDate: studentMember.billingStartDate ? studentMember.billingStartDate.toISOString().split("T")[0] : null,
        billingDescription: studentMember.billingDescription,
        billingCategory: studentMember.billingCategory,
        billingPaymentMethod: studentMember.billingPaymentMethod,
        billingIsActive: studentMember.billingIsActive,
        planEndDate: studentMember.planEndDate ? studentMember.planEndDate.toISOString().split("T")[0] : null,
      },
      payments: payments.map((p) => ({
        id: p.id,
        planName: p.planName,
        amount: p.amount,
        status: p.status,
        method: p.method,
        createdAt: p.createdAt.toISOString(),
        billingOrigin: p.billingOrigin,
        billingMode: p.billingMode,
        isAutomaticBilled: p.isAutomaticBilled,
      })),
    });
  } catch (error) {
    console.error("GET student finance history error:", error);
    return new NextResponse("Erro interno do servidor.", { status: 500 });
  }
}

export async function POST(req: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Não autorizado.", { status: 401 });
  }

  const { id: studentId } = await params;

  try {
    const body = await req.json();
    const { workspaceId, planName, amount, status, method, createdAt } = body;

    if (!workspaceId || !planName || amount === undefined || !status || !method) {
      return new NextResponse("Campos obrigatórios ausentes.", { status: 400 });
    }

    // Verify trainer belongs to the workspace
    const trainerMember = await prisma.workspaceMember.findFirst({
      where: {
        userId: session.user.id,
        workspaceId,
      },
    });

    if (!trainerMember) {
      return new NextResponse("Acesso negado a este workspace.", { status: 403 });
    }

    // Fetch student's name
    const studentMember = await prisma.workspaceMember.findFirst({
      where: {
        userId: studentId,
        workspaceId,
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
    const paymentDate = createdAt ? new Date(createdAt) : new Date();

    const newPayment = await prisma.workspacePayment.create({
      data: {
        workspaceId,
        studentName,
        planName,
        amount: parseFloat(amount),
        status,
        method,
        createdAt: paymentDate,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(newPayment);
  } catch (error) {
    console.error("POST client dynamic payment error:", error);
    return new NextResponse("Erro interno do servidor.", { status: 500 });
  }
}

export async function PUT(req: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Não autorizado.", { status: 401 });
  }

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
      planEndDate,
    } = body;

    if (!workspaceId) {
      return new NextResponse("ID do workspace é obrigatório.", { status: 400 });
    }

    // Verify trainer belongs to the workspace
    const trainerMember = await prisma.workspaceMember.findFirst({
      where: {
        userId: session.user.id,
        workspaceId,
      },
    });

    if (!trainerMember) {
      return new NextResponse("Acesso negado a este workspace.", { status: 403 });
    }

    // Find student member
    const studentMember = await prisma.workspaceMember.findFirst({
      where: {
        userId: studentId,
        workspaceId,
        role: "STUDENT",
      },
    });

    if (!studentMember) {
      return new NextResponse("Aluno não encontrado neste workspace.", { status: 404 });
    }

    // Prepare billing update object
    const updateData: any = {};
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
        userId: session.user.id,
        severity: "info",
      },
    });

    // Automatically trigger processing to catch up if needed
    if (billingControlType !== "MANUAL" && billingIsActive !== false) {
      await processRecurringPaymentsForMember(studentMember.id);
    }

    return NextResponse.json(updatedMember);
  } catch (error) {
    console.error("PUT student recurrence error:", error);
    return new NextResponse("Erro interno do servidor.", { status: 500 });
  }
}
