import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { superadminCreateStatus } from "@/lib/roadmap/services";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (session?.user?.role !== "SUPERADMIN") {
      return new NextResponse("Não autorizado", { status: 403 });
    }

    const statuses = await prisma.roadmapStatus.findMany({
      where: { isActive: true },
      orderBy: { position: "asc" },
      include: {
        _count: {
          select: { features: { where: { deletedAt: null } } },
        },
      },
    });

    return NextResponse.json(statuses);
  } catch (error: any) {
    console.error("GET /api/superadmin/roadmap/statuses error:", error);
    return new NextResponse("Erro ao listar colunas", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (session?.user?.role !== "SUPERADMIN") {
      return new NextResponse("Não autorizado", { status: 403 });
    }

    const body = await req.json();
    if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
      return new NextResponse("Nome da coluna é obrigatório", { status: 400 });
    }

    const status = await superadminCreateStatus(
      {
        name: body.name.trim(),
        color: body.color || "#f59e0b",
        isPublic: body.isPublic !== undefined ? body.isPublic : true,
      },
      session.user.id
    );

    return NextResponse.json({ success: true, status });
  } catch (error: any) {
    console.error("POST /api/superadmin/roadmap/statuses error:", error);
    return new NextResponse(error.message || "Erro ao criar coluna", { status: 500 });
  }
}
