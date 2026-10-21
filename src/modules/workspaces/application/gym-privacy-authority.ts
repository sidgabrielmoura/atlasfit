import prisma from "@/lib/prisma";
import type { GymTransactionClient } from "./transaction";
import { resolveGymAccessRoles } from "../domain/access-roles";
import { resolveEffectiveCapabilities } from "../domain/roles";
import { WorkspaceAccessError } from "../domain/types";

/** Rights over retained data survive suspension, offboarding and a commercial license's expiry. */
export async function assertGymPrivacyAuthority(db: GymTransactionClient, workspaceId: string, actorUserId: string, unitId?: string | null) {
  const [workspace, user, member] = await Promise.all([
    db.workspace.findUnique({ where: { id: workspaceId }, select: { type: true, ownerId: true } }),
    db.user.findUnique({ where: { id: actorUserId }, select: { role: true } }),
    db.workspaceMember.findUnique({ where: { userId_workspaceId: { userId: actorUserId, workspaceId } }, include: { roleGrants: true } }),
  ]);
  if (workspace?.type !== "GYM") throw new WorkspaceAccessError(404, "WORKSPACE_NOT_FOUND", "Academia não encontrada.");
  if (unitId && !await db.gymUnit.findFirst({ where: { id: unitId, workspaceId }, select: { id: true } })) throw new WorkspaceAccessError(409, "TENANT_MISMATCH", "Unidade histórica fora desta academia.");
  if (user?.role === "SUPERADMIN") return;
  if (!member?.isActive) throw new WorkspaceAccessError(403, "NOT_A_MEMBER", "Gestão atual obrigatória para tratar o pedido.");
  if (workspace.ownerId === actorUserId) return;
  if (!member.roleGrants.length && member.unitId && member.unitId !== unitId) throw new WorkspaceAccessError(403, "INSUFFICIENT_PERMISSIONS", "Pedido fora da unidade do operador.");
  if (!resolveEffectiveCapabilities(resolveGymAccessRoles(member, unitId)).has("privacy.manage")) throw new WorkspaceAccessError(403, "INSUFFICIENT_PERMISSIONS", "Gestão de privacidade obrigatória.");
}
export async function requireGymPrivacyAccess(workspaceId: string) {
  const { auth } = await import("@/auth");
  const session = await auth(); if (!session?.user?.id) throw new WorkspaceAccessError(401, "UNAUTHORIZED", "Sessão obrigatória.");
  await assertGymPrivacyAuthority(prisma, workspaceId, session.user.id);
  return { workspaceId, userId: session.user.id };
}
