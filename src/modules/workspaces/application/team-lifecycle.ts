import { serializableTransaction, type GymTransactionClient } from "./transaction";
import { assertActorAuthority } from "./actor-authority";
import { hasHistoricalGymOwnership, isGymProfessionalInUnit } from "../domain/access-roles";
import { assertGymStaffCapacity } from "./staff-capacity";
import { WorkspaceAccessError } from "../domain/types";
import type { WorkspaceRole } from "@prisma/client";
import type { OffboardStaffWithHandoverInput } from "./gym-offboarding-service";
import { z } from "zod";
import type { ReassignStudentsInput } from "./staff-service";
import { getGymUnitAccess } from "./gym-unit-access";

const editableRole = z.enum(["MANAGER", "RECEPTIONIST", "FINANCE", "TRAINER", "ASSISTANT", "STUDENT"]);

export function reassignGymStudents(input: ReassignStudentsInput) {
  const parsed = z.object({ workspaceId: z.string().min(1).max(100), fromStaffMemberId: z.string().min(1).max(100), toStaffMemberId: z.string().min(1).max(100).nullable().optional(), studentMemberIds: z.array(z.string().min(1).max(100)).min(1).max(500).optional(), actorUserId: z.string().min(1).max(100) }).strict().safeParse(input);
  if (!parsed.success) throw new WorkspaceAccessError(400, "INVALID_REQUEST", "Dados de repasse inválidos.");
  return serializableTransaction(async tx => {
    const values = parsed.data;
    const workspace = await tx.workspace.findUnique({ where: { id: values.workspaceId }, select: { type: true } });
    const source = await tx.workspaceMember.findFirst({ where: { id: values.fromStaffMemberId, workspaceId: values.workspaceId } });
    if (!workspace || workspace.type !== "GYM" || !source) throw new WorkspaceAccessError(404, "STAFF_NOT_FOUND", "Profissional de origem não encontrado nesta academia.");
    await assertActorAuthority(tx, values.workspaceId, values.actorUserId, "staff.manage", source.unitId);
    if (values.toStaffMemberId === source.id) throw new WorkspaceAccessError(400, "INVALID_REPLACEMENT", "Escolha um profissional diferente da origem.");
    const students = await tx.workspaceMember.findMany({ where: { workspaceId: values.workspaceId, assignedStaffId: source.id, isActive: true, ...(values.studentMemberIds ? { id: { in: values.studentMemberIds } } : {}) }, select: { id: true, unitId: true } });
    if (values.studentMemberIds && students.length !== new Set(values.studentMemberIds).size) throw new WorkspaceAccessError(404, "STUDENT_NOT_FOUND", "Todos os alunos devem estar ativos e atribuídos a este profissional na academia.");
    const units = [...new Set(students.length ? students.map(student => student.unitId) : [source.unitId])];
    for (const unitId of units) await assertActorAuthority(tx, values.workspaceId, values.actorUserId, "staff.manage", unitId);
    if (values.toStaffMemberId) {
      const target = await tx.workspaceMember.findFirst({ where: { id: values.toStaffMemberId, workspaceId: values.workspaceId, isActive: true }, include: { roleGrants: true } });
      if (!target || !units.every(unitId => isGymProfessionalInUnit(target, unitId))) throw new WorkspaceAccessError(400, "INVALID_REPLACEMENT", "Destino deve ser profissional elegível nas unidades dos alunos.");
    }
    const changed = await tx.workspaceMember.updateMany({ where: { id: { in: students.map(student => student.id) }, workspaceId: values.workspaceId, assignedStaffId: source.id }, data: { assignedStaffId: values.toStaffMemberId ?? null } });
    await tx.auditLog.create({ data: { userId: values.actorUserId, action: `GYM_STUDENTS_REASSIGNED:${source.id}:${values.toStaffMemberId ?? "UNASSIGNED"}:${changed.count}`, entity: "WORKSPACE", entityId: values.workspaceId } });
    return { success: true, count: changed.count };
  });
}

