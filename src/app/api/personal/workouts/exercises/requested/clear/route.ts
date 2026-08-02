import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

// POST /api/personal/workouts/exercises/requested/clear
// Clears/Deletes requested exercises created by the current trainer (or resolved/rejected ones)
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Não autorizado.", { status: 401 });
    }

    const isSuperAdmin = session.user.role === "SUPERADMIN";

    if (isSuperAdmin) {
      // SuperAdmin clears approved/rejected or all historical requested exercises
      await prisma.exercise.deleteMany({
        where: {
          isOfficial: false,
          status: { in: ["APPROVED", "REJECTED"] },
        },
      });
    } else {
      // Personal clears their own requested exercises that are APPROVED or REJECTED
      // (or disassociates them from creator view)
      await prisma.exercise.updateMany({
        where: {
          creatorId: session.user.id,
          isOfficial: false,
          status: { in: ["APPROVED", "REJECTED"] },
        },
        data: {
          creatorId: null,
        },
      });
    }

    return NextResponse.json({ success: true, message: "Solicitações de exercícios limpas." });
  } catch (error) {
    console.error("Error clearing requested exercises:", error);
    return new NextResponse("Erro Interno do Servidor", { status: 500 });
  }
}
