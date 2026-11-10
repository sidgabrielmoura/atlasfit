import { personalCommercialContextResponse } from "@/lib/personal-commercial-context";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { logSystemError } from "@/lib/logger";
import { NotificationService } from "@/lib/notifications/service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

async function verifyBillingAccess(billing: any, userId: string, userRole: string): Promise<boolean> {
  if (userRole === "SUPERADMIN") return true;
  if (billing.account?.personalUserId === userId) return true;
  if (billing.workspaceId) {
    const member = await prisma.workspaceMember.findFirst({
      where: {
        userId,
        workspaceId: billing.workspaceId,
        role: { in: ["OWNER", "TRAINER", "MANAGER"] },
        isActive: true,
      },
    });
    if (member) return true;
  }
  const trainerCheck = await prisma.workspaceMember.findFirst({
    where: {
      userId,
      role: { in: ["OWNER", "TRAINER", "MANAGER"] },
      isActive: true,
      workspace: {
        members: {
          some: { userId: billing.studentUserId, role: "STUDENT" },
        },
      },
    },
  });
  return Boolean(trainerCheck);
}

export async function PATCH(req: Request, { params }: RouteParams) {
  const restricted = await personalCommercialContextResponse(); if (restricted) return restricted;
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse("Não autorizado.", { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const { studentName, planName, amount, status, method, createdAt } = body;

    // 1. Try finding manual payment first
    const payment = await prisma.workspacePayment.findUnique({
      where: { id },
      include: {
        gatewayBilling: true,
      },
    });

    if (payment) {
      const memberCheck = await prisma.workspaceMember.findFirst({
        where: {
          userId: session.user.id,
          workspaceId: payment.workspaceId,
        },
      });

      if (!memberCheck && session.user.role !== "SUPERADMIN") {
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

      // Synchronize linked gatewayBilling if present
      if (payment.gatewayBilling) {
        if (status === "pago") {
          await prisma.studentBilling.update({
            where: { id: payment.gatewayBilling.id },
            data: {
              status: "SETTLED",
              settledAt: new Date(),
              paidAt: new Date(),
              confirmedAt: new Date(),
            },
          });
        } else if (status === "pendente") {
          await prisma.studentBilling.update({
            where: { id: payment.gatewayBilling.id },
            data: {
              status: "PENDING",
              settledAt: null,
              paidAt: null,
              confirmedAt: null,
            },
          });
        } else if (status === "cancelado") {
          await prisma.studentBilling.update({
            where: { id: payment.gatewayBilling.id },
            data: {
              status: "CANCELLED",
            },
          });
        }
      }

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
            user: { name: updatedPayment.studentName },
          },
          select: { userId: true },
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
            workspaceId: payment.workspaceId,
          });
        }
      }

      return NextResponse.json(updatedPayment);
    }

    // 2. Not in WorkspacePayment: check StudentBilling
    const billing = await prisma.studentBilling.findUnique({
      where: { id },
      include: {
        workspace: true,
        account: true,
        workspacePayment: true,
      },
    });

    if (!billing) {
      return new NextResponse("Pagamento não encontrado.", { status: 404 });
    }

    const hasAccess = await verifyBillingAccess(billing, session.user.id, session.user.role || "");
    if (!hasAccess) {
      return new NextResponse("Acesso negado a este faturamento.", { status: 403 });
    }

    if (status === "pago") {
      const updatedBilling = await prisma.studentBilling.update({
        where: { id: billing.id },
        data: {
          status: "SETTLED",
          settledAt: new Date(),
          paidAt: new Date(),
          confirmedAt: new Date(),
        },
      });

      if (billing.workspacePaymentId) {
        await prisma.workspacePayment.update({
          where: { id: billing.workspacePaymentId },
          data: {
            status: "pago",
            paidAt: new Date(),
            paidBy: session.user.id,
            actionType: "MANUAL",
          },
        });
      }

      await prisma.auditLog.create({
        data: {
          action: `Cobrança digital ${billing.id} ("${billing.title}") marcada como paga manualmente pelo usuário ${session.user.name || session.user.id}.`,
          entity: "StudentBilling",
          entityId: billing.id,
          userId: session.user.id,
          severity: "info",
        },
      });

      await NotificationService.sendNotification({
        userId: billing.studentUserId,
        type: "PAYMENT_CONFIRMED",
        category: "FINANCE",
        title: "Pagamento Confirmado! ✅",
        description: `Seu pagamento referente à fatura "${billing.title}" foi confirmado e seus treinos estão liberados.`,
        deepLink: "/student/workouts",
        source: "FINANCE",
        workspaceId: billing.workspaceId || undefined,
      });

      return NextResponse.json({
        id: updatedBilling.id,
        planName: updatedBilling.title,
        amount: Number(updatedBilling.grossAmountInCents) / 100,
        status: "pago",
        method: updatedBilling.paymentMethod,
        createdAt: updatedBilling.createdAt,
        billingOrigin: "GATEWAY",
        billingMode: "AUTOMATIC",
        isAutomaticBilled: true,
        isGateway: true,
      });
    }

    if (status === "pendente") {
      const updatedBilling = await prisma.studentBilling.update({
        where: { id: billing.id },
        data: {
          status: "PENDING",
          settledAt: null,
          paidAt: null,
          confirmedAt: null,
        },
      });

      if (billing.workspacePaymentId) {
        await prisma.workspacePayment.update({
          where: { id: billing.workspacePaymentId },
          data: {
            status: "pendente",
            paidAt: null,
            paidBy: null,
            reopenedAt: new Date(),
            reopenedBy: session.user.id,
            actionType: "MANUAL",
          },
        });
      }

      await prisma.auditLog.create({
        data: {
          action: `Cobrança digital ${billing.id} reaberta manualmente pelo usuário ${session.user.name || session.user.id}.`,
          entity: "StudentBilling",
          entityId: billing.id,
          userId: session.user.id,
          severity: "info",
        },
      });

      return NextResponse.json({
        id: updatedBilling.id,
        planName: updatedBilling.title,
        amount: Number(updatedBilling.grossAmountInCents) / 100,
        status: "pendente",
        method: updatedBilling.paymentMethod,
        createdAt: updatedBilling.createdAt,
        billingOrigin: "GATEWAY",
        billingMode: "AUTOMATIC",
        isAutomaticBilled: true,
        isGateway: true,
      });
    }

    if (status === "cancelado") {
      const updatedBilling = await prisma.studentBilling.update({
        where: { id: billing.id },
        data: {
          status: "CANCELLED",
        },
      });

      if (billing.workspacePaymentId) {
        await prisma.workspacePayment.update({
          where: { id: billing.workspacePaymentId },
          data: {
            status: "cancelado",
          },
        });
      }

      await prisma.auditLog.create({
        data: {
          action: `Cobrança digital ${billing.id} cancelada manualmente pelo usuário ${session.user.name || session.user.id}.`,
          entity: "StudentBilling",
          entityId: billing.id,
          userId: session.user.id,
          severity: "info",
        },
      });

      return NextResponse.json({
        id: updatedBilling.id,
        planName: updatedBilling.title,
        amount: Number(updatedBilling.grossAmountInCents) / 100,
        status: "cancelado",
        method: updatedBilling.paymentMethod,
        createdAt: updatedBilling.createdAt,
        billingOrigin: "GATEWAY",
        billingMode: "AUTOMATIC",
        isAutomaticBilled: true,
        isGateway: true,
      });
    }

    // Other updates (e.g. title / amount)
    const updateBillingData: any = {};
    if (planName) updateBillingData.title = planName;
    if (amount !== undefined) updateBillingData.grossAmountInCents = BigInt(Math.round(parseFloat(amount) * 100));

    const updatedBilling = await prisma.studentBilling.update({
      where: { id: billing.id },
      data: updateBillingData,
    });

    const isPaid = updatedBilling.status === "SETTLED" || updatedBilling.status === "AVAILABLE" || updatedBilling.status === "CONFIRMED";
    return NextResponse.json({
      id: updatedBilling.id,
      planName: updatedBilling.title,
      amount: Number(updatedBilling.grossAmountInCents) / 100,
      status: isPaid ? "pago" : updatedBilling.status === "OVERDUE" ? "atrasado" : "pendente",
      method: updatedBilling.paymentMethod,
      createdAt: updatedBilling.createdAt,
      billingOrigin: "GATEWAY",
      billingMode: "AUTOMATIC",
      isAutomaticBilled: true,
      isGateway: true,
    });
  } catch (error) {
    await logSystemError({ action: "PATCH_MANUAL_PAYMENT", error, entity: "PAYMENT", entityId: id });
    return new NextResponse("Erro interno do servidor.", { status: 500 });
  }
}

