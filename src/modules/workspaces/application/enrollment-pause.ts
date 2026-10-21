import { jobRetryAt } from "@/lib/job-retry";
import { assertGymOperationalWorkspace, gymOperationalWorkspaceWhere } from "./gym-license";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { serializableTransaction, type GymTransactionClient } from "./transaction";
import { lockGymEnrollment } from "./enrollment-lock";
import { assertActorAuthority } from "./actor-authority";
import { WorkspaceAccessError } from "../domain/types";
import { gymPublicUserSelect } from "../domain/public-user";
import { hasStudentMembership } from "../domain/student-membership";
import { calculatePauseExtension } from "../domain/enrollment-lifecycle";
import { gymCalendarInstant } from "../domain/gym-calendar-date";
import type { PauseEnrollmentInput, ResumeEnrollmentInput } from "./enrollment-service";
import { assertSingleLiveGymEnrollment } from "./enrollment-uniqueness";
import { skipPausedBillingDates } from "../domain/paused-billing-calendar";

const id = z.string().trim().min(1).max(100);
const date = z.union([z.date(), z.iso.date(), z.iso.datetime({ offset: true })]);
export const pauseGymEnrollmentSchema = z.object({ workspaceId: id, startDate: date, endDate: date, reason: z.string().trim().min(1).max(2000), extendEndDate: z.boolean().default(true), billingResumePolicy: z.literal("SKIP").default("SKIP") }).strict().refine(value => new Date(value.endDate) > new Date(value.startDate), { message: "O término deve ser posterior ao início.", path: ["endDate"] });
export const resumeGymEnrollmentSchema = z.object({ workspaceId: id }).strict();

async function context(tx: GymTransactionClient, workspaceId: string, enrollmentId: string, actorUserId?: string) {
  await assertGymOperationalWorkspace(workspaceId, tx);
  await lockGymEnrollment(tx, workspaceId, enrollmentId);
  const enrollment = await tx.gymEnrollment.findFirst({ where: { id: enrollmentId, workspaceId }, omit: { creditCardToken: true }, include: {
    workspace: { select: { type: true, isActive: true, settings: { select: { timezone: true } } } }, acceptance: true,
    planVersion: { include: { plan: true } }, studentMember: { include: { roleGrants: true, studentProfile: { select: { memberId: true } }, user: { select: gymPublicUserSelect } } },
    pauses: { where: { resumedAt: null }, orderBy: [{ createdAt: "desc" }, { id: "asc" }] },
  } });
  if (!enrollment || enrollment.workspace.type !== "GYM" || enrollment.studentMember.workspaceId !== workspaceId || enrollment.planVersion.plan.workspaceId !== workspaceId) throw new WorkspaceAccessError(404, "ENROLLMENT_NOT_FOUND", "Matrícula não encontrada nesta academia.");
  if (actorUserId) await assertActorAuthority(tx, workspaceId, actorUserId, "enrollments.manage", enrollment.unitId);
  if (!enrollment.workspace.isActive) throw new WorkspaceAccessError(403, "WORKSPACE_SUSPENDED", "Academia suspensa.");
  if (enrollment.unitId !== enrollment.studentMember.unitId || (enrollment.unitId && !await tx.gymUnit.findFirst({ where: { id: enrollment.unitId, workspaceId, isActive: true }, select: { id: true } }))) throw new WorkspaceAccessError(409, "TENANT_MISMATCH", "Regularize a unidade da matrícula e do aluno.");
  if (enrollment.providerSubscriptionId || enrollment.recurrenceMode === "PROVIDER") throw new WorkspaceAccessError(409, "LEGACY_SUBSCRIPTION_REVIEW_REQUIRED", "A assinatura externa exige reconciliação antes de alterar a pausa. Nenhuma operação externa foi executada.");
  return enrollment;
}

function publicEnrollment(enrollment: Awaited<ReturnType<typeof context>>) {
  const { workspace, ...publicFields } = enrollment;
  return publicFields;
}

