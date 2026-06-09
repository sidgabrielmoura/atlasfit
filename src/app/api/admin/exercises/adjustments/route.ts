import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "SUPERADMIN") {
      return new NextResponse("Não autorizado.", { status: 401 });
    }

    const adjustments = await prisma.exerciseAdjustmentRequest.findMany({
      include: {
        exercise: {
          include: {
            muscleGroup: true,
          },
        },
        requester: {
          select: {
            name: true,
            email: true,
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
      orderBy: [
        {
          status: "asc",
        },
        {
          createdAt: "desc",
        },
      ],
    });

    const adjustmentsWithUnread = adjustments.map((adj) => {
      const unreadCount = adj.messages.filter(
        (m) => m.senderId !== session.user.id && !m.isReadByAdmin
      ).length;
      return {
        ...adj,
        unreadCount,
      };
    });

    return NextResponse.json(adjustmentsWithUnread);
  } catch (error) {
    console.error("Error fetching admin adjustments:", error);
    return new NextResponse("Erro Interno do Servidor", { status: 500 });
  }
}
