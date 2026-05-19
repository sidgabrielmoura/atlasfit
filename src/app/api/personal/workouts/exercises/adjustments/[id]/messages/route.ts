import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

// POST /api/personal/workouts/exercises/adjustments/[id]/messages
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Não autorizado.", { status: 401 });
    }

    const { id: requestId } = await params;
    const body = await req.json();
    const { message } = body;

    if (!message || !message.trim()) {
      return new NextResponse("Mensagem vazia não permitida.", { status: 400 });
    }

    // Verify request exists
    const request = await prisma.exerciseAdjustmentRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      return new NextResponse("Solicitação não encontrada.", { status: 404 });
    }

    // Identify if the sender is the requester or an admin
    const isTrainer = request.requesterId === session.user.id;
    const isAdmin = session.user.role === "SUPERADMIN";

    if (!isTrainer && !isAdmin) {
      return new NextResponse("Você não tem permissão para responder nesta solicitação.", { status: 403 });
    }

    // Create the message
    const newMessage = await prisma.adjustmentMessage.create({
      data: {
        requestId,
        senderId: session.user.id,
        message: message.trim(),
        isReadByTrainer: isTrainer, // Read if trainer sent it
        isReadByAdmin: isAdmin,     // Read if admin sent it
      },
    });

    // If trainer sent it, mark other admin messages as read as well
    if (isTrainer) {
      await prisma.adjustmentMessage.updateMany({
        where: {
          requestId,
          senderId: { not: session.user.id },
          isReadByTrainer: false,
        },
        data: {
          isReadByTrainer: true,
        },
      });
    }

    return NextResponse.json(newMessage);
  } catch (error) {
    console.error("Error creating adjustment message:", error);
    return new NextResponse("Erro Interno do Servidor", { status: 500 });
  }
}

// GET /api/personal/workouts/exercises/adjustments/[id]/messages
// Used to retrieve and mark all messages as read by trainer
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Não autorizado.", { status: 401 });
    }

    const { id: requestId } = await params;

    const request = await prisma.exerciseAdjustmentRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      return new NextResponse("Solicitação não encontrada.", { status: 404 });
    }

    // Mark as read by trainer if trainer fetches
    if (request.requesterId === session.user.id) {
      await prisma.adjustmentMessage.updateMany({
        where: {
          requestId,
          senderId: { not: session.user.id },
          isReadByTrainer: false,
        },
        data: {
          isReadByTrainer: true,
        },
      });
    }

    // Mark as read by admin if admin fetches
    if (session.user.role === "SUPERADMIN") {
      await prisma.adjustmentMessage.updateMany({
        where: {
          requestId,
          senderId: { not: session.user.id },
          isReadByAdmin: false,
        },
        data: {
          isReadByAdmin: true,
        },
      });
    }

    const messages = await prisma.adjustmentMessage.findMany({
      where: { requestId },
      orderBy: { createdAt: "asc" },
      include: {
        sender: {
          select: {
            name: true,
            role: true,
          },
        },
      },
    });

    return NextResponse.json(messages);
  } catch (error) {
    console.error("Error fetching adjustment messages:", error);
    return new NextResponse("Erro Interno do Servidor", { status: 500 });
  }
}