function assertResumable(enrollment: Awaited<ReturnType<typeof context>>, now: Date, endDate: Date | null) {
  if (!enrollment.acceptance || !enrollment.activatedAt || !enrollment.studentMember.isActive || !hasStudentMembership(enrollment.studentMember) || enrollment.startDate > now || (endDate && endDate <= now) || (enrollment.cancellationEffectiveDate && enrollment.cancellationEffectiveDate <= now)) throw new WorkspaceAccessError(409, "ACTIVATION_CONDITION_NOT_MET", "Retomada exige aceite, ativação anterior, vínculo e vigência válidos.");
}

export async function pauseGymEnrollment(input: PauseEnrollmentInput, now = new Date()) {
  const { actorUserId, enrollmentId, ...request } = input;
  const parsed = pauseGymEnrollmentSchema.safeParse(request);
  if (!parsed.success) throw new WorkspaceAccessError(400, "INVALID_REQUEST", "Informe intervalo válido, motivo e opção de extensão da pausa.");
  return serializableTransaction(async tx => {
    const enrollment = await context(tx, parsed.data.workspaceId, enrollmentId, actorUserId);
    const timezone = enrollment.workspace.settings?.timezone || "America/Sao_Paulo";
    const p = { ...parsed.data, startDate: gymCalendarInstant(parsed.data.startDate, timezone), endDate: gymCalendarInstant(parsed.data.endDate, timezone) };
    // Date-only forms may pause a contract activated earlier on the same civil day.
    // Clamp only that day to the contractual start; previous days still fail validation.
    if (typeof parsed.data.startDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(parsed.data.startDate) && p.startDate < enrollment.startDate && new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(enrollment.startDate) === parsed.data.startDate) p.startDate = enrollment.startDate;
    if (p.endDate <= p.startDate) throw new WorkspaceAccessError(400, "INVALID_REQUEST", "O término deve ser posterior ao início.");
    const open = enrollment.pauses[0];
    if (enrollment.pauses.length > 1) throw new WorkspaceAccessError(409, "INVALID_STATUS", "Existem pausas sobrepostas no histórico; revise antes de continuar.");
    if (open) {
      if (open.startDate.getTime() === p.startDate.getTime() && open.endDate.getTime() === p.endDate.getTime() && open.reason === p.reason && open.extendEndDate === p.extendEndDate && open.billingResumePolicy === p.billingResumePolicy && ["ACTIVE", "PAUSED"].includes(enrollment.status)) return publicEnrollment(enrollment);
      throw new WorkspaceAccessError(409, "INVALID_STATUS", "Já existe pausa em aberto ou programada. Encerre-a antes de registrar outra.");
    }
    if (enrollment.status !== "ACTIVE") throw new WorkspaceAccessError(409, "INVALID_TRANSITION", "Somente uma matrícula ativa pode ser pausada.");
    assertResumable(enrollment, now, enrollment.endDate);
    if (!enrollment.accessGranted) throw new WorkspaceAccessError(409, "INVALID_STATUS", "A matrícula não possui acesso ativo para pausar.");
    if (p.endDate <= now || p.startDate < enrollment.startDate || (enrollment.endDate && p.startDate >= enrollment.endDate) || (enrollment.cancellationEffectiveDate && p.startDate >= enrollment.cancellationEffectiveDate)) throw new WorkspaceAccessError(400, "INVALID_REQUEST", "A pausa deve iniciar dentro da vigência e terminar no futuro.");
    const immediate = p.startDate <= now;
    const pause = await tx.gymEnrollmentPause.create({ data: { enrollmentId, startDate: p.startDate, endDate: p.endDate, reason: p.reason, extendEndDate: p.extendEndDate, billingResumePolicy: p.billingResumePolicy, requestedByUserId: actorUserId, startedAt: immediate ? now : null } });
    if (immediate) await tx.gymEnrollment.update({ where: { id: enrollmentId }, data: { status: "PAUSED", accessGranted: false } });
    await tx.gymEnrollmentEvent.create({ data: { enrollmentId, workspaceId: p.workspaceId, fromStatus: "ACTIVE", toStatus: immediate ? "PAUSED" : "ACTIVE", reason: `${immediate ? "PAUSE_STARTED" : "PAUSE_SCHEDULED"}:${pause.id}:${p.reason}`, actorId: actorUserId, effectiveDate: immediate ? now : p.startDate } });
    await tx.auditLog.create({ data: { userId: actorUserId, entity: "GYM_ENROLLMENT", entityId: enrollmentId, action: `GYM_${immediate ? "PAUSE_STARTED" : "PAUSE_SCHEDULED"}:${pause.id}` } });
    return publicEnrollment(await context(tx, p.workspaceId, enrollmentId));
  });
}

