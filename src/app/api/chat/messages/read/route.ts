import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { publishToChannel } from "@/lib/ably";

export async function POST(req: Request) {
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

    // Reset unread count for current user
    await prisma.conversationParticipant.updateMany({
      where: {
        conversationId,
        userId,
      },
      data: {
        unreadCount: 0,
      },
    });

    // Mark all other participants' messages as READ
    await prisma.message.updateMany({
      where: {
        conversationId,
        senderId: { not: userId },
        status: { not: "READ" },
      },
      data: {
        status: "READ",
      },
    });

    // Notify other participants in the conversation via Ably
    await publishToChannel(`conversation:${conversationId}`, "message:read_all", {
      readerId: userId,
    });

    return new NextResponse("Sucesso", { status: 200 });
  } catch (error) {
    console.error("[API Messages Read] Error:", error);
    return new NextResponse("Erro Interno do Servidor", { status: 500 });
  }
}
