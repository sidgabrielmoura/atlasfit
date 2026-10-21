import { randomBytes, createHash } from "node:crypto";
import type { InviteStaffInput, UpdateStaffInput } from "./staff-service";
import { serializableTransaction, type GymTransactionClient } from "./transaction";
import { assertActorAuthority } from "./actor-authority";
import { WorkspaceAccessError } from "../domain/types";
import { hasHistoricalGymOwnership } from "../domain/access-roles";
import { assertGymStaffCapacity } from "./staff-capacity";
import { z } from "zod";
import { getGymUnitAccess } from "./gym-unit-access";

const identifier = z.string().trim().min(1).max(100);
const staffDetails = {
  cref: z.string().trim().max(100).nullable().optional(),
  jobTitle: z.string().trim().max(100).nullable().optional(),
};
const inviteSchema = z.object({ workspaceId: identifier, invitedById: identifier, email: z.string().trim().email().max(254), role: z.enum(["OWNER", "MANAGER", "RECEPTIONIST", "FINANCE", "TRAINER", "ASSISTANT", "STUDENT"]), unitId: identifier.nullable().optional(), ...staffDetails }).strict();
const updateSchema = z.object({ workspaceId: identifier, memberId: identifier, actorUserId: identifier, unitId: identifier.nullable().optional(), role: z.enum(["OWNER", "MANAGER", "RECEPTIONIST", "FINANCE", "TRAINER", "ASSISTANT", "STUDENT"]).optional(), ...staffDetails, bio: z.string().trim().max(2000).nullable().optional(), emergencyContactName: z.string().trim().max(100).nullable().optional(), emergencyContactPhone: z.string().trim().max(30).nullable().optional() }).strict();

const staffRoles = ["MANAGER", "RECEPTIONIST", "FINANCE", "TRAINER", "ASSISTANT"];
export async function revokeGymInvitation(invitationId: string, workspaceId: string, actorUserId: string) {
  return serializableTransaction(async tx => {
    await getGymUnitAccess(tx, workspaceId, actorUserId, "staff.manage");
    const invitation = await tx.workspaceInvitation.findFirst({ where: { id: invitationId, workspaceId }, select: { id: true, status: true, unitId: true } });
    if (!invitation) throw new WorkspaceAccessError(404, "INVITATION_NOT_FOUND", "Convite não encontrado nesta academia.");
    await assertActorAuthority(tx, workspaceId, actorUserId, "staff.manage", invitation.unitId);
    if (invitation.status === "REVOKED") return { id: invitation.id };
    if (invitation.status !== "PENDING") throw new WorkspaceAccessError(409, "CANNOT_REVOKE", "O convite já foi utilizado ou expirou.");
    const claim = await tx.workspaceInvitation.updateMany({ where: { id: invitation.id, workspaceId, status: "PENDING" }, data: { status: "REVOKED" } });
    if (claim.count !== 1) throw new WorkspaceAccessError(409, "CANNOT_REVOKE", "O estado mudou. Recarregue os convites.");
    await tx.auditLog.create({ data: { userId: actorUserId, action: `GYM_STAFF_INVITATION_REVOKED:${invitation.id}`, entity: "WORKSPACE", entityId: workspaceId } });
    return { id: invitation.id };
  });
}
async function unit(tx: GymTransactionClient, workspaceId: string, unitId?: string | null) {
  if (unitId && !await tx.gymUnit.findFirst({ where: { id: unitId, workspaceId, isActive: true } })) throw new WorkspaceAccessError(404, "UNIT_NOT_FOUND", "Unidade inválida nesta academia.");
}
async function capacity(tx: GymTransactionClient, workspaceId: string) {
  await assertGymStaffCapacity(tx, workspaceId);
}

