import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

// GET /api/personal/clients/[id]/progress
// Retorna a evolução de medidas corporais e composição do aluno
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
    // Validar se o personaltrainer pertence ao workspace
    const trainerMember = await prisma.workspaceMember.findFirst({
      where: {
        userId: session.user.id,
        workspaceId,
      },
    });

    if (!trainerMember) {
      return new NextResponse("Acesso negado a este workspace.", { status: 403 });
    }

    // Buscar histórico de progresso ordenado da mais antiga para a mais nova
    const progressHistory = await prisma.studentProgress.findMany({
      where: {
        studentId,
        workspaceId,
      },
      orderBy: {
        date: "asc",
      },
    });

    return NextResponse.json(progressHistory);
  } catch (error) {
    console.error("GET progress logs error:", error);
    return new NextResponse("Erro interno do servidor.", { status: 500 });
  }
}

// POST /api/personal/clients/[id]/progress
// Registra uma nova avaliação antropométrica
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
    const {
      workspaceId,
      date,
      weight,
      height,
      bodyFat,
      muscleMass,
      chest,
      waist,
      abdomen,
      hips,
      rightArm,
      leftArm,
      rightForearm,
      leftForearm,
      rightThigh,
      leftThigh,
      rightCalf,
      leftCalf,
      notes,
    } = body;

    if (!workspaceId) {
      return new NextResponse("O ID do workspace é obrigatório.", { status: 400 });
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

    // Criar o registro
    const newProgress = await prisma.studentProgress.create({
      data: {
        studentId,
        workspaceId,
        date: date ? new Date(date) : new Date(),
        weight: weight ? parseFloat(weight) : null,
        height: height ? parseFloat(height) : null,
        bodyFat: bodyFat ? parseFloat(bodyFat) : null,
        muscleMass: muscleMass ? parseFloat(muscleMass) : null,
        chest: chest ? parseFloat(chest) : null,
        waist: waist ? parseFloat(waist) : null,
        abdomen: abdomen ? parseFloat(abdomen) : null,
        hips: hips ? parseFloat(hips) : null,
        rightArm: rightArm ? parseFloat(rightArm) : null,
        leftArm: leftArm ? parseFloat(leftArm) : null,
        rightForearm: rightForearm ? parseFloat(rightForearm) : null,
        leftForearm: leftForearm ? parseFloat(leftForearm) : null,
        rightThigh: rightThigh ? parseFloat(rightThigh) : null,
        leftThigh: leftThigh ? parseFloat(leftThigh) : null,
        rightCalf: rightCalf ? parseFloat(rightCalf) : null,
        leftCalf: leftCalf ? parseFloat(leftCalf) : null,
        notes: notes || null,
      },
    });

    return NextResponse.json(newProgress);
  } catch (error) {
    console.error("POST progress log error:", error);
    return new NextResponse("Erro interno do servidor.", { status: 500 });
  }
}
