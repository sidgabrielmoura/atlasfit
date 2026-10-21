import type { GymTransactionClient } from "./transaction";
import { assertGymOperationalWorkspace } from "./gym-license";
import { WorkspaceAccessError } from "../domain/types";
import { assertSuperadmin } from "./gym-provisioning";

/** Invitations reserve a seat; accepting converts that same seat into an active member. */
export async function assertGymStaffCapacity(tx: GymTransactionClient, workspaceId: string, increment = 1, recoveryAdminUserId?: string) {
  if (recoveryAdminUserId) await assertSuperadmin(tx, recoveryAdminUserId);
  const workspace = recoveryAdminUserId ? await tx.workspace.findUnique({ where: { id: workspaceId }, include: { subscription: true } }) : await assertGymOperationalWorkspace(workspaceId, tx);
  if (!workspace || workspace.type !== "GYM" || !workspace.subscription) throw new WorkspaceAccessError(403, "INVALID_STATUS", "Configure a licença antes de ampliar a equipe.");
  const count = await tx.workspaceMember.count({ where: { workspaceId, isActive: true, OR: [
    { userId: workspace.ownerId }, { role: { not: "STUDENT" }, roleGrants: { none: {} } },
    { roleGrants: { some: { role: { not: "STUDENT" }, revokedAt: null } } },
  ] } });
  const pending = await tx.workspaceInvitation.count({ where: { workspaceId, status: "PENDING", expiresAt: { gt: new Date() } } });
  if (increment > 0 && count + pending + increment > workspace.subscription!.maxStaff) throw new WorkspaceAccessError(409, "STAFF_LIMIT_REACHED", "Equipe e convites ativos atingiram o limite da licença.");
}
