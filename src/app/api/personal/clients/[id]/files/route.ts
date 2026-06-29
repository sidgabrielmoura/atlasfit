import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: Request, { params }: RouteParams) {
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
    // Verify trainer has access to workspace
    const trainerCheck = await prisma.workspaceMember.findFirst({
      where: { userId: session.user.id, workspaceId }
    });

    if (!trainerCheck) {
      return new NextResponse("Acesso negado a este workspace.", { status: 403 });
    }

    // Verify student is in this workspace
    const studentCheck = await prisma.workspaceMember.findFirst({
      where: { userId: studentId, workspaceId, role: "STUDENT" }
    });

    if (!studentCheck) {
      return new NextResponse("Aluno não encontrado neste workspace.", { status: 404 });
    }

    const files = await prisma.studentFile.findMany({
      where: { studentId, workspaceId },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(files);
  } catch (error) {
    console.error("GET student files error:", error);
    return new NextResponse("Erro interno do servidor.", { status: 500 });
  }
}

export async function POST(req: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Não autorizado.", { status: 401 });
  }

  const { id: studentId } = await params;

  try {
    const body = await req.json();
    const { 
      workspaceId, 
      name, 
      category, 
      type, 
      fileName, 
      fileSize, 
      url, 
      notes,
      objectKey,
      mimeType,
      size
    } = body;

    if (!workspaceId || !name || !category || !type || !url) {
      return new NextResponse("Campos obrigatórios ausentes.", { status: 400 });
    }

    // Verify trainer
    const trainerCheck = await prisma.workspaceMember.findFirst({
      where: { userId: session.user.id, workspaceId }
    });

    if (!trainerCheck) {
      return new NextResponse("Acesso negado a este workspace.", { status: 403 });
    }

    // Verify student
    const studentCheck = await prisma.workspaceMember.findFirst({
      where: { userId: studentId, workspaceId, role: "STUDENT" }
    });

    if (!studentCheck) {
      return new NextResponse("Aluno não encontrado neste workspace.", { status: 404 });
    }

    const fileRecord = await prisma.studentFile.create({
      data: {
        studentId,
        workspaceId,
        name,
        category,
        type,
        fileName: fileName || null,
        fileSize: fileSize || null,
        url,
        notes: notes || null,
        objectKey: objectKey || null,
        mimeType: mimeType || null,
        size: size || null,
        uploadedBy: session.user.id,
      }
    });

    return NextResponse.json(fileRecord);
  } catch (error) {
    console.error("POST student file error:", error);
    return new NextResponse("Erro interno do servidor.", { status: 500 });
  }
}
