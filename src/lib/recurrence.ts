import prisma from "./prisma";
import { NotificationService } from "@/lib/notifications/service";

function alignToDueDay(date: Date, dueDay: number): Date {
  const targetDate = new Date(date);
  // Set day to 1 first to avoid overflow issues (e.g., setting day 31 on Feb)
  targetDate.setDate(1);
  
  // Find last day of target month
  const lastDay = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0).getDate();
  const alignedDay = Math.min(dueDay, lastDay);
  
  targetDate.setDate(alignedDay);
  return targetDate;
}

export function calculateNextDueDate(
  currentDate: Date,
  periodicity: string,
  count: number = 1,
  unit: string = "meses",
  dueDay?: number | null
): Date {
  let nextDate = new Date(currentDate);

  if (periodicity === "MENSAL") {
    nextDate.setMonth(nextDate.getMonth() + 1);
    if (dueDay !== undefined && dueDay !== null) {
      nextDate = alignToDueDay(nextDate, dueDay);
    }
  } else if (periodicity === "QUINZENAL") {
    nextDate.setDate(nextDate.getDate() + 15);
  } else if (periodicity === "SEMANAL") {
    nextDate.setDate(nextDate.getDate() + 7);
  } else if (periodicity === "ANUAL") {
    nextDate.setFullYear(nextDate.getFullYear() + 1);
    if (dueDay !== undefined && dueDay !== null) {
      nextDate = alignToDueDay(nextDate, dueDay);
    }
  } else if (periodicity === "PERSONALIZADA") {
    const val = Number(count) || 1;
    const cleanUnit = String(unit).toLowerCase();
    if (cleanUnit === "dias" || cleanUnit === "dia" || cleanUnit === "d") {
      nextDate.setDate(nextDate.getDate() + val);
    } else if (cleanUnit === "semanas" || cleanUnit === "semana" || cleanUnit === "w") {
      nextDate.setDate(nextDate.getDate() + val * 7);
    } else if (cleanUnit === "meses" || cleanUnit === "mês" || cleanUnit === "m") {
      nextDate.setMonth(nextDate.getMonth() + val);
      if (dueDay !== undefined && dueDay !== null) {
        nextDate = alignToDueDay(nextDate, dueDay);
      }
    } else if (cleanUnit === "anos" || cleanUnit === "ano" || cleanUnit === "y") {
      nextDate.setFullYear(nextDate.getFullYear() + val);
      if (dueDay !== undefined && dueDay !== null) {
        nextDate = alignToDueDay(nextDate, dueDay);
      }
    }
  }

  return nextDate;
}

