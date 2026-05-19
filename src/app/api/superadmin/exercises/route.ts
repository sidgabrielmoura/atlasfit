import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET() {
  const session = await auth();

  if (session?.user?.role !== "SUPERADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const exercises = await prisma.exercise.findMany({
      include: {
        muscleGroup: true,
        creator: {
          select: {
            name: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });
    return NextResponse.json(exercises);
  } catch (error) {
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
    return new NextResponse("Internal Error", { status: 500 });
  }
}
