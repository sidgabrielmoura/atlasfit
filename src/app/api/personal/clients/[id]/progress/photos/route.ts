import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

// GET /api/personal/clients/[id]/progress/photos
// Retorna o histórico de fotos de evolução visual do aluno
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Não autorizado.", { status: 401 });
  }

  const { id: studentId } = await params;
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspaceId");

  if (!workspaceId) {
    return new NextResponse("O ID do workspace é obrigatório.", { status: 400 });
  }

  try {
    // Validar se o personal trainer pertence ao workspace
    const trainerMember = await prisma.workspaceMember.findFirst({
      where: {
        userId: session.user.id,
        workspaceId,
      },
    });

    if (!trainerMember) {
      return new NextResponse("Acesso negado a este workspace.", { status: 403 });
    }

    // Buscar fotos ordenadas cronologicamente
    const photos = await prisma.studentProgressPhoto.findMany({
      where: {
        studentId,
        workspaceId,
      },
      orderBy: {
        date: "asc",
      },
    });

    return NextResponse.json(photos);
  } catch (error) {
    console.error("GET progress photos error:", error);
    return new NextResponse("Erro interno do servidor.", { status: 500 });
  }
}

// POST /api/personal/clients/[id]/progress/photos
// Adiciona uma nova foto à linha do tempo
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Não autorizado.", { status: 401 });
  }

  const { id: studentId } = await params;

  try {
    const body = await req.json();
    const { workspaceId, photoUrl, date, comment } = body;

    if (!workspaceId) {
      return new NextResponse("O ID do workspace é obrigatório.", { status: 400 });
    }

    if (!photoUrl) {
      return new NextResponse("A URL da foto é obrigatória.", { status: 400 });
    }

    // Validar se o personal trainer pertence ao workspace
    const trainerMember = await prisma.workspaceMember.findFirst({
      where: {
        userId: session.user.id,
        workspaceId,
      },
    });

    if (!trainerMember) {
      return new NextResponse("Acesso negado a este workspace.", { status: 403 });
    }

    // Criar a foto de progresso
    const newPhoto = await prisma.studentProgressPhoto.create({
      data: {
        studentId,
        workspaceId,
        photoUrl,
        date: date ? new Date(date) : new Date(),
        comment: comment || null,
        trainerLiked: false,
      },
    });

    return NextResponse.json(newPhoto);
  } catch (error) {
    console.error("POST progress photo error:", error);
    return new NextResponse("Erro interno do servidor.", { status: 500 });
  }
}
