import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { publishToChannel } from "@/lib/ably";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return new NextResponse("Não autorizado.", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId");

    if (!workspaceId) {
      return new NextResponse("workspaceId é obrigatório.", { status: 400 });
    }

    const userId = session.user.id;

    // Check workspace membership
    const membership = await prisma.workspaceMember.findFirst({
      where: { userId, workspaceId, isActive: true },
    });
    if (!membership) {
      return new NextResponse("Acesso negado a este workspace.", { status: 403 });
    }

    // Settle offline delivery receipts
    await prisma.message.updateMany({
      where: {
        conversation: {
          workspaceId,
          participants: {
            some: {
              userId,
            },
          },
        },
        senderId: { not: userId },
        status: "SENT",
      },
      data: {
        status: "DELIVERED",
      },
    });

    // Find conversations where user is a participant
    const conversations = await prisma.conversation.findMany({
      where: {
        workspaceId,
        participants: {
          some: {
            userId,
          },
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
        },
        messages: {
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
          select: {
            senderId: true,
          },
        },
      },
      orderBy: {
        lastMessageAt: "desc",
      },
    });

    const formatted = conversations.map((c) => ({
      id: c.id,
      workspaceId: c.workspaceId,
      type: c.type,
      lastMessage: c.lastMessage,
      lastMessageAt: c.lastMessageAt,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      participants: c.participants,
      lastSenderId: c.messages[0]?.senderId || null,
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("[API Conversations GET] Error:", error);
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
    const { workspaceId, targetUserId } = body;

    if (!workspaceId || !targetUserId) {
      return new NextResponse("workspaceId e targetUserId são obrigatórios.", { status: 400 });
    }

    const userId = session.user.id;

    if (userId === targetUserId) {
      return new NextResponse("Não é possível criar uma conversa direta consigo mesmo.", { status: 400 });
    }

    // Verify memberships for both users
    const memberships = await prisma.workspaceMember.findMany({
      where: {
        userId: { in: [userId, targetUserId] },
        workspaceId,
        isActive: true,
      },
    });

    if (memberships.length < 2) {
      return new NextResponse("Um ou ambos os participantes não pertencem a este workspace.", { status: 400 });
    }

    // Check if DIRECT conversation already exists between these two users
    const existingConversation = await prisma.conversation.findFirst({
      where: {
        workspaceId,
        type: "DIRECT",
        AND: [
          { participants: { some: { userId } } },
          { participants: { some: { userId: targetUserId } } },
        ],
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
        },
      },
    });

    if (existingConversation) {
      return NextResponse.json(existingConversation);
    }

    // Create a new direct conversation in a transaction
    const newConversation = await prisma.$transaction(async (tx) => {
      const conv = await tx.conversation.create({
        data: {
          workspaceId,
          type: "DIRECT",
          lastMessageAt: new Date(),
        },
      });

      // Create participants
      await tx.conversationParticipant.createMany({
        data: [
          { conversationId: conv.id, userId, role: "MEMBER" },
          { conversationId: conv.id, userId: targetUserId, role: "MEMBER" },
        ],
      });

      return conv;
    });

    // Query full conversation structure to return
    const conversation = await prisma.conversation.findUnique({
      where: { id: newConversation.id },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
        },
      },
    });

    // Notify other user via Ably workspace channel
    if (conversation) {
      await publishToChannel(`workspace:${workspaceId}:chat`, "conversation:new", conversation);
    }

    return NextResponse.json(conversation);
  } catch (error) {
    console.error("[API Conversations POST] Error:", error);
    return new NextResponse("Erro Interno do Servidor", { status: 500 });
  }
}
