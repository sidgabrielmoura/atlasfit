import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { superadminUpdateStatus, superadminDeleteStatus } from "@/lib/roadmap/services";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (session?.user?.role !== "SUPERADMIN") {
      return new NextResponse("Não autorizado", { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();

    const updated = await superadminUpdateStatus(id, body, session.user.id);
    return NextResponse.json({ success: true, status: updated });
  } catch (error: any) {
    console.error("PATCH /api/superadmin/roadmap/statuses/[id] error:", error);
    return new NextResponse(error.message || "Erro ao atualizar coluna", { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (session?.user?.role !== "SUPERADMIN") {
      return new NextResponse("Não autorizado", { status: 403 });
    }

    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const targetStatusId = searchParams.get("targetStatusId") || null;

    const result = await superadminDeleteStatus(id, targetStatusId, session.user.id);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("DELETE /api/superadmin/roadmap/statuses/[id] error:", error);
    return new NextResponse(error.message || "Erro ao excluir coluna", { status: 500 });
  }
}
