import type { GymTransactionClient } from "./transaction";
import { WorkspaceAccessError } from "../domain/types";
import { resolveAccessRoles, resolveGymAccessRoles } from "../domain/access-roles";
import { assertGymOperationalWorkspace } from "./gym-license";
import { resolveEffectiveCapabilities, type WorkspaceCapability } from "../domain/roles";

/** Also used by jobs/domain commands, independent of HTTP/UI guards. */
export async function assertActorAuthority(tx: GymTransactionClient, workspaceId: string, userId: string, capability: WorkspaceCapability, unitId?: string | null): Promise<void> {
  const workspace = await tx.workspace.findUnique({ where: { id: workspaceId }, select: { isActive: true, ownerId: true, type: true } });
  const user = await tx.user.findUnique({ where: { id: userId }, select: { role: true } });
  const member = await tx.workspaceMember.findUnique({ where: { userId_workspaceId: { userId, workspaceId } }, include: { roleGrants: true } });
  if (!workspace) throw new WorkspaceAccessError(404, "WORKSPACE_NOT_FOUND", "Academia não encontrada.");
  if (unitId && !await tx.gymUnit.findFirst({ where: { id: unitId, workspaceId, isActive: true }, select: { id: true } })) throw new WorkspaceAccessError(404, "UNIT_NOT_FOUND", "Unidade não pertence ao workspace ativo ou está inativa.");
  if (workspace.type === "GYM") await assertGymOperationalWorkspace(workspaceId, tx);
  if (user?.role === "SUPERADMIN") return;
  if (!workspace.isActive) throw new WorkspaceAccessError(403, "WORKSPACE_SUSPENDED", "Academia suspensa.");
  if (!member?.isActive) throw new WorkspaceAccessError(403, "NOT_A_MEMBER", "Vínculo ativo necessário.");
  if (workspace.type === "GYM" && unitId && member.unitId && !member.roleGrants.length && member.unitId !== unitId && workspace.ownerId !== userId) throw new WorkspaceAccessError(403, "INSUFFICIENT_PERMISSIONS", "Papel legado restrito à unidade do vínculo.");
  const roles = workspace.type === "GYM" ? resolveGymAccessRoles(member, unitId) : resolveAccessRoles(member.role, member.roleGrants, unitId || undefined);
  if (workspace.ownerId === userId || roles.includes("OWNER")) return;
  if (!resolveEffectiveCapabilities(roles).has(capability)) throw new WorkspaceAccessError(403, "INSUFFICIENT_PERMISSIONS", "Operação não permitida para este perfil e unidade.");
}