async function resume(tx: GymTransactionClient, workspaceId: string, enrollmentId: string, actorUserId: string | undefined, now: Date, scheduledPauseId?: string) {
  const enrollment = await context(tx, workspaceId, enrollmentId, actorUserId);
  if (enrollment.pauses.length > 1) throw new WorkspaceAccessError(409, "INVALID_STATUS", "Existem pausas sobrepostas; revisão necessária.");
  const pause = enrollment.pauses[0];
  if (!pause) {
    if (enrollment.status === "ACTIVE") return publicEnrollment(enrollment);
    throw new WorkspaceAccessError(409, "INVALID_STATUS", "Não existe pausa aberta para retomar.");
  }
  if (scheduledPauseId && (pause.id !== scheduledPauseId || pause.endDate > now)) return publicEnrollment(enrollment);
  if (!["ACTIVE", "PAUSED"].includes(enrollment.status)) throw new WorkspaceAccessError(409, "INVALID_TRANSITION", "A matrícula não admite retomada de pausa.");
  // A future/unapplied schedule is cancelled, never awarded a period of service credit.
  const started = pause.startedAt || (enrollment.status === "PAUSED" ? pause.startDate : null);
  const end = new Date(Math.min(now.getTime(), pause.endDate.getTime()));
  const newEndDate = started && pause.extendEndDate ? calculatePauseExtension({ currentEndDate: enrollment.endDate, pauseStartDate: started, pauseEndDate: end }) : enrollment.endDate;
  // A missed scheduler must still respect dates suspended by the saved schedule.
  const billingStart = started || (pause.startDate <= now ? pause.startDate : null);
  let nextDueDate = enrollment.nextDueDate, billingAnchorDay = enrollment.billingAnchorDay;
  let skipped = 0;
  if (billingStart && end > billingStart && nextDueDate) {
      const result = skipPausedBillingDates(nextDueDate, billingStart, end, enrollment.planVersion.billingCycle, billingAnchorDay || enrollment.startDate.getUTCDate(), enrollment.planVersion.durationDays);
      nextDueDate = result.next; skipped = result.skipped;
  }
  if (enrollment.status === "PAUSED") {
    assertResumable(enrollment, now, newEndDate);
    await assertSingleLiveGymEnrollment(tx, { ...enrollment, supersedesEnrollmentId: null });
  }
  await tx.gymEnrollmentPause.update({ where: { id: pause.id }, data: { resumedAt: now } });
  if (billingStart) await tx.gymEnrollment.update({ where: { id: enrollmentId }, data: { nextDueDate, nextCycleBillingDate: nextDueDate, billingAnchorDay } });
  if (enrollment.status === "PAUSED") await tx.gymEnrollment.update({ where: { id: enrollmentId }, data: { status: "ACTIVE", accessGranted: true, endDate: newEndDate } });
  await tx.gymEnrollmentEvent.create({ data: { enrollmentId, workspaceId, fromStatus: enrollment.status, toStatus: enrollment.status === "PAUSED" ? "ACTIVE" : enrollment.status, reason: `${started ? "PAUSE_RESUMED" : "PAUSE_SCHEDULE_CANCELLED"}:${pause.id}`, actorId: actorUserId || "SYSTEM_CRON", effectiveDate: now } });
  await tx.auditLog.create({ data: { userId: actorUserId || null, entity: "GYM_ENROLLMENT", entityId: enrollmentId, action: `GYM_${started ? "PAUSE_RESUMED" : "PAUSE_SCHEDULE_CANCELLED"}:${pause.id}` } });
  if (billingStart) await tx.auditLog.create({ data: { userId: actorUserId || null, entity: "GYM_ENROLLMENT", entityId: enrollmentId, action: `GYM_PAUSE_BILLING_RESUMED:${pause.id}:policy=${pause.billingResumePolicy}:skipped=${skipped}:next=${nextDueDate?.toISOString() || "NONE"}` } });
  return publicEnrollment(await context(tx, workspaceId, enrollmentId));
}

