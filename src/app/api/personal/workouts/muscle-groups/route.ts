import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

// GET /api/personal/workouts/muscle-groups
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Não autorizado.", { status: 401 });
    }

    const muscleGroups = await prisma.muscleGroup.findMany({
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json(muscleGroups);
  } catch (error) {
    console.error("Error fetching muscle groups:", error);
    return new NextResponse("Erro Interno do Servidor", { status: 500 });
  }
}