export function mutateGymRole(input: { workspaceId: string; memberId: string; role: WorkspaceRole; unitId?: string; actorUserId: string; revoke: boolean }) {
  return serializableTransaction(async tx => {
    const workspace = await tx.workspace.findUnique({ where: { id: input.workspaceId }, select: { type: true, ownerId: true } });
    const member = await tx.workspaceMember.findFirst({ where: { id: input.memberId, workspaceId: input.workspaceId }, include: { roleGrants: true } });
    if (!workspace || workspace.type !== "GYM" || !member) throw new WorkspaceAccessError(404, "RESOURCE_NOT_FOUND", "Membro não encontrado nesta academia.");
    await assertActorAuthority(tx, input.workspaceId, input.actorUserId, "staff.manage", input.unitId);
    if (member.userId === workspace.ownerId || !editableRole.safeParse(input.role).success) throw new WorkspaceAccessError(403, "INVALID_ROLE", "Titularidade deve ser alterada pelo fluxo de transferência.");
    if (hasHistoricalGymOwnership(member)) throw new WorkspaceAccessError(403, "INVALID_ROLE", "Use o fluxo de titularidade ou desligamento para alterar autoridade de coproprietários.");
    if (!member.isActive && !input.revoke) throw new WorkspaceAccessError(409, "INVALID_STATUS", "Reative o vínculo antes de conceder permissões.");
    const activeStaff = member.roleGrants.some(grant => !grant.revokedAt && grant.role !== "STUDENT") || (!member.roleGrants.length && member.role !== "STUDENT");
    if (!input.revoke && input.role !== "STUDENT" && !activeStaff) await assertGymStaffCapacity(tx, input.workspaceId, 1);
    if (input.unitId && !await tx.gymUnit.findFirst({ where: { id: input.unitId, workspaceId: input.workspaceId, isActive: true }, select: { id: true } })) throw new WorkspaceAccessError(404, "RESOURCE_NOT_FOUND", "Unidade não encontrada nesta academia.");
    const active = await tx.workspaceRoleGrant.findFirst({ where: { memberId: member.id, role: input.role, unitId: input.unitId ?? null, revokedAt: null } });
    const existing = active ?? await tx.workspaceRoleGrant.findFirst({ where: { memberId: member.id, role: input.role, unitId: input.unitId ?? null }, orderBy: { grantedAt: "desc" } });
    if (input.revoke) {
      await tx.workspaceRoleGrant.updateMany({ where: { memberId: member.id, role: input.role, unitId: input.unitId ?? null, revokedAt: null }, data: { revokedAt: new Date(), revokedBy: input.actorUserId } });
      // A revoked grant remains as an authoritative record, even for a legacy member.
      if (!existing) await tx.workspaceRoleGrant.create({ data: { memberId: member.id, role: input.role, unitId: input.unitId ?? null, grantedBy: input.actorUserId, revokedAt: new Date(), revokedBy: input.actorUserId } });
    } else if (existing) await tx.workspaceRoleGrant.update({ where: { id: existing.id }, data: { revokedAt: null, revokedBy: null, grantedAt: new Date(), grantedBy: input.actorUserId } });
    else await tx.workspaceRoleGrant.create({ data: { memberId: member.id, role: input.role, unitId: input.unitId ?? null, grantedBy: input.actorUserId } });
    await tx.auditLog.create({ data: { userId: input.actorUserId, action: `GYM_ROLE_${input.revoke ? "REVOKED" : "GRANTED"}:${input.role}:${input.unitId ?? "GLOBAL"}`, entity: "WORKSPACE_MEMBER", entityId: member.id, severity: "high", metadata: { role: input.role, unitId: input.unitId ?? null, before: { grantActive: Boolean(active), legacyRole: member.role, hasGrants: member.roleGrants.length > 0 }, after: { grantActive: !input.revoke } } } });
    return tx.workspaceRoleGrant.findFirst({ where: { memberId: member.id, role: input.role, unitId: input.unitId ?? null }, orderBy: { grantedAt: "desc" } });
  });
}

async function grantGlobal(tx: GymTransactionClient, memberId: string, role: WorkspaceRole, actorId: string) {
  const active = await tx.workspaceRoleGrant.findFirst({ where: { memberId, role, unitId: null, revokedAt: null } });
  const old = active ?? await tx.workspaceRoleGrant.findFirst({ where: { memberId, role, unitId: null }, orderBy: { grantedAt: "desc" } });
  if (old) await tx.workspaceRoleGrant.update({ where: { id: old.id }, data: { revokedAt: null, revokedBy: null, grantedBy: actorId, grantedAt: new Date() } });
  else await tx.workspaceRoleGrant.create({ data: { memberId, role, grantedBy: actorId } });
}

type TransferWorkspaceOwnerInput = { workspaceId: string; currentOwnerUserId: string; targetUserId: string; auditActorId: string; demoteCurrentOwnerTo?: WorkspaceRole };
export function transferWorkspaceOwner(input: TransferWorkspaceOwnerInput) {
  return serializableTransaction(tx => transferWorkspaceOwnerInTransaction(tx, input));
}

