import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { logSystemError } from "@/lib/logger";
import { NotificationService } from "@/lib/notifications/service";


interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Não autorizado.", { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const { studentName, planName, amount, status, method, createdAt } = body;

    const payment = await prisma.workspacePayment.findUnique({
      where: { id },
    });

    if (!payment) {
      return new NextResponse("Pagamento não encontrado.", { status: 404 });
    }

    const memberCheck = await prisma.workspaceMember.findFirst({
      where: {
        userId: session.user.id,
        workspaceId: payment.workspaceId,
      },
    });

    if (!memberCheck) {
      return new NextResponse("Acesso negado a este workspace.", { status: 403 });
    }

    const updateData: any = {};
    if (studentName !== undefined) updateData.studentName = studentName;
    if (planName !== undefined) updateData.planName = planName;
    if (amount !== undefined) updateData.amount = parseFloat(amount);
    if (status !== undefined) {
      updateData.status = status;
      if (status === "pago" && payment.status !== "pago") {
        updateData.paidAt = new Date();
        updateData.paidBy = session.user.id;
        updateData.actionType = "MANUAL";
      } else if (status === "pendente" && payment.status === "pago") {
        updateData.paidAt = null;
        updateData.paidBy = null;
        updateData.reopenedAt = new Date();
        updateData.reopenedBy = session.user.id;
        updateData.actionType = "MANUAL";
      }
    }
    if (method !== undefined) updateData.method = method;
    if (createdAt !== undefined) updateData.createdAt = new Date(createdAt);

    const updatedPayment = await prisma.workspacePayment.update({
      where: { id },
      data: updateData,
    });

    if (updatedPayment.status === "pendente" && payment.status === "pago") {
      await prisma.auditLog.create({
        data: {
          action: `Cobrança ${updatedPayment.id} reaberta manualmente pelo usuário ${session.user.name || session.user.id}.`,
          entity: "Recurrence",
          entityId: updatedPayment.id,
          userId: session.user.id,
          severity: "info",
        },
      });
    }

    if (updatedPayment.status === "pago" && payment.status !== "pago") {
      const studentMember = await prisma.workspaceMember.findFirst({
        where: {
          workspaceId: payment.workspaceId,
          role: "STUDENT",
          user: { name: updatedPayment.studentName }
        },
        select: { userId: true }
      });
      if (studentMember?.userId) {
        await NotificationService.sendNotification({
          userId: studentMember.userId,
          type: "PAYMENT_CONFIRMED",
          category: "FINANCE",
          title: "Pagamento Confirmado! ✅",
          description: `Seu pagamento referente ao plano "${updatedPayment.planName}" foi confirmado.`,
          deepLink: "/student/finance",
          source: "FINANCE",
          workspaceId: payment.workspaceId
        });
      }
    }

    return NextResponse.json(updatedPayment);
  } catch (error) {
    await logSystemError({ action: "PATCH_MANUAL_PAYMENT", error, entity: "PAYMENT", entityId: id });
    return new NextResponse("Erro interno do servidor.", { status: 500 });
  }
}

// DELETE: Delete a manual payment record
export async function DELETE(req: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Não autorizado.", { status: 401 });
  }

  const { id } = await params;

  try {
    // Fetch existing payment to check workspace boundary
    const payment = await prisma.workspacePayment.findUnique({
      where: { id },
    });

    if (!payment) {
      return new NextResponse("Pagamento não encontrado.", { status: 404 });
    }

    // Verify trainer belongs to this workspace
    const memberCheck = await prisma.workspaceMember.findFirst({
      where: {
        userId: session.user.id,
        workspaceId: payment.workspaceId,
      },
    });

    if (!memberCheck) {
      return new NextResponse("Acesso negado a este workspace.", { status: 403 });
    }

    await prisma.workspacePayment.delete({
      where: { id },
    });

    return new NextResponse("Pagamento excluído com sucesso.", { status: 200 });
  } catch (error) {
    await logSystemError({ action: "DELETE_MANUAL_PAYMENT", error, entity: "PAYMENT", entityId: id });
    return new NextResponse("Erro interno do servidor.", { status: 500 });
  }
}
