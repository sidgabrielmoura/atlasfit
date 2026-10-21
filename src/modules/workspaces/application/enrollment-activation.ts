import type { ActivateEnrollmentInput } from "./enrollment-service";
import { serializableTransaction } from "./transaction";
import { assertActorAuthority } from "./actor-authority";
import { WorkspaceAccessError } from "../domain/types";
import { assertValidEnrollmentTransition } from "../domain/enrollment-state-machine";
import { gymPublicUserSelect } from "../domain/public-user";
import { lockGymEnrollment } from "./enrollment-lock";
import { z } from "zod";
import { assertGymRevisionPredecessor } from "./enrollment-revision";
import { hasStudentMembership } from "../domain/student-membership";
import { assertSingleLiveGymEnrollment } from "./enrollment-uniqueness";

export const activateGymEnrollmentSchema = z.object({ workspaceId: z.string().trim().min(1).max(100), paymentVerified: z.boolean().optional(), overrideReason: z.string().trim().min(1).max(2000).nullable().optional() }).strict();

export async function activateGymEnrollment(input: ActivateEnrollmentInput) {
  const { enrollmentId, actorUserId, ...request } = input;
  if (!activateGymEnrollmentSchema.safeParse(request).success) throw new WorkspaceAccessError(400, "INVALID_REQUEST", "Revise a solicitação de ativação.");
  return serializableTransaction(async tx => {
    const revision = await tx.gymEnrollment.findFirst({ where: { id: enrollmentId, workspaceId: input.workspaceId }, select: { supersedesEnrollmentId: true } });
    if (revision?.supersedesEnrollmentId) await lockGymEnrollment(tx, input.workspaceId, revision.supersedesEnrollmentId);
    await lockGymEnrollment(tx, input.workspaceId, input.enrollmentId);
    const enrollment = await tx.gymEnrollment.findFirst({ where: { id: enrollmentId, workspaceId: input.workspaceId }, omit: { creditCardToken: true }, include: { acceptance: true, planVersion: { include: { plan: true } }, workspace: { select: { type: true, subscription: { select: { status: true, endDate: true, trialEndsAt: true } } } }, studentMember: { include: { roleGrants: true, studentProfile: { select: { memberId: true } }, user: { select: gymPublicUserSelect } } } } });
    if (!enrollment) throw new WorkspaceAccessError(404, "ENROLLMENT_NOT_FOUND", "Matrícula não encontrada.");
    await assertActorAuthority(tx, input.workspaceId, input.actorUserId, "enrollments.manage", enrollment.unitId);
    if (enrollment.workspace.type !== "GYM" || enrollment.studentMember.workspaceId !== input.workspaceId || enrollment.planVersion.plan.workspaceId !== input.workspaceId || enrollment.unitId !== enrollment.studentMember.unitId || !hasStudentMembership(enrollment.studentMember)) throw new WorkspaceAccessError(403, "TENANT_MISMATCH", "Plano, vínculo e unidade devem corresponder à academia e ao aluno.");
    if (!["PENDING_ACTIVATION", "ACTIVE"].includes(enrollment.status)) throw new WorkspaceAccessError(409, "INVALID_TRANSITION", "A ativação exige aceite pendente de pagamento. Utilize a retomada para encerrar uma pausa.");
    if (enrollment.providerSubscriptionId || enrollment.recurrenceMode === "PROVIDER") throw new WorkspaceAccessError(409, "LEGACY_SUBSCRIPTION_REVIEW_REQUIRED", "Reconcilie a assinatura externa antes da ativação local.");
    const now = new Date();
    await assertSingleLiveGymEnrollment(tx, enrollment);
    const license = enrollment.workspace.subscription;
    if (enrollment.supersedesEnrollmentId && (!license || (license.endDate && license.endDate <= now) || !(license.status === "ACTIVE" || (license.status === "TRIAL" && license.trialEndsAt && license.trialEndsAt > now)))) throw new WorkspaceAccessError(403, "INVALID_STATUS", "Licença da academia inativa ou expirada.");
    if (!enrollment.acceptance || !enrollment.studentMember.isActive || enrollment.startDate > now || (enrollment.endDate && enrollment.endDate <= now)) throw new WorkspaceAccessError(409, "ACTIVATION_CONDITION_NOT_MET", "Aceite, vínculo e vigência devem estar válidos.");
    const firstInvoice = await tx.gymInvoice.findFirst({ where: { enrollmentId: enrollment.id, workspaceId: input.workspaceId, ...(enrollment.supersedesEnrollmentId ? { cycleNumber: 1, recurrenceKey: { not: null } } : {}), status: { notIn: ["CANCELLED", "REFUNDED"] } }, orderBy: [{ cycleNumber: "asc" }, { issueDate: "asc" }] });
    const paymentSatisfied = firstInvoice?.status === "PAID" && firstInvoice.balanceRemainingInCents === BigInt(0) && firstInvoice.paidAmountInCents >= firstInvoice.totalInCents;
    if (enrollment.supersedesEnrollmentId && (!paymentSatisfied || firstInvoice?.totalInCents !== enrollment.initialChargeInCents)) throw new WorkspaceAccessError(409, "ACTIVATION_CONDITION_NOT_MET", "Registre o recebimento integral da obrigação aprovada para esta revisão.");
    if (!paymentSatisfied) {
      if (!input.overrideReason?.trim()) throw new WorkspaceAccessError(409, "ACTIVATION_CONDITION_NOT_MET", "Registre o recebimento inicial no financeiro antes de ativar.");
      await assertActorAuthority(tx, input.workspaceId, input.actorUserId, "workspace.manage", enrollment.unitId);
    }
    // paymentVerified fornecido pelo cliente é ignorado; somente os fatos persistidos contam.
    assertValidEnrollmentTransition(enrollment.status, "ACTIVE");
    if (enrollment.status === "ACTIVE") return enrollment;
    if (enrollment.supersedesEnrollmentId) {
      const previous = await assertGymRevisionPredecessor(tx, enrollment);
      if (!previous || (enrollment.changeKind === "PLAN_CHANGE" && !enrollment.changeApprovedByUserId)) throw new WorkspaceAccessError(409, "INVALID_TRANSITION", "Revisão sem contrato anterior ou aprovação válida.");
      await tx.gymEnrollment.update({ where: { id: previous.id }, data: { status: "CANCELLED", accessGranted: false, autoRenew: false, subscriptionStatus: "CANCELLED", cancelledAt: now, cancellationReason: `Substituído pelo contrato ${enrollment.id}` } });
      await tx.gymEnrollmentEvent.create({ data: { enrollmentId: previous.id, workspaceId: input.workspaceId, fromStatus: previous.status, toStatus: "CANCELLED", actorId: input.actorUserId, reason: `CONTRACT_SUPERSEDED:${enrollment.id}:recebiveisAnterioresPreservados`, effectiveDate: now } });
      await tx.auditLog.create({ data: { userId: input.actorUserId, action: `GYM_CONTRACT_SUPERSEDED:${previous.id}:successor=${enrollment.id}`, entity: "GYM_ENROLLMENT", entityId: previous.id } });
    }
    const updated = await tx.gymEnrollment.update({ where: { id: enrollment.id }, data: { status: "ACTIVE", accessGranted: true, activatedAt: now, ...(enrollment.supersedesEnrollmentId ? { subscriptionStatus: "ACTIVE" } : {}) }, omit: { creditCardToken: true }, include: { acceptance: true, planVersion: { include: { plan: true } }, studentMember: { include: { user: { select: gymPublicUserSelect } } } } });
    await tx.gymEnrollmentEvent.create({ data: { enrollmentId: enrollment.id, workspaceId: input.workspaceId, fromStatus: enrollment.status, toStatus: "ACTIVE", actorId: input.actorUserId, reason: paymentSatisfied ? `Recebimento confirmado da fatura ${firstInvoice?.id}` : `Liberação autorizada: ${input.overrideReason?.trim()}` } });
    await tx.auditLog.create({ data: { userId: input.actorUserId, action: `GYM_ENROLLMENT_ACTIVATED:${enrollment.id}`, entity: "GYM_ENROLLMENT", entityId: enrollment.id, severity: paymentSatisfied ? "info" : "warning" } });
    return updated;
  });
}
