import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET() {
  const session = await auth();

  if (session?.user?.role !== "SUPERADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const settings = await prisma.systemSetting.findMany({
      orderBy: { createdAt: "asc" }
    });
    return NextResponse.json(settings);
  } catch (error) {
    return new NextResponse("Internal Error", { status: 500 });
  }
}
export async function PATCH(req: Request) {
  const session = await auth();

  if (session?.user?.role !== "SUPERADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const { settings } = await req.json();

    if (!Array.isArray(settings)) {
      return new NextResponse("Invalid request", { status: 400 });
    }

    // Update all settings in a transaction
    await prisma.$transaction(
      settings.map((s: { key: string; value: string }) =>
        prisma.systemSetting.upsert({
          where: { key: s.key },
          update: { value: s.value },
          create: { key: s.key, value: s.value }
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[SETTINGS_PATCH]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
