import prisma from "@/lib/prisma";
import { createHash } from "node:crypto";
import { z } from "zod";
import { WorkspaceAccessError } from "../domain/types";
import { serializableTransaction, type GymTransactionClient } from "./transaction";
import { validateGymMinorEligibility } from "@/lib/privacy/age-validator";
import { permitsOwnAccount } from "@/lib/auth/account-eligibility";
import { hasVerifiedGuardianIdentity } from "./guardian-identity";
import { hasStudentMembership } from "../domain/student-membership";
import type { AcceptContractInput } from "./enrollment-service";
import { lockGymEnrollment } from "./enrollment-lock";
import { generateLocalCycleInvoice } from "./manual-subscription-service";
import { assertGymRevisionPredecessor } from "./enrollment-revision";

export const gymContractAcceptanceSchema = z.object({ workspaceId: z.string().trim().min(1).max(100), accepted: z.literal(true), contractDigest: z.string().regex(/^[a-f0-9]{64}$/) }).strict();

async function signingContext(tx: GymTransactionClient, workspaceId: string, enrollmentId: string, signerUserId: string) {
  const workspace = await tx.workspace.findUnique({ where: { id: workspaceId }, select: { type: true, isActive: true, name: true, subscription: { select: { status: true, endDate: true, trialEndsAt: true } } } });
  const enrollment = await tx.gymEnrollment.findFirst({ where: { id: enrollmentId, workspaceId }, select: {
    id: true, workspaceId: true, studentMemberId: true, planVersionId: true, unitId: true, status: true, startDate: true, endDate: true, priceInCents: true, enrollmentFeeInCents: true, autoRenew: true,
    supersedesEnrollmentId: true, changeKind: true, initialChargeInCents: true, changeReason: true,
    acceptance: { select: { id: true, signerUserId: true, representedUserId: true, representationRole: true, termsSnapshot: true, termsVersion: true, signedAt: true } },
    planVersion: { include: { plan: { select: { workspaceId: true, isActive: true } } } },
    studentMember: { select: { workspaceId: true, userId: true, unitId: true, isActive: true, role: true, studentProfile: { select: { memberId: true } }, roleGrants: { select: { role: true, revokedAt: true, unitId: true } }, user: { select: { name: true, birthDate: true } }, guardians: { where: { workspaceId, revokedAt: null, verifiedAt: { not: null }, isLegalRepresentative: true, guardianUserId: signerUserId }, select: { id: true, cpf: true, guardianUserId: true, verifiedAt: true, revokedAt: true, relationship: true } } } },
  } });
  if (!workspace || workspace.type !== "GYM" || !enrollment || enrollment.studentMember.workspaceId !== workspaceId || enrollment.planVersion.plan.workspaceId !== workspaceId) throw new WorkspaceAccessError(404, "ENROLLMENT_NOT_FOUND", "Matrícula não encontrada nesta academia.");
  if (!workspace.isActive || !enrollment.studentMember.isActive) throw new WorkspaceAccessError(403, "WORKSPACE_SUSPENDED", "Academia e vínculo do aluno devem estar ativos.");
  if (!hasStudentMembership(enrollment.studentMember)) throw new WorkspaceAccessError(403, "FORBIDDEN_RESOURCE", "O papel estudantil foi revogado.");
  const now = new Date(); const license = workspace.subscription;
  if (!license || (license.endDate && license.endDate <= now) || !(license.status === "ACTIVE" || (license.status === "TRIAL" && license.trialEndsAt && license.trialEndsAt > now))) throw new WorkspaceAccessError(403, "INVALID_STATUS", "Licença da academia inativa ou expirada.");
  for (const unitId of new Set([enrollment.unitId, enrollment.studentMember.unitId].filter((value): value is string => value !== null))) if (!await tx.gymUnit.findFirst({ where: { id: unitId, workspaceId, isActive: true }, select: { id: true } })) throw new WorkspaceAccessError(403, "TENANT_MISMATCH", "Unidade da matrícula ou do aluno inválida.");
  if (enrollment.unitId !== enrollment.studentMember.unitId) throw new WorkspaceAccessError(409, "INVALID_STATUS", "A unidade contratada e o vínculo do aluno exigem reconciliação.");
  const age = validateGymMinorEligibility(enrollment.studentMember.user.birthDate);
  if (!age.isValid) throw new WorkspaceAccessError(409, "INVALID_STATUS", "Regularize o nascimento do aluno antes do aceite.");
  let representationRole = "SELF"; let representedUserId: string | null = null;
  if (age.isMinor) {
    const guardian = enrollment.studentMember.guardians[0];
    if (!guardian || !await hasVerifiedGuardianIdentity(guardian, signerUserId, tx)) throw new WorkspaceAccessError(403, "GUARDIAN_NOT_AUTHORIZED", "O responsável deve ter identidade e representação legal verificadas para este aluno.");
    representationRole = guardian.relationship; representedUserId = enrollment.studentMember.userId;
  } else if (enrollment.studentMember.userId !== signerUserId || !await permitsOwnAccount(signerUserId, tx)) throw new WorkspaceAccessError(403, "SIGNER_NOT_AUTHORIZED", "O contrato deve ser confirmado pelo próprio aluno adulto.");
  return { workspace, enrollment, representationRole, representedUserId };
}

