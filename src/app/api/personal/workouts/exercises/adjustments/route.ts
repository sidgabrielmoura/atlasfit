import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

// GET /api/personal/workouts/exercises/adjustments
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Não autorizado.", { status: 401 });
    }

    const adjustments = await prisma.exerciseAdjustmentRequest.findMany({
      where: {
        requesterId: session.user.id,
      },
      include: {
        exercise: {
          include: {
            muscleGroup: true,
          },
        },
        messages: {
          orderBy: {
            createdAt: "asc",
          },
          include: {
            sender: {
              select: {
                name: true,
                role: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Count unread messages sent by SuperAdmin for each adjustment
    const adjustmentsWithUnreadCount = adjustments.map((adj: any) => {
      const unreadCount = adj.messages.filter(
        (m: any) => m.senderId !== session.user.id && !m.isReadByTrainer
      ).length;
      return {
        ...adj,
        unreadCount,
      };
    });

    return NextResponse.json(adjustmentsWithUnreadCount);
  } catch (error) {
    console.error("Error fetching trainer adjustments:", error);
    return new NextResponse("Erro Interno do Servidor", { status: 500 });
  }
}

// POST /api/personal/workouts/exercises/adjustments
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Não autorizado.", { status: 401 });
    }

    const body = await req.json();
    const { exerciseId, description } = body;

    if (!exerciseId) {
      return new NextResponse("ID do exercício é obrigatório.", { status: 400 });
    }

    if (!description || !description.trim()) {
      return new NextResponse("Descrição do problema é obrigatória.", { status: 400 });
    }

    // Verify exercise exists
    const exerciseExists = await prisma.exercise.findUnique({
      where: { id: exerciseId },
    });

    if (!exerciseExists) {
      return new NextResponse("Exercício não encontrado.", { status: 404 });
    }

    // Check if there is already an active (PENDING) adjustment request for this exercise by this trainer
    const existingPendingRequest = await prisma.exerciseAdjustmentRequest.findFirst({
      where: {
        exerciseId,
        requesterId: session.user.id,
        status: "PENDING",
      },
    });

    if (existingPendingRequest) {
      return new NextResponse("Você já possui uma solicitação em andamento para este exercício.", { status: 400 });
    }

    // Create the adjustment request
    const adjustmentRequest = await prisma.exerciseAdjustmentRequest.create({
      data: {
        exerciseId,
        description: description.trim(),
        requesterId: session.user.id,
        status: "PENDING",
      },
    });

    // Add the initial message as the description sent by the trainer
    await prisma.adjustmentMessage.create({
      data: {
        requestId: adjustmentRequest.id,
        senderId: session.user.id,
        message: description.trim(),
        isReadByTrainer: true, // Already read by trainer as they sent it
        isReadByAdmin: false,  // Unread by SuperAdmin
      },
    });

    return NextResponse.json(adjustmentRequest);
  } catch (error) {
    console.error("Error creating adjustment request:", error);
    return new NextResponse("Erro Interno do Servidor", { status: 500 });
  }
}
