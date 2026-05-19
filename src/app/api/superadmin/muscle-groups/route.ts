import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET() {
  const session = await auth();

  if (session?.user?.role !== "SUPERADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const muscleGroups = await prisma.muscleGroup.findMany({
      orderBy: { name: "asc" }
    });
    return NextResponse.json(muscleGroups);
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
    const { name } = body;

    const muscleGroup = await prisma.muscleGroup.create({
      data: { name }
    });

    return NextResponse.json(muscleGroup);
  } catch (error) {
    return new NextResponse("Internal Error", { status: 500 });
  }
}
