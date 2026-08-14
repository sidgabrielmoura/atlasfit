import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (session?.user?.role !== "SUPERADMIN") {
      return new NextResponse("Não autorizado", { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();

    const current = await prisma.roadmapFeature.findUnique({ where: { id } });
    if (!current) {
      return new NextResponse("Funcionalidade não encontrada", { status: 404 });
    }

    const dataToUpdate: any = {
      editedAt: new Date(),
      editedById: session.user.id,
    };
    if (body.title !== undefined) dataToUpdate.title = body.title;
    if (body.description !== undefined) dataToUpdate.description = body.description;
    if (body.statusId !== undefined) {
      dataToUpdate.statusId = body.statusId;
      const releasedStatus = await prisma.roadmapStatus.findFirst({ where: { slug: "released" } });
      if (releasedStatus && body.statusId === releasedStatus.id && !current.releasedAt) {
        dataToUpdate.releasedAt = new Date();
      }
    }
    if (body.categoryId !== undefined) dataToUpdate.categoryId = body.categoryId || null;
    if (body.priority !== undefined) dataToUpdate.priority = body.priority;
    if (body.source !== undefined) dataToUpdate.source = body.source;
    if (body.featured !== undefined) dataToUpdate.featured = body.featured;
    if (body.isCommunityChoice !== undefined) dataToUpdate.isCommunityChoice = body.isCommunityChoice;
    if (body.estimatedRelease !== undefined) dataToUpdate.estimatedRelease = body.estimatedRelease;
    if (body.visibility !== undefined) dataToUpdate.visibility = body.visibility;
    if (body.rank !== undefined) dataToUpdate.rank = body.rank;

    if (body.officialResponse !== undefined) {
      dataToUpdate.officialResponse = body.officialResponse;
      dataToUpdate.officialResponseAt = body.officialResponse ? new Date() : null;
      dataToUpdate.officialResponseById = body.officialResponse ? session.user.id : null;
    }

    const updated = await prisma.roadmapFeature.update({
      where: { id },
      data: dataToUpdate,
      include: {
        author: { select: { id: true, name: true, image: true, role: true } },
        editedBy: { select: { id: true, name: true, role: true } },
        category: { select: { id: true, name: true, icon: true, slug: true } },
        status: { select: { id: true, name: true, slug: true, color: true } },
      },
    });

    await prisma.roadmapAuditLog.create({
      data: {
        actorId: session.user.id,
        action: "FEATURE_UPDATED",
        entity: "FEATURE",
        entityId: id,
        metadata: JSON.stringify(dataToUpdate),
      },
    });

    return NextResponse.json({ success: true, feature: updated });
  } catch (error: any) {
    console.error("PATCH /api/superadmin/roadmap/features/[id] error:", error);
    return new NextResponse("Erro ao atualizar funcionalidade", { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (session?.user?.role !== "SUPERADMIN") {
      return new NextResponse("Não autorizado", { status: 403 });
    }

    const { id } = await params;

    const feature = await prisma.roadmapFeature.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        visibility: "ARCHIVED",
      },
    });

    await prisma.roadmapAuditLog.create({
      data: {
        actorId: session.user.id,
        action: "FEATURE_SOFT_DELETED",
        entity: "FEATURE",
        entityId: id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE /api/superadmin/roadmap/features/[id] error:", error);
    return new NextResponse("Erro ao arquivar funcionalidade", { status: 500 });
  }
}
