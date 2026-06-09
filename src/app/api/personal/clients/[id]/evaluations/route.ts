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

    const evaluations = await prisma.physicalEvaluation.findMany({
      where: { studentId, workspaceId },
      orderBy: { date: "desc" }
    });

    return NextResponse.json(evaluations);
  } catch (error) {
    console.error("GET student evaluations error:", error);
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
    const { workspaceId, type, weight, height, bodyFat, muscleMass, dobras, notes, date } = body;

    if (!workspaceId || !type || weight === undefined || height === undefined) {
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

    const evaluation = await prisma.physicalEvaluation.create({
      data: {
        studentId,
        workspaceId,
        type,
        weight: parseFloat(weight),
        height: parseFloat(height),
        bodyFat: bodyFat !== undefined && bodyFat !== null ? parseFloat(bodyFat) : null,
        muscleMass: muscleMass !== undefined && muscleMass !== null ? parseFloat(muscleMass) : null,
        dobras: dobras || null,
        notes: notes || null,
        date: date ? new Date(date) : new Date(),
      }
    });

    return NextResponse.json(evaluation);
  } catch (error) {
    console.error("POST student evaluation error:", error);
    return new NextResponse("Erro interno do servidor.", { status: 500 });
  }
}
