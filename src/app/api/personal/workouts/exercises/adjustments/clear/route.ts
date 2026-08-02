import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

// POST /api/personal/workouts/exercises/adjustments/clear
// Clears/Deletes resolved adjustment requests
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Não autorizado.", { status: 401 });
    }

    const isSuperAdmin = session.user.role === "SUPERADMIN";

    if (isSuperAdmin) {
      // SuperAdmin deletes resolved adjustment requests
      await prisma.exerciseAdjustmentRequest.deleteMany({
        where: {
          status: "RESOLVED",
        },
      });
    } else {
      // Personal deletes their own resolved adjustment requests
      await prisma.exerciseAdjustmentRequest.deleteMany({
        where: {
          requesterId: session.user.id,
          status: "RESOLVED",
        },
      });
    }

    return NextResponse.json({ success: true, message: "Solicitações de reajuste limpas." });
  } catch (error) {
    console.error("Error clearing adjustment requests:", error);
    return new NextResponse("Erro Interno do Servidor", { status: 500 });
  }
}
