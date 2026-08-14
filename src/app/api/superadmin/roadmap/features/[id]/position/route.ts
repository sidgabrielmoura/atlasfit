import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { superadminMoveFeaturePosition } from "@/lib/roadmap/services";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (session?.user?.role !== "SUPERADMIN") {
      return new NextResponse("Não autorizado", { status: 403 });
    }

    const { id } = await params;
    const { position } = await req.json();

    if (position !== "TOP" && position !== "BOTTOM") {
      return new NextResponse("Posição inválida. Use TOP ou BOTTOM.", { status: 400 });
    }

    const updated = await superadminMoveFeaturePosition(id, position, session.user.id);

    return NextResponse.json({ success: true, feature: updated });
  } catch (error: any) {
    console.error("POST /api/superadmin/roadmap/features/[id]/position error:", error);
    return new NextResponse(error.message || "Erro ao reposicionar funcionalidade", { status: 500 });
  }
}
