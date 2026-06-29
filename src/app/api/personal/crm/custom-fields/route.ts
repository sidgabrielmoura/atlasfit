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

    const fields = await prisma.customFieldDefinition.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(fields);
  } catch (error) {
    console.error("GET custom fields error:", error);
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
    const { workspaceId, name, type, options } = body;

    if (!workspaceId || !name) {
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

    const existingField = await prisma.customFieldDefinition.findUnique({
      where: {
        workspaceId_name: {
          workspaceId,
          name: name.trim(),
        },
      },
    });

    if (existingField) {
      return new NextResponse("Campo já cadastrado com este nome.", { status: 400 });
    }

    const newField = await prisma.customFieldDefinition.create({
      data: {
        workspaceId,
        name: name.trim(),
        type: type || "text",
        options: options || null,
      },
    });

    return NextResponse.json(newField, { status: 201 });
  } catch (error) {
    console.error("POST custom field error:", error);
    return new NextResponse("Erro interno.", { status: 500 });
  }
}
