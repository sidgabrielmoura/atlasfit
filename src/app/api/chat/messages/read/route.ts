import { runChatMutation } from "@/modules/workspaces/application/chat-authority";
import { assertChatConversation } from "@/modules/workspaces/application/chat-authority";
import { handleWorkspaceAccessError } from "@/modules/workspaces/application/guard";
import { withAuditedRequest } from "@/lib/audited-request";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { publishToChannel } from "@/lib/ably";

export const POST = withAuditedRequest(async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return new NextResponse("Não autorizado.", { status: 401 });
    }

    const body = await req.json();
    const { conversationId } = body;

    if (!conversationId) {
      return new NextResponse("conversationId é obrigatório.", { status: 400 });
    }

    const userId = session.user.id;

    const changed = await runChatMutation(conversationId, userId, "GYM_CHAT_READ_RECEIPTS_UPDATED", async tx => {
    // Reset unread count for current user
    const participant = await tx.conversationParticipant.updateMany({
      where: {
        conversationId,
        userId,
        leftAt: null,
        unreadCount: { gt: 0 },
      },
      data: {
        unreadCount: 0,
      },
    });

    // Mark all other participants' messages as READ
    const messages = await tx.message.updateMany({
      where: {
        conversationId,
        senderId: { not: userId },
        status: { not: "READ" },
      },
      data: {
        status: "READ",
      },
    });
    return participant.count + messages.count > 0;
    }, result => result);

    // Notify other participants in the conversation via Ably
    if (changed) await publishToChannel(`conversation:${conversationId}`, "message:read_all", {
      readerId: userId,
    });

    return new NextResponse("Sucesso", { status: 200 });
  } catch (error) {
    const denied = handleWorkspaceAccessError(error); if (denied) return denied;
    console.error("[API Messages Read] Error:", error);
    return new NextResponse("Erro Interno do Servidor", { status: 500 });
  }
});