export async function transferWorkspaceOwnerInTransaction(tx: GymTransactionClient, input: TransferWorkspaceOwnerInput) {
    const workspace = await tx.workspace.findUnique({ where: { id: input.workspaceId } });
    const actor = await tx.user.findUnique({ where: { id: input.auditActorId }, select: { role: true } });
    if (!workspace) throw new WorkspaceAccessError(404, "WORKSPACE_NOT_FOUND", "Workspace não encontrado.");
    if (input.auditActorId !== workspace.ownerId && actor?.role !== "SUPERADMIN") throw new WorkspaceAccessError(403, "OWNER_TRANSFER_FAILED", "Somente o titular registrado ou superadmin pode transferir titularidade.");
    if (workspace.ownerId !== input.currentOwnerUserId || workspace.ownerId === input.targetUserId) throw new WorkspaceAccessError(409, "OWNER_TRANSFER_FAILED", "A titularidade mudou ou o destino é o titular atual. Recarregue.");
    if (actor?.role !== "SUPERADMIN") await assertActorAuthority(tx, input.workspaceId, input.auditActorId, "workspace.manage");
    if (!await tx.user.findUnique({ where: { id: input.targetUserId }, select: { id: true } })) throw new WorkspaceAccessError(404, "USER_NOT_FOUND", "Novo titular não encontrado.");
    const demote = input.demoteCurrentOwnerTo ?? "MANAGER";
    if (!["MANAGER", "RECEPTIONIST", "FINANCE", "TRAINER", "ASSISTANT", "STUDENT"].includes(demote)) throw new WorkspaceAccessError(400, "INVALID_ROLE", "Papel do titular anterior inválido.");
    // Administrative transfer remains available after expiry, but cannot silently enlarge a valid license.
    const targetBefore = await tx.workspaceMember.findUnique({ where: { userId_workspaceId: { userId: input.targetUserId, workspaceId: workspace.id } }, include: { roleGrants: true } });
    const previousBefore = await tx.workspaceMember.findUnique({ where: { userId_workspaceId: { userId: input.currentOwnerUserId, workspaceId: workspace.id } }, include: { roleGrants: true, studentProfile: { select: { id: true } } } });
    if (workspace.type === "GYM" && demote === "STUDENT" && !previousBefore?.studentProfile) throw new WorkspaceAccessError(400, "INVALID_ROLE", "O titular anterior precisa de cadastro estudantil existente para permanecer como aluno.");
    const targetHasSeat = Boolean(targetBefore?.isActive && (targetBefore.roleGrants.some(grant => !grant.revokedAt && grant.role !== "STUDENT") || (!targetBefore.roleGrants.length && targetBefore.role !== "STUDENT")));
    const releasesPreviousSeat = previousBefore?.isActive && demote === "STUDENT" && !previousBefore.roleGrants.some(grant => !grant.revokedAt && grant.role !== "STUDENT" && grant.role !== "OWNER");
    const increment = Math.max(0, (targetHasSeat ? 0 : 1) - (releasesPreviousSeat ? 1 : 0));
    if (workspace.type === "GYM" && increment) await assertGymStaffCapacity(tx, workspace.id, increment, actor?.role === "SUPERADMIN" ? input.auditActorId : undefined);
    const target = await tx.workspaceMember.upsert({ where: { userId_workspaceId: { userId: input.targetUserId, workspaceId: workspace.id } }, create: { userId: input.targetUserId, workspaceId: workspace.id, role: "OWNER" }, update: { role: "OWNER", isActive: true, unitId: null } });
    await grantGlobal(tx, target.id, "OWNER", input.auditActorId);
    await tx.workspace.update({ where: { id: workspace.id }, data: { ownerId: input.targetUserId } });
    const previous = await tx.workspaceMember.findUnique({ where: { userId_workspaceId: { userId: input.currentOwnerUserId, workspaceId: workspace.id } } });
    if (previous) {
      await tx.workspaceRoleGrant.updateMany({ where: { memberId: previous.id, role: "OWNER", revokedAt: null }, data: { revokedAt: new Date(), revokedBy: input.auditActorId } });
      await tx.workspaceMember.update({ where: { id: previous.id }, data: { role: demote, unitId: null } });
      await grantGlobal(tx, previous.id, demote, input.auditActorId);
    }
    await tx.auditLog.create({ data: { userId: input.auditActorId, action: `WORKSPACE_OWNERSHIP_TRANSFER:${JSON.stringify({ before: { ownerId: input.currentOwnerUserId }, after: { ownerId: input.targetUserId, previousOwnerRole: demote } })}`, entity: "WORKSPACE", entityId: workspace.id, severity: "high", metadata: { before: { ownerId: input.currentOwnerUserId }, after: { ownerId: input.targetUserId, previousOwnerRole: demote } } } });
    return { success: true, newOwnerId: input.targetUserId };
}

