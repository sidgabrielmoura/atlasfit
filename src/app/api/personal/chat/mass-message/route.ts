import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { publishToChannel } from "@/lib/ably";
import { NotificationService } from "@/lib/notifications/service";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Não autorizado.", { status: 401 });
    }

    const trainerId = session.user.id;
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId");
    const objective = searchParams.get("objective");
    const chatStatus = searchParams.get("chatStatus");
    const modality = searchParams.get("modality");

    if (!workspaceId) {
      return new NextResponse("workspaceId é obrigatório.", { status: 400 });
    }

    // Verify trainer is owner or member of workspace
    const trainerMember = await prisma.workspaceMember.findFirst({
      where: { userId: trainerId, workspaceId, isActive: true },
    });
    if (!trainerMember) {
      return new NextResponse("Acesso negado a este workspace.", { status: 403 });
    }

    // Fetch all active students in the workspace
    const studentMembers = await prisma.workspaceMember.findMany({
      where: {
        workspaceId,
        role: "STUDENT",
        isActive: true,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            objective: true,
            chatParticipations: {
              where: {
                conversation: {
                  workspaceId,
                  type: "DIRECT",
                  participants: {
                    some: {
                      userId: trainerId,
                    },
                  },
                },
              },
              include: {
                conversation: {
                  select: {
                    id: true,
                    messages: {
                      take: 1,
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    // Apply filters
    const targetStudents = studentMembers.filter((member) => {
      // 1. Group / Objective filter
      if (objective && objective !== "all") {
        if (!member.user.objective || member.user.objective.toLowerCase() !== objective.toLowerCase()) {
          return false;
        }
      }

      // 2. Modality filter
      if (modality && modality !== "all") {
        if (!member.modality || member.modality.toLowerCase() !== modality.toLowerCase()) {
          return false;
        }
      }

      // 3. Chat activity filter
      const hasMessages = member.user.chatParticipations.some(
        (part) => part.conversation.messages.length > 0
      );
      if (chatStatus === "no_messages" && hasMessages) {
        return false;
      }
      if (chatStatus === "active_chat" && !hasMessages) {
        return false;
      }

      return true;
    });

    return NextResponse.json({ count: targetStudents.length });
  } catch (error) {
    console.error("[API Chat Mass Message GET] Error:", error);
    return new NextResponse("Erro Interno do Servidor", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Não autorizado.", { status: 401 });
    }

    const trainerId = session.user.id;
    const body = await req.json();
    const { workspaceId, filters, messageType, content, attachment } = body;

    if (!workspaceId || !filters || !messageType) {
      return new NextResponse("Campos obrigatórios ausentes.", { status: 400 });
    }

    const { objective, chatStatus, modality } = filters;

    // Verify trainer is owner or member of workspace
    const trainerMember = await prisma.workspaceMember.findFirst({
      where: { userId: trainerId, workspaceId, isActive: true },
    });
    if (!trainerMember) {
      return new NextResponse("Acesso negado a este workspace.", { status: 403 });
    }

    // Fetch all active students in the workspace
    const studentMembers = await prisma.workspaceMember.findMany({
      where: {
        workspaceId,
        role: "STUDENT",
        isActive: true,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            objective: true,
            chatParticipations: {
              where: {
                conversation: {
                  workspaceId,
                  type: "DIRECT",
                  participants: {
                    some: {
                      userId: trainerId,
                    },
                  },
                },
              },
              include: {
                conversation: {
                  select: {
                    id: true,
                    messages: {
                      take: 1,
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    // Apply filters
    const targetStudents = studentMembers.filter((member) => {
      // 1. Group / Objective filter
      if (objective && objective !== "all") {
        if (!member.user.objective || member.user.objective.toLowerCase() !== objective.toLowerCase()) {
          return false;
        }
      }

      // 2. Modality filter
      if (modality && modality !== "all") {
        if (!member.modality || member.modality.toLowerCase() !== modality.toLowerCase()) {
          return false;
        }
      }

      // 3. Chat activity filter
      const hasMessages = member.user.chatParticipations.some(
        (part) => part.conversation.messages.length > 0
      );
      if (chatStatus === "no_messages" && hasMessages) {
        return false;
      }
      if (chatStatus === "active_chat" && !hasMessages) {
        return false;
      }

      return true;
    });

    if (targetStudents.length === 0) {
      return NextResponse.json({ success: true, count: 0, message: "Nenhum aluno correspondeu aos filtros selecionados." });
    }

    // Prepare message formats
    let lastMsgText = "";
    if (messageType === "TEXT") {
      lastMsgText = content || "";
    } else {
      const typeLabels: Record<string, string> = {
        IMAGE: "📷 Foto",
        VIDEO: "🎥 Vídeo",
        AUDIO: "🎵 Mensagem de voz",
        FILE: "📄 Arquivo",
      };
      lastMsgText = typeLabels[messageType] || "Mensagem";
    }

    const trainerName = session.user.name || "Seu Treinador";

    // Loop through each student to find/create conversation and send message
    for (const student of targetStudents) {
      const studentId = student.user.id;

      try {
        let conversationId = "";

        // Check if there is an existing conversation participant record
        const existingParticipation = student.user.chatParticipations[0];
        if (existingParticipation) {
          conversationId = existingParticipation.conversationId;
        } else {
          // Double check or create DIRECT conversation
          const existingConv = await prisma.conversation.findFirst({
            where: {
              workspaceId,
              type: "DIRECT",
              AND: [
                { participants: { some: { userId: trainerId } } },
                { participants: { some: { userId: studentId } } },
              ],
            },
            select: { id: true },
          });

          if (existingConv) {
            conversationId = existingConv.id;
          } else {
            // Create a new direct conversation
            const newConv = await prisma.conversation.create({
              data: {
                workspaceId,
                type: "DIRECT",
                lastMessageAt: new Date(),
                participants: {
                  createMany: {
                    data: [
                      { userId: trainerId, role: "MEMBER" },
                      { userId: studentId, role: "MEMBER" },
                    ],
                  },
                },
              },
            });
            conversationId = newConv.id;
            
            // Query new full conversation structure to notify the other user about the new conversation
            const fullConv = await prisma.conversation.findUnique({
              where: { id: conversationId },
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
            if (fullConv) {
              await publishToChannel(`workspace:${workspaceId}:chat`, "conversation:new", fullConv);
            }
          }
        }

        // Create the Message and update last message info in a transaction
        const message = await prisma.$transaction(async (tx) => {
          const msg = await tx.message.create({
            data: {
              conversationId,
              senderId: trainerId,
              type: messageType,
              content,
              attachment: attachment || undefined,
              status: "SENT",
            },
            include: {
              sender: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                },
              },
            },
          });

          await tx.conversation.update({
            where: { id: conversationId },
            data: {
              lastMessage: lastMsgText,
              lastMessageAt: new Date(),
            },
          });

          await tx.conversationParticipant.updateMany({
            where: {
              conversationId,
              userId: studentId,
            },
            data: {
              unreadCount: { increment: 1 },
            },
          });

          return msg;
        });

        // Publish to Ably channel for this conversation: new message event
        await publishToChannel(`conversation:${conversationId}`, "message:new", message);

        // Publish conversation list update event
        await publishToChannel(`workspace:${workspaceId}:chat`, "conversation:update", {
          conversationId,
          messageId: message.id,
          lastMessage: lastMsgText,
          lastMessageAt: new Date(),
          senderId: trainerId,
        });

        // Send Push/In-app Notification
        await NotificationService.sendNotification({
          userId: studentId,
          type: "MESSAGE_RECEIVED",
          category: "MESSAGE",
          title: trainerName,
          description: lastMsgText || "Enviou um anexo.",
          deepLink: "/student/chat",
          workspaceId,
          payload: {
            conversationId,
            messageId: message.id,
          },
        });
      } catch (err) {
        console.error(`Failed to send mass message to student ${studentId}:`, err);
      }
    }

    return NextResponse.json({ success: true, count: targetStudents.length });
  } catch (error) {
    console.error("[API Chat Mass Message POST] Error:", error);
    return new NextResponse("Erro Interno do Servidor", { status: 500 });
  }
}
