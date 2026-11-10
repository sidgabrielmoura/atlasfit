import { withRequestMemo } from "@/lib/request-memo";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { getMuscleGroups, invalidateMuscleGroups } from "@/lib/cache/public-data";

async function handleGET() {
  const session = await auth();

  if (session?.user?.role !== "SUPERADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    return NextResponse.json(await getMuscleGroups());
  } catch (error) {
    console.error("[MUSCLE_GROUPS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
export const GET = withRequestMemo(handleGET);

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

    invalidateMuscleGroups();
    return NextResponse.json(muscleGroup);
  } catch (error) {
    return new NextResponse("Internal Error", { status: 500 });
  }
}
