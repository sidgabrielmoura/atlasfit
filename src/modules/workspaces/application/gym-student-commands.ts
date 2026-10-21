import { createHash, randomUUID } from "node:crypto";
import { consumeGymIdentityLink } from "./gym-identity-link";
import { applyGymMajorityTransition } from "./gym-majority-transition";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { isValidCPF } from "@/lib/cpf-validator";
import { parseBirthDate } from "@/lib/privacy/civil-age";
import { validateGymMinorEligibility } from "@/lib/privacy/age-validator";
import { newSetupTokenExpiry } from "@/lib/auth/setup-token-policy";
import { WorkspaceAccessError } from "../domain/types";
import { resolveAccessRoles, resolveGymAccessRoles, hasHistoricalGymOwnership } from "../domain/access-roles";
import { authorizeGymStudent } from "./student-authority";
import { assertActorAuthority } from "./actor-authority";
import { serializableTransaction, type GymTransactionClient } from "./transaction";
import type { RegisterGymStudentInput, UpdateGymStudentInput } from "./gym-student-service";

const id = z.string().trim().min(1).max(100);
const optionalId = z.string().trim().max(100).nullable().optional().transform(value => value === undefined ? undefined : value || null);
const optionalText = (max: number) => z.string().trim().max(max).nullable().optional();
const phone = z.string().trim().max(30).transform(value => value.replace(/\D/g, "")).refine(value => /^\d{10,13}$/.test(value), "Telefone inválido.");
const optionalPhone = z.union([phone, z.literal(""), z.null()]).optional().transform(value => value === undefined ? undefined : value || null);
const email = z.union([z.string().trim().email().max(254), z.literal(""), z.null()]).optional().transform(value => value === undefined ? undefined : value?.toLowerCase() || null);
const cpf = z.union([z.string().max(18).transform(value => value.replace(/\D/g, "")).refine(isValidCPF), z.literal(""), z.null()]).optional().transform(value => value === undefined ? undefined : value || null);
const date = z.union([z.string(), z.date()]).refine(value => parseBirthDate(value) !== null, "Data inválida.").transform(value => parseBirthDate(value));
const nullableDate = z.union([date, z.null(), z.literal("")]).optional().transform(value => value === undefined ? undefined : value || null);
export const gymRegistrationGuardianSchema = z.object({
  name: z.string().trim().min(2).max(150), cpf: z.string().max(18).transform(value => value.replace(/\D/g, "")).refine(isValidCPF),
  phone, email, relationship: z.enum(["PAI", "MAE", "TUTOR_LEGAL", "OUTRO"]).default("PAI"),
  isLegalRepresentative: z.boolean().default(true), isFinancialResponsible: z.boolean().default(true), isEmergencyContact: z.boolean().default(true), hasHealthAccess: z.boolean().default(false),
}).strict();
const localFields = {
  assignedStaffId: optionalId, plan: z.string().trim().min(1).max(100).optional(), modality: z.enum(["PRESENCIAL", "ONLINE", "HIBRIDO"]).optional(),
  registrationNumber: optionalText(100), emergencyContactName: optionalText(150), emergencyContactPhone: optionalPhone,
  medicalClearance: z.boolean().optional(), medicalClearanceExpiresAt: nullableDate, notes: optionalText(2000),
  canDoAnyWorkoutDay: z.boolean().optional(),
};
export const gymStudentRegistrationSchema = z.object({
  workspaceId: id, unitId: optionalId, existingUserId: optionalId, identityLinkProofId: optionalId, name: z.string().trim().min(2).max(150).optional(), email, cpfCnpj: cpf, whatsapp: optionalPhone,
  birthDate: nullableDate, gender: optionalText(30), ...localFields, guardian: gymRegistrationGuardianSchema.nullable().optional(),
  idempotencyKey: z.string().regex(/^[\w:.-]{8,128}$/),
}).strict();
export const gymStudentUpdateSchema = z.object({
  workspaceId: id, unitId: z.string().trim().min(1).max(100).optional(),
  name: z.string().trim().min(2).max(150).optional(), whatsapp: optionalPhone, birthDate: nullableDate, ...localFields,
  isActive: z.boolean().optional(), status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED", "CANCELLED"]).optional(),
}).strict();
function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) throw new WorkspaceAccessError(400, "INVALID_REQUEST", "Confira os dados do cadastro, documentos, datas e responsável.");
  return result.data;
}
function invalid(message: string): never { throw new WorkspaceAccessError(400, "INVALID_REQUEST", message); }
export async function assertGymStudentCapacity(tx: GymTransactionClient, workspaceId: string, increment: number) {
  const workspace = await tx.workspace.findUnique({ where: { id: workspaceId }, include: { subscription: true } });
  if (workspace?.type !== "GYM") throw new WorkspaceAccessError(404, "WORKSPACE_NOT_FOUND", "Academia não encontrada.");
  if (!workspace.isActive) throw new WorkspaceAccessError(403, "WORKSPACE_SUSPENDED", "Academia suspensa.");
  const license = workspace.subscription; const now = new Date();
  if (!license || (license.endDate && license.endDate <= now) || !(license.status === "ACTIVE" || (license.status === "TRIAL" && license.trialEndsAt && license.trialEndsAt > now))) throw new WorkspaceAccessError(403, "INVALID_STATUS", "Licença da academia inativa ou expirada.");
  const count = await tx.workspaceMember.count({ where: { workspaceId, isActive: true, OR: [{ studentProfile: { isNot: null } }, { roleGrants: { some: { role: "STUDENT", revokedAt: null } } }, { role: "STUDENT", roleGrants: { none: {} } }] } });
  if (increment > 0 && count + increment > license.maxStudents) throw new WorkspaceAccessError(409, "STUDENT_LIMIT_REACHED", "Limite de alunos ativos da academia atingido.");
}
async function targetUnit(tx: GymTransactionClient, workspaceId: string, unitId?: string | null) {
  const units = await tx.gymUnit.findMany({ where: { workspaceId, isActive: true, ...(unitId ? { id: unitId } : {}) }, select: { id: true }, take: 2 });
  if (!units.length) throw new WorkspaceAccessError(404, "UNIT_NOT_FOUND", "Unidade ativa não encontrada.");
  if (units.length !== 1) throw new WorkspaceAccessError(400, "UNIT_REQUIRED", "Selecione a unidade do cadastro.");
  return units[0].id;
}
async function staff(tx: GymTransactionClient, workspaceId: string, memberId: string | null | undefined, unitId: string) {
  if (!memberId) return;
  const member = await tx.workspaceMember.findFirst({ where: { id: memberId, workspaceId, isActive: true }, include: { roleGrants: true, workspace: { select: { ownerId: true } } } });
  const roles = member ? resolveGymAccessRoles(member, unitId) : [];
  if (!member || !(member.userId === member.workspace.ownerId || roles.some(role => ["OWNER", "MANAGER", "TRAINER"].includes(role)))) throw new WorkspaceAccessError(404, "STAFF_NOT_FOUND", "Selecione um profissional elegível desta academia e unidade.");
}
async function health(tx: GymTransactionClient, workspaceId: string, actorUserId: string, unitId: string, assignedStaffId: string | null | undefined, input: { medicalClearance?: boolean; medicalClearanceExpiresAt?: Date | null; notes?: string | null }) {
  if (!(input.medicalClearance === true || input.medicalClearanceExpiresAt || input.notes?.trim())) return;
  await assertActorAuthority(tx, workspaceId, actorUserId, "health.manage.assigned", unitId);
  const [actor, workspace, user] = await Promise.all([tx.workspaceMember.findUnique({ where: { userId_workspaceId: { userId: actorUserId, workspaceId } }, include: { roleGrants: true } }), tx.workspace.findUnique({ where: { id: workspaceId }, select: { ownerId: true } }), tx.user.findUnique({ where: { id: actorUserId }, select: { role: true } })]);
  const roles = actor ? resolveGymAccessRoles(actor, unitId) : [];
  if (user?.role !== "SUPERADMIN" && workspace?.ownerId !== actorUserId && !roles.some(role => ["OWNER", "MANAGER"].includes(role)) && actor?.id !== assignedStaffId) throw new WorkspaceAccessError(403, "FORBIDDEN_RESOURCE", "Saúde exige profissional atribuído ou gestão da unidade.");
}
async function registration(tx: GymTransactionClient, workspaceId: string, value?: string | null, exceptMemberId?: string) {
  const number = value?.trim() || `MAT-${randomUUID()}`;
  const duplicate = await tx.gymStudentProfile.findFirst({ where: { registrationNumber: number, member: { workspaceId, ...(exceptMemberId ? { id: { not: exceptMemberId } } : {}) } }, select: { id: true } });
  if (duplicate) throw new WorkspaceAccessError(409, "DUPLICATE_REGISTRATION_NUMBER", "Matrícula administrativa já utilizada nesta academia.");
  return number;
}
function result(member: { id: string; userId: string; unitId: string | null; assignedStaffId: string | null; plan: string }, profile: { registrationNumber: string | null }, name: string | null) {
  return { memberId: member.id, userId: member.userId, name: name || "Aluno", registrationNumber: profile.registrationNumber, unitId: member.unitId, assignedStaffId: member.assignedStaffId, plan: member.plan };
}
async function command<T>(operation: (tx: GymTransactionClient) => Promise<T>) {
  try { return await serializableTransaction(operation); }
  catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") throw error;
    try { return await serializableTransaction(operation); }
    catch (repeat) { if (repeat instanceof Prisma.PrismaClientKnownRequestError && repeat.code === "P2002") throw new WorkspaceAccessError(409, "USER_ALREADY_MEMBER", "Documento, e-mail ou matrícula já utilizado. Recarregue o cadastro."); throw repeat; }
  }
}

