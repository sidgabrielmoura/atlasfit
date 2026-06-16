import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

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

export async function GET() {
  const session = await auth();

  if (session?.user?.role !== "SUPERADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    // Garante que os grupos musculares solicitados existam no banco
    for (const name of DEFAULT_MUSCLE_GROUPS) {
      await prisma.muscleGroup.upsert({
        where: { name },
        update: {},
        create: { name }
      });
    }

    const muscleGroups = await prisma.muscleGroup.findMany({
      orderBy: { name: "asc" }
    });
    return NextResponse.json(muscleGroups);
  } catch (error) {
    console.error("[MUSCLE_GROUPS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth();

  if (session?.user?.role !== "SUPERADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const body = await req.json();
    const { name } = body;

    const muscleGroup = await prisma.muscleGroup.create({
      data: { name }
    });

    return NextResponse.json(muscleGroup);
  } catch (error) {
    return new NextResponse("Internal Error", { status: 500 });
  }
}
