import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const banners = await prisma.engageBanner.findMany({
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

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const { imageUrl, title, linkUrl, targetRole, isActive, sortOrder } = body;

    if (!imageUrl?.trim()) {
      return NextResponse.json({ error: "A imagem do banner é obrigatória" }, { status: 400 });
    }

    const banner = await prisma.engageBanner.create({
      data: {
        imageUrl: imageUrl.trim(),
        title: title?.trim() || null,
        linkUrl: linkUrl?.trim() || null,
        targetRole: targetRole || "ALL",
        isActive: isActive ?? true,
        sortOrder: parseInt(sortOrder) || 0
      }
    });

    return NextResponse.json(banner);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Erro ao criar banner";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
