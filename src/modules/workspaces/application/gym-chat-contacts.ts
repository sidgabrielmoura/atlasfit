import { resolveGymAccessRoles } from "../domain/access-roles";
import { hasStudentMembership } from "../domain/student-membership";
import { WorkspaceAccessError } from "../domain/types";
import { assertChatWorkspace } from "./chat-authority";
import { reportReadTransaction, type GymTransactionClient } from "./transaction";

async function authorizedContacts(tx: GymTransactionClient, workspaceId: string, actorUserId: string, targetUserIds?: string[]) {
  const actor = await assertChatWorkspace(workspaceId, actorUserId, tx);
  const workspace = await tx.workspace.findUniqueOrThrow({ where: { id: workspaceId }, select: { ownerId: true, type: true } });
  if (workspace.type !== "GYM") throw new WorkspaceAccessError(400, "INVALID_REQUEST", "Consulta exclusiva de academia.");
  const units = await tx.gymUnit.findMany({ where: { workspaceId, isActive: true }, select: { id: true } });
  const unitIds = new Set(units.map(unit => unit.id));
  const candidates = await tx.workspaceMember.findMany({ where: { workspaceId, isActive: true, userId: { not: actorUserId, ...(targetUserIds ? { in: targetUserIds } : {}) } }, include: { roleGrants: true, studentProfile: { select: { id: true } } } });
  const currentActor = await tx.workspaceMember.findUniqueOrThrow({ where: { id: actor.id }, include: { roleGrants: true, studentProfile: { select: { id: true } } } });
  type Member = typeof currentActor;
  const usable = (member: Member) => (!member.unitId || unitIds.has(member.unitId)) && (workspace.ownerId === member.userId || [null, ...unitIds].some(unitId => resolveGymAccessRoles(member, unitId).length > 0));
  const rolesFor = (member: Member, unitId: string | null) => workspace.ownerId === member.userId ? ["OWNER"] : resolveGymAccessRoles(member, unitId);
  const eligible = (target: Member) => {
    if (!usable(currentActor) || !usable(target)) return false;
    const aStudent = hasStudentMembership(currentActor), bStudent = hasStudentMembership(target);
    if (aStudent && bStudent) return false;
    if (aStudent || bStudent) {
      const student = aStudent ? currentActor : target;
      const staff = aStudent ? target : currentActor;
      const roles = rolesFor(staff, student.unitId);
      return roles.some(role => ["OWNER", "MANAGER", "RECEPTIONIST", "FINANCE"].includes(role)) || (roles.some(role => ["TRAINER", "ASSISTANT"].includes(role)) && student.assignedStaffId === staff.id);
    }
    return [null, ...unitIds].some(unitId => rolesFor(currentActor, unitId).some(role => role !== "STUDENT") && rolesFor(target, unitId).some(role => role !== "STUDENT"));
  };
  return candidates.filter(eligible).map(member => ({ id: member.userId, role: member.role }));
}
export function getGymChatContacts(workspaceId: string, actorUserId: string) {
  return reportReadTransaction(async tx => {
    const allowed = await authorizedContacts(tx, workspaceId, actorUserId);
    if (!allowed.length) return [];
    const users = await tx.user.findMany({ where: { id: { in: allowed.map(member => member.id) } }, select: { id: true, name: true, email: true, image: true } });
    const roles = new Map(allowed.map(member => [member.id, member.role]));
    return users.map(user => ({ ...user, role: roles.get(user.id)! }));
  });
}
export async function assertGymChatContact(tx: GymTransactionClient, workspaceId: string, actorUserId: string, targetUserId: string) {
  if ((await tx.workspace.findUniqueOrThrow({ where: { id: workspaceId }, select: { type: true } })).type !== "GYM") return;
  if (!(await authorizedContacts(tx, workspaceId, actorUserId, [targetUserId])).some(contact => contact.id === targetUserId)) throw new WorkspaceAccessError(403, "FORBIDDEN_RESOURCE", "Contato fora da unidade ou carteira autorizada.");
}

/** Permission facts only: token renewal must not read profile images. */
export async function getGymChatContactIds(tx: GymTransactionClient, workspaceId: string, actorUserId: string) {
  return new Set((await authorizedContacts(tx, workspaceId, actorUserId)).map(member => member.id));
}