export async function resumeGymEnrollment(input: ResumeEnrollmentInput, now = new Date()) {
  const { enrollmentId, actorUserId, ...request } = input;
  if (!resumeGymEnrollmentSchema.safeParse(request).success) throw new WorkspaceAccessError(400, "INVALID_REQUEST", "Informe a academia da matrícula.");
  return serializableTransaction(tx => resume(tx, input.workspaceId, enrollmentId, actorUserId, now));
}

/** Only changes local lifecycle facts. Does not change billing policy or cancel existing debt. */
export async function processScheduledGymPauses(workspaceId?: string, now = new Date()) {
  const candidates = await prisma.gymEnrollmentPause.findMany({ where: { resumedAt: null, AND: [{ OR: [{ processingRetryAt: null }, { processingRetryAt: { lte: now } }] }], OR: [{ startedAt: null, startDate: { lte: now } }, { endDate: { lte: now } }], enrollment: { ...(workspaceId ? { workspaceId } : {}), workspace: gymOperationalWorkspaceWhere(now), recurrenceMode: "LOCAL", providerSubscriptionId: null, status: { in: ["ACTIVE", "PAUSED"] } } }, select: { id: true, processingFailures: true, enrollmentId: true, enrollment: { select: { workspaceId: true } } }, orderBy: [{ startDate: "asc" }, { id: "asc" }], take: 500 });
  let startedCount = 0, resumedCount = 0;
  const failures: string[] = [];
  for (const candidate of candidates) {
    try {
      const result = await serializableTransaction(async tx => {
        const enrollment = await context(tx, candidate.enrollment.workspaceId, candidate.enrollmentId);
        const pause = enrollment.pauses[0];
        if (enrollment.pauses.length > 1) throw new WorkspaceAccessError(409, "INVALID_STATUS", "Pausas sobrepostas exigem revisão.");
        if (!pause || pause.id !== candidate.id) return null;
        if (pause.endDate <= now) {
          await resume(tx, enrollment.workspaceId, enrollment.id, undefined, now, pause.id);
          return "RESUMED";
        }
        if (enrollment.status !== "ACTIVE" || pause.startedAt || pause.startDate > now) return null;
        assertResumable(enrollment, now, enrollment.endDate);
        if (!enrollment.accessGranted) throw new WorkspaceAccessError(409, "INVALID_STATUS", "Acesso não estava ativo.");
        await tx.gymEnrollmentPause.update({ where: { id: pause.id }, data: { startedAt: now } });
        await tx.gymEnrollment.update({ where: { id: enrollment.id }, data: { status: "PAUSED", accessGranted: false } });
        await tx.gymEnrollmentEvent.create({ data: { enrollmentId: enrollment.id, workspaceId: enrollment.workspaceId, fromStatus: "ACTIVE", toStatus: "PAUSED", reason: `PAUSE_STARTED:${pause.id}`, actorId: "SYSTEM_CRON", effectiveDate: now } });
        await tx.auditLog.create({ data: { userId: null, entity: "GYM_ENROLLMENT", entityId: enrollment.id, action: `GYM_PAUSE_STARTED:${pause.id}` } });
        return "STARTED";
      });
      if (candidate.processingFailures) await prisma.gymEnrollmentPause.update({ where: { id: candidate.id }, data: { processingRetryAt: null, processingFailures: 0 } });
      if (result === "STARTED") startedCount++;
      if (result === "RESUMED") resumedCount++;
    } catch (error) {
      failures.push(candidate.id);
      await prisma.gymEnrollmentPause.update({ where: { id: candidate.id }, data: { processingRetryAt: jobRetryAt(candidate.processingFailures, now), processingFailures: { increment: 1 } } });
      console.error("[GYM_PAUSE_JOB_FAILED]", { pauseId: candidate.id, workspaceId: candidate.enrollment.workspaceId, code: error instanceof WorkspaceAccessError ? error.code : "INTERNAL_ERROR" });
    }
  }
  return { startedCount, resumedCount, failures, hasMore: candidates.length === 500 };
}
