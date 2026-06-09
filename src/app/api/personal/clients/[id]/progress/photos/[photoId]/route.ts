import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

// PATCH /api/personal/clients/[id]/progress/photos/[photoId]
// Atualiza a curtida ou o comentário de uma foto específica
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; photoId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Não autorizado.", { status: 401 });
  }

  const { id: studentId, photoId } = await params;

  try {
    const body = await req.json();
    const { trainerLiked, comment } = body;

    // Buscar a foto
    const photo = await prisma.studentProgressPhoto.findUnique({
      where: { id: photoId },
    });

    if (!photo) {
      return new NextResponse("Foto não encontrada.", { status: 404 });
    }

    if (photo.studentId !== studentId) {
      return new NextResponse("Esta foto não pertence a este aluno.", { status: 400 });
    }

    // Validar se o personal trainer pertence ao workspace da foto
    const trainerMember = await prisma.workspaceMember.findFirst({
      where: {
        userId: session.user.id,
        workspaceId: photo.workspaceId,
      },
    });

    if (!trainerMember) {
      return new NextResponse("Acesso negado a este workspace.", { status: 403 });
    }

    // Montar os dados para atualização
    const updateData: any = {};
    if (typeof trainerLiked === "boolean") {
      updateData.trainerLiked = trainerLiked;
    }
    if (typeof comment === "string" || comment === null) {
      updateData.comment = comment;
    }

    // Atualizar
    const updatedPhoto = await prisma.studentProgressPhoto.update({
      where: { id: photoId },
      data: updateData,
    });

    return NextResponse.json(updatedPhoto);
  } catch (error) {
    console.error("PATCH progress photo error:", error);
    return new NextResponse("Erro interno do servidor.", { status: 500 });
  }
}

// DELETE /api/personal/clients/[id]/progress/photos/[photoId]
// Remove uma foto da linha do tempo
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; photoId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Não autorizado.", { status: 401 });
  }

  const { id: studentId, photoId } = await params;

  try {
    const photo = await prisma.studentProgressPhoto.findUnique({
      where: { id: photoId },
    });

    if (!photo) {
      return new NextResponse("Foto não encontrada.", { status: 404 });
    }

    if (photo.studentId !== studentId) {
      return new NextResponse("Esta foto não pertence a este aluno.", { status: 400 });
    }

    // Validar se o personal trainer pertence ao workspace
    const trainerMember = await prisma.workspaceMember.findFirst({
      where: {
        userId: session.user.id,
        workspaceId: photo.workspaceId,
      },
    });

    if (!trainerMember) {
      return new NextResponse("Acesso negado a este workspace.", { status: 403 });
    }

    // Deletar a foto
    await prisma.studentProgressPhoto.delete({
      where: { id: photoId },
    });

    return new NextResponse("Foto removida da linha do tempo.", { status: 200 });
  } catch (error) {
    console.error("DELETE progress photo error:", error);
    return new NextResponse("Erro interno do servidor.", { status: 500 });
  }
}
