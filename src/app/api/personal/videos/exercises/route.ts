import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Não autorizado.", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim().toLowerCase() || "";
    const muscleGroupId = searchParams.get("muscleGroupId") || "";

    const whereClause: any = {
      AND: [
        {
          OR: [
            { isOfficial: true },
            { status: "READY" },
            { status: "APPROVED" },
            { creatorId: session.user.id },
          ],
        },
        {
          status: {
            notIn: ["REJECTED"],
          },
        },
      ],
    };

    if (search) {
      whereClause.AND = whereClause.AND || [];
      whereClause.AND.push({
        name: { contains: search, mode: "insensitive" },
      });
    }

    if (muscleGroupId && muscleGroupId !== "all") {
      whereClause.AND = whereClause.AND || [];
      whereClause.AND.push({
        OR: [
          { muscleGroupId },
          { muscleGroups: { some: { id: muscleGroupId } } },
        ],
      });
    }

    const exercises = await prisma.exercise.findMany({
      where: whereClause,
      include: {
        muscleGroup: true,
        muscleGroups: true,
        trainerVideoLinks: {
          where: {
            video: {
              trainerId: session.user.id,
            },
          },
          include: {
            video: {
              select: {
                id: true,
                title: true,
                videoUrl: true,
                sourceType: true,
              },
            },
          },
        },
      },
      orderBy: {
        name: "asc",
      },
      take: 500,
    });

    return NextResponse.json(exercises);
  } catch (error: any) {
    console.error("GET exercises for trainer videos error:", error);
    return new NextResponse("Erro interno do servidor.", { status: 500 });
  }
}
