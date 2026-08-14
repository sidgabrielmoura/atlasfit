import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { superadminMoveAllCardsInStatus } from "@/lib/roadmap/services";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (session?.user?.role !== "SUPERADMIN") {
      return new NextResponse("Não autorizado", { status: 403 });
    }

    const { id: fromStatusId } = await params;
    const body = await req.json();
    const { toStatusId } = body;

    if (!toStatusId) {
      return new NextResponse("Coluna de destino é obrigatória", { status: 400 });
    }

    const result = await superadminMoveAllCardsInStatus(fromStatusId, toStatusId, session.user.id);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("POST /api/superadmin/roadmap/statuses/[id]/move-cards error:", error);
    return new NextResponse(error.message || "Erro ao transferir cards da coluna", { status: 500 });
  }
}
