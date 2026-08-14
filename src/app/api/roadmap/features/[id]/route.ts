import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getFeatureDetails, editTrainerSuggestion, deleteTrainerSuggestion } from "@/lib/roadmap/services";
import { editSuggestionSchema } from "@/lib/roadmap/schemas";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    const { id } = await params;
    const feature = await getFeatureDetails(id, session?.user?.id);

    if (!feature) {
      return new NextResponse("Funcionalidade não encontrada", { status: 404 });
    }

    return NextResponse.json(feature);
  } catch (error: any) {
    console.error("GET /api/roadmap/features/[id] error:", error);
    return new NextResponse("Erro ao carregar funcionalidade", { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Não autorizado.", { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const parsed = editSuggestionSchema.parse(body);

    const isSuperAdmin = session.user.role === "SUPERADMIN";
    const updated = await editTrainerSuggestion(id, session.user.id, parsed, isSuperAdmin);

    return NextResponse.json(updated);
  } catch (error: any) {
    if (error.name === "ZodError") {
      return new NextResponse(error.errors[0]?.message || "Dados inválidos", { status: 400 });
    }
    console.error("PATCH /api/roadmap/features/[id] error:", error);
    return new NextResponse(error.message || "Erro ao editar sugestão", { status: 400 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Não autorizado.", { status: 401 });
    }

    const { id } = await params;
    const isSuperAdmin = session.user.role === "SUPERADMIN";

    await deleteTrainerSuggestion(id, session.user.id, isSuperAdmin);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE /api/roadmap/features/[id] error:", error);
    return new NextResponse(error.message || "Erro ao excluir sugestão", { status: 400 });
  }
}
