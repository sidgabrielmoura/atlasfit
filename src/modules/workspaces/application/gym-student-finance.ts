import type { Prisma } from "@prisma/client";
import { serializableTransaction, type GymTransactionClient } from "./transaction";
import { WorkspaceAccessError } from "../domain/types";
import { hasStudentMembership } from "../domain/student-membership";
import { reportDateBoundary } from "../domain/gym-report-metrics";
import { reportCalendarRange } from "../domain/gym-report-calendar";
import { assertGymOperationalWorkspace } from "./gym-license";

/** Read-only student statement. Never queries or reconciles a gateway. */
export async function getGymStudentFinance(workspaceId: string, memberId: string, userId: string, page = 1) {
  if (!Number.isInteger(page) || page < 1 || page > 10000) throw new WorkspaceAccessError(400, "INVALID_REQUEST", "Página inválida.");
  return serializableTransaction(async tx => {
    await assertGymOperationalWorkspace(workspaceId, tx);
    const student = await tx.workspaceMember.findFirst({ where: { id: memberId, workspaceId, userId, isActive: true, workspace: { type: "GYM", isActive: true } }, select: { id: true, unitId: true, workspace: { select: { name: true } }, studentProfile: { select: { memberId: true } }, role: true, roleGrants: { select: { role: true, revokedAt: true, unitId: true } } } });
    if (!student || !hasStudentMembership(student)) throw new WorkspaceAccessError(403, "FORBIDDEN_RESOURCE", "Vínculo estudantil ativo obrigatório.");
    if (student.unitId && !await tx.gymUnit.findFirst({ where: { id: student.unitId, workspaceId, isActive: true }, select: { id: true } })) throw new WorkspaceAccessError(403, "TENANT_MISMATCH", "Unidade do aluno exige reconciliação.");
    return readGymStudentStatement(tx, workspaceId, memberId, userId, student.workspace.name, page);
  });
}

/** Internal query: callers establish student/guardian authority in this same transaction. */
export async function readGymStudentStatement(tx: GymTransactionClient, workspaceId: string, memberId: string, userId: string, workspaceName: string, page: number) {
  const timezone = (await tx.gymSettings.findUnique({ where: { workspaceId }, select: { timezone: true } }))?.timezone || "America/Sao_Paulo";
  const now = new Date();
  const today = reportDateBoundary(reportCalendarRange(now, timezone, "7d").endDate, timezone, false);
  const where: Prisma.GymInvoiceWhereInput = { workspaceId, studentMemberId: memberId, studentUserId: userId, status: { not: "DRAFT" },
    OR: [{ enrollmentId: null }, { enrollment: { workspaceId, studentMemberId: memberId, studentMember: { userId, workspaceId }, planVersion: { plan: { workspaceId } } } }] };
  const open: Prisma.GymInvoiceWhereInput = { ...where, status: { in: ["OPEN", "PARTIALLY_PAID"] }, balanceRemainingInCents: { gt: BigInt(0) } };
  const invoices = await tx.gymInvoice.findMany({ where, orderBy: [{ dueDate: "desc" }, { id: "desc" }], skip: (page - 1) * 30, take: 30, select: {
    id: true, invoiceNumber: true, title: true, competenceMonth: true, dueDate: true, status: true, totalInCents: true, balanceRemainingInCents: true,
    enrollment: { select: { planVersion: { select: { name: true } } } },
    allocations: { where: { payment: { workspaceId, status: { in: ["CONFIRMED", "REVERSED"] } } }, select: { allocatedAmountInCents: true, status: true, payment: { select: { receiptNumber: true, paidAt: true, paymentMethod: true, status: true, reversedAt: true } } }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 51 },
  } });
  const total = await tx.gymInvoice.count({ where });
  const outstanding = await tx.gymInvoice.aggregate({ where: open, _sum: { balanceRemainingInCents: true } });
  const overdue = await tx.gymInvoice.aggregate({ where: { ...open, dueDate: { lt: today } }, _sum: { balanceRemainingInCents: true } });
  const received = await tx.gymPaymentAllocation.aggregate({ where: { invoice: where, status: "ACTIVE", payment: { workspaceId, status: "CONFIRMED" } }, _sum: { allocatedAmountInCents: true } });
  return { kind: "GYM_MANUAL" as const, workspaceId, workspaceName, timezone, snapshot: { asOf: now.toISOString(), basis: "CURRENT" as const },
    totals: { receivedInCents: (received._sum.allocatedAmountInCents || BigInt(0)).toString(), outstandingInCents: (outstanding._sum.balanceRemainingInCents || BigInt(0)).toString(), overdueInCents: (overdue._sum.balanceRemainingInCents || BigInt(0)).toString() },
    invoices: invoices.map(invoice => ({ id: invoice.id, number: invoice.invoiceNumber, title: invoice.title, competenceMonth: invoice.competenceMonth, dueDate: invoice.dueDate.toISOString(), status: invoice.status,
      overdue: invoice.balanceRemainingInCents > BigInt(0) && ["OPEN", "PARTIALLY_PAID"].includes(invoice.status) && invoice.dueDate < today, totalInCents: invoice.totalInCents.toString(), balanceInCents: invoice.balanceRemainingInCents.toString(), planName: invoice.enrollment?.planVersion.name || null,
      receipts: invoice.allocations.slice(0, 50).map(allocation => ({ amountInCents: allocation.allocatedAmountInCents.toString(), receiptNumber: allocation.payment.receiptNumber, paidAt: allocation.payment.paidAt.toISOString(), paymentMethod: allocation.payment.paymentMethod, reversed: allocation.status === "REVERSED" || allocation.payment.status === "REVERSED", reversedAt: allocation.payment.reversedAt?.toISOString() || null })), receiptsLimited: invoice.allocations.length > 50 })),
    pagination: { page, limit: 30, total, totalPages: Math.ceil(total / 30) },
  };
}