function snapshot(context: Awaited<ReturnType<typeof signingContext>>) {
  const { enrollment: e } = context; const p = e.planVersion;
  if (!p.termsText.trim() || e.priceInCents < BigInt(0) || e.enrollmentFeeInCents < BigInt(0) || (e.endDate && e.endDate <= e.startDate)) throw new WorkspaceAccessError(409, "INVALID_STATUS", "As condições do contrato exigem revisão.");
  // Text persisted at acceptance includes the conditions actually displayed.
  return [
    p.termsText,
    "CONDIÇÕES CONTRATADAS",
    `Matrícula: ${e.id}`, `Versão do plano: ${p.id} (${p.name}, v${p.version})`, `Versão dos termos: ${p.termsVersion}`,
    `Academia: ${e.workspaceId}`, `Unidade: ${e.unitId || "Não informada"}`,
    `Início: ${e.startDate.toISOString()}`, `Término: ${e.endDate?.toISOString() || "Sem término definido"}`,
    `Preço por ciclo (centavos BRL): ${e.priceInCents.toString()}`, `Taxa de matrícula (centavos BRL): ${e.enrollmentFeeInCents.toString()}`,
    `Periodicidade: ${p.billingCycle}`, `Renovação automática: ${e.autoRenew ? "Sim" : "Não"}`,
    ...(e.supersedesEnrollmentId ? [`Revisão do contrato: ${e.supersedesEnrollmentId}`, `Operação: ${e.changeKind}`, `Obrigação inicial aprovada (centavos BRL): ${e.initialChargeInCents?.toString()}`, `Justificativa: ${e.changeReason}`, "O contrato anterior será substituído somente na ativação desta revisão. Obrigações anteriores permanecem registradas."] : []),
  ].join("\n\n");
}
function digest(content: string) { return createHash("sha256").update(content).digest("hex"); }
function view(context: Awaited<ReturnType<typeof signingContext>>) {
  const e = context.enrollment; const content = e.acceptance?.termsSnapshot || snapshot(context);
  return { enrollmentId: e.id, workspaceId: e.workspaceId, workspaceName: context.workspace.name, studentName: e.studentMember.user.name || "Aluno", planName: e.planVersion.name, termsVersion: e.acceptance?.termsVersion || e.planVersion.termsVersion, content, contractDigest: digest(content), status: e.status, signedAt: e.acceptance?.signedAt || null, priceInCents: e.priceInCents.toString(), enrollmentFeeInCents: e.enrollmentFeeInCents.toString() };
}
export async function getGymContractForSigner(workspaceId: string, enrollmentId: string, signerUserId: string) { return view(await signingContext(prisma, workspaceId, enrollmentId, signerUserId)); }
export async function acceptGymContract(input: AcceptContractInput) {
  return serializableTransaction(async tx => {
    const revision = await tx.gymEnrollment.findFirst({ where: { id: input.enrollmentId, workspaceId: input.workspaceId }, select: { supersedesEnrollmentId: true } });
    if (revision?.supersedesEnrollmentId) await lockGymEnrollment(tx, input.workspaceId, revision.supersedesEnrollmentId);
    await lockGymEnrollment(tx, input.workspaceId, input.enrollmentId);
    const context = await signingContext(tx, input.workspaceId, input.enrollmentId, input.signerUserId);
    const parsed = gymContractAcceptanceSchema.safeParse({ workspaceId: input.workspaceId, accepted: input.accepted, contractDigest: input.contractDigest });
    if (!parsed.success) throw new WorkspaceAccessError(400, "INVALID_REQUEST", "Confirme explicitamente as condições exibidas.");
    const enrollment = context.enrollment;
    if (enrollment.acceptance) {
      if (enrollment.acceptance.signerUserId !== input.signerUserId || digest(enrollment.acceptance.termsSnapshot) !== parsed.data.contractDigest) throw new WorkspaceAccessError(409, "CONTRACT_ALREADY_ACCEPTED", "O contrato já foi confirmado por outro aceite.");
      return view(context);
    }
    if (enrollment.status !== "PENDING_ACCEPTANCE") throw new WorkspaceAccessError(409, "INVALID_TRANSITION", "A matrícula não aguarda aceite.");
    if (!enrollment.planVersion.isActive || !enrollment.planVersion.plan.isActive) throw new WorkspaceAccessError(409, "PLAN_INACTIVE", "O plano deixou de estar disponível para esta contratação.");
    await assertGymRevisionPredecessor(tx, enrollment);
    const termsSnapshot = snapshot(context);
    if (digest(termsSnapshot) !== parsed.data.contractDigest) throw new WorkspaceAccessError(409, "INVALID_STATUS", "As condições mudaram. Recarregue e confirme o contrato atual.");
    const now = new Date();
    await tx.gymContractAcceptance.create({ data: { enrollmentId: enrollment.id, workspaceId: input.workspaceId, signerUserId: input.signerUserId, representedUserId: context.representedUserId, representationRole: context.representationRole, termsSnapshot, termsVersion: enrollment.planVersion.termsVersion, signedAt: now, ipAddress: input.ipAddress?.slice(0, 80), userAgent: input.userAgent?.slice(0, 500) } });
    await tx.gymEnrollment.update({ where: { id: enrollment.id }, data: { status: "PENDING_ACTIVATION", accessGranted: false } });
    if (enrollment.supersedesEnrollmentId) {
      await tx.gymEnrollment.update({ where: { id: enrollment.id }, data: { nextDueDate: enrollment.startDate } });
      await generateLocalCycleInvoice(tx, { workspaceId: input.workspaceId, enrollmentId: enrollment.id, actorUserId: input.signerUserId, dueDate: enrollment.startDate }, true);
      // O aceite cria a obrigação aprovada; geração posterior aguarda a ativação.
      await tx.gymEnrollment.update({ where: { id: enrollment.id }, data: { subscriptionStatus: "INACTIVE" } });
    }
    await tx.gymEnrollmentEvent.create({ data: { enrollmentId: enrollment.id, workspaceId: input.workspaceId, fromStatus: "PENDING_ACCEPTANCE", toStatus: "PENDING_ACTIVATION", actorId: input.signerUserId, effectiveDate: now, reason: `GYM_CONTRACT_ACCEPTED:digest=${parsed.data.contractDigest}:representation=${context.representationRole}` } });
    await tx.auditLog.create({ data: { userId: input.signerUserId, action: `GYM_CONTRACT_ACCEPTED:${enrollment.id}:digest=${parsed.data.contractDigest}`, entity: "GYM_ENROLLMENT", entityId: enrollment.id } });
    return { ...view(context), status: "PENDING_ACTIVATION", signedAt: now };
  });
}
