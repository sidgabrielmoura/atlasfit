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
    const workspaceId = searchParams.get("workspaceId");

    const whereClause: any = {
      trainerId: session.user.id,
    };

    if (workspaceId) {
      whereClause.OR = [
        { workspaceId },
        { workspaceId: null },
      ];
    }

    if (search) {
      whereClause.AND = whereClause.AND || [];
      whereClause.AND.push({
        OR: [
          { title: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
          {
            exerciseLinks: {
              some: {
                exercise: {
                  name: { contains: search, mode: "insensitive" },
                },
              },
            },
          },
        ],
      });
    }

    if (muscleGroupId && muscleGroupId !== "all") {
      whereClause.AND = whereClause.AND || [];
      whereClause.AND.push({
        exerciseLinks: {
          some: {
            exercise: {
              OR: [
                { muscleGroupId },
                { muscleGroups: { some: { id: muscleGroupId } } },
              ],
            },
          },
        },
      });
    }

    const videos = await prisma.trainerVideo.findMany({
      where: whereClause,
      include: {
        exerciseLinks: {
          include: {
            exercise: {
              include: {
                muscleGroup: true,
                muscleGroups: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(videos);
  } catch (error: any) {
    console.error("GET trainer videos error:", error);
    return new NextResponse("Erro interno do servidor.", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Não autorizado.", { status: 401 });
    }

    const body = await req.json();
    const {
      title,
      description,
      videoUrl,
      thumbnailUrl,
      storageKey,
      fileSize,
      duration,
      sourceType = "UPLOAD",
      workspaceId,
      exerciseIds = [],
    } = body;

    if (!title || !title.trim()) {
      return new NextResponse("O título do vídeo é obrigatório.", { status: 400 });
    }

    if (!videoUrl || !videoUrl.trim()) {
      return new NextResponse("O link ou arquivo do vídeo é obrigatório.", { status: 400 });
    }

    if (workspaceId) {
      const member = await prisma.workspaceMember.findFirst({
        where: {
          userId: session.user.id,
          workspaceId,
        },
      });
      if (!member) {
        return new NextResponse("Acesso negado ao workspace.", { status: 403 });
      }
    }

    const cleanTitle = String(title).trim().slice(0, 150);
    const cleanDescription = description ? String(description).trim().slice(0, 1000) : null;
    const cleanVideoUrl = String(videoUrl).trim().slice(0, 1000);
    const cleanThumbnail = thumbnailUrl ? String(thumbnailUrl).trim().slice(0, 1000) : null;
    const cleanStorageKey = storageKey ? String(storageKey).trim().slice(0, 500) : null;
    const cleanSourceType = String(sourceType).trim().toUpperCase().slice(0, 30);
    const numDuration = duration ? Math.max(0, Number(duration) || 0) : null;
    const numSize = fileSize ? Math.max(0, Number(fileSize) || 0) : null;

    const createdVideo = await prisma.$transaction(async (tx) => {
      const video = await tx.trainerVideo.create({
        data: {
          title: cleanTitle,
          description: cleanDescription,
          videoUrl: cleanVideoUrl,
          thumbnailUrl: cleanThumbnail,
          storageKey: cleanStorageKey,
          fileSize: numSize,
          duration: numDuration,
          sourceType: cleanSourceType,
          trainerId: session.user.id,
          workspaceId: workspaceId || null,
        },
      });

      if (Array.isArray(exerciseIds) && exerciseIds.length > 0) {
        const uniqueIds = Array.from(new Set(exerciseIds.filter(Boolean)));
        for (const exId of uniqueIds) {
          await tx.trainerVideoExercise.create({
            data: {
              videoId: video.id,
              exerciseId: String(exId),
              isDefault: true,
            },
          });
        }
      }

      return tx.trainerVideo.findUnique({
        where: { id: video.id },
        include: {
          exerciseLinks: {
            include: {
              exercise: {
                include: {
                  muscleGroup: true,
                  muscleGroups: true,
                },
              },
            },
          },
        },
      });
    });

    return NextResponse.json(createdVideo, { status: 201 });
  } catch (error: any) {
    console.error("POST trainer video error:", error);
    return new NextResponse(error.message || "Erro interno do servidor.", { status: 500 });
  }
}
