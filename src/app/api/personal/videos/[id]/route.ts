import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { storageService } from "@/lib/storage.service";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Não autorizado.", { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { title, description, videoUrl, sourceType, duration, exerciseIds } = body;

    const existingVideo = await prisma.trainerVideo.findFirst({
      where: {
        id,
        trainerId: session.user.id,
      },
    });

    if (!existingVideo) {
      return new NextResponse("Vídeo não encontrado ou acesso negado.", { status: 404 });
    }

    const updatedVideo = await prisma.$transaction(async (tx) => {
      const dataToUpdate: any = {};
      if (title !== undefined) dataToUpdate.title = String(title).trim().slice(0, 150);
      if (description !== undefined) dataToUpdate.description = description ? String(description).trim().slice(0, 1000) : null;
      if (videoUrl !== undefined) dataToUpdate.videoUrl = String(videoUrl).trim().slice(0, 1000);
      if (sourceType !== undefined) dataToUpdate.sourceType = String(sourceType).trim().toUpperCase().slice(0, 30);
      if (duration !== undefined) dataToUpdate.duration = duration ? Math.max(0, Number(duration) || 0) : null;

      await tx.trainerVideo.update({
        where: { id },
        data: dataToUpdate,
      });

      if (Array.isArray(exerciseIds)) {
        await tx.trainerVideoExercise.deleteMany({
          where: { videoId: id },
        });

        const uniqueIds = Array.from(new Set(exerciseIds.filter(Boolean)));
        for (const exId of uniqueIds) {
          await tx.trainerVideoExercise.create({
            data: {
              videoId: id,
              exerciseId: String(exId),
              isDefault: true,
            },
          });
        }
      }

      return tx.trainerVideo.findUnique({
        where: { id },
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

    return NextResponse.json(updatedVideo);
  } catch (error: any) {
    console.error("PUT trainer video error:", error);
    return new NextResponse(error.message || "Erro interno do servidor.", { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Não autorizado.", { status: 401 });
    }

    const { id } = await params;

    const existingVideo = await prisma.trainerVideo.findFirst({
      where: {
        id,
        trainerId: session.user.id,
      },
    });

    if (!existingVideo) {
      return new NextResponse("Vídeo não encontrado ou acesso negado.", { status: 404 });
    }

    if (existingVideo.storageKey) {
      try {
        await storageService.deleteObject(existingVideo.storageKey);
      } catch (storageErr) {
        console.warn("Storage deletion warning:", storageErr);
      }
    }

    await prisma.trainerVideo.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Vídeo excluído com sucesso." });
  } catch (error: any) {
    console.error("DELETE trainer video error:", error);
    return new NextResponse(error.message || "Erro interno do servidor.", { status: 500 });
  }
}
