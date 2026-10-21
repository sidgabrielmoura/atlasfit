import { chatUserDto } from "@/lib/avatar-response";
import { serializableTransaction } from "@/modules/workspaces/application/transaction";
import { finalizeGymStorage, gymAttachmentKeys, gymStoredObjectMetadata, isGymWorkspace } from "@/modules/workspaces/application/gym-storage";
import { WorkspaceAccessError } from "@/modules/workspaces/domain/types";
import { STORAGE_CHAT_TYPES } from "@/lib/storage-upload-policy";
import { assertChatConversation } from "@/modules/workspaces/application/chat-authority";
import { handleWorkspaceAccessError } from "@/modules/workspaces/application/guard";
import { withAuditedRequest } from "@/lib/audited-request";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { publishToChannel } from "@/lib/ably";
import { NotificationService } from "@/lib/notifications/service";
import { NotificationType, NotificationCategory } from "@/lib/notifications/types";

export const GET = withAuditedRequest(async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return new NextResponse("Não autorizado.", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get("conversationId");
    const cursor = searchParams.get("cursor");
    const requestedLimit = Number(searchParams.get("limit") || "30");
    const limit = Number.isFinite(requestedLimit) ? Math.min(100, Math.max(1, Math.trunc(requestedLimit))) : 30;

    if (!conversationId) {
      return new NextResponse("conversationId é obrigatório.", { status: 400 });
    }

    const userId = session.user.id;
    await assertChatConversation(conversationId, userId);

    // Query messages with cursor pagination
    const messages = await prisma.message.findMany({
      where: { conversationId },
      take: limit + 1, // Get one extra to determine if there is a next page
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            updatedAt: true,
          },
        },
        replyTo: {
          select: {
            id: true,
            type: true,
            content: true,
            attachment: true,
            sender: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    let nextCursor: string | null = null;
    if (messages.length > limit) {
      messages.pop();
      nextCursor = messages[messages.length - 1]?.id || null;
    }

    return NextResponse.json({
      messages: messages.map(message => ({ ...message, sender: chatUserDto(message.sender, conversationId) })),
      nextCursor,
    });
  } catch (error) {
    const denied = handleWorkspaceAccessError(error); if (denied) return denied;
    console.error("[API Messages GET] Error:", error);
    return new NextResponse("Erro Interno do Servidor", { status: 500 });
  }
});

export const POST = withAuditedRequest(async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return new NextResponse("Não autorizado.", { status: 401 });
    }

    const body = await req.json();
    const { conversationId, type, content, attachment, replyToId } = body;

    if (!conversationId || !type) {
      return new NextResponse("conversationId e type são obrigatórios.", { status: 400 });
    }

    const userId = session.user.id;
    const chat = await assertChatConversation(conversationId, userId);
    const gym = await isGymWorkspace(chat.workspaceId);
    const storedAttachments: { key: string; size: number }[] = [];
    if (gym && attachment && ["IMAGE", "VIDEO", "AUDIO", "FILE"].includes(type)) {
      const keys = gymAttachmentKeys(attachment);
      if (!keys.length) throw new WorkspaceAccessError(400, "INVALID_REQUEST", "Anexos da academia exigem upload conferido.");
      for (const key of keys) {
        const verified = await gymStoredObjectMetadata(key, chat.workspaceId, `chat/${userId}`, 50 * 1024 * 1024, STORAGE_CHAT_TYPES);
        storedAttachments.push({ key, size: verified.size });
      }
    }
    // Create message in transaction
    const { message: storedMessage, conversation } = await serializableTransaction(async (tx) => {
      await assertChatConversation(conversationId, userId, tx);
      if (replyToId && !await tx.message.findFirst({ where: { id: replyToId, conversationId }, select: { id: true } })) throw new WorkspaceAccessError(404, "RESOURCE_NOT_FOUND", "Mensagem de resposta de outra conversa.");
      for (const asset of storedAttachments) {
        await finalizeGymStorage(tx, { workspaceId: chat.workspaceId, actorUserId: userId, objectKey: asset.key, target: "chat_attachment", size: asset.size });
      }
      // 1. Create Message
      const msg = await tx.message.create({
        data: {
          conversationId,
          senderId: userId,
          type,
          content,
          attachment: attachment || undefined,
          replyToId: replyToId || undefined,
          status: "SENT", // Server creates it as SENT immediately
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              updatedAt: true,
            },
          },
          replyTo: {
            select: {
              id: true,
              type: true,
              content: true,
              attachment: true,
              sender: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      // Format preview for lastMessage
      let lastMsgText = "";
      if (type === "TEXT") {
        lastMsgText = content || "";
      } else {
        const typeLabels: Record<string, string> = {
          IMAGE: "📷 Foto",
          VIDEO: "🎥 Vídeo",
          AUDIO: "🎵 Mensagem de voz",
          FILE: "📄 Arquivo",
        };
        lastMsgText = typeLabels[type] || "Mensagem";
      }

      // 2. Update Conversation last message fields
      const updatedConv = await tx.conversation.update({
        where: { id: conversationId },
        data: {
          lastMessage: lastMsgText,
          lastMessageAt: new Date(),
        },
      });

      // 3. Increment unreadCount for all OTHER participants
      await tx.conversationParticipant.updateMany({
        where: {
          conversationId,
          userId: { not: userId },
        },
        data: {
          unreadCount: { increment: 1 },
        },
      });

      if (gym) await tx.auditLog.create({ data: { userId, action: "GYM_CHAT_MESSAGE_CREATED", entity: "MESSAGE", entityId: msg.id } });
      return { message: msg, conversation: updatedConv };
    });

    const message = { ...storedMessage, sender: chatUserDto(storedMessage.sender, conversationId) };

    // Publish to Ably channel for this conversation: new message event
    await publishToChannel(`conversation:${conversationId}`, "message:new", message);

    // Publish conversation list update event to the workspace chat channel
    await publishToChannel(`workspace:${conversation.workspaceId}:chat`, "conversation:update", {
      conversationId,
      messageId: message.id,
      lastMessage: conversation.lastMessage,
      lastMessageAt: conversation.lastMessageAt,
      senderId: userId,
    });

    // 4. Send Notifications to other participants (integrated with system push and preferences)
    try {
      const otherParticipants = await prisma.conversationParticipant.findMany({
        where: {
          conversationId,
          userId: { not: userId }
        }
      });

      if (otherParticipants.length > 0) {
        // Fetch sender user to get their name
        const senderUser = await prisma.user.findUnique({
          where: { id: userId },
          select: { name: true }
        });
        const senderName = senderUser?.name || "Mensagem";

        // Fetch last 5 messages in chronological order
        const last5 = await prisma.message.findMany({
          where: { conversationId },
          orderBy: { createdAt: "desc" },
          take: 5,
          include: {
            sender: {
              select: { name: true }
            }
          }
        });
        const chronological = [...last5].reverse();

        // Format active message body
        let currentMsgText = "";
        if (type === "TEXT") {
          currentMsgText = content || "";
        } else {
          const typeLabels: Record<string, string> = {
            IMAGE: "📷 Foto",
            VIDEO: "🎥 Vídeo",
            AUDIO: "🎵 Mensagem de voz",
            FILE: "📄 Arquivo",
          };
          const label = typeLabels[type] || "Anexo";
          currentMsgText = content ? `${label}: ${content}` : label;
        }

        // Format multiline WhatsApp-style text
        let finalDescription = currentMsgText;
        if (chronological.length > 1) {
          const historyLines = chronological.map(m => {
            let msgStr = "";
            if (m.type === "TEXT") {
              msgStr = m.content || "";
            } else {
              const typeLabels: Record<string, string> = {
                IMAGE: "📷 Foto",
                VIDEO: "🎥 Vídeo",
                AUDIO: "🎵 Mensagem de voz",
                FILE: "📄 Arquivo",
              };
              const label = typeLabels[m.type] || "Anexo";
              msgStr = m.content ? `${label}: ${m.content}` : label;
            }
            return `• ${m.sender.name}: ${msgStr}`;
          }).join("\n");

          finalDescription = `${currentMsgText}\n\nMensagens recentes:\n${historyLines}`;
        }

        for (const part of otherParticipants) {
          // Check recipient role to decide deepLink route
          const member = await prisma.workspaceMember.findFirst({
            where: {
              workspaceId: conversation.workspaceId,
              userId: part.userId,
            }
          });
          const deepLink = member?.role === "STUDENT" ? "/student/chat" : "/personal/chat";

          await NotificationService.sendNotification({
            userId: part.userId,
            type: NotificationType.MESSAGE_RECEIVED,
            category: NotificationCategory.MESSAGE,
            title: senderName,
            description: finalDescription,
            deepLink: deepLink,
            workspaceId: conversation.workspaceId,
            payload: {
              conversationId,
              messageId: message.id
            }
          });
        }
      }
    } catch (notifErr) {
      console.error("[API Messages POST] Notification dispatch failed:", notifErr);
    }

    return NextResponse.json(message);
  } catch (error) {
    const denied = handleWorkspaceAccessError(error); if (denied) return denied;
    console.error("[API Messages POST] Error:", error);
    return new NextResponse("Erro Interno do Servidor", { status: 500 });
  }
});