export async function processRecurringPaymentsForMember(memberId: string) {
  const now = new Date();

  // Find active student membership with active recurrence configuration
  const member = await prisma.workspaceMember.findUnique({
    where: { id: memberId },
    include: { 
      user: true,
      workspace: true
    },
  });

  if (
    !member ||
    member.role !== "STUDENT" ||
    !member.isActive ||
    member.billingControlType === "MANUAL" ||
    !member.billingIsActive ||
    !member.billingNextDueDate
  ) {
    return;
  }

  let nextDue = new Date(member.billingNextDueDate);

  // If next due date is in the future, nothing to do
  if (nextDue > now) {
    return;
  }

  const generatedNotifications: Array<{
    userId: string;
    type: string;
    category: string;
    title: string;
    description: string;
    workspaceId: string;
  }> = [];

  // Process all past-due billing cycles up to today
  await prisma.$transaction(async (tx) => {
    let currentNextDue = new Date(nextDue);

    while (currentNextDue <= now) {
      // 1. Create WorkspacePayment (Cobrança)
      const paymentStatus = member.billingControlType === "AUTOMATIC" ? "pago" : "pendente";
      const paymentDate = new Date(currentNextDue);

      const newPayment = await tx.workspacePayment.create({
        data: {
          workspaceId: member.workspaceId,
          studentName: member.user.name || "Sem Nome",
          planName: member.billingDescription || `Mensalidade — Plano ${member.plan}`,
          amount: member.billingPrice,
          status: paymentStatus,
          method: member.billingPaymentMethod || "PIX",
          createdAt: paymentDate,
          updatedAt: new Date(),
          billingOrigin: "RECURRENCE",
          billingMode: member.billingControlType,
          generatedAt: new Date(),
          paidAt: member.billingControlType === "AUTOMATIC" ? new Date() : null,
          actionType: member.billingControlType === "AUTOMATIC" ? "AUTOMATIC" : null,
          isAutomaticBilled: member.billingControlType === "AUTOMATIC",
        },
      });

      // 2. Register Audit Logs
      await tx.auditLog.create({
        data: {
          action: `Cobrança recorrente criada automaticamente para o aluno ${member.user.name || "Sem Nome"}.`,
          entity: "Recurrence",
          entityId: newPayment.id,
          severity: "info",
        },
      });

      if (member.billingControlType === "AUTOMATIC") {
        await tx.auditLog.create({
          data: {
            action: `Baixa automática executada para a cobrança ${newPayment.id} do aluno ${member.user.name || "Sem Nome"}.`,
            entity: "Recurrence",
            entityId: newPayment.id,
            severity: "info",
          },
        });
      }

      // Collect notification details
      const amountStr = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(member.billingPrice);
      const trainerUserId = member.workspace?.ownerId;

      if (paymentStatus === "pago") {
        generatedNotifications.push({
          userId: member.userId,
          type: "PAYMENT_CONFIRMED",
          category: "FINANCE",
          title: "Mensalidade Regularizada 🎉",
          description: `Sua mensalidade no valor de ${amountStr} foi baixada automaticamente com sucesso. Bons treinos!`,
          workspaceId: member.workspaceId,
        });

        if (trainerUserId) {
          generatedNotifications.push({
            userId: trainerUserId,
            type: "PAYMENT_CONFIRMED",
            category: "FINANCE",
            title: "Mensalidade Recebida 💸",
            description: `A mensalidade de ${member.user.name || "Sem Nome"} no valor de ${amountStr} foi recebida e baixada automaticamente.`,
            workspaceId: member.workspaceId,
          });
        }
      } else {
        generatedNotifications.push({
          userId: member.userId,
          type: "PAYMENT_PENDING",
          category: "FINANCE",
          title: "Mensalidade Disponível 💳",
          description: `Sua mensalidade no valor de ${amountStr} foi gerada e está disponível para pagamento.`,
          workspaceId: member.workspaceId,
        });

        if (trainerUserId) {
          generatedNotifications.push({
            userId: trainerUserId,
            type: "PAYMENT_PENDING",
            category: "FINANCE",
            title: "Nova Fatura Gerada 💳",
            description: `Uma nova cobrança de ${amountStr} foi aberta para o aluno ${member.user.name || "Sem Nome"}.`,
            workspaceId: member.workspaceId,
          });
        }
      }

      // 3. Move to next cycle
      currentNextDue = calculateNextDueDate(
        currentNextDue,
        member.billingPeriodicity,
        member.billingCustomIntervalCount || 1,
        member.billingCustomIntervalUnit || "meses",
        member.billingDueDay
      );
    }

    // 4. Update member details
    await tx.workspaceMember.update({
      where: { id: member.id },
      data: {
        billingLastGeneratedDate: new Date(),
        billingNextDueDate: currentNextDue,
        planEndDate: currentNextDue,
      },
    });
  });

  // Send notifications outside the transaction boundary to avoid connection blocking
  for (const notif of generatedNotifications) {
    try {
      await NotificationService.sendNotification({
        userId: notif.userId,
        type: notif.type,
        category: notif.category,
        title: notif.title,
        description: notif.description,
        workspaceId: notif.workspaceId,
        priority: "NORMAL",
      });
    } catch (err) {
      console.error("Failed to send recurrence notification:", err);
    }
  }
}

export async function processRecurringPayments(workspaceId?: string) {
  const now = new Date();

  // Find all active student members with active recurrence configs
  const members = await prisma.workspaceMember.findMany({
    where: {
      ...(workspaceId ? { workspaceId } : {}),
      role: "STUDENT",
      isActive: true,
      billingIsActive: true,
      billingNextDueDate: {
        lte: now,
      },
      NOT: {
        billingControlType: "MANUAL",
      },
    },
    select: {
      id: true,
    },
  });

  // Process sequentially to avoid lock issues on NeonDB
  for (const member of members) {
    try {
      await processRecurringPaymentsForMember(member.id);
    } catch (err) {
      console.error(`Failed to process recurrence for member ${member.id}:`, err);
    }
  }
}
