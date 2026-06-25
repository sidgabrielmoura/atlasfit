import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { logSystemError } from "@/lib/logger";

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
    const { status, name, videoUrl, muscleGroupId, muscleGroupIds, isOfficial } = body;

    const ids = Array.isArray(muscleGroupIds) ? muscleGroupIds : (muscleGroupId ? [muscleGroupId] : []);

    const updateData: any = {
      status,
      name,
      videoUrl,
      isOfficial
    };

    if (ids.length > 0) {
      updateData.muscleGroupId = ids[0];
      updateData.muscleGroups = {
        set: ids.map(id => ({ id }))
      };
    }

    const exercise = await prisma.exercise.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json(exercise);
  } catch (error) {
    console.error("[EXERCISE_PATCH]", error);
    await logSystemError({ action: "PATCH_EXERCISE", error, entity: "EXERCISE", entityId: id });
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const session = await auth();

  if (session?.user?.role !== "SUPERADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "DELETION",
        entity: "EXERCISE",
        entityId: id,
        severity: "warning"
      }
    });

    const exercise = await prisma.exercise.delete({
      where: { id }
    });

    return NextResponse.json(exercise);
  } catch (error) {
    console.error("[EXERCISE_DELETE]", error);
    await logSystemError({ action: "DELETE_EXERCISE", error, entity: "EXERCISE", entityId: id });
    return new NextResponse("Internal Error", { status: 500 });
  }
}

