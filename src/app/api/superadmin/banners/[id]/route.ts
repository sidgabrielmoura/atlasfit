import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    const banner = await prisma.engageBanner.update({
      where: { id },
      data: {
        ...(body.imageUrl !== undefined && { imageUrl: body.imageUrl.trim() }),
        ...(body.title !== undefined && { title: body.title?.trim() || null }),
        ...(body.linkUrl !== undefined && { linkUrl: body.linkUrl?.trim() || null }),
        ...(body.targetRole !== undefined && { targetRole: body.targetRole }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
        ...(body.sortOrder !== undefined && { sortOrder: parseInt(body.sortOrder) || 0 })
      }
    });

    return NextResponse.json(banner);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Erro ao atualizar banner";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id } = await params;
    await prisma.engageBanner.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Erro ao deletar banner";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
