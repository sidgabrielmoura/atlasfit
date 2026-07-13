import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Não autorizado. Por favor, faça login.", { status: 401 });
  }

  const role = (session.user as any).role;
  if (role !== "TRAINER") {
    return new NextResponse("Acesso negado. Apenas personal trainers podem realizar o onboarding.", { status: 403 });
  }

  try {
    const body = await req.json();
    const {
      name,
      image,
      imageKey,
      bio,
      specialty,
      whatsapp,
      instagram,
      linkedin,
      city,
      experience,
      cref,
      brandName,
      brandSlogan,
      brandColor,
      logoUrl,
      logoKey,
      watermarkUrl,
      watermarkKey,
      workoutCoverUrl,
      workoutCoverKey,
    } = body;

    // Validate mandatory fields
    if (!name?.trim()) {
      return new NextResponse("O nome é obrigatório.", { status: 400 });
    }
    if (!specialty?.trim()) {
      return new NextResponse("A especialidade é obrigatória.", { status: 400 });
    }
    if (!whatsapp?.trim()) {
      return new NextResponse("O número de WhatsApp é obrigatório.", { status: 400 });
    }
    if (!city?.trim()) {
      return new NextResponse("A cidade e estado são obrigatórios.", { status: 400 });
    }
    if (!experience?.trim()) {
      return new NextResponse("O tempo de experiência é obrigatório.", { status: 400 });
    }
    if (!brandName?.trim()) {
      return new NextResponse("O nome da assessoria é obrigatório.", { status: 400 });
    }

    // Generate unique slug
    let baseSlug = brandName
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // remove accents
      .replace(/[^\w\s-]/g, "") // remove non-word characters
      .replace(/[\s_]+/g, "-") // replace spaces/underscores with hyphens
      .replace(/--+/g, "-") // replace multiple hyphens
      .trim();

    if (!baseSlug) {
      baseSlug = "assessoria";
    }

    let uniqueSlug = baseSlug;
    let counter = 1;
    let isUnique = false;

    while (!isUnique) {
      const existing = await prisma.workspace.findUnique({
        where: { slug: uniqueSlug },
      });
      if (!existing) {
        isUnique = true;
      } else {
        uniqueSlug = `${baseSlug}-${counter}`;
        counter++;
      }
    }

    // Run transaction with extended timeout to allow large base64 image data to save over serverless connection
    const result = await prisma.$transaction(async (tx) => {
      // 1. Update Trainer Profile
      const updatedUser = await tx.user.update({
        where: { id: session.user.id },
        data: {
          name: name.trim(),
          image: image || null,
          imageKey: imageKey || null,
          bio: bio?.trim() || null,
          specialty: specialty.trim(),
          whatsapp: whatsapp.trim(),
          instagram: instagram?.trim() || null,
          linkedin: linkedin?.trim() || null,
          city: city.trim(),
          experience: experience.trim(),
          cref: cref?.trim() || null,
          onboarded: true,
        },
      });

      // 2. Create Workspace (Assessoria)
      const workspace = await tx.workspace.create({
        data: {
          name: brandName.trim(),
          slug: uniqueSlug,
          ownerId: session.user.id,
          slogan: brandSlogan?.trim() || null,
          logoUrl: logoUrl || null,
          logoKey: logoKey || null,
          primaryColor: brandColor || "#3052EB",
          watermarkUrl: watermarkUrl || null,
          watermarkKey: watermarkKey || null,
          workoutCoverUrl: workoutCoverUrl || null,
          workoutCoverKey: workoutCoverKey || null,
        },
      });

      // 3. Create WorkspaceMember link as OWNER
      await tx.workspaceMember.create({
        data: {
          userId: session.user.id,
          workspaceId: workspace.id,
          role: "OWNER",
        },
      });

      // 4. Log Workspace Update (Creation)
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: "WORKSPACE_UPDATE",
          entity: "WORKSPACE",
          entityId: workspace.id,
          severity: "success"
        }
      });

      return { user: updatedUser, workspace };
    }, {
      timeout: 30000 // 30 seconds timeout
    });

    return NextResponse.json({ success: true, workspaceId: result.workspace.id });
  } catch (error) {
    console.error("Personal Trainer Onboarding API Error:", error);
    return new NextResponse("Erro Interno do Servidor ao salvar o onboarding.", { status: 500 });
  }
}
