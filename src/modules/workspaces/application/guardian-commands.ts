import prisma from "@/lib/prisma";
import { z } from "zod";
import { isValidCPF } from "@/lib/cpf-validator";
import { validateAgeEligibility, validateGymMinorEligibility } from "@/lib/privacy/age-validator";
import { WorkspaceAccessError } from "../domain/types";
import { serializableTransaction, type GymTransactionClient } from "./transaction";
import { authorizeGymStudent } from "./student-authority";
import { gymRegistrationGuardianSchema } from "./gym-student-commands";
import type { AddGuardianInput, UpdateGuardianInput } from "./minor-service";

const id = z.string().trim().min(1).max(100);
const optionalUserId = id.nullable().optional();
const common = { workspaceId: id, actorUserId: id };
export const addGymGuardianSchema = gymRegistrationGuardianSchema.extend({ ...common, studentMemberId: id, guardianUserId: optionalUserId }).strict();
// Creation defaults must never fill omitted fields in a PATCH (including its second parse).
export const updateGymGuardianSchema = gymRegistrationGuardianSchema.omit({ cpf: true }).partial().extend({
  ...common, guardianId: id, guardianUserId: optionalUserId,
  relationship: gymRegistrationGuardianSchema.shape.relationship.removeDefault().optional(),
  isLegalRepresentative: gymRegistrationGuardianSchema.shape.isLegalRepresentative.removeDefault().optional(),
  isFinancialResponsible: gymRegistrationGuardianSchema.shape.isFinancialResponsible.removeDefault().optional(),
  isEmergencyContact: gymRegistrationGuardianSchema.shape.isEmergencyContact.removeDefault().optional(),
  hasHealthAccess: gymRegistrationGuardianSchema.shape.hasHealthAccess.removeDefault().optional(),
}).strict();
function parse<T>(schema: z.ZodType<T>, input: unknown): T { const result = schema.safeParse(input); if (!result.success) throw new WorkspaceAccessError(400, "INVALID_REQUEST", "Dados do responsável inválidos."); return result.data; }
async function identity(tx: GymTransactionClient, studentUserId: string, cpf: string, guardianUserId?: string | null) {
  if (!isValidCPF(cpf) || studentUserId === guardianUserId) throw new WorkspaceAccessError(400, "INVALID_REQUEST", "Identidade do responsável inválida.");
  if (!guardianUserId) return null;
  const user = await tx.user.findUnique({ where: { id: guardianUserId }, select: { id: true, cpfCnpj: true, birthDate: true } });
  if (!user || user.cpfCnpj?.replace(/\D/g, "") !== cpf || !validateAgeEligibility(user.birthDate).isValid) throw new WorkspaceAccessError(403, "GUARDIAN_NOT_AUTHORIZED", "A conta do responsável deve corresponder ao CPF e comprovar maioridade no perfil.");
  return user.id;
}
async function resource(tx: GymTransactionClient, workspaceId: string, guardianId: string, actorUserId: string) {
  const guardian = await tx.gymGuardian.findFirst({ where: { id: guardianId, workspaceId, revokedAt: null } });
  if (!guardian) throw new WorkspaceAccessError(404, "RESOURCE_NOT_FOUND", "Responsável não encontrado ou revogado.");
  const student = await authorizeGymStudent(workspaceId, guardian.studentMemberId, actorUserId, "students.manage", {}, tx);
  return { guardian, student };
}
function dto(guardian: { id: string; name: string; relationship: string; phone: string; email: string | null; isLegalRepresentative: boolean; isFinancialResponsible: boolean; isEmergencyContact: boolean; hasHealthAccess: boolean; verifiedAt: Date | null; revokedAt: Date | null }) {
  return { id: guardian.id, name: guardian.name, relationship: guardian.relationship, phone: guardian.phone, email: guardian.email, isLegalRepresentative: guardian.isLegalRepresentative, isFinancialResponsible: guardian.isFinancialResponsible, isEmergencyContact: guardian.isEmergencyContact, hasHealthAccess: guardian.hasHealthAccess, verifiedAt: guardian.verifiedAt, revokedAt: guardian.revokedAt };
}
export async function addGymGuardian(input: AddGuardianInput) {
  const data = parse(addGymGuardianSchema, input);
  return serializableTransaction(async tx => {
    const student = await authorizeGymStudent(data.workspaceId, data.studentMemberId, data.actorUserId, "students.manage", {}, tx);
    const user = await tx.user.findUniqueOrThrow({ where: { id: student.userId }, select: { cpfCnpj: true, birthDate: true } });
    const age = validateGymMinorEligibility(user.birthDate);
    if (!age.isValid || user.cpfCnpj?.replace(/\D/g, "") === data.cpf) throw new WorkspaceAccessError(400, "INVALID_REQUEST", "Confira o nascimento e documentos distintos do aluno e responsável.");
    if (data.hasHealthAccess) await authorizeGymStudent(data.workspaceId, data.studentMemberId, data.actorUserId, "health.manage.assigned", {}, tx);
    const guardianUserId = await identity(tx, student.userId, data.cpf, data.guardianUserId);
    if (await tx.gymGuardian.findFirst({ where: { workspaceId: data.workspaceId, studentMemberId: student.id, cpf: data.cpf, revokedAt: null }, select: { id: true } })) throw new WorkspaceAccessError(409, "INVALID_STATUS", "Responsável já cadastrado para este aluno. Edite o vínculo existente.");
    const { actorUserId, ...values } = data;
    const guardian = await tx.gymGuardian.create({ data: { ...values, guardianUserId, verifiedAt: null } });
    await tx.workspaceMember.update({ where: { id: student.id }, data: { isMinor: age.isMinor } });
    await tx.auditLog.create({ data: { userId: actorUserId, action: `GYM_GUARDIAN_ADDED:${guardian.id}:student=${student.id}:unverified`, entity: "WORKSPACE", entityId: data.workspaceId } });
    return dto(guardian);
  });
}
export async function updateGymGuardian(input: UpdateGuardianInput) {
  const data = parse(updateGymGuardianSchema, input);
  return serializableTransaction(async tx => {
    const { guardian, student } = await resource(tx, data.workspaceId, data.guardianId, data.actorUserId);
    const guardianUserId = data.guardianUserId !== undefined ? await identity(tx, student.userId, guardian.cpf, data.guardianUserId) : guardian.guardianUserId;
    if (data.hasHealthAccess === true && !guardian.hasHealthAccess) await authorizeGymStudent(data.workspaceId, student.id, data.actorUserId, "health.manage.assigned", {}, tx);
    const changed = (data.name !== undefined && data.name !== guardian.name) || (data.phone !== undefined && data.phone !== guardian.phone) || (data.email !== undefined && data.email !== guardian.email) || (data.relationship !== undefined && data.relationship !== guardian.relationship) || (data.guardianUserId !== undefined && guardianUserId !== guardian.guardianUserId) || (data.isLegalRepresentative !== undefined && data.isLegalRepresentative !== guardian.isLegalRepresentative) || (data.isFinancialResponsible !== undefined && data.isFinancialResponsible !== guardian.isFinancialResponsible) || (data.isEmergencyContact !== undefined && data.isEmergencyContact !== guardian.isEmergencyContact) || (data.hasHealthAccess !== undefined && data.hasHealthAccess !== guardian.hasHealthAccess);
    const { workspaceId, actorUserId, guardianId, ...values } = data;
    const updated = await tx.gymGuardian.update({ where: { id: guardianId }, data: { ...values, guardianUserId, ...(changed ? { verifiedAt: null, verificationNotes: null } : {}) } });
    await tx.auditLog.create({ data: { userId: actorUserId, action: `GYM_GUARDIAN_UPDATED:${guardianId}:verificationInvalidated=${changed}`, entity: "WORKSPACE", entityId: workspaceId } });
    return dto(updated);
  });
}
export async function verifyGymGuardian(workspaceId: string, guardianId: string, actorUserId: string, notes?: string) {
  const data = parse(z.object({ ...common, guardianId: id, notes: z.string().trim().min(10).max(2000) }).strict(), { workspaceId, guardianId, actorUserId, notes });
  return serializableTransaction(async tx => {
    const { guardian, student } = await resource(tx, workspaceId, guardianId, actorUserId);
    await identity(tx, student.userId, guardian.cpf, guardian.guardianUserId);
    const updated = await tx.gymGuardian.update({ where: { id: guardian.id }, data: { verifiedAt: new Date(), verificationNotes: data.notes } });
    await tx.auditLog.create({ data: { userId: actorUserId, action: `GYM_GUARDIAN_VERIFIED:${guardian.id}:student=${student.id}:accountLinked=${Boolean(guardian.guardianUserId)}`, entity: "WORKSPACE", entityId: workspaceId } });
    return dto(updated);
  });
}
export async function revokeGymGuardian(workspaceId: string, guardianId: string, actorUserId: string, reason?: string) {
  const data = parse(z.object({ ...common, guardianId: id, reason: z.string().trim().min(3).max(1000) }).strict(), { workspaceId, guardianId, actorUserId, reason });
  return serializableTransaction(async tx => {
    const { guardian, student } = await resource(tx, workspaceId, guardianId, actorUserId);
    const updated = await tx.gymGuardian.update({ where: { id: guardian.id }, data: { revokedAt: new Date() } });
    const remainingGuardiansCount = await tx.gymGuardian.count({ where: { workspaceId, studentMemberId: student.id, revokedAt: null, isLegalRepresentative: true } });
    // Do not invent contract cancellation or physical purge here. Portal authority
    // checks revokedAt live; losing the last legal representative is auditable.
    await tx.auditLog.create({ data: { userId: actorUserId, action: `GYM_GUARDIAN_REVOKED:${guardian.id}:remainingLegal=${remainingGuardiansCount}:reason=${data.reason}`, entity: "WORKSPACE", entityId: workspaceId, severity: student.isMinor && remainingGuardiansCount === 0 ? "high" : "info" } });
    return { res: dto(updated), remainingGuardiansCount };
  });
}
export async function listGymStudentGuardians(workspaceId: string, studentMemberId: string, actorUserId?: string) {
  if (!actorUserId) throw new WorkspaceAccessError(401, "UNAUTHORIZED", "Ator obrigatório.");
  await authorizeGymStudent(workspaceId, studentMemberId, actorUserId, "students.read");
  const guardians = await prisma.gymGuardian.findMany({ where: { workspaceId, studentMemberId, revokedAt: null }, select: { id: true, name: true, relationship: true, phone: true, email: true, isLegalRepresentative: true, isFinancialResponsible: true, isEmergencyContact: true, hasHealthAccess: true, verifiedAt: true, revokedAt: true }, orderBy: [{ isLegalRepresentative: "desc" }, { createdAt: "asc" }], take: 50 });
  return guardians.map(dto);
}
