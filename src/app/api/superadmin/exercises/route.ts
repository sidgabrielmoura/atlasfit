import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { logSystemError } from "@/lib/logger";

export async function GET(req: Request) {
  const session = await auth();

  if (session?.user?.role !== "SUPERADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const muscleGroupId = searchParams.get("muscleGroupId") || "";
    const statusParam = searchParams.get("status") || "";
    const isOfficialParam = searchParams.get("isOfficial") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const skip = (page - 1) * limit;

    const where: any = {};

    // Filter by status if provided (comma separated)
    if (statusParam) {
      where.status = { in: statusParam.split(",") };
    }

    // Filter by isOfficial if provided
    if (isOfficialParam === "true") {
      where.isOfficial = true;
    } else if (isOfficialParam === "false") {
      where.isOfficial = false;
    }

    // Filter by muscleGroup
    if (muscleGroupId && muscleGroupId !== "all") {
      where.muscleGroupId = muscleGroupId;
    }

    // Search query
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { muscleGroup: { name: { contains: search, mode: "insensitive" } } },
      ];
    }

    const hasPagination = searchParams.has("page") || searchParams.has("limit");

    if (!hasPagination) {
      const exercises = await prisma.exercise.findMany({
        where,
        include: {
          muscleGroup: true,
          creator: {
            select: {
              name: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json(exercises);
    }

    const [exercises, total, totalUsageAggregate] = await Promise.all([
      prisma.exercise.findMany({
        where,
        include: {
          muscleGroup: true,
          creator: {
            select: {
              name: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.exercise.count({ where }),
      prisma.exercise.aggregate({
        _sum: {
          usage: true
        },
        where: {
          status: { in: ["READY", "APPROVED"] }
        }
      })
    ]);

    const totalUsage = totalUsageAggregate._sum.usage || 0;

    return NextResponse.json({
      data: exercises,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
      totalUsage,
    });
  } catch (error) {
    console.error("[EXERCISES_GET]", error);
    await logSystemError({ action: "GET_EXERCISES", error, entity: "EXERCISE" });
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
    const { name, videoUrl, muscleGroupId, isOfficial, status } = body;

    const exercise = await prisma.exercise.create({
      data: {
        name,
        videoUrl,
        muscleGroupId,
        isOfficial: isOfficial ?? true,
        status: status ?? "READY"
      }
    });

    return NextResponse.json(exercise);
  } catch (error) {
    console.error("[EXERCISES_POST]", error);
    await logSystemError({ action: "POST_EXERCISE", error, entity: "EXERCISE" });
    return new NextResponse("Internal Error", { status: 500 });
  }
}
