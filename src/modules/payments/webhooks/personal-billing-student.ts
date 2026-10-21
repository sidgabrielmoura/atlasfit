import prisma from "@/lib/prisma";
import type { GymTransactionClient } from "@/modules/workspaces/application/transaction";

/** A legacy missing workspace may resolve only to one PERSONAL owned by the account holder. */
export async function resolvePersonalBillingStudent(workspaceId: string | null, studentUserId: string, ownerUserId: string | null, client: Pick<GymTransactionClient, "workspaceMember"> = prisma) {
  if (!ownerUserId) throw new Error("BILLING_OWNER_REVIEW_REQUIRED");
  const members = await client.workspaceMember.findMany({ where: { userId: studentUserId, isActive: true, role: "STUDENT", ...(workspaceId ? { workspaceId } : {}), workspace: { type: "PERSONAL", ownerId: ownerUserId, isActive: true } }, select: { id: true, workspaceId: true, user: { select: { name: true, email: true } } }, take: 2 });
  if (members.length !== 1) throw new Error("BILLING_WORKSPACE_REVIEW_REQUIRED");
  return members[0];
}
