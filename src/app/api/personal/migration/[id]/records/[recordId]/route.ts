import { NextResponse } from "next/server";
import { auth } from "@/auth";
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
