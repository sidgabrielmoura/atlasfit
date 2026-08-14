import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { superadminDuplicateFeature } from "@/lib/roadmap/services";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (session?.user?.role !== "SUPERADMIN") {
      return new NextResponse("Não autorizado", { status: 403 });
    }

    const { id } = await params;
    const duplicated = await superadminDuplicateFeature(id, session.user.id);

    return NextResponse.json({ success: true, feature: duplicated });
  } catch (error: any) {
    console.error("POST /api/superadmin/roadmap/features/[id]/duplicate error:", error);
    return new NextResponse(error.message || "Erro ao duplicar funcionalidade", { status: 500 });
  }
}
