import { z } from "zod";
import { WorkspaceAccessError } from "../domain/types";
import { cents, safeCentsNumber } from "../domain/money";
import { resolveAccessRoles } from "../domain/access-roles";
import { gymPublicUserSelect } from "../domain/public-user";
import { serializableTransaction } from "./transaction";
import { assertActorAuthority } from "./actor-authority";
import type { CreateEnrollmentInput } from "./enrollment-service";
import { isValidCpfCnpj } from "@/lib/cpf-validator";
import { assertSingleLiveGymEnrollment } from "./enrollment-uniqueness";

const id = z.string().trim().min(1).max(100);
const text = z.string().trim().max(150).nullable().optional();
const date = z.union([z.date(), z.string().date(), z.string().datetime({ offset: true })]).transform(value => new Date(value));
export const createGymEnrollmentSchema = z.object({
  workspaceId: id, studentMemberId: id, planVersionId: id, unitId: id.nullable().optional(),
  startDate: date.optional(), autoRenew: z.boolean().optional(),
  customPriceInCents: z.union([z.number().int().safe().nonnegative(), z.bigint().nonnegative(), z.string().regex(/^\d+$/)]).optional(),
  billingPayerUserId: id.nullable().optional(), billingPayerGuardianId: id.nullable().optional(),
  billingPayerName: text, billingPayerCpf: text,
  billingPayerEmail: z.string().trim().email().max(254).nullable().optional(), billingPayerPhone: z.string().trim().max(30).nullable().optional(),
}).strict();

export async function createGymEnrollment(input: CreateEnrollmentInput) {
  const { actorUserId, ...request } = input;
  const parsed = createGymEnrollmentSchema.safeParse(request);
  if (!parsed.success) throw new WorkspaceAccessError(400, "INVALID_REQUEST", "Revise aluno, plano, início e pagador.");
  const data = parsed.data;
  return serializableTransaction(async tx => {
    const student = await tx.workspaceMember.findFirst({ where: { id: data.studentMemberId, workspaceId: data.workspaceId }, include: { roleGrants: true, studentProfile: true, user: { select: gymPublicUserSelect } } });
    if (!student?.isActive || !resolveAccessRoles(student.role, student.roleGrants, student.unitId || undefined).includes("STUDENT") || student.studentProfile?.status === "CANCELLED") throw new WorkspaceAccessError(404, "STUDENT_NOT_FOUND", "Aluno ativo não encontrado nesta academia.");
    const unitId = data.unitId || student.unitId;
    await assertActorAuthority(tx, data.workspaceId, actorUserId, "enrollments.manage", unitId);
    await assertSingleLiveGymEnrollment(tx, { workspaceId: data.workspaceId, studentMemberId: student.id });
    const workspace = await tx.workspace.findUniqueOrThrow({ where: { id: data.workspaceId }, select: { type: true } });
    if (workspace.type !== "GYM") throw new WorkspaceAccessError(403, "FORBIDDEN_RESOURCE", "Esta matrícula pertence à operação GYM.");
    if (student.unitId && unitId !== student.unitId) throw new WorkspaceAccessError(409, "TENANT_MISMATCH", "A unidade deve corresponder ao vínculo atual do aluno.");
    const version = await tx.gymPlanVersion.findFirst({ where: { id: data.planVersionId, isActive: true, plan: { workspaceId: data.workspaceId, isActive: true } }, include: { plan: true } });
    if (!version) throw new WorkspaceAccessError(404, "PLAN_INACTIVE", "Plano ou versão indisponível para novas matrículas.");
    const price = data.customPriceInCents === undefined ? version.priceInCents : cents(data.customPriceInCents);
    if (price !== version.priceInCents) await assertActorAuthority(tx, data.workspaceId, actorUserId, "workspace.manage", unitId);
    safeCentsNumber(price); safeCentsNumber(version.enrollmentFeeInCents);
    if (price < BigInt(0) || version.enrollmentFeeInCents < BigInt(0) || !Number.isSafeInteger(version.durationDays) || version.durationDays < 1) throw new WorkspaceAccessError(409, "INVALID_AMOUNT", "Condições do plano inválidas.");
    const guardians = await tx.gymGuardian.findMany({ where: { workspaceId: data.workspaceId, studentMemberId: student.id, revokedAt: null } });
    if (student.isMinor && !guardians.some(guardian => guardian.isLegalRepresentative)) throw new WorkspaceAccessError(409, "GUARDIAN_NOT_AUTHORIZED", "Cadastre o representante legal antes da matrícula.");
    const guardian = data.billingPayerGuardianId ? guardians.find(item => item.id === data.billingPayerGuardianId && item.isFinancialResponsible) : undefined;
    if (data.billingPayerGuardianId && !guardian) throw new WorkspaceAccessError(403, "GUARDIAN_NOT_AUTHORIZED", "Responsável financeiro não pertence a este aluno.");
    if (data.billingPayerUserId && data.billingPayerUserId !== student.userId && (!guardian?.verifiedAt || guardian.guardianUserId !== data.billingPayerUserId)) throw new WorkspaceAccessError(403, "INVALID_PAYER", "Conta pagadora incompatível com este aluno.");
    if (data.billingPayerName && (!data.billingPayerCpf || !isValidCpfCnpj(data.billingPayerCpf))) throw new WorkspaceAccessError(400, "INVALID_PAYER", "Informe o documento válido do pagador identificado.");
    if (data.billingPayerCpf && !data.billingPayerName) throw new WorkspaceAccessError(400, "INVALID_PAYER", "Informe o nome do pagador.");
    const start = data.startDate || new Date();
    const end = new Date(start.getTime() + version.durationDays * 86400000);
    if (!Number.isFinite(end.getTime()) || !version.termsText.trim()) throw new WorkspaceAccessError(409, "INVALID_STATUS", "Vigência ou contrato inválido.");
    const enrollment = await tx.gymEnrollment.create({ data: {
      workspaceId: data.workspaceId, studentMemberId: student.id, planVersionId: version.id, unitId,
      status: "PENDING_ACCEPTANCE", startDate: start, endDate: end, autoRenew: data.autoRenew ?? true,
      priceInCents: price, enrollmentFeeInCents: version.enrollmentFeeInCents,
      billingPayerUserId: data.billingPayerUserId || null, billingPayerGuardianId: guardian?.id || null,
      billingPayerName: data.billingPayerName || null, billingPayerCpf: data.billingPayerCpf?.replace(/\D/g, "") || null,
      billingPayerEmail: data.billingPayerEmail || null, billingPayerPhone: data.billingPayerPhone || null,
      accessGranted: false, recurrenceMode: "LOCAL", subscriptionStatus: "INACTIVE",
    }, omit: { creditCardToken: true }, include: { planVersion: { include: { plan: true } }, studentMember: { include: { user: { select: gymPublicUserSelect } } } } });
    await tx.gymEnrollmentEvent.create({ data: { enrollmentId: enrollment.id, workspaceId: data.workspaceId, toStatus: "PENDING_ACCEPTANCE", reason: "Matrícula criada; aguardando aceite e ativação.", actorId: actorUserId } });
    await tx.auditLog.create({ data: { userId: actorUserId, action: `GYM_ENROLLMENT_CREATED:${enrollment.id}:planVersion=${version.id}:priceCents=${price}:catalogPriceCents=${version.priceInCents}`, entity: "GYM_ENROLLMENT", entityId: enrollment.id } });
    return enrollment;
  });
}
