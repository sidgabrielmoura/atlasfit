import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { addComment, editComment, deleteComment } from "@/lib/roadmap/services";
import { commentSchema, editCommentSchema } from "@/lib/roadmap/schemas";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Não autorizado.", { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const parsed = commentSchema.parse({ ...body, featureId: id });

    const isOfficial = session.user.role === "SUPERADMIN";
    const comment = await addComment(id, session.user.id, parsed.content, parsed.parentId, isOfficial);

    return NextResponse.json({ success: true, comment });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return new NextResponse(error.errors[0]?.message || "Dados inválidos", { status: 400 });
    }
    console.error("POST /api/roadmap/features/[id]/comments error:", error);
    return new NextResponse("Erro ao adicionar comentário", { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Não autorizado.", { status: 401 });
    }

    const body = await req.json();
    const { commentId, content } = body;
    const parsed = editCommentSchema.parse({ content });

    const isSuperAdmin = session.user.role === "SUPERADMIN";
    const comment = await editComment(commentId, session.user.id, parsed.content, isSuperAdmin);

    return NextResponse.json({ success: true, comment });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return new NextResponse(error.errors[0]?.message || "Dados inválidos", { status: 400 });
    }
    console.error("PATCH /api/roadmap/features/comments error:", error);
    return new NextResponse(error.message || "Erro ao editar comentário", { status: 400 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Não autorizado.", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const commentId = searchParams.get("commentId");

    if (!commentId) {
      return new NextResponse("commentId é obrigatório", { status: 400 });
    }

    const isSuperAdmin = session.user.role === "SUPERADMIN";
    await deleteComment(commentId, session.user.id, isSuperAdmin);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE /api/roadmap/features/comments error:", error);
    return new NextResponse(error.message || "Erro ao excluir comentário", { status: 400 });
  }
}
