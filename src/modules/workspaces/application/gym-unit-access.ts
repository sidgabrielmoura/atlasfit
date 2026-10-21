import type { GymTransactionClient } from "./transaction";
import { WorkspaceAccessError } from "../domain/types";
import { resolveGymAccessRoles } from "../domain/access-roles";
import { assertGymOperationalWorkspace } from "./gym-license";
import { ALL_CAPABILITIES, resolveEffectiveCapabilities, type WorkspaceCapability } from "../domain/roles";

/** A unit-scoped role can list its units without being promoted to global authority. */
export async function getGymUnitAccess(tx: GymTransactionClient, workspaceId: string, actorUserId: string, capability: WorkspaceCapability) {
  await assertGymOperationalWorkspace(workspaceId, tx);
  const workspace = await tx.workspace.findUnique({ where: { id: workspaceId }, select: { id: true, name: true, type: true, isActive: true, ownerId: true } });
  if (!workspace || workspace.type !== "GYM") throw new WorkspaceAccessError(404, "WORKSPACE_NOT_FOUND", "Academia não encontrada.");
  const user = await tx.user.findUnique({ where: { id: actorUserId }, select: { role: true } });
  const member = await tx.workspaceMember.findUnique({ where: { userId_workspaceId: { userId: actorUserId, workspaceId } }, select: { isActive: true, role: true, unitId: true, roleGrants: { select: { role: true, unitId: true, revokedAt: true } } } });
  const superadmin = user?.role === "SUPERADMIN";
  if (!superadmin && !workspace.isActive) throw new WorkspaceAccessError(403, "WORKSPACE_SUSPENDED", "Academia suspensa.");
  if (!superadmin && !member?.isActive) throw new WorkspaceAccessError(403, "NOT_A_MEMBER", "Vínculo ativo necessário.");
  const owner = workspace.ownerId === actorUserId;
  const globalRoles = member ? resolveGymAccessRoles(member) : [];
  const includeUnassigned = superadmin || owner || globalRoles.includes("OWNER") || resolveEffectiveCapabilities(globalRoles).has(capability);
  const candidates = await tx.gymUnit.findMany({ where: { workspaceId, isActive: true }, select: { id: true, name: true }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] });
  const units = candidates.flatMap(unit => {
    if (!superadmin && !owner && member?.unitId && !member.roleGrants.length && member.unitId !== unit.id) return [];
    const roles = member ? resolveGymAccessRoles(member, unit.id) : [];
    const capabilities = superadmin || owner || roles.includes("OWNER") ? new Set(ALL_CAPABILITIES) : resolveEffectiveCapabilities(roles);
    return capabilities.has(capability) ? [{ ...unit, capabilities: [...capabilities], canReadFinance: capabilities.has("invoices.read"), canManageStudents: capabilities.has("students.manage"), canManageEnrollments: capabilities.has("enrollments.manage"), canApproveChanges: capabilities.has("workspace.manage") }] : [];
  });
  if (!units.length && !includeUnassigned) throw new WorkspaceAccessError(403, "INSUFFICIENT_PERMISSIONS", "Nenhuma unidade disponível para esta operação.");
  const canManageUnassignedStudents = includeUnassigned && (superadmin || owner || resolveEffectiveCapabilities(globalRoles).has("students.manage"));
  const unassignedCapabilities = superadmin || owner ? [...ALL_CAPABILITIES] : [...resolveEffectiveCapabilities(globalRoles)];
  return { workspace: { id: workspace.id, name: workspace.name }, units, includeUnassigned, canManageUnassignedStudents, unassignedCapabilities };
}
