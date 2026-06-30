import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Não autorizado.", { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspaceId");

  if (!workspaceId) {
    return new NextResponse("O ID do workspace é obrigatório.", { status: 400 });
  }

  try {
    const memberCheck = await prisma.workspaceMember.findFirst({
      where: {
        userId: session.user.id,
        workspaceId,
      },
    });

    if (!memberCheck) {
      return new NextResponse("Acesso negado.", { status: 403 });
    }

    const tags = await prisma.tag.findMany({
      where: { workspaceId },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(tags);
  } catch (error) {
    console.error("GET tags error:", error);
    return new NextResponse("Erro interno.", { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Não autorizado.", { status: 401 });
  }

  try {
    const body = await req.json();
    const { workspaceId, name, color } = body;

    if (!workspaceId || !name || !color) {
      return new NextResponse("Campos obrigatórios ausentes.", { status: 400 });
    }

    const memberCheck = await prisma.workspaceMember.findFirst({
      where: {
        userId: session.user.id,
        workspaceId,
      },
    });

    if (!memberCheck) {
      return new NextResponse("Acesso negado.", { status: 403 });
    }

    const existingTag = await prisma.tag.findUnique({
      where: {
        workspaceId_name: {
          workspaceId,
          name: name.trim(),
        },
      },
    });

    if (existingTag) {
      return NextResponse.json(existingTag);
    }

    const newTag = await prisma.tag.create({
      data: {
        workspaceId,
        name: name.trim(),
        color,
      },
    });

    return NextResponse.json(newTag, { status: 201 });
  } catch (error) {
    console.error("POST tag error:", error);
    return new NextResponse("Erro interno.", { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Não autorizado.", { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const tagId = searchParams.get("tagId");

  if (!tagId) {
    return new NextResponse("O ID da etiqueta é obrigatório.", { status: 400 });
  }

  try {
    const tag = await prisma.tag.findUnique({
      where: { id: tagId },
    });

    if (!tag) {
      return new NextResponse("Etiqueta não encontrada.", { status: 404 });
    }

    const memberCheck = await prisma.workspaceMember.findFirst({
      where: {
        userId: session.user.id,
        workspaceId: tag.workspaceId,
      },
    });

    if (!memberCheck) {
      return new NextResponse("Acesso negado.", { status: 403 });
    }

    await prisma.tag.delete({
      where: { id: tagId },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("DELETE tag error:", error);
    return new NextResponse("Erro interno.", { status: 500 });
  }
}
