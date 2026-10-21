import prisma from "@/lib/prisma";
import type { GymTransactionClient } from "./transaction";
import { assertGymOperationalWorkspace } from "./gym-license";
import { resolveNavigationRoles } from "../domain/access-roles";
import { WorkspaceAccessError } from "../domain/types";
import { serializableTransaction } from "./transaction";

/** Shared chat must revalidate the tenant even with a session or an old conversation. */
export async function assertChatWorkspace(workspaceId: string, userId: string, tx: GymTransactionClient = prisma) {
  const workspace = await tx.workspace.findUnique({ where: { id: workspaceId }, select: { isActive: true, type: true, ownerId: true } });
  if (!workspace?.isActive) throw new WorkspaceAccessError(403, "WORKSPACE_SUSPENDED", "Workspace indisponível para chat.");
  if (workspace.type === "GYM") await assertGymOperationalWorkspace(workspaceId, tx);
  const member = await tx.workspaceMember.findUnique({ where: { userId_workspaceId: { workspaceId, userId } }, include: { roleGrants: true } });
  if (!member?.isActive) throw new WorkspaceAccessError(403, "NOT_A_MEMBER", "Vínculo ativo necessário para chat.");
  if (workspace.type === "GYM") {
    const units = await tx.gymUnit.findMany({ where: { workspaceId, isActive: true }, select: { id: true } });
    if (workspace.ownerId !== userId && member.unitId && !units.some(unit => unit.id === member.unitId) && !member.roleGrants.length) throw new WorkspaceAccessError(403, "TENANT_MISMATCH", "Unidade do vínculo indisponível.");
    if (!resolveNavigationRoles(member.role, member.roleGrants, units.map(unit => unit.id)).length) throw new WorkspaceAccessError(403, "INSUFFICIENT_PERMISSIONS", "Papéis do vínculo revogados.");
  }
  return member;
}
export async function assertChatConversation(conversationId: string, userId: string, tx: GymTransactionClient = prisma) {
  const conversation = await tx.conversation.findFirst({ where: { id: conversationId, participants: { some: { userId, leftAt: null } } }, select: { id: true, workspaceId: true, participants: { where: { leftAt: null, userId: { not: userId } }, select: { userId: true } } } });
  if (!conversation) throw new WorkspaceAccessError(403, "FORBIDDEN_RESOURCE", "Conversa indisponível para este participante.");
  await assertChatWorkspace(conversation.workspaceId, userId, tx);
  if ((await tx.workspace.findUniqueOrThrow({ where: { id: conversation.workspaceId }, select: { type: true } })).type === "GYM") {
    const { assertGymChatContact } = await import("./gym-chat-contacts");
    for (const participant of conversation.participants) await assertGymChatContact(tx, conversation.workspaceId, userId, participant.userId);
  }
  return conversation;
}
export function runChatMutation<T>(conversationId: string, userId: string, action: string, operation: (tx: GymTransactionClient) => Promise<T>, shouldAudit: (result: T) => boolean = () => true) {
  return serializableTransaction(async tx => {
    const conversation = await assertChatConversation(conversationId, userId, tx);
    const result = await operation(tx);
    if (shouldAudit(result) && (await tx.workspace.findUniqueOrThrow({ where: { id: conversation.workspaceId }, select: { type: true } })).type === "GYM") await tx.auditLog.create({ data: { userId, action, entity: "CONVERSATION", entityId: conversationId } });
    return result;
  });
}
