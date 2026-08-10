import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const role = searchParams.get("role") || "ALL";

    const banners = await prisma.engageBanner.findMany({
      where: {
        isActive: true,
        OR: [
          { targetRole: "ALL" },
          { targetRole: role }
        ]
      },
      orderBy: [
        { sortOrder: "asc" },
        { createdAt: "desc" }
      ]
    });

    return NextResponse.json(banners);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Erro ao carregar banners";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