export function offboardGymStaff(input: OffboardStaffWithHandoverInput) {
  return serializableTransaction(async tx => {
    await getGymUnitAccess(tx, input.workspaceId, input.actorUserId, "staff.manage");
    const workspace = await tx.workspace.findUnique({ where: { id: input.workspaceId }, select: { ownerId: true, type: true } });
    const member = await tx.workspaceMember.findFirst({ where: { id: input.memberId, workspaceId: input.workspaceId }, include: { roleGrants: true, studentProfile: { select: { id: true } } } });
    if (!workspace || workspace.type !== "GYM" || !member) throw new WorkspaceAccessError(404, "STAFF_NOT_FOUND", "Colaborador não encontrado nesta academia.");
    await assertActorAuthority(tx, input.workspaceId, input.actorUserId, "staff.manage", member.unitId);
    for (const grant of member.roleGrants.filter(grant => !grant.revokedAt && grant.role !== "STUDENT")) await assertActorAuthority(tx, input.workspaceId, input.actorUserId, "staff.manage", grant.unitId);
    if (workspace.ownerId === member.userId) throw new WorkspaceAccessError(409, "CANNOT_REMOVE_LAST_OWNER", "Transfira a titularidade antes de desligar o titular registrado.");
    if ((member.role === "OWNER" || member.roleGrants.some(grant => grant.role === "OWNER" && !grant.revokedAt)) && input.actorUserId !== workspace.ownerId && (await tx.user.findUnique({ where: { id: input.actorUserId }, select: { role: true } }))?.role !== "SUPERADMIN") throw new WorkspaceAccessError(403, "INSUFFICIENT_PERMISSIONS", "Somente o titular registrado ou superadmin pode desligar um coproprietário.");
    if (!input.reason?.trim()) throw new WorkspaceAccessError(400, "REASON_REQUIRED", "Informe o motivo do desligamento.");
    const students = await tx.workspaceMember.findMany({ where: { workspaceId: input.workspaceId, assignedStaffId: member.id, isActive: true }, select: { id: true, unitId: true } });
    const units = [...new Set(students.length ? students.map(item => item.unitId) : [member.unitId])];
    let replacement = null;
    if (input.replacementStaffMemberId) {
      replacement = await tx.workspaceMember.findFirst({ where: { id: input.replacementStaffMemberId, workspaceId: input.workspaceId, isActive: true }, include: { roleGrants: true } });
      if (!replacement || replacement.id === member.id) throw new WorkspaceAccessError(400, "INVALID_REPLACEMENT", "Substituto deve ser profissional elegível nas unidades dos alunos.");
      const candidate = replacement;
      if (!units.every(unitId => isGymProfessionalInUnit(candidate, unitId))) throw new WorkspaceAccessError(400, "INVALID_REPLACEMENT", "Substituto deve ser profissional elegível nas unidades dos alunos.");
    }
    for (const unitId of units) await assertActorAuthority(tx, input.workspaceId, input.actorUserId, "staff.manage", unitId);
    await tx.workspaceMember.updateMany({ where: { id: { in: students.map(student => student.id) } }, data: { assignedStaffId: replacement?.id ?? null } });
    const remainsStudent = member.roleGrants.some(grant => grant.role === "STUDENT" && !grant.revokedAt) || (member.role === "STUDENT" && !member.roleGrants.length);
    await tx.workspaceRoleGrant.updateMany({ where: { memberId: member.id, role: { not: "STUDENT" }, revokedAt: null }, data: { revokedAt: new Date(), revokedBy: input.actorUserId } });
    if (remainsStudent && !member.roleGrants.some(grant => grant.role === "STUDENT" && !grant.revokedAt)) {
      await tx.workspaceRoleGrant.create({ data: { memberId: member.id, role: "STUDENT", unitId: member.unitId, grantedBy: input.actorUserId } });
    }
    await tx.workspaceMember.update({ where: { id: member.id }, data: { isActive: remainsStudent, role: remainsStudent ? "STUDENT" : member.role } });
    await tx.gymStaffProfile.upsert({ where: { memberId: member.id }, create: { memberId: member.id, terminationDate: new Date() }, update: { terminationDate: new Date() } });
    await tx.auditLog.create({ data: { userId: input.actorUserId, action: `GYM_STAFF_OFFBOARDED:${input.reason.trim().slice(0, 2000)}`, entity: "WORKSPACE_MEMBER", entityId: member.id, severity: "high", metadata: { before: { isActive: member.isActive, role: member.role }, after: { isActive: remainsStudent, role: remainsStudent ? "STUDENT" : member.role }, reassignedStudentsCount: students.length } } });
    return { success: true, memberId: member.id, reassignedStudentsCount: students.length, remainsStudent };
  });
}
