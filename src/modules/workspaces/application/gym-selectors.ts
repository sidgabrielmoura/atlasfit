import prisma from "@/lib/prisma";
import { serializableTransaction } from "./transaction";
import { getGymUnitAccess } from "./gym-unit-access";
import { resolveGymAccessRoles, resolveNavigationRoles } from "../domain/access-roles";
import { assertActorAuthority } from "./actor-authority";
import { WorkspaceAccessError } from "../domain/types";

export function getGymStudentSelectors(workspaceId: string, actorUserId: string) {
  return serializableTransaction(async tx => {
    const scope = await getGymUnitAccess(tx, workspaceId, actorUserId, "students.read");
    const workspace = await tx.workspace.findUniqueOrThrow({ where: { id: workspaceId }, select: { ownerId: true } });
    const candidates = await tx.workspaceMember.findMany({ where: { workspaceId, isActive: true }, select: { id: true, userId: true, role: true, unitId: true, roleGrants: { select: { role: true, unitId: true, revokedAt: true } }, user: { select: { name: true } } }, orderBy: { id: "asc" } });
    const trainers = candidates.flatMap(member => {
      const unitIds = scope.units.filter(unit => member.userId === workspace.ownerId || resolveGymAccessRoles(member, unit.id).some(role => ["OWNER", "MANAGER", "TRAINER"].includes(role))).map(unit => unit.id);
      return unitIds.length ? [{ id: member.id, name: member.user.name || "Profissional", role: member.userId === workspace.ownerId ? "OWNER" as const : member.role, unitIds }] : [];
    });
    return { trainers, units: scope.units.map(unit => ({ id: unit.id, name: unit.name, canManageStudents: unit.canManageStudents, canManageHealth: unit.capabilities.includes("health.manage.assigned") })) };
  });
}
export function getGymOwnershipCandidates(workspaceId: string, actorUserId: string) {
  return serializableTransaction(async tx => {
    await assertActorAuthority(tx, workspaceId, actorUserId, "workspace.manage");
    const units = await tx.gymUnit.findMany({ where: { workspaceId, isActive: true }, select: { id: true } });
    const members = await tx.workspaceMember.findMany({ where: { workspaceId, isActive: true }, select: { id: true, userId: true, role: true, unitId: true, roleGrants: { select: { role: true, unitId: true, revokedAt: true } }, user: { select: { id: true, name: true, email: true } } }, orderBy: { createdAt: "asc" } });
    const owner = await tx.workspace.findUniqueOrThrow({ where: { id: workspaceId }, select: { ownerId: true } });
    return members.filter(member => member.userId === owner.ownerId || ((!member.unitId || member.roleGrants.length || units.some(unit => unit.id === member.unitId)) && resolveNavigationRoles(member.role, member.roleGrants, units.map(unit => unit.id)).some(role => role !== "STUDENT"))).map(({ roleGrants: _grants, unitId: _unit, ...member }) => ({ ...member, role: member.userId === owner.ownerId ? "OWNER" as const : member.role }));
  });
}
