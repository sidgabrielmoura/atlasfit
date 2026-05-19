import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

// GET /api/personal/workouts/exercises
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Não autorizado.", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const requested = searchParams.get("requested");

    if (requested === "true") {
      const requestedExercises = await prisma.exercise.findMany({
        where: {
          creatorId: session.user.id,
          isOfficial: false,
        },
        include: {
          muscleGroup: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });
      return NextResponse.json(requestedExercises);
    }

    const muscleGroupId = searchParams.get("muscleGroupId");

    const whereClause: any = {
      AND: [
        {
          OR: [
            { isOfficial: true },
            { status: "READY" },
            { status: "APPROVED" }
          ]
        },
        {
          status: {
            notIn: ["PENDING", "NEEDS_CONFIG", "REJECTED"]
          }
        }
      ]
    };
    if (muscleGroupId) {
      whereClause.AND.push({ muscleGroupId });
    }

    const exercises = await prisma.exercise.findMany({
      where: whereClause,
      include: {
        muscleGroup: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json(exercises);
  } catch (error) {
    console.error("Error fetching exercises:", error);
    return new NextResponse("Erro Interno do Servidor", { status: 500 });
  }
}

// POST /api/personal/workouts/exercises
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Não autorizado.", { status: 401 });
    }

    const body = await req.json();
    const { name, muscleGroupId, videoUrl } = body;

    if (!name || !name.trim()) {
      return new NextResponse("Nome do exercício é obrigatório.", { status: 400 });
    }

    if (!muscleGroupId) {
      return new NextResponse("ID do grupamento muscular é obrigatório.", { status: 400 });
    }

    // Verify muscle group exists
    const muscleGroupExists = await prisma.muscleGroup.findUnique({
      where: { id: muscleGroupId },
    });

    if (!muscleGroupExists) {
      return new NextResponse("Grupamento muscular inválido.", { status: 404 });
    }

    // Create the exercise request
    const exerciseRequest = await prisma.exercise.create({
      data: {
        name: name.trim(),
        muscleGroupId,
        videoUrl: videoUrl ? videoUrl.trim() : null,
        creatorId: session.user.id,
        isOfficial: false,
        status: "PENDING",
      },
    });

    return NextResponse.json(exerciseRequest, { status: 201 });
  } catch (error) {
    console.error("Error creating exercise request:", error);
    return new NextResponse("Erro Interno do Servidor", { status: 500 });
  }
}
