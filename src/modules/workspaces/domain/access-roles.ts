import type { WorkspaceRole } from "./roles";

export interface AccessRoleGrant {
  role: WorkspaceRole;
  unitId: string | null;
  revokedAt: Date | null;
}

/** Navigation may advertise a unit role, but it never grants workspace-wide authority. */
export function resolveNavigationRoles(legacyRole: WorkspaceRole, grants: readonly AccessRoleGrant[], activeUnitIds: readonly string[]): WorkspaceRole[] {
  if (!grants.length) return [legacyRole];
  return [...new Set(grants.filter(grant => !grant.revokedAt && (grant.unitId === null || activeUnitIds.includes(grant.unitId))).map(grant => grant.role))];
}

/** A legacy role applies only before grants have ever been provisioned. */
export function resolveAccessRoles(
  legacyRole: WorkspaceRole,
  grants: readonly AccessRoleGrant[],
  unitId?: string,
): WorkspaceRole[] {
  if (grants.length === 0) return [legacyRole];
  return [...new Set(grants
    .filter((grant) => !grant.revokedAt && (grant.unitId === null || grant.unitId === unitId))
    .map((grant) => grant.role))];
}

/** Legacy professional roles are restricted to their member unit in GYM. */
export function isGymProfessionalInUnit(member: { role: WorkspaceRole; unitId: string | null; roleGrants: readonly AccessRoleGrant[] }, unitId: string | null): boolean {
  if (!member.roleGrants.length && member.unitId !== null && member.unitId !== unitId) return false;
  return resolveAccessRoles(member.role, member.roleGrants, unitId ?? undefined).some(role => role === "OWNER" || role === "MANAGER" || role === "TRAINER");
}

/** An unprovisioned legacy role keeps its original unit scope, including global calls. */
export function resolveGymAccessRoles(member: { role: WorkspaceRole; unitId: string | null; roleGrants: readonly AccessRoleGrant[] }, unitId?: string | null): WorkspaceRole[] {
  if (!member.roleGrants.length && member.unitId !== null && member.unitId !== (unitId ?? null)) return [];
  return resolveAccessRoles(member.role, member.roleGrants, unitId ?? undefined);
}

/** Historical ownership must be protected even when only the legacy column retains it. */
export function hasHistoricalGymOwnership(member: { role: WorkspaceRole; roleGrants: readonly Pick<AccessRoleGrant, "role" | "revokedAt">[] }) {
  return member.role === "OWNER" || member.roleGrants.some(grant => grant.role === "OWNER" && !grant.revokedAt);
}
