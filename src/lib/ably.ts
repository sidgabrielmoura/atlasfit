import * as Ably from "ably";
import prisma from "./prisma";
import { assertChatConversation } from "@/modules/workspaces/application/chat-authority";
import { WorkspaceAccessError } from "@/modules/workspaces/domain/types";

// Global Ably REST client instance (resilient when ABLY_API_KEY is omitted in tests/dev)
export const ablyRest: Ably.Rest | null = process.env.ABLY_API_KEY
  ? new Ably.Rest(process.env.ABLY_API_KEY)
  : null;

/**
 * Publishes an event to a specified Ably channel.
 */
export async function publishToChannel(channelName: string, eventName: string, data: unknown) {
  if (!ablyRest) {
    return;
  }
  try {
    const chatMatch = /^workspace:([^:]+):chat$/.exec(channelName);
    if (chatMatch) {
      const id = typeof data === "object" && data !== null ? ("conversationId" in data ? data.conversationId : "id" in data ? data.id : undefined) : undefined;
      if (typeof id !== "string") throw new Error("Evento de conversa sem identificador.");
      const participants = await prisma.conversationParticipant.findMany({ where: { conversationId: id, leftAt: null, conversation: { workspaceId: chatMatch[1], workspace: { isActive: true } } }, select: { userId: true } });
      for (const participant of participants) {
        if (!await prisma.workspaceMember.findUnique({ where: { userId_workspaceId: { userId: participant.userId, workspaceId: chatMatch[1] }, isActive: true }, select: { id: true } })) continue;
        try { await assertChatConversation(id, participant.userId); }
        catch (error) { if (error instanceof WorkspaceAccessError) continue; throw error; }
        await ablyRest.channels.get(`user:${participant.userId}:workspace:${chatMatch[1]}:chat`).publish(eventName, data);
      }
      return;
    }
    const workspaceMatch = /^workspace:([^:]+)$/.exec(channelName);
    if (workspaceMatch) {
      const workspace = await prisma.workspace.findUnique({ where: { id: workspaceMatch[1] }, select: { type: true } });
      if (workspace?.type === "GYM") {
        if (!/financial|billing|invoice|payment|subscription/i.test(eventName)) throw new Error("Evento GYM sem canal operacional disponível.");
        channelName += ":finance";
      }
    }
    const channel = ablyRest.channels.get(channelName);
    await channel.publish(eventName, data);
  } catch (error) {
    console.error(`[Ably REST] Failed to publish event ${eventName} to channel ${channelName}:`, error);
  }
}
