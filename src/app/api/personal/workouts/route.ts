import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

// GET /api/personal/workouts
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Não autorizado. Por favor, faça login.", { status: 401 });
    }

    const workouts = await prisma.workout.findMany({
      where: {
        creatorId: session.user.id,
      },
      include: {
        exercises: {
          include: {
            exercise: {
              include: {
                muscleGroup: true,
              },
            },
          },
          orderBy: {
            order: "asc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(workouts);
  } catch (error) {
    console.error("Error fetching workouts:", error);
    return new NextResponse("Erro Interno do Servidor", { status: 500 });
  }
}

// POST /api/personal/workouts
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Não autorizado. Por favor, faça login.", { status: 401 });
    }

    const body = await req.json();
    const { name, goal, difficulty, duration, exercises } = body;

    if (!name || !goal || !difficulty || !duration) {
      return new NextResponse("Campos obrigatórios ausentes.", { status: 400 });
    }

    const workout = await prisma.workout.create({
      data: {
        name,
        goal,
        difficulty,
        duration,
        creatorId: session.user.id,
        exercises: {
          create: (exercises || []).map((ex: any, index: number) => ({
            exerciseId: ex.exerciseId,
            sets: Number(ex.sets) || 4,
            reps: String(ex.reps) || "10",
            rest: String(ex.rest) || "60s",
            order: index,
          })),
        },
      },
      include: {
        exercises: {
          include: {
            exercise: {
              include: {
                muscleGroup: true,
              },
            },
          },
          orderBy: {
            order: "asc",
          },
        },
      },
    });

    return NextResponse.json(workout, { status: 201 });
  } catch (error) {
    console.error("Error creating workout:", error);
    return new NextResponse("Erro Interno do Servidor", { status: 500 });
  }
}
