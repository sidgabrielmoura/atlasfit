import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { publishToChannel } from "@/lib/ably";
import { NotificationService } from "@/lib/notifications/service";
import { NotificationType, NotificationCategory } from "@/lib/notifications/types";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return new NextResponse("Não autorizado.", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get("conversationId");
    const cursor = searchParams.get("cursor");
    const limit = parseInt(searchParams.get("limit") || "30", 10);

    if (!conversationId) {
      return new NextResponse("conversationId é obrigatório.", { status: 400 });
    }

    const userId = session.user.id;

    // Verify user is participant in conversation
    const isParticipant = await prisma.conversationParticipant.findFirst({
      where: { conversationId, userId },
    });
    if (!isParticipant) {
      return new NextResponse("Acesso negado a esta conversa.", { status: 403 });
    }

    // Query messages with cursor pagination
    const messages = await prisma.message.findMany({
      where: { conversationId },
      take: limit + 1, // Get one extra to determine if there is a next page
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
      orderBy: {
        createdAt: "desc", // Latest first, client will reverse for display
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            image: true,
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
      const nextItem = messages.pop(); // Remove extra item
      nextCursor = nextItem?.id || null;
    }

    return NextResponse.json({
      messages,
      nextCursor,
    });
  } catch (error) {
    console.error("[API Messages GET] Error:", error);
    return new NextResponse("Erro Interno do Servidor", { status: 500 });
  }
}

export async function POST(req: Request) {
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

    // Verify user is participant in conversation
    const isParticipant = await prisma.conversationParticipant.findFirst({
      where: { conversationId, userId },
    });
    if (!isParticipant) {
      return new NextResponse("Acesso negado a esta conversa.", { status: 403 });
    }

    // Create message in transaction
    const { message, conversation } = await prisma.$transaction(async (tx) => {
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
              image: true,
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

      return { message: msg, conversation: updatedConv };
    });

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
    console.error("[API Messages POST] Error:", error);
    return new NextResponse("Erro Interno do Servidor", { status: 500 });
  }
}
