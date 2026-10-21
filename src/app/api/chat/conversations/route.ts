import { chatUserDto } from "@/lib/avatar-response";
import { serializableTransaction } from "@/modules/workspaces/application/transaction";
import { assertChatWorkspace } from "@/modules/workspaces/application/chat-authority";
import { handleWorkspaceAccessError } from "@/modules/workspaces/application/guard";
import { withAuditedRequest } from "@/lib/audited-request";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { publishToChannel } from "@/lib/ably";
import { assertGymChatContact, getGymChatContacts } from "@/modules/workspaces/application/gym-chat-contacts";

export const GET = withAuditedRequest(async function GET(req: Request) {
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
    await assertChatWorkspace(workspaceId, userId);
    const gym = (await prisma.workspace.findUniqueOrThrow({ where: { id: workspaceId }, select: { type: true } })).type === "GYM";
    const allowedParticipants = gym ? [userId, ...(await getGymChatContacts(workspaceId, userId)).map(contact => contact.id)] : undefined;
    const participantScope = allowedParticipants ? { participants: { every: { OR: [{ leftAt: { not: null } }, { userId: { in: allowedParticipants } }] } } } : {};

    // Check workspace membership
    const membership = await prisma.workspaceMember.findFirst({
      where: { userId, workspaceId, isActive: true },
    });
    if (!membership) {
      return new NextResponse("Acesso negado a este workspace.", { status: 403 });
    }

    // Settle offline delivery receipts
    await serializableTransaction(async tx => { await assertChatWorkspace(workspaceId, userId, tx); return tx.message.updateMany({
      where: {
        conversation: {
          AND: [participantScope],
          workspaceId,
          participants: {
            some: {
              userId, leftAt: null,
            },
          },
        },
        senderId: { not: userId },
        status: "SENT",
      },
      data: {
        status: "DELIVERED",
      },
    }); });

    // Find conversations where user is a participant
    const conversations = await prisma.conversation.findMany({
      where: {
        workspaceId,
        AND: [participantScope],
        participants: {
          some: {
            userId, leftAt: null,
          },
        },
      },
      include: {
        participants: {
          where: { leftAt: null },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                updatedAt: true,
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
      participants: c.participants.map(participant => ({ ...participant, user: chatUserDto(participant.user, c.id) })),
      lastSenderId: c.messages[0]?.senderId || null,
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    const denied = handleWorkspaceAccessError(error); if (denied) return denied;
    console.error("[API Conversations GET] Error:", error);
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
    const { workspaceId, targetUserId } = body;

    if (!workspaceId || !targetUserId) {
      return new NextResponse("workspaceId e targetUserId são obrigatórios.", { status: 400 });
    }

    const userId = session.user.id;
    await assertChatWorkspace(workspaceId, userId);

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
                updatedAt: true,
              },
            },
          },
        },
      },
    });

    if (existingConversation) {
      await serializableTransaction(tx => assertGymChatContact(tx, workspaceId, userId, targetUserId));
      return NextResponse.json({ ...existingConversation, participants: existingConversation.participants.map(participant => ({ ...participant, user: chatUserDto(participant.user, existingConversation.id) })) });
    }

    // Create a new direct conversation in a transaction
    const newConversation = await serializableTransaction(async (tx) => {
      await assertChatWorkspace(workspaceId, userId, tx);
      await assertChatWorkspace(workspaceId, targetUserId, tx);
      await assertGymChatContact(tx, workspaceId, userId, targetUserId);
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

      if ((await tx.workspace.findUniqueOrThrow({ where: { id: workspaceId }, select: { type: true } })).type === "GYM") await tx.auditLog.create({ data: { userId, action: "GYM_CHAT_CONVERSATION_CREATED", entity: "CONVERSATION", entityId: conv.id } });
      return conv;
    });

    // Query full conversation structure to return
    const storedConversation = await prisma.conversation.findUnique({
      where: { id: newConversation.id },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                updatedAt: true,
              },
            },
          },
        },
      },
    });

    const conversation = storedConversation ? { ...storedConversation, participants: storedConversation.participants.map(participant => ({ ...participant, user: chatUserDto(participant.user, storedConversation.id) })) } : null;

    // Notify other user via Ably workspace channel
    if (conversation) {
      await publishToChannel(`workspace:${workspaceId}:chat`, "conversation:new", conversation);
    }

    return NextResponse.json(conversation);
  } catch (error) {
    const denied = handleWorkspaceAccessError(error); if (denied) return denied;
    console.error("[API Conversations POST] Error:", error);
    return new NextResponse("Erro Interno do Servidor", { status: 500 });
  }
});
