import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { createFeatureSchema, reorderFeatureSchema } from "@/lib/roadmap/schemas";
import { superadminReorderFeature } from "@/lib/roadmap/services";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (session?.user?.role !== "SUPERADMIN") {
      return new NextResponse("Não autorizado", { status: 403 });
    }

    const body = await req.json();
    const parsed = createFeatureSchema.parse(body);

    let baseSlug = slugify(parsed.title);
    let slug = baseSlug;
    let counter = 1;
    while (await prisma.roadmapFeature.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    const lastFeature = await prisma.roadmapFeature.findFirst({
      where: { statusId: parsed.statusId },
      orderBy: { rank: "desc" },
      select: { rank: true },
    });

    const rank = (lastFeature?.rank || 0) + 1000;

    let cleanCategoryId: string | null = null;
    if (parsed.categoryId && parsed.categoryId !== "NONE" && parsed.categoryId.trim().length > 0) {
      const exists = await prisma.roadmapCategory.findUnique({ where: { id: parsed.categoryId } });
      if (exists) cleanCategoryId = parsed.categoryId;
    }

    const feature = await prisma.roadmapFeature.create({
      data: {
        title: parsed.title,
        slug,
        description: parsed.description,
        statusId: parsed.statusId,
        categoryId: cleanCategoryId,
        source: parsed.source || "ATLASFIT",
        priority: parsed.priority || "MEDIUM",
        featured: Boolean(parsed.featured),
        isCommunityChoice: Boolean(parsed.isCommunityChoice),
        estimatedRelease: parsed.estimatedRelease?.trim() || null,
        rank,
        authorId: session.user.id,
      },
    });

    await prisma.roadmapAuditLog.create({
      data: {
        actorId: session.user.id,
        action: "FEATURE_CREATED",
        entity: "FEATURE",
        entityId: feature.id,
        metadata: JSON.stringify({ title: feature.title, statusId: feature.statusId }),
      },
    });

    return NextResponse.json({ success: true, feature });
  } catch (error: any) {
    if (error.name === "ZodError") {
      const issue = error.errors?.[0];
      return new NextResponse(issue?.message || "Dados inválidos", { status: 400 });
    }
    console.error("POST /api/superadmin/roadmap/features error:", error);
    return new NextResponse(error.message || "Erro ao criar funcionalidade oficial", { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (session?.user?.role !== "SUPERADMIN") {
      return new NextResponse("Não autorizado", { status: 403 });
    }

    const body = await req.json();
    const parsed = reorderFeatureSchema.parse(body);

    const updated = await superadminReorderFeature(parsed.featureId, parsed.targetStatusId, parsed.newRank, session.user.id);
    return NextResponse.json({ success: true, feature: updated });
  } catch (error: any) {
    console.error("PATCH /api/superadmin/roadmap/features error:", error);
    return new NextResponse("Erro ao reordenar funcionalidade", { status: 500 });
  }
}
