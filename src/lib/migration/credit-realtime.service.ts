import prisma from "@/lib/prisma";
import { publishToChannel } from "@/lib/ably";
import { checkImportQuota } from "./quota.service";

/** Personal balances stay on the user's private channel; gym balances belong to the workspace. */
export async function publishImportCreditBalance(workspaceId: string, userId: string) {
  try {
    const [workspace, quotaBalance] = await Promise.all([
      prisma.workspace.findUnique({ where: { id: workspaceId }, select: { type: true } }),
      checkImportQuota(workspaceId, userId),
    ]);
    if (!workspace) return;
    await publishToChannel(workspace.type === "GYM" ? `migration:${workspaceId}` : `user:${userId}`, "import:credits_updated", { workspaceId, quotaBalance });
  } catch {
    // A notification failure must never interrupt an already committed debit.
    console.warn("[Migration] Saldo em tempo real indisponível.");
  }
}