export async function registerGymStudent(input: RegisterGymStudentInput) {
  return command(tx => registerGymStudentInTransaction(tx, input));
}

/** Allows CRM to commit the lead, student and draft contract as one operation. */
export async function registerGymStudentInTransaction(tx: GymTransactionClient, input: RegisterGymStudentInput) {
  const { actorUserId, ...request } = input;
  const data = parse(gymStudentRegistrationSchema, request);
  if (!actorUserId) throw new WorkspaceAccessError(401, "UNAUTHORIZED", "Ator obrigatório.");
  const key = `GYM:${data.workspaceId}:student:${createHash("sha256").update(data.idempotencyKey).digest("hex")}`;
  const { existingUserId: _existingUserId, idempotencyKey: _requestKey, ...conditions } = data;
  const fingerprint = createHash("sha256").update(JSON.stringify({ ...conditions, actorUserId })).digest("hex");
    const unitId = await targetUnit(tx, data.workspaceId, data.unitId);
    await assertActorAuthority(tx, data.workspaceId, actorUserId, "students.manage", unitId);
    const previous = await tx.gymStudentProfile.findUnique({ where: { registrationRequestKey: key }, include: { member: { include: { user: { select: { name: true } } } } } });
    if (previous) {
      if (previous.registrationRequestFingerprint !== fingerprint || previous.member.workspaceId !== data.workspaceId || (data.existingUserId && data.existingUserId !== previous.member.userId)) throw new WorkspaceAccessError(409, "IDEMPOTENCY_CONFLICT", "Esta operação já foi utilizada com outros dados.");
      return result(previous.member, previous, previous.member.user.name);
    }
    await assertGymStudentCapacity(tx, data.workspaceId, 1);
    await staff(tx, data.workspaceId, data.assignedStaffId, unitId);
    await health(tx, data.workspaceId, actorUserId, unitId, data.assignedStaffId, data);
    const existing = data.existingUserId ? await tx.user.findUnique({ where: { id: data.existingUserId }, select: { id: true, name: true, email: true, cpfCnpj: true, birthDate: true } }) : null;
    if (data.existingUserId && !existing) throw new WorkspaceAccessError(404, "USER_NOT_FOUND", "Conta não encontrada.");
    if (existing) {
      await consumeGymIdentityLink(tx, data.identityLinkProofId, data.workspaceId, unitId, existing.id, actorUserId);
      // Assisted linking requires the supplied identifiers to identify the selected account.
      // An arbitrary ID and a phone substring do not establish the student's identity.
      if (!((existing.email && data.email === existing.email.toLowerCase()) || (existing.cpfCnpj && data.cpfCnpj === existing.cpfCnpj.replace(/\D/g, "")))) throw new WorkspaceAccessError(403, "FORBIDDEN_RESOURCE", "Confirme o e-mail ou CPF completo da conta selecionada.");
      if ((data.email && data.email !== existing.email?.toLowerCase()) || (data.cpfCnpj && data.cpfCnpj !== existing.cpfCnpj?.replace(/\D/g, ""))) invalid("Os documentos informados não correspondem à conta selecionada.");
      if (data.birthDate && existing.birthDate && data.birthDate.getTime() !== parseBirthDate(existing.birthDate)?.getTime()) invalid("Nascimento diverge da identidade da conta. A academia não altera a identidade global.");
      if (!existing.birthDate) invalid("A conta existente precisa completar seu nascimento no perfil antes do vínculo.");
    }
    const birthDate = existing?.birthDate ? parseBirthDate(existing.birthDate) : data.birthDate;
    if (!birthDate) invalid("Data de nascimento válida é obrigatória.");
    const age = validateGymMinorEligibility(birthDate);
    if (!age.isValid) invalid(age.error || "Idade inválida.");
    if (age.isMinor && (!data.guardian || !data.guardian.isLegalRepresentative)) invalid("Informe um responsável legal completo para o aluno menor.");
    if (data.guardian?.cpf && data.guardian.cpf === (existing?.cpfCnpj?.replace(/\D/g, "") || data.cpfCnpj)) invalid("Aluno e responsável não podem ter o mesmo CPF.");
    if (!existing && (!data.name || data.name.length < 2)) invalid("Nome completo obrigatório.");
    if (!existing && (data.email || data.cpfCnpj) && await tx.user.findFirst({ where: { OR: [...(data.email ? [{ email: data.email }] : []), ...(data.cpfCnpj ? [{ cpfCnpj: data.cpfCnpj }] : [])] }, select: { id: true } })) throw new WorkspaceAccessError(409, "USER_ALREADY_MEMBER", "Já existe uma conta com o documento ou e-mail. Confira a identificação antes de vincular.");
    const oldMember = existing ? await tx.workspaceMember.findUnique({ where: { userId_workspaceId: { userId: existing.id, workspaceId: data.workspaceId } }, include: { studentProfile: true, roleGrants: true } }) : null;
    if (oldMember && (!oldMember.isActive || oldMember.studentProfile || resolveAccessRoles(oldMember.role, oldMember.roleGrants, unitId).includes("STUDENT"))) throw new WorkspaceAccessError(409, "ALREADY_STUDENT_MEMBER", "Vínculo já existente; utilize a ficha para administrar sua situação.");
    if (oldMember && oldMember.unitId !== unitId) invalid("Papéis acumulados devem preservar a unidade do vínculo existente.");
    const user = existing || await tx.user.create({ data: { name: data.name, email: data.email, cpfCnpj: data.cpfCnpj, whatsapp: data.whatsapp, birthDate, gender: data.gender, role: "USER", setupToken: age.isMinor ? null : randomUUID(), setupTokenExpiresAt: age.isMinor ? null : newSetupTokenExpiry() }, select: { id: true, name: true } });
    const member = oldMember || await tx.workspaceMember.create({ data: { workspaceId: data.workspaceId, userId: user.id, role: "STUDENT", unitId, assignedStaffId: data.assignedStaffId, isMinor: age.isMinor, plan: data.plan || "Mensal", modality: data.modality || "PRESENCIAL" } });
    if (oldMember && !oldMember.roleGrants.length) await tx.workspaceRoleGrant.create({ data: { memberId: member.id, role: oldMember.role, unitId: oldMember.unitId, grantedBy: actorUserId } });
    await tx.workspaceRoleGrant.create({ data: { memberId: member.id, role: "STUDENT", unitId, grantedBy: actorUserId } });
    if (oldMember) await tx.workspaceMember.update({ where: { id: member.id }, data: { isMinor: age.isMinor } });
    const number = await registration(tx, data.workspaceId, data.registrationNumber);
    const profile = await tx.gymStudentProfile.create({ data: { memberId: member.id, registrationNumber: number, registrationRequestKey: key, registrationRequestFingerprint: fingerprint, emergencyContactName: data.emergencyContactName || (data.guardian?.isEmergencyContact ? data.guardian.name : null), emergencyContactPhone: data.emergencyContactPhone || (data.guardian?.isEmergencyContact ? data.guardian.phone : null), medicalClearance: data.medicalClearance || false, medicalClearanceExpiresAt: data.medicalClearanceExpiresAt, notes: data.notes, status: "ACTIVE" } });
    if (age.isMinor && data.guardian) await tx.gymGuardian.create({ data: { ...data.guardian, workspaceId: data.workspaceId, studentMemberId: member.id, guardianUserId: null, verifiedAt: null, hasHealthAccess: false } });
    await tx.auditLog.create({ data: { userId: actorUserId, action: `GYM_STUDENT_REGISTERED:${member.id}:unit=${unitId}:minor=${age.isMinor}:assisted=${Boolean(existing)}`, entity: "WORKSPACE", entityId: data.workspaceId } });
    return result(member, profile, user.name);
}

