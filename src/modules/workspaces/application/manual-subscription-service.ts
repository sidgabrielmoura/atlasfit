import { jobRetryAt } from "@/lib/job-retry";
import { assertGymOperationalWorkspace, gymOperationalWorkspaceWhere } from "./gym-license";
import prisma from "@/lib/prisma";
import { randomBytes } from "node:crypto";
import type { SetupEnrollmentSubscriptionInput, GenerateCycleInvoiceInput, CancelSubscriptionInput } from "./subscription-service";
import { serializableTransaction, type GymTransactionClient } from "./transaction";
import { assertActorAuthority } from "./actor-authority";
import { resolveGymPayer } from "./payer-service";
import { WorkspaceAccessError } from "../domain/types";
import { safeCentsNumber } from "../domain/money";
import { billingCompetence, nextBillingDate } from "../domain/billing-calendar";
import { rejectActiveGymGateway } from "../domain/gateway-policy";
import { lockGymEnrollment as lockEnrollment } from "./enrollment-lock";
import { assertSingleLiveGymEnrollment } from "./enrollment-uniqueness";
import { skipPausedBillingDates } from "../domain/paused-billing-calendar";

export async function generateLocalCycleInvoice(tx: GymTransactionClient, input: GenerateCycleInvoiceInput, job = false, now = new Date()) {
  await assertGymOperationalWorkspace(input.workspaceId, tx, now);
  await lockEnrollment(tx, input.workspaceId, input.enrollmentId);
  const enrollment = await tx.gymEnrollment.findFirst({ where: { id: input.enrollmentId, workspaceId: input.workspaceId }, include: { planVersion: true, studentMember: true, workspace: { include: { settings: true } } } });
  if (!enrollment) throw new WorkspaceAccessError(404, "ENROLLMENT_NOT_FOUND", "Matrícula não encontrada.");
  if (!job) await assertActorAuthority(tx, input.workspaceId, input.actorUserId, "enrollments.manage", enrollment.unitId);
  if (!enrollment.workspace.isActive || enrollment.workspace.type !== "GYM") throw new WorkspaceAccessError(403, "WORKSPACE_SUSPENDED", "Academia indisponível.");
  if (enrollment.providerSubscriptionId || enrollment.recurrenceMode === "PROVIDER") throw new WorkspaceAccessError(409, "LEGACY_SUBSCRIPTION_REVIEW_REQUIRED", "A assinatura externa deve ser reconciliada antes da transição manual; nenhuma cobrança foi cancelada.");
  let due = input.dueDate || enrollment.nextDueDate;
  if (!due || !Number.isFinite(due.getTime())) throw new WorkspaceAccessError(400, "INVALID_REQUEST", "Vencimento obrigatório.");
  const timezone = enrollment.workspace.settings?.timezone || "America/Sao_Paulo";
  const closedPauses = await tx.gymEnrollmentPause.findMany({ where: { enrollmentId: enrollment.id, resumedAt: { not: null }, billingResumePolicy: "SKIP" }, orderBy: [{ startDate: "asc" }, { id: "asc" }], take: 1001 });
  if (closedPauses.length > 1000) throw new WorkspaceAccessError(409, "REVIEW_SOURCE_LIMIT", "Revise o calendário histórico em lotes menores.");
  let skipped = 0;
  for (const pause of closedPauses) {
    const start = pause.startedAt || pause.startDate;
    const end = new Date(Math.min(pause.endDate.getTime(), pause.resumedAt!.getTime()));
    const advanced = skipPausedBillingDates(due, start, end, enrollment.planVersion.billingCycle, enrollment.billingAnchorDay || enrollment.startDate.getUTCDate(), enrollment.planVersion.durationDays);
    due = advanced.next!; skipped += advanced.skipped;
  }
  if (skipped) {
    // Older debt before a pause remains due; suspended dates reached later are skipped too.
    if (input.dueDate && enrollment.nextDueDate?.getTime() !== input.dueDate.getTime()) throw new WorkspaceAccessError(409, "INVALID_REQUEST", "Gere o próximo ciclo previsto.");
    await tx.gymEnrollment.update({ where: { id: enrollment.id }, data: { nextDueDate: due, nextCycleBillingDate: due } });
    enrollment.nextDueDate = due;
    await tx.auditLog.create({ data: { userId: job ? null : input.actorUserId, entity: "GYM_ENROLLMENT", entityId: enrollment.id, action: `GYM_SUSPENDED_BILLING_DATES_SKIPPED:${skipped}:next=${due.toISOString()}` } });
  }
  const competence = billingCompetence(due, timezone);
  if (input.competenceMonth && input.competenceMonth !== competence) throw new WorkspaceAccessError(400, "INVALID_REQUEST", "A competência deve corresponder ao vencimento.");
  const key = `GYM:${enrollment.id}:${enrollment.planVersion.billingCycle === "CUSTOM" ? due.toISOString().slice(0, 10) : competence}`;
  if (enrollment.supersedesEnrollmentId && enrollment.cycleCount > 0 && enrollment.status !== "ACTIVE") throw new WorkspaceAccessError(409, "INVALID_STATUS", "Ative a revisão contratual antes de gerar ciclos adicionais.");
  const existing = await tx.gymInvoice.findFirst({ where: { enrollmentId: enrollment.id, workspaceId: input.workspaceId, OR: [{ recurrenceKey: key }, { competenceMonth: competence, recurrenceKey: null }] } });
  if (existing) return existing;
  const acceptedRevision = await tx.gymEnrollment.findFirst({ where: { workspaceId: input.workspaceId, supersedesEnrollmentId: enrollment.id, status: "PENDING_ACTIVATION", startDate: { lte: due }, acceptance: { isNot: null } }, select: { id: true } });
  if (acceptedRevision) throw new WorkspaceAccessError(409, "CONTRACT_REVISION_PENDING", "Existe revisão aceita para este vencimento. Conclua sua ativação ou cancele a proposta antes de gerar outra obrigação no contrato anterior.");
  // A scheduled pause must suspend generation even before the lifecycle job runs.
  const pause = await tx.gymEnrollmentPause.findFirst({ where: { enrollmentId: enrollment.id, resumedAt: null, startDate: { lte: now }, endDate: { gt: now } }, select: { id: true } });
  if (enrollment.status === "PAUSED" || pause) throw new WorkspaceAccessError(409, "BILLING_PAUSED", "A geração de mensalidades está suspensa durante a pausa.");
  await assertSingleLiveGymEnrollment(tx, enrollment);
  if (!enrollment.studentMember.isActive || ["CANCELLED", "EXPIRED", "DRAFT", "PAUSED"].includes(enrollment.status) || enrollment.subscriptionStatus === "CANCELLED" || (enrollment.cancellationEffectiveDate && due >= enrollment.cancellationEffectiveDate) || (enrollment.endDate && due > enrollment.endDate && !enrollment.autoRenew)) throw new WorkspaceAccessError(409, "INVALID_STATUS", "Matrícula não elegível para esta mensalidade.");
  if (enrollment.nextDueDate && due.getTime() !== enrollment.nextDueDate.getTime()) throw new WorkspaceAccessError(409, "INVALID_REQUEST", "Gere o próximo ciclo previsto; vencimentos arbitrários não são permitidos.");
  const payer = await resolveGymPayer(input.workspaceId, { studentUserId: enrollment.studentMember.userId, studentMemberId: enrollment.studentMemberId, enrollmentId: enrollment.id }, tx);
  const fee = enrollment.cycleCount === 0 ? enrollment.enrollmentFeeInCents : BigInt(0);
  const firstCharge = enrollment.cycleCount === 0 ? enrollment.initialChargeInCents : null;
  const planCharge = firstCharge ?? enrollment.priceInCents;
  const total = planCharge + fee;
  if (total < BigInt(0)) throw new WorkspaceAccessError(409, "INVALID_AMOUNT", "Condições contratadas inválidas.");
  const invoice = await tx.gymInvoice.create({ data: { workspaceId: input.workspaceId, studentMemberId: enrollment.studentMemberId, studentUserId: enrollment.studentMember.userId, enrollmentId: enrollment.id, recurrenceKey: key, cycleNumber: enrollment.cycleCount + 1, invoiceNumber: `FAT-${randomBytes(12).toString("hex").toUpperCase()}`, title: `${enrollment.planVersion.name} · ${competence}`, dueDate: due, competenceMonth: competence, status: total === BigInt(0) ? "PAID" : "OPEN", subtotalInCents: total, totalInCents: total, balanceRemainingInCents: total, payerType: payer.payerType, payerName: payer.name, payerCpfCnpj: payer.cpfCnpj, payerEmail: payer.email || null, payerPhone: payer.phone, createdByUserId: job ? "SYSTEM_JOB" : input.actorUserId, items: { create: [{ itemType: "PLAN_SUBSCRIPTION", description: enrollment.planVersion.name, unitPriceInCents: planCharge, totalInCents: planCharge, planVersionId: enrollment.planVersionId }, ...(fee > BigInt(0) ? [{ itemType: "ENROLLMENT_FEE" as const, description: "Taxa de matrícula", unitPriceInCents: fee, totalInCents: fee }] : [])] } } });
  const next = nextBillingDate(due, enrollment.planVersion.billingCycle, enrollment.billingAnchorDay || enrollment.startDate.getUTCDate(), enrollment.planVersion.durationDays);
  await tx.gymEnrollment.update({ where: { id: enrollment.id }, data: { cycleCount: { increment: 1 }, nextDueDate: next, nextCycleBillingDate: next, subscriptionStatus: "ACTIVE" } });
  await tx.auditLog.create({ data: { userId: job ? null : input.actorUserId, action: `${job ? "JOB:" : ""}GYM_CYCLE_INVOICE_GENERATED:${invoice.id}`, entity: "GYM_ENROLLMENT", entityId: enrollment.id, severity: "info" } });
  return invoice;
}

