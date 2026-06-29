import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Não autorizado.", { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const { content } = body;

    if (!content) {
      return new NextResponse("O conteúdo da atividade é obrigatório.", { status: 400 });
    }

    const lead = await prisma.lead.findUnique({
      where: { id },
    });

    if (!lead || lead.ownerId !== session.user.id) {
      return new NextResponse("Lead não encontrado ou acesso negado.", { status: 404 });
    }

    const activity = await prisma.leadActivity.create({
      data: {
        leadId: id,
        content,
      },
    });

    return NextResponse.json(activity, { status: 201 });
  } catch (error) {
    console.error("POST crm activity error:", error);
    return new NextResponse("Erro interno do servidor.", { status: 500 });
  }
}
