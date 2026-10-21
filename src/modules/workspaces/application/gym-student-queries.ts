import { assertGymOperationalWorkspace } from "./gym-license";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { isValidCPF } from "@/lib/cpf-validator";
import { verifyAndDecayWorkspaceMemberStreak } from "@/lib/streak-helper";
import { resolveGymAccessRoles } from "../domain/access-roles";
import { resolveEffectiveCapabilities } from "../domain/roles";
import { WorkspaceAccessError, type WorkspaceContext } from "../domain/types";
import { assertActorAuthority } from "./actor-authority";
import { createGymIdentityLookup } from "./gym-identity-lookup";
import type { ListGymStudentsOptions } from "./gym-student-service";

const studentSelect = {
  id: true, userId: true, workspaceId: true, unitId: true, assignedStaffId: true, plan: true, modality: true, isActive: true, isMinor: true, createdAt: true,
  streak: true, bestStreak: true, progress: true, lastActive: true, canDoAnyWorkoutDay: true,
  billingControlType: true, billingPrice: true, billingPeriodicity: true, billingDueDay: true, billingPaymentMethod: true, billingIsActive: true,
  user: { select: { id: true, name: true, email: true, cpfCnpj: true, whatsapp: true, birthDate: true, gender: true, image: true, height: true, weight: true, objective: true } },
  unit: { select: { id: true, name: true, code: true } },
  assignedStaff: { select: { id: true, workspaceId: true, role: true, user: { select: { name: true } } } },
  studentProfile: { select: { id: true, registrationNumber: true, emergencyContactName: true, emergencyContactPhone: true, medicalClearance: true, medicalClearanceExpiresAt: true, notes: true, privacyRestrictedAt: true, enrolledAt: true, status: true } },
  guardians: { where: { revokedAt: null }, select: { id: true, name: true, relationship: true, phone: true, isLegalRepresentative: true, isFinancialResponsible: true, isEmergencyContact: true, hasHealthAccess: true, verifiedAt: true } },
} satisfies Prisma.WorkspaceMemberSelect;
type Student = Prisma.WorkspaceMemberGetPayload<{ select: typeof studentSelect }>;
const studentWhere: Prisma.WorkspaceMemberWhereInput = { OR: [{ studentProfile: { isNot: null } }, { role: "STUDENT", roleGrants: { none: {} } }, { roleGrants: { some: { role: "STUDENT", revokedAt: null } } }] };
async function readAuthority(workspaceId: string, context: WorkspaceContext, unitId?: string | null) {
  await assertGymOperationalWorkspace(workspaceId);
  const [workspace, user, actor] = await Promise.all([
    prisma.workspace.findUnique({ where: { id: workspaceId }, select: { type: true, isActive: true, ownerId: true } }),
    prisma.user.findUnique({ where: { id: context.userId }, select: { role: true } }),
    prisma.workspaceMember.findUnique({ where: { userId_workspaceId: { userId: context.userId, workspaceId } }, include: { roleGrants: true } }),
  ]);
  if (workspace?.type !== "GYM") throw new WorkspaceAccessError(404, "WORKSPACE_NOT_FOUND", "Academia não encontrada.");
  const administrator = user?.role === "SUPERADMIN";
  if (!workspace.isActive && !administrator) throw new WorkspaceAccessError(403, "WORKSPACE_SUSPENDED", "Academia suspensa.");
  if (!administrator && !actor?.isActive) throw new WorkspaceAccessError(403, "NOT_A_MEMBER", "Vínculo ativo obrigatório.");
  const all = administrator || workspace.ownerId === context.userId;
  if (unitId && !await prisma.gymUnit.findFirst({ where: { id: unitId, workspaceId, isActive: true }, select: { id: true } })) throw new WorkspaceAccessError(404, "UNIT_NOT_FOUND", "Unidade indisponível nesta academia.");
  const scopes: Prisma.WorkspaceMemberWhereInput[] = [];
  if (!all && actor) {
    const units = actor.roleGrants.length ? [...new Set(actor.roleGrants.filter(grant => !grant.revokedAt).map(grant => grant.unitId))] : [actor.unitId];
    for (const grantUnit of units) {
      if (unitId && grantUnit && grantUnit !== unitId) continue;
      if (grantUnit && !await prisma.gymUnit.findFirst({ where: { id: grantUnit, workspaceId, isActive: true }, select: { id: true } })) continue;
      const roles = resolveGymAccessRoles(actor, grantUnit || unitId);
      if (!resolveEffectiveCapabilities(roles).has("students.read")) continue;
      const restricted = roles.includes("TRAINER") && !roles.some(role => ["OWNER", "MANAGER", "RECEPTIONIST", "FINANCE", "ASSISTANT"].includes(role));
      scopes.push({ ...(grantUnit ? { unitId: grantUnit } : {}), ...(restricted ? { assignedStaffId: actor.id } : {}) });
    }
    if (!scopes.length) throw new WorkspaceAccessError(403, "INSUFFICIENT_PERMISSIONS", "Sem leitura de alunos na unidade selecionada.");
  }
  const where: Prisma.WorkspaceMemberWhereInput = { AND: [studentWhere, { workspaceId }, ...(unitId ? [{ unitId }] : []), ...(!all ? [{ OR: scopes }] : [])] };
  const canReadHealth = (student: Student) => {
    if (student.studentProfile?.privacyRestrictedAt) return false;
    if (all) return true;
    if (!actor) return false;
    const roles = resolveGymAccessRoles(actor, student.unitId);
    return resolveEffectiveCapabilities(roles).has("health.read.assigned") && (roles.some(role => role === "OWNER" || role === "MANAGER") || student.assignedStaffId === actor.id);
  };
  return { where, canReadHealth };
}
function dto(member: Student, health: boolean) {
  const profile = member.studentProfile;
  return {
    id: member.id, userId: member.userId, name: member.user.name || "Aluno", email: member.user.email, cpfCnpj: member.user.cpfCnpj,
    whatsapp: member.user.whatsapp, birthDate: member.user.birthDate, gender: member.user.gender, image: member.user.image,
    height: member.user.height ?? null, weight: member.user.weight ?? null, objective: member.user.objective || null,
    plan: member.plan, modality: member.modality, isActive: member.isActive, isMinor: member.isMinor, unitId: member.unitId, unit: member.unit,
    streak: member.streak ?? 0, bestStreak: member.bestStreak ?? 0, progress: member.progress ?? 0, lastActive: member.lastActive,
    canDoAnyWorkoutDay: member.canDoAnyWorkoutDay ?? false,
    billingControlType: member.billingControlType, billingPrice: member.billingPrice, billingPeriodicity: member.billingPeriodicity,
    billingDueDay: member.billingDueDay, billingPaymentMethod: member.billingPaymentMethod, billingIsActive: member.billingIsActive,
    assignedStaffId: member.assignedStaffId, assignedStaff: member.assignedStaff?.workspaceId === member.workspaceId ? { id: member.assignedStaff.id, name: member.assignedStaff.user.name || "Profissional", role: member.assignedStaff.role } : null,
    guardians: member.guardians, studentProfile: profile ? { id: profile.id, registrationNumber: profile.registrationNumber, emergencyContactName: profile.emergencyContactName, emergencyContactPhone: profile.emergencyContactPhone, enrolledAt: profile.enrolledAt, status: profile.status, ...(health ? { medicalClearance: profile.medicalClearance, medicalClearanceExpiresAt: profile.medicalClearanceExpiresAt, notes: profile.notes } : {}) } : null,
    canReadHealth: health, createdAt: member.createdAt,
  };
}
export async function listGymStudents(options: ListGymStudentsOptions) {
  const { workspaceId, actorContext, unitId, assignedStaffId, search, plan } = options;
  const page = options.page ?? 1; const limit = options.limit ?? 20; const status = options.status ?? "ACTIVE";
  if (!Number.isSafeInteger(page) || page < 1 || page > 10000 || !Number.isSafeInteger(limit) || limit < 1 || limit > 100 || !["ACTIVE", "INACTIVE", "ALL"].includes(status) || (search && search.length > 200)) throw new WorkspaceAccessError(400, "INVALID_REQUEST", "Paginação ou filtros inválidos.");
  const scope = await readAuthority(workspaceId, actorContext, unitId);
  const term = search?.trim(); const digits = term?.replace(/\D/g, "") || "";
  const filters: Prisma.WorkspaceMemberWhereInput = { ...(assignedStaffId ? { assignedStaffId } : {}), ...(plan && plan !== "ALL" ? { plan } : {}), ...(status !== "ALL" ? { isActive: status === "ACTIVE" } : {}) };
  if (term) filters.OR = [{ user: { name: { contains: term, mode: "insensitive" } } }, { user: { email: { contains: term, mode: "insensitive" } } }, { studentProfile: { registrationNumber: { contains: term, mode: "insensitive" } } }, ...(digits.length >= 3 ? [{ user: { cpfCnpj: { contains: digits } } }, { user: { whatsapp: { contains: digits } } }] : [])];
  const where: Prisma.WorkspaceMemberWhereInput = { AND: [scope.where, filters] };
  const [members, total] = await Promise.all([prisma.workspaceMember.findMany({ where, select: studentSelect, skip: (page - 1) * limit, take: limit, orderBy: [{ createdAt: "desc" }, { id: "desc" }] }), prisma.workspaceMember.count({ where })]);
  return { students: members.map(member => dto(member, scope.canReadHealth(member))), pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}
export async function getGymStudent(workspaceId: string, memberId: string, context: WorkspaceContext) {
  const scope = await readAuthority(workspaceId, context);
  const student = await prisma.workspaceMember.findFirst({
    where: {
      AND: [
        scope.where,
        {
          OR: [
            { id: memberId },
            { userId: memberId },
          ]
        }
      ]
    },
    select: studentSelect
  });
  if (!student) throw new WorkspaceAccessError(404, "STUDENT_NOT_FOUND", "Aluno indisponível nesta academia ou unidade.");
  const { streak: freshStreak, bestStreak: freshBestStreak } = await verifyAndDecayWorkspaceMemberStreak(student);
  const studentDto = dto(student, scope.canReadHealth(student));
  return {
    ...studentDto,
    streak: freshStreak,
    bestStreak: freshBestStreak,
  };
}
export async function checkGymStudentDuplicate(workspaceId: string, params: { cpf?: string | null; email?: string | null; phone?: string | null }, actorUserId?: string, unitId?: string) {
  if (!actorUserId) throw new WorkspaceAccessError(401, "UNAUTHORIZED", "Ator obrigatório.");
  const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { type: true } });
  if (workspace?.type !== "GYM") throw new WorkspaceAccessError(404, "WORKSPACE_NOT_FOUND", "Academia não encontrada.");
  await assertActorAuthority(prisma, workspaceId, actorUserId, "students.manage", unitId);
  const cleanCpf = params.cpf?.replace(/\D/g, ""); const normalizedEmail = params.email?.trim().toLowerCase();
  if ((cleanCpf && !isValidCPF(cleanCpf)) || (normalizedEmail && (normalizedEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)))) throw new WorkspaceAccessError(400, "INVALID_REQUEST", "Informe CPF ou e-mail completo e válido.");
  if (!cleanCpf && !normalizedEmail) throw new WorkspaceAccessError(400, "INVALID_REQUEST", "A busca global exige CPF ou e-mail completo; telefone não identifica a conta.");
  const matches = await prisma.user.findMany({ where: { OR: [...(cleanCpf ? [{ cpfCnpj: cleanCpf }] : []), ...(normalizedEmail ? [{ email: normalizedEmail }] : [])] }, select: { id: true, name: true, cpfCnpj: true, email: true }, take: 2 });
  if (!matches.length) return { status: "NOT_FOUND" as const };
  if (matches.length !== 1) throw new WorkspaceAccessError(409, "USER_ALREADY_MEMBER", "CPF e e-mail identificam contas diferentes. Confira os dados.");
  const user = matches[0];
  const membership = await prisma.workspaceMember.findUnique({ where: { userId_workspaceId: { userId: user.id, workspaceId } }, select: { id: true, role: true, isActive: true, unitId: true } });
  if (membership) await assertActorAuthority(prisma, workspaceId, actorUserId, "students.manage", membership.unitId);
  const [local, domain] = (user.email || "").split("@"); const maskedEmail = domain ? `${local.slice(0, 1)}***@${domain}` : null;
  // No global date of birth, phone, auth fields or lookup based on partial matches.
  const preview = { id: user.id, name: user.name, emailMasked: maskedEmail, cpfMasked: user.cpfCnpj ? `***.***.***-${user.cpfCnpj.slice(-2)}` : null };
  if (membership) return { status: "ALREADY_MEMBER" as const, memberId: membership.id, role: membership.role, isActive: membership.isActive, user: preview };
  if (!unitId) throw new WorkspaceAccessError(400, "UNIT_REQUIRED", "Selecione a unidade do vínculo.");
  const lookup = await createGymIdentityLookup(workspaceId, unitId, actorUserId, user.id);
  return { status: "EXISTING_USER_CAN_LINK" as const, user: { id: lookup, name: null, emailMasked: null, cpfMasked: null } };
}
