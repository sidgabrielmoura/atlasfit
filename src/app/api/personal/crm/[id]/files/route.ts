import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Não autorizado.", { status: 401 });
  }

  const { id } = await params;

  try {
    const lead = await prisma.lead.findUnique({
      where: { id },
    });

    if (!lead || lead.ownerId !== session.user.id) {
      return new NextResponse("Acesso negado.", { status: 403 });
    }

    const files = await prisma.leadFile.findMany({
      where: { leadId: id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(files);
  } catch (error) {
    console.error("GET lead files error:", error);
    return new NextResponse("Erro interno.", { status: 500 });
  }
}

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
    const lead = await prisma.lead.findUnique({
      where: { id },
    });

    if (!lead || lead.ownerId !== session.user.id) {
      return new NextResponse("Acesso negado.", { status: 403 });
    }

    const body = await req.json();
    const { fileName, fileSize, url, objectKey, mimeType, size } = body;

    if (!fileName || !url) {
      return new NextResponse("Campos obrigatórios ausentes.", { status: 400 });
    }

    const file = await prisma.$transaction(async (tx) => {
      const newFile = await tx.leadFile.create({
        data: {
          leadId: id,
          fileName,
          fileSize,
          url,
          objectKey: objectKey || null,
          mimeType: mimeType || null,
          size: size ? parseInt(size) : null,
          uploadedBy: session.user.name || "Treinador",
        },
      });

      await tx.leadActivity.create({
        data: {
          leadId: id,
          content: `Arquivo anexado: ${fileName}`,
        },
      });

      return newFile;
    });

    return NextResponse.json(file, { status: 201 });
  } catch (error) {
    console.error("POST lead file error:", error);
    return new NextResponse("Erro interno.", { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Não autorizado.", { status: 401 });
  }

  const { id } = await params;

  try {
    const { searchParams } = new URL(req.url);
    const fileId = searchParams.get("fileId");

    if (!fileId) {
      return new NextResponse("ID do arquivo é obrigatório.", { status: 400 });
    }

    const lead = await prisma.lead.findUnique({
      where: { id },
    });

    if (!lead || lead.ownerId !== session.user.id) {
      return new NextResponse("Acesso negado.", { status: 403 });
    }

    const file = await prisma.leadFile.findUnique({
      where: { id: fileId },
    });

    if (!file || file.leadId !== id) {
      return new NextResponse("Arquivo não encontrado.", { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.leadFile.delete({
        where: { id: fileId },
      });

      await tx.leadActivity.create({
        data: {
          leadId: id,
          content: `Arquivo removido: ${file.fileName}`,
        },
      });
    });

    return new NextResponse("Arquivo removido com sucesso.", { status: 200 });
  } catch (error) {
    console.error("DELETE lead file error:", error);
    return new NextResponse("Erro interno.", { status: 500 });
  }
}