export class ManualSubscriptionService {
  async setup(input: SetupEnrollmentSubscriptionInput) {
    if (input.recurrenceMode !== "LOCAL" || input.creditCardData || input.creditCardToken) rejectActiveGymGateway();
    const invoice = await serializableTransaction(async tx => {
      await assertGymOperationalWorkspace(input.workspaceId, tx);
      await lockEnrollment(tx, input.workspaceId, input.enrollmentId);
      const enrollment = await tx.gymEnrollment.findFirst({ where: { id: input.enrollmentId, workspaceId: input.workspaceId } });
      if (!enrollment) throw new WorkspaceAccessError(404, "ENROLLMENT_NOT_FOUND", "Matrícula não encontrada.");
      await assertActorAuthority(tx, input.workspaceId, input.actorUserId, "enrollments.manage", enrollment.unitId);
      if (enrollment.providerSubscriptionId || enrollment.recurrenceMode === "PROVIDER") throw new WorkspaceAccessError(409, "LEGACY_SUBSCRIPTION_REVIEW_REQUIRED", "Assinatura externa exige reconciliação antes da transição manual.");
      if (enrollment.cycleCount && input.customFirstDueDate && enrollment.nextDueDate?.getTime() !== input.customFirstDueDate.getTime()) throw new WorkspaceAccessError(409, "INVALID_REQUEST", "O primeiro vencimento já foi aplicado.");
      const firstInvoice = await tx.gymInvoice.findFirst({ where: { enrollmentId: enrollment.id, workspaceId: input.workspaceId }, orderBy: { issueDate: "asc" } });
      if (firstInvoice) return firstInvoice;
      if (!enrollment.nextDueDate) await tx.gymEnrollment.update({ where: { id: enrollment.id }, data: { nextDueDate: input.customFirstDueDate || enrollment.startDate, billingType: "UNDEFINED" } });
      return generateLocalCycleInvoice(tx, { ...input, dueDate: enrollment.cycleCount === 0 ? input.customFirstDueDate : undefined });
    });
    return { enrollmentId: input.enrollmentId, recurrenceMode: "LOCAL" as const, subscriptionStatus: "ACTIVE" as const, providerSubscriptionId: null, billingType: "UNDEFINED" as const, checkoutUrl: null, creditCardBrand: null, creditCardLast4: null, firstInvoiceNumber: invoice.invoiceNumber, firstInvoiceAmountInCents: safeCentsNumber(invoice.totalInCents) };
  }
  async cycle(input: GenerateCycleInvoiceInput) {
    const invoice = await serializableTransaction(tx => generateLocalCycleInvoice(tx, input));
    return { invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber, cycleNumber: invoice.cycleNumber, competenceMonth: invoice.competenceMonth, totalInCents: safeCentsNumber(invoice.totalInCents), dueDate: invoice.dueDate.toISOString() };
  }
  async stop(input: CancelSubscriptionInput) {
    if (!input.cancellationReason.trim()) throw new WorkspaceAccessError(400, "REASON_REQUIRED", "Informe o motivo.");
    await serializableTransaction(async tx => {
      await assertGymOperationalWorkspace(input.workspaceId, tx);
      await lockEnrollment(tx, input.workspaceId, input.enrollmentId);
      const enrollment = await tx.gymEnrollment.findFirst({ where: { id: input.enrollmentId, workspaceId: input.workspaceId } });
      if (!enrollment) throw new WorkspaceAccessError(404, "ENROLLMENT_NOT_FOUND", "Matrícula não encontrada.");
      await assertActorAuthority(tx, input.workspaceId, input.actorUserId, "enrollments.manage", enrollment.unitId);
      if (enrollment.providerSubscriptionId || enrollment.recurrenceMode === "PROVIDER") throw new WorkspaceAccessError(409, "LEGACY_SUBSCRIPTION_REVIEW_REQUIRED", "A assinatura externa exige transição administrativa. Nenhuma operação externa foi cancelada.");
      await tx.gymEnrollment.update({ where: { id: enrollment.id }, data: { autoRenew: false, subscriptionStatus: "CANCELLED" } });
      await tx.auditLog.create({ data: { userId: input.actorUserId, action: `GYM_RECURRENCE_STOPPED:${enrollment.id}:${input.cancellationReason.trim()}`, entity: "GYM_ENROLLMENT", entityId: enrollment.id, severity: "warning" } });
    });
    // Encerrar a geração não cancela a matrícula nem recebimentos já registrados.
    return { status: "CANCELLED", enrollmentId: input.enrollmentId, cancelledAt: new Date().toISOString() };
  }
  async processDue(now = new Date(), workspaceId?: string) {
    const candidates = await prisma.gymEnrollment.findMany({ where: { ...(workspaceId ? { workspaceId } : {}), workspace: gymOperationalWorkspaceWhere(now), recurrenceMode: "LOCAL", providerSubscriptionId: null, subscriptionStatus: "ACTIVE", status: { in: ["ACTIVE", "PENDING_ACTIVATION"] }, nextDueDate: { lte: now }, OR: [{ billingRetryAt: null }, { billingRetryAt: { lte: now } }], studentMember: { isActive: true }, pauses: { none: { resumedAt: null, startDate: { lte: now }, endDate: { gt: now } } } }, select: { id: true, workspaceId: true, nextDueDate: true, billingFailureCount: true }, take: 500, orderBy: { nextDueDate: "asc" } });
    let processed = 0, skippedPaused = 0, deferredAfterPause = 0;
    const failures: string[] = [];
    for (const candidate of candidates) {
      try {
        const deferred = await serializableTransaction(async tx => {
          await assertGymOperationalWorkspace(candidate.workspaceId, tx, now);
          await lockEnrollment(tx, candidate.workspaceId, candidate.id);
          const current = await tx.gymEnrollment.findFirst({ where: { id: candidate.id, workspaceId: candidate.workspaceId }, include: { planVersion: true, studentMember: { select: { isActive: true } } } });
          if (!current?.nextDueDate || !current.studentMember.isActive || !["ACTIVE", "PENDING_ACTIVATION"].includes(current.status) || current.subscriptionStatus !== "ACTIVE" || current.recurrenceMode !== "LOCAL" || current.providerSubscriptionId || (current.cancellationEffectiveDate && current.cancellationEffectiveDate <= now)) return true;
          const pauses = await tx.gymEnrollmentPause.findMany({ where: { enrollmentId: current.id, resumedAt: { not: null }, billingResumePolicy: "SKIP" }, orderBy: [{ startDate: "asc" }, { id: "asc" }], take: 1001 });
          if (pauses.length > 1000) throw new WorkspaceAccessError(409, "REVIEW_SOURCE_LIMIT", "Revise o calendário histórico em lotes menores.");
          let due = current.nextDueDate, skipped = 0;
          for (const pause of pauses) {
            const advanced = skipPausedBillingDates(due, pause.startedAt || pause.startDate, new Date(Math.min(pause.endDate.getTime(), pause.resumedAt!.getTime())), current.planVersion.billingCycle, current.billingAnchorDay || current.startDate.getUTCDate(), current.planVersion.durationDays);
            due = advanced.next!; skipped += advanced.skipped;
          }
          if (skipped) {
            await tx.gymEnrollment.update({ where: { id: current.id }, data: { nextDueDate: due, nextCycleBillingDate: due } });
            await tx.auditLog.create({ data: { userId: null, entity: "GYM_ENROLLMENT", entityId: current.id, action: `GYM_SUSPENDED_BILLING_DATES_SKIPPED:${skipped}:next=${due.toISOString()}` } });
          }
          if (due > now) return true;
          await generateLocalCycleInvoice(tx, { enrollmentId: candidate.id, workspaceId: candidate.workspaceId, actorUserId: "SYSTEM_JOB", dueDate: due }, true, now);
          return false;
        });
        if (candidate.billingFailureCount) await prisma.gymEnrollment.update({ where: { id: candidate.id }, data: { billingRetryAt: null, billingFailureCount: 0 } });
        if (deferred) deferredAfterPause++; else processed++;
      }
      catch (error) {
        if (error instanceof WorkspaceAccessError && error.code === "BILLING_PAUSED") { skippedPaused++; continue; }
        failures.push(candidate.id);
        await prisma.gymEnrollment.update({ where: { id: candidate.id }, data: { billingRetryAt: jobRetryAt(candidate.billingFailureCount, now), billingFailureCount: { increment: 1 } } });
        console.error("[GYM_RECURRENCE_FAILED]", { workspaceId: candidate.workspaceId, enrollmentId: candidate.id, errorCode: error instanceof WorkspaceAccessError ? error.code : error instanceof Error ? error.name : "UNKNOWN" });
      }
    }
    return { processed, skippedPaused, deferredAfterPause, failures, hasMore: candidates.length === 500 };
  }
}
export const manualSubscriptionService = new ManualSubscriptionService();