export async function inviteGymStaff(input: InviteStaffInput) {
  const parsed = inviteSchema.safeParse(input);
  if (!parsed.success) throw new WorkspaceAccessError(400, "INVALID_REQUEST", "Dados de convite inválidos.");
  input = parsed.data;
  const email = input.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new WorkspaceAccessError(400, "INVALID_EMAIL", "E-mail inválido.");
  if (!staffRoles.includes(input.role)) throw new WorkspaceAccessError(403, "INVALID_ROLE", "Titularidade exige o fluxo próprio; alunos ingressam pelo cadastro de alunos.");
  const rawToken = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 72 * 3600000);
  const invitation = await serializableTransaction(async tx => {
    await assertActorAuthority(tx, input.workspaceId, input.invitedById, "staff.manage", input.unitId);
    await unit(tx, input.workspaceId, input.unitId);
    const existing = await tx.workspaceMember.findFirst({ where: { workspaceId: input.workspaceId, user: { email }, isActive: true }, include: { roleGrants: true, workspace: { select: { ownerId: true } } } });
    if (existing && (existing.userId === existing.workspace.ownerId || existing.roleGrants.some(grant => !grant.revokedAt && grant.role !== "STUDENT") || (!existing.roleGrants.length && existing.role !== "STUDENT"))) throw new WorkspaceAccessError(409, "ALREADY_STAFF_MEMBER", "Este usuário já pertence à equipe.");
    await tx.workspaceInvitation.updateMany({ where: { workspaceId: input.workspaceId, email, status: "PENDING" }, data: { status: "REVOKED" } });
    await capacity(tx, input.workspaceId);
    const created = await tx.workspaceInvitation.create({ data: { workspaceId: input.workspaceId, unitId: input.unitId, email, role: input.role, tokenHash: createHash("sha256").update(rawToken).digest("hex"), invitedBy: input.invitedById, expiresAt, cref: input.cref?.trim() || null, jobTitle: input.jobTitle?.trim() || null }, include: { unit: { select: { id: true, name: true, code: true } } } });
    await tx.auditLog.create({ data: { userId: input.invitedById, action: `GYM_STAFF_INVITED:${created.id}`, entity: "WORKSPACE", entityId: input.workspaceId } });
    return created;
  });
  return { invitation, rawToken, inviteUrl: `/auth/invite?token=${rawToken}`, expiresAt };
}