// DELETE: Delete or cancel a payment record
export async function DELETE(req: Request, { params }: RouteParams) {
  const restricted = await personalCommercialContextResponse(); if (restricted) return restricted;
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse("Não autorizado.", { status: 401 });
  }

  const { id } = await params;

  try {
    // 1. Try finding WorkspacePayment first
    const payment = await prisma.workspacePayment.findUnique({
      where: { id },
      include: {
        gatewayBilling: true,
      },
    });

    if (payment) {
      const memberCheck = await prisma.workspaceMember.findFirst({
        where: {
          userId: session.user.id,
          workspaceId: payment.workspaceId,
        },
      });

      if (!memberCheck && session.user.role !== "SUPERADMIN") {
        return new NextResponse("Acesso negado a este workspace.", { status: 403 });
      }

      if (payment.gatewayBilling) {
        await prisma.studentBilling.update({
          where: { id: payment.gatewayBilling.id },
          data: { status: "CANCELLED" },
        });
      }

      await prisma.workspacePayment.delete({
        where: { id },
      });

      await prisma.auditLog.create({
        data: {
          action: `Pagamento ${payment.id} excluído pelo usuário ${session.user.name || session.user.id}.`,
          entity: "WorkspacePayment",
          entityId: payment.id,
          userId: session.user.id,
          severity: "info",
        },
      });

      return new NextResponse("Pagamento excluído com sucesso.", { status: 200 });
    }

    // 2. Not in WorkspacePayment: check StudentBilling
    const billing = await prisma.studentBilling.findUnique({
      where: { id },
      include: {
        workspace: true,
        account: true,
        workspacePayment: true,
      },
    });

    if (!billing) {
      return new NextResponse("Pagamento não encontrado.", { status: 404 });
    }

    const hasAccess = await verifyBillingAccess(billing, session.user.id, session.user.role || "");
    if (!hasAccess) {
      return new NextResponse("Acesso negado a esta cobrança.", { status: 403 });
    }

    // In financial systems, mark as CANCELLED to preserve ledger integrity
    await prisma.studentBilling.update({
      where: { id: billing.id },
      data: { status: "CANCELLED" },
    });

    if (billing.workspacePaymentId) {
      await prisma.workspacePayment.update({
        where: { id: billing.workspacePaymentId },
        data: { status: "cancelado" },
      });
    }

    await prisma.auditLog.create({
      data: {
        action: `Cobrança digital ${billing.id} ("${billing.title}") cancelada pelo usuário ${session.user.name || session.user.id}.`,
        entity: "StudentBilling",
        entityId: billing.id,
        userId: session.user.id,
        severity: "info",
      },
    });

    return new NextResponse("Cobrança cancelada com sucesso.", { status: 200 });
  } catch (error) {
    await logSystemError({ action: "DELETE_MANUAL_PAYMENT", error, entity: "PAYMENT", entityId: id });
    return new NextResponse("Erro interno do servidor.", { status: 500 });
  }
}
