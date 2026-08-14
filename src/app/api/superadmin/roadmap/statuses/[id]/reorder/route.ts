import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { superadminReorderStatus } from "@/lib/roadmap/services";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (session?.user?.role !== "SUPERADMIN") {
      return new NextResponse("Não autorizado", { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { direction } = body;

    if (direction !== "LEFT" && direction !== "RIGHT") {
      return new NextResponse("Direção inválida. Use LEFT ou RIGHT.", { status: 400 });
    }

    const statuses = await superadminReorderStatus(id, direction, session.user.id);
    return NextResponse.json({ success: true, statuses });
  } catch (error: any) {
    console.error("POST /api/superadmin/roadmap/statuses/[id]/reorder error:", error);
    return new NextResponse(error.message || "Erro ao reordenar coluna", { status: 500 });
  }
}
