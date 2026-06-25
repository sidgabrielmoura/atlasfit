import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

const DEFAULT_MUSCLE_GROUPS = [
  "Trapézio",
  "Ombro",
  "Costas",
  "Peito",
  "Tríceps",
  "Bíceps",
  "Abdomen",
  "Antebraço",
  "Glúteo",
  "Posterior de perna",
  "Quadríceps",
  "Panturrilha"
];

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

    const existingNames = new Set(muscleGroups.map(g => g.name));
    const missingNames = DEFAULT_MUSCLE_GROUPS.filter(name => !existingNames.has(name));
    
    if (missingNames.length > 0) {
      for (const name of missingNames) {
        try {
          await prisma.muscleGroup.create({
            data: { name }
          });
        } catch (e) {
          // ignore duplicate errors
        }
      }
      return NextResponse.json(await prisma.muscleGroup.findMany({
        orderBy: {
          name: "asc",
        },
      }));
    }

    return NextResponse.json(muscleGroups);
  } catch (error) {
    console.error("Error fetching muscle groups:", error);
    return new NextResponse("Erro Interno do Servidor", { status: 500 });
  }
}
