import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const session = await auth();

  if (session?.user?.role !== "SUPERADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const body = await req.json();
    const { status, name, videoUrl, muscleGroupId, isOfficial } = body;

    const exercise = await prisma.exercise.update({
      where: { id },
      data: {
        status,
        name,
        videoUrl,
        muscleGroupId,
        isOfficial
      }
    });

    return NextResponse.json(exercise);
  } catch (error) {
    console.error("[EXERCISE_PATCH]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
