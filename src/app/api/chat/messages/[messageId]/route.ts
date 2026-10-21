import { Prisma } from "@prisma/client";
import { runChatMutation } from "@/modules/workspaces/application/chat-authority";
import { serializableTransaction } from "@/modules/workspaces/application/transaction";
import { assertChatConversation } from "@/modules/workspaces/application/chat-authority";
import { handleWorkspaceAccessError } from "@/modules/workspaces/application/guard";
import { withAuditedRequest } from "@/lib/audited-request";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { publishToChannel } from "@/lib/ably";

export const PATCH = withAuditedRequest(async function PATCH(
  req: Request,
  { params }: { params: Promise<{ messageId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return new NextResponse("Não autorizado.", { status: 401 });
    }

    const { messageId } = await params;
    const body = await req.json();
    const { status, content } = body;

    const userId = session.user.id;

    const existingMessage = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        conversation: true,
      },
    });

    if (!existingMessage) {
      return new NextResponse("Mensagem não encontrada.", { status: 404 });
    }

    // Verify user is participant in conversation
    const isParticipant = await prisma.conversationParticipant.findFirst({
      where: { conversationId: existingMessage.conversationId, userId },
    });
    if (!isParticipant) {
      return new NextResponse("Acesso negado.", { status: 403 });
    }

    await assertChatConversation(existingMessage.conversationId, userId);
    // Edit message content
    if (content !== undefined) {
      if (existingMessage.senderId !== userId) {
        return new NextResponse("Apenas o remetente pode editar esta mensagem.", { status: 403 });
      }

      const updatedMessage = await runChatMutation(existingMessage.conversationId, userId, "GYM_CHAT_MESSAGE_UPDATED", tx => tx.message.update({
        where: { id: messageId },
        data: {
          content,
        },
        include: {
          sender: {
            select: { id: true, name: true, image: true },
          },
          replyTo: true,
        },
      }));

      // Notify Ably about edited message
      await publishToChannel(`conversation:${existingMessage.conversationId}`, "message:update", updatedMessage);

      return NextResponse.json(updatedMessage);
    }

    // Update message status (Sent, Delivered, Read)
    if (status !== undefined) {
      const updatedMessage = await runChatMutation(existingMessage.conversationId, userId, "GYM_CHAT_MESSAGE_UPDATED", tx => tx.message.update({
        where: { id: messageId },
        data: {
          status,
        },
        include: {
          sender: {
            select: { id: true, name: true, image: true },
          },
          replyTo: true,
        },
      }));

      // Notify Ably about status change
      await publishToChannel(`conversation:${existingMessage.conversationId}`, "message:status", {
        messageId,
        status,
      });

      return NextResponse.json(updatedMessage);
    }

    return new NextResponse("Sem modificações solicitadas.", { status: 400 });
  } catch (error) {
    const denied = handleWorkspaceAccessError(error); if (denied) return denied;
    console.error("[API Message PATCH] Error:", error);
    return new NextResponse("Erro Interno do Servidor", { status: 500 });
  }
});

export const DELETE = withAuditedRequest(async function DELETE(
  req: Request,
  { params }: { params: Promise<{ messageId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return new NextResponse("Não autorizado.", { status: 401 });
    }

    const { messageId } = await params;
    const userId = session.user.id;

    const existingMessage = await prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!existingMessage) {
      return new NextResponse("Mensagem não encontrada.", { status: 404 });
    }

    if (existingMessage.senderId !== userId) {
      return new NextResponse("Apenas o remetente pode excluir esta mensagem.", { status: 403 });
    }

    await assertChatConversation(existingMessage.conversationId, userId);
    // Soft delete: clear attachments, clear replyToId, and change text content to "Esta mensagem foi excluída"
    // Run inside transaction to safely update conversation metadata if this was the last message
    const { deletedMessage, conversation } = await serializableTransaction(async (tx) => {
      await assertChatConversation(existingMessage.conversationId, userId, tx);
      const msg = await tx.message.update({
        where: { id: messageId },
        data: {
          type: "TEXT",
          content: "Esta mensagem foi excluída.",
          attachment: Prisma.DbNull,
          replyToId: null,
        },
        include: {
          sender: {
            select: { id: true, name: true, image: true },
          },
          replyTo: true,
        },
      });

      const conv = await tx.conversation.findUnique({
        where: { id: msg.conversationId },
      });

      const latestMsg = await tx.message.findFirst({
        where: { conversationId: msg.conversationId },
        orderBy: { createdAt: "desc" },
      });

      let updatedConv = conv;
      if (conv && latestMsg && latestMsg.id === msg.id) {
        updatedConv = await tx.conversation.update({
          where: { id: msg.conversationId },
          data: {
            lastMessage: "Esta mensagem foi excluída.",
            lastMessageAt: msg.createdAt,
          },
        });
      }

      if ((await tx.workspace.findUniqueOrThrow({ where: { id: conv!.workspaceId }, select: { type: true } })).type === "GYM") await tx.auditLog.create({ data: { userId, action: "GYM_CHAT_MESSAGE_DELETED", entity: "MESSAGE", entityId: msg.id } });
      return { deletedMessage: msg, conversation: updatedConv };
    });

    // Notify Ably about deletion (update clients in conversation)
    await publishToChannel(`conversation:${existingMessage.conversationId}`, "message:delete", {
      messageId,
      deletedMessage,
    });

    // Notify Ably workspace chat channel about conversation update
    if (conversation) {
      await publishToChannel(`workspace:${conversation.workspaceId}:chat`, "conversation:update", {
        conversationId: conversation.id,
        messageId: deletedMessage.id,
        lastMessage: conversation.lastMessage,
        lastMessageAt: conversation.lastMessageAt,
        senderId: userId,
      });
    }

    return NextResponse.json(deletedMessage);
  } catch (error) {
    const denied = handleWorkspaceAccessError(error); if (denied) return denied;
    console.error("[API Message DELETE] Error:", error);
    return new NextResponse("Erro Interno do Servidor", { status: 500 });
  }
});