export async function acceptGymStaffInvitation(rawToken: string, userId: string) {
  if (!/^[a-f0-9]{64}$/i.test(rawToken)) throw new WorkspaceAccessError(400, "INVALID_TOKEN", "Convite inválido.");
  return serializableTransaction(async tx => {
    const invitation = await tx.workspaceInvitation.findUnique({ where: { tokenHash: createHash("sha256").update(rawToken).digest("hex") } });
    const user = await tx.user.findUnique({ where: { id: userId }, select: { id: true, email: true } });
    if (!invitation || !user?.email || user.email.trim().toLowerCase() !== invitation.email.toLowerCase()) throw new WorkspaceAccessError(403, "INVALID_TOKEN", "Entre com a conta destinatária do convite.");
    if (!staffRoles.includes(invitation.role)) throw new WorkspaceAccessError(403, "INVALID_ROLE", "Este convite exige revisão administrativa.");
    if (invitation.status !== "PENDING") throw new WorkspaceAccessError(409, "INVITATION_NOT_PENDING", "Convite já utilizado ou revogado.");
    if (invitation.expiresAt <= new Date()) throw new WorkspaceAccessError(410, "INVITATION_EXPIRED", "Convite expirado.");
    await assertActorAuthority(tx, invitation.workspaceId, invitation.invitedBy, "staff.manage", invitation.unitId);
    await unit(tx, invitation.workspaceId, invitation.unitId);
    const claim = await tx.workspaceInvitation.updateMany({ where: { id: invitation.id, status: "PENDING", expiresAt: { gt: new Date() } }, data: { status: "ACCEPTED", acceptedAt: new Date() } });
    if (claim.count !== 1) throw new WorkspaceAccessError(409, "INVITATION_NOT_PENDING", "Convite já utilizado.");
    const previous = await tx.workspaceMember.findUnique({ where: { userId_workspaceId: { userId, workspaceId: invitation.workspaceId } }, include: { roleGrants: true, workspace: { select: { ownerId: true } } } });
    if (previous && (previous.userId === previous.workspace.ownerId || (previous.isActive && (previous.roleGrants.some(grant => !grant.revokedAt && grant.role !== "STUDENT") || (!previous.roleGrants.length && previous.role !== "STUDENT"))))) throw new WorkspaceAccessError(409, "ALREADY_STAFF_MEMBER", "Este usuário já pertence à equipe; edite o vínculo existente.");
    await capacity(tx, invitation.workspaceId);
    // Preserve legacy student rights in their original unit, without restoring revoked grants.
    if (previous?.isActive && previous.role === "STUDENT" && !previous.roleGrants.length) await tx.workspaceRoleGrant.create({ data: { memberId: previous.id, role: "STUDENT", unitId: previous.unitId, grantedBy: invitation.invitedBy } });
    const member = await tx.workspaceMember.upsert({ where: { userId_workspaceId: { userId, workspaceId: invitation.workspaceId } }, create: { workspaceId: invitation.workspaceId, userId, role: invitation.role, unitId: invitation.unitId }, update: { role: invitation.role, unitId: invitation.unitId, isActive: true } });
    const activeGrant = await tx.workspaceRoleGrant.findFirst({ where: { memberId: member.id, role: invitation.role, unitId: invitation.unitId, revokedAt: null } });
    const grant = activeGrant ?? await tx.workspaceRoleGrant.findFirst({ where: { memberId: member.id, role: invitation.role, unitId: invitation.unitId }, orderBy: { grantedAt: "desc" } });
    if (grant) await tx.workspaceRoleGrant.update({ where: { id: grant.id }, data: { revokedAt: null, revokedBy: null, grantedAt: new Date(), grantedBy: invitation.invitedBy } });
    else await tx.workspaceRoleGrant.create({ data: { memberId: member.id, role: invitation.role, unitId: invitation.unitId, grantedBy: invitation.invitedBy } });
    await tx.gymStaffProfile.upsert({ where: { memberId: member.id }, create: { memberId: member.id, cref: invitation.cref, jobTitle: invitation.jobTitle }, update: { cref: invitation.cref, jobTitle: invitation.jobTitle, terminationDate: null } });
    await tx.auditLog.create({ data: { userId, action: `GYM_STAFF_INVITATION_ACCEPTED:${invitation.id}`, entity: "WORKSPACE", entityId: invitation.workspaceId } });
    return { success: true, workspaceId: invitation.workspaceId, memberId: member.id, role: invitation.role };
  });
}

