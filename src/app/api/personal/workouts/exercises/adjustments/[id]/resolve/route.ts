import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

// POST /api/personal/workouts/exercises/adjustments/[id]/resolve
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

    const request = await prisma.exerciseAdjustmentRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      return new NextResponse("Solicitação não encontrada.", { status: 404 });
    }

    if (request.requesterId !== session.user.id && session.user.role !== "SUPERADMIN") {
      return new NextResponse("Apenas o solicitante ou o SuperAdmin podem marcar como resolvido.", { status: 403 });
    }

    const updatedRequest = await prisma.exerciseAdjustmentRequest.update({
      where: { id: requestId },
      data: {
        status: "RESOLVED",
      },
    });

    return NextResponse.json(updatedRequest);
  } catch (error) {
    console.error("Error resolving adjustment request:", error);
    return new NextResponse("Erro Interno do Servidor", { status: 500 });
  }
}
