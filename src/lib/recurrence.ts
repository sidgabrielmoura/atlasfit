import { jobRetryAt } from "@/lib/job-retry";
import prisma from "./prisma";
import { enqueueNotification } from "@/lib/notifications/delivery";
import { triggerOutboxProcessing } from "@/lib/delivery/worker";
import { serializableTransaction } from "@/modules/workspaces/application/transaction";


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
  return serializableTransaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "WorkspaceMember" WHERE id = ${memberId} FOR UPDATE`;
    const member = await tx.workspaceMember.findUnique({ where: { id: memberId }, include: { user: { select: { name: true } }, workspace: { select: { type: true, isActive: true, ownerId: true } } } });
    if (!member || member.workspace.type !== "PERSONAL" || !member.workspace.isActive || member.role !== "STUDENT" || !member.isActive || member.billingControlType === "MANUAL" || !member.billingIsActive || !member.billingNextDueDate || member.billingNextDueDate > now) return { generated: 0 };
    if (!Number.isFinite(member.billingPrice) || member.billingPrice <= 0) throw new Error("INVALID_RECURRENCE_AMOUNT");
    let due = member.billingNextDueDate, generated = 0;
    while (due <= now && generated < 24) {
      const next = calculateNextDueDate(due, member.billingPeriodicity, member.billingCustomIntervalCount || 1, member.billingCustomIntervalUnit || "meses", member.billingDueDay);
      if (!Number.isFinite(next.getTime()) || next <= due) throw new Error("INVALID_RECURRENCE_INTERVAL");
      const payment = await tx.workspacePayment.create({ data: { workspaceId: member.workspaceId, studentName: member.user.name || "Sem Nome", planName: member.billingDescription || `Mensalidade — Plano ${member.plan}`, amount: member.billingPrice, status: "pendente", method: member.billingPaymentMethod || "PIX", createdAt: due, billingOrigin: "RECURRENCE", billingMode: member.billingControlType, generatedAt: now, paidAt: null, actionType: "RECURRENCE_GENERATED", isAutomaticBilled: false } });
      await tx.auditLog.create({ data: { action: "PERSONAL_RECURRENCE_OBLIGATION_CREATED", entity: "Recurrence", entityId: payment.id, severity: "info" } });
      const amount = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(member.billingPrice);
      const common = { type: "PAYMENT_PENDING", category: "FINANCE", workspaceId: member.workspaceId, priority: "NORMAL" };
      await enqueueNotification(tx, { ...common, userId: member.userId, requestKey: `recurrence:${payment.id}:student`, title: "Mensalidade disponível", description: `Sua mensalidade de ${amount} foi gerada e está pendente de pagamento.` });
      if (member.workspace.ownerId) await enqueueNotification(tx, { ...common, userId: member.workspace.ownerId, requestKey: `recurrence:${payment.id}:owner`, title: "Nova cobrança gerada", description: `Uma cobrança de ${amount} para ${member.user.name || "o aluno"} está pendente de pagamento.` });
      due = next; generated++;
    }
    await tx.workspaceMember.update({ where: { id: member.id }, data: { billingLastGeneratedDate: now, billingNextDueDate: due, planEndDate: due } });
    return { generated };
  });
}

export async function processRecurringPayments(workspaceId?: string) {
  const now = new Date();
  const members = await prisma.workspaceMember.findMany({ where: { ...(workspaceId ? { workspaceId } : {}), workspace: { type: "PERSONAL", isActive: true }, role: "STUDENT", isActive: true, billingIsActive: true, billingNextDueDate: { lte: now }, OR: [{ billingRetryAt: null }, { billingRetryAt: { lte: now } }], NOT: { billingControlType: "MANUAL" } }, select: { id: true, billingFailureCount: true }, take: 100, orderBy: [{ billingNextDueDate: "asc" }, { id: "asc" }] });
  let processed = 0, failed = 0;
  for (const member of members) {
    try { await processRecurringPaymentsForMember(member.id); if (member.billingFailureCount) await prisma.workspaceMember.update({ where: { id: member.id }, data: { billingRetryAt: null, billingFailureCount: 0 } }); processed++; }
    catch { failed++; await prisma.workspaceMember.update({ where: { id: member.id }, data: { billingRetryAt: jobRetryAt(member.billingFailureCount, now, 60 * 60_000), billingFailureCount: { increment: 1 } } }); }
  }
  if (processed > 0) {
    triggerOutboxProcessing();
  }
  return { processed, failed, hasMore: members.length === 100 };
}