export async function updateGymStaff(input: UpdateStaffInput) {
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) throw new WorkspaceAccessError(400, "INVALID_REQUEST", "Dados do colaborador inválidos.");
  input = parsed.data;
  return serializableTransaction(async tx => {
    await getGymUnitAccess(tx, input.workspaceId, input.actorUserId, "staff.manage");
    const workspace = await tx.workspace.findUnique({ where: { id: input.workspaceId }, select: { ownerId: true, type: true } });
    const existing = await tx.workspaceMember.findFirst({ where: { id: input.memberId, workspaceId: input.workspaceId, isActive: true }, include: { roleGrants: true } });
    if (!existing || !workspace || workspace.type !== "GYM") throw new WorkspaceAccessError(404, "STAFF_NOT_FOUND", "Colaborador não encontrado nesta academia.");
    await assertActorAuthority(tx, input.workspaceId, input.actorUserId, "staff.manage", existing.unitId);
    for (const grant of existing.roleGrants.filter(grant => !grant.revokedAt && grant.role !== "STUDENT")) await assertActorAuthority(tx, input.workspaceId, input.actorUserId, "staff.manage", grant.unitId);
    const role = input.role ?? existing.role;
    if (role === "OWNER" && existing.role !== "OWNER") throw new WorkspaceAccessError(403, "INVALID_ROLE", "Use o fluxo próprio de titularidade.");
    const isOwner = existing.userId === workspace.ownerId || hasHistoricalGymOwnership(existing);
    if (isOwner) {
      const actor = await tx.user.findUnique({ where: { id: input.actorUserId }, select: { role: true } });
      if ((input.role !== undefined && input.role !== existing.role) || (input.unitId !== undefined && input.unitId !== existing.unitId) || (input.actorUserId !== workspace.ownerId && actor?.role !== "SUPERADMIN")) throw new WorkspaceAccessError(403, "INVALID_ROLE", "A titularidade deve ser administrada pelo fluxo próprio.");
    } else if (!staffRoles.includes(role)) throw new WorkspaceAccessError(400, "INVALID_ROLE", "Papel de equipe inválido.");
    await unit(tx, input.workspaceId, input.unitId);
    const changesPermissions = !isOwner && (input.role !== undefined || input.unitId !== undefined);
    const wasStaff = existing.roleGrants.some(grant => !grant.revokedAt && grant.role !== "STUDENT") || (!existing.roleGrants.length && existing.role !== "STUDENT");
    if (changesPermissions && !wasStaff) await assertGymStaffCapacity(tx, input.workspaceId);
    if (changesPermissions) {
      const targetUnit = input.unitId === undefined ? existing.unitId : input.unitId;
      // Null means global authority; it must not bypass the destination check.
      await assertActorAuthority(tx, input.workspaceId, input.actorUserId, "staff.manage", targetUnit);
      for (const grant of existing.roleGrants.filter(grant => !grant.revokedAt && grant.role !== "STUDENT")) await assertActorAuthority(tx, input.workspaceId, input.actorUserId, "staff.manage", grant.unitId);
    }
    const member = await tx.workspaceMember.update({ where: { id: existing.id }, data: { role, unitId: input.unitId }, include: { user: { select: { id: true, name: true, email: true } } } });
    if (changesPermissions) {
      await tx.workspaceRoleGrant.updateMany({ where: { memberId: existing.id, role: { not: "STUDENT" }, revokedAt: null }, data: { revokedAt: new Date(), revokedBy: input.actorUserId } });
      const targetUnit = input.unitId === undefined ? existing.unitId : input.unitId;
      const grant = await tx.workspaceRoleGrant.findFirst({ where: { memberId: existing.id, role, unitId: targetUnit } });
      if (grant) await tx.workspaceRoleGrant.update({ where: { id: grant.id }, data: { revokedAt: null, grantedBy: input.actorUserId } });
      else await tx.workspaceRoleGrant.create({ data: { memberId: existing.id, role, unitId: targetUnit, grantedBy: input.actorUserId } });
    }
    const details = { cref: input.cref, jobTitle: input.jobTitle, bio: input.bio, emergencyContactName: input.emergencyContactName, emergencyContactPhone: input.emergencyContactPhone };
    const staffProfile = await tx.gymStaffProfile.upsert({ where: { memberId: existing.id }, create: { memberId: existing.id, ...details }, update: details });
    await tx.auditLog.create({ data: { userId: input.actorUserId, action: `GYM_STAFF_UPDATED:${existing.id}`, entity: "WORKSPACE", entityId: input.workspaceId, metadata: { before: { role: existing.role, unitId: existing.unitId }, after: { role: member.role, unitId: member.unitId }, permissionsChanged: changesPermissions, revokedProfessionalGrants: changesPermissions ? existing.roleGrants.filter(grant => !grant.revokedAt && grant.role !== "STUDENT").map(grant => ({ id: grant.id, role: grant.role, unitId: grant.unitId })) : [] } } });
    return { member, staffProfile };
  });
}