export async function updateGymStudent(input: UpdateGymStudentInput) {
  const { memberId, actorContext, ...request } = input;
  const data = parse(gymStudentUpdateSchema, request);
  return command(async tx => {
    const member = await tx.workspaceMember.findFirst({ where: { workspaceId: data.workspaceId, OR: [{ id: memberId }, { userId: memberId }] }, include: { roleGrants: true, studentProfile: true, user: { select: { name: true, whatsapp: true, birthDate: true } } } });
    if (!member || !(member.studentProfile || resolveAccessRoles(member.role, member.roleGrants, member.unitId || undefined).includes("STUDENT"))) throw new WorkspaceAccessError(404, "STUDENT_NOT_FOUND", "Aluno não encontrado nesta academia.");
    await assertActorAuthority(tx, data.workspaceId, actorContext.userId, "students.manage", member.unitId);
    const unitId = data.unitId || member.unitId;
    if (!unitId) invalid("Defina a unidade antes de editar o cadastro legado.");
    await assertActorAuthority(tx, data.workspaceId, actorContext.userId, "students.manage", unitId);
    if (request.birthDate !== undefined && data.birthDate?.getTime() !== parseBirthDate(member.user.birthDate)?.getTime()) invalid("Nascimento pertence à conta global. Edite apenas os dados locais da academia.");
    if (data.plan !== undefined && data.plan !== member.plan) invalid("Troca de plano deve ser feita na matrícula contratual.");
    const userUpdate: { name?: string; whatsapp?: string | null } = {};
    if (data.name !== undefined && data.name.trim() !== "" && data.name !== member.user.name) {
      userUpdate.name = data.name.trim();
    }
    if (request.whatsapp !== undefined) {
      const cleanWhatsapp = data.whatsapp || null;
      if (cleanWhatsapp !== (member.user.whatsapp?.replace(/\D/g, "") || null)) {
        userUpdate.whatsapp = cleanWhatsapp;
      }
    }
    if (Object.keys(userUpdate).length > 0) {
      await tx.user.update({
        where: { id: member.userId },
        data: userUpdate,
      });
    }
    const active = data.isActive ?? member.isActive;
    const roles = resolveAccessRoles(member.role, member.roleGrants, member.unitId || undefined);
    const workspace = await tx.workspace.findUniqueOrThrow({ where: { id: data.workspaceId }, select: { ownerId: true } });
    const holdsAuthority = workspace.ownerId === member.userId || hasHistoricalGymOwnership(member) || member.roleGrants.some(grant => !grant.revokedAt && grant.role !== "STUDENT") || roles.some(role => role !== "STUDENT");
    if (active !== member.isActive && holdsAuthority) throw new WorkspaceAccessError(409, "INVALID_TRANSITION", "Este vínculo acumula papéis de equipe. Utilize o desligamento coordenado para alterar seu acesso.");
    const birthDate = parseBirthDate(member.user.birthDate);
    const age = birthDate ? validateGymMinorEligibility(birthDate) : null;
    if (member.isMinor && age?.isValid && !age.isMinor) await applyGymMajorityTransition(tx, data.workspaceId, member.id, actorContext.userId);
    if (active && !age?.isValid) invalid("A conta precisa completar um nascimento válido antes de ativar ou editar seu cadastro.");
    const isMinor = age?.isValid ? age.isMinor : member.isMinor;
    const status = data.status ?? (active ? member.studentProfile?.status || "ACTIVE" : "INACTIVE");
    if ((active && status !== "ACTIVE") || (!active && status === "ACTIVE")) invalid("Situação do cadastro e vínculo precisam ser coerentes.");
    if (isMinor && active && !await tx.gymGuardian.findFirst({ where: { workspaceId: data.workspaceId, studentMemberId: member.id, revokedAt: null, isLegalRepresentative: true }, select: { id: true } })) invalid("Aluno menor precisa de responsável legal ativo.");
    if (!member.isActive && active) await assertGymStudentCapacity(tx, data.workspaceId, 1);
    await staff(tx, data.workspaceId, data.assignedStaffId, unitId);
    if (request.medicalClearance !== undefined || request.medicalClearanceExpiresAt !== undefined || request.notes !== undefined) {
      const changed = (request.medicalClearance !== undefined && data.medicalClearance !== member.studentProfile?.medicalClearance) || (request.medicalClearanceExpiresAt !== undefined && data.medicalClearanceExpiresAt?.getTime() !== member.studentProfile?.medicalClearanceExpiresAt?.getTime()) || (request.notes !== undefined && (data.notes || null) !== (member.studentProfile?.notes || null));
      if (changed) await authorizeGymStudent(data.workspaceId, member.id, actorContext.userId, "health.manage.assigned", {}, tx);
    }
    const registrationNumber = request.registrationNumber !== undefined ? await registration(tx, data.workspaceId, data.registrationNumber, member.id) : member.studentProfile?.registrationNumber || await registration(tx, data.workspaceId);
    const profileData = { registrationNumber, emergencyContactName: request.emergencyContactName !== undefined ? data.emergencyContactName : undefined, emergencyContactPhone: request.emergencyContactPhone !== undefined ? data.emergencyContactPhone : undefined, medicalClearance: data.medicalClearance, medicalClearanceExpiresAt: request.medicalClearanceExpiresAt !== undefined ? data.medicalClearanceExpiresAt : undefined, notes: request.notes !== undefined ? data.notes : undefined, status };
    const updated = await tx.workspaceMember.update({ where: { id: member.id }, data: { assignedStaffId: request.assignedStaffId !== undefined ? data.assignedStaffId : undefined, modality: data.modality, isActive: active, isMinor, canDoAnyWorkoutDay: request.canDoAnyWorkoutDay !== undefined ? data.canDoAnyWorkoutDay : undefined } });
    const profile = await tx.gymStudentProfile.upsert({ where: { memberId: member.id }, create: { memberId: member.id, ...profileData }, update: profileData });
    await tx.auditLog.create({ data: { userId: actorContext.userId, action: `GYM_STUDENT_LOCAL_UPDATED:${member.id}:active=${active}:minor=${isMinor}`, entity: "WORKSPACE", entityId: data.workspaceId, metadata: { before: { isActive: member.isActive, isMinor: member.isMinor, assignedStaffId: member.assignedStaffId }, after: { isActive: updated.isActive, isMinor: updated.isMinor, assignedStaffId: updated.assignedStaffId } } } });
    return { member: { id: updated.id, unitId: updated.unitId, assignedStaffId: updated.assignedStaffId, isActive: updated.isActive, isMinor: updated.isMinor }, profile: { id: profile.id, registrationNumber: profile.registrationNumber, status: profile.status } };
  });
}
