import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { saveUserRecordEdit } from "@/lib/migration/review.service";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; recordId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Não autorizado.", { status: 401 });
  }

  const { recordId } = await params;

  try {
    const body = await req.json();
    const { normalizedData } = body;

    if (!normalizedData) {
      return new NextResponse("normalizedData é obrigatório.", { status: 400 });
    }

    const updated = await saveUserRecordEdit(recordId, normalizedData);
    return NextResponse.json(updated);
  } catch (error: any) {
    return new NextResponse(error.message || "Erro ao salvar alteração.", { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; recordId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Não autorizado.", { status: 401 });
  }

  const { recordId } = await params;

  try {
    await prisma.importRecord.delete({
      where: { id: recordId },
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return new NextResponse(error.message || "Erro ao excluir registro.", { status: 500 });
  }
}
