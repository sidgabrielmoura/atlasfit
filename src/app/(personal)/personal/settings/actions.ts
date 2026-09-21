"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { slugify } from "@/lib/utils";

export async function updateProfile(data: {
  name: string;
  image?: string;
  imageKey?: string;
  specialty?: string;
  bio?: string;
  whatsapp?: string;
  instagram?: string;
  linkedin?: string;
  city?: string;
  experience?: string;
  cref?: string;
}) {
  const session = await auth();
  if (!session || !session.user || !session.user.id) {
    throw new Error("Não autorizado");
  }

  const userBefore = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true },
  });

  const updatedUser = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name: data.name,
      image: data.image || null,
      imageKey: data.imageKey || null,
      specialty: data.specialty || null,
      bio: data.bio || null,
      whatsapp: data.whatsapp || null,
      instagram: data.instagram || null,
      linkedin: data.linkedin || null,
      city: data.city || null,
      experience: data.experience || null,
      cref: data.cref || null,
    },
  });

  // Se o nome do treinador mudou, sincroniza o workspace caso o slug ainda refletisse o nome antigo
  if (userBefore?.name && userBefore.name.trim() !== data.name.trim()) {
    const oldSlug = slugify(userBefore.name);
    const newSlug = slugify(data.name);

    if (oldSlug && newSlug && oldSlug !== newSlug) {
      const ownedWorkspace = await prisma.workspace.findFirst({
        where: {
          ownerId: session.user.id,
          slug: oldSlug,
        },
      });

      if (ownedWorkspace) {
        const slugExists = await prisma.workspace.findFirst({
          where: {
            slug: newSlug,
            id: { not: ownedWorkspace.id },
          },
        });

        if (!slugExists) {
          await prisma.workspace.update({
            where: { id: ownedWorkspace.id },
            data: { slug: newSlug },
          });
        }
      }
    }
  }

  return { success: true, user: updatedUser };
}

export async function updateBrandSettings(
  workspaceId: string,
  data: {
    name: string;
    slug?: string | null;
    slogan?: string | null;
    primaryColor?: string | null;
    logoUrl?: string | null;
    logoKey?: string | null;
    watermarkUrl?: string | null;
    watermarkKey?: string | null;
    workoutCoverUrl?: string | null;
    workoutCoverKey?: string | null;
  }
) {
  const session = await auth();
  if (!session || !session.user || !session.user.id) {
    throw new Error("Não autorizado");
  }

  const isSuperAdminOrImpersonated =
    session.user.role === "SUPERADMIN" ||
    (session.user as any).isImpersonated === true;

  if (!isSuperAdminOrImpersonated) {
    const member = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId: session.user.id,
        role: { in: ["OWNER", "TRAINER", "ASSISTANT"] },
      },
    });

    if (!member) {
      throw new Error("Permissão negada. Apenas administradores e proprietários podem alterar a marca.");
    }
  }

  // Obter workspace atual para verificar o slug
  const currentWorkspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
  });

  if (!currentWorkspace) {
    throw new Error("Workspace não encontrado.");
  }

  // Determinar novo slug se fornecido ou se o nome mudou
  let finalSlug = currentWorkspace.slug;
  if (data.slug && data.slug.trim()) {
    const candidateSlug = slugify(data.slug.trim());
    if (candidateSlug && candidateSlug !== currentWorkspace.slug) {
      const existing = await prisma.workspace.findFirst({
        where: {
          slug: candidateSlug,
          id: { not: workspaceId },
        },
      });
      if (existing) {
        throw new Error(`O link/slug "${candidateSlug}" já está em uso por outro profissional. Por favor, escolha outro.`);
      }
      finalSlug = candidateSlug;
    }
  }

  const updatedWorkspace = await prisma.workspace.update({
    where: { id: workspaceId },
    data: {
      name: data.name.trim(),
      slug: finalSlug,
      slogan: data.slogan?.trim() || null,
      primaryColor: data.primaryColor?.trim() || "#2B4FCC",
      logoUrl: data.logoUrl?.trim() || null,
      logoKey: data.logoKey || null,
      watermarkUrl: data.watermarkUrl?.trim() || null,
      watermarkKey: data.watermarkKey || null,
      workoutCoverUrl: data.workoutCoverUrl?.trim() || null,
      workoutCoverKey: data.workoutCoverKey || null,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "WORKSPACE_UPDATE",
      entity: "WORKSPACE",
      entityId: workspaceId,
      severity: "success",
    },
  });

  const logo = updatedWorkspace.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return {
    success: true,
    workspace: {
      id: updatedWorkspace.id,
      name: updatedWorkspace.name,
      slug: updatedWorkspace.slug,
      logo,
      logoUrl: updatedWorkspace.logoUrl,
      logoKey: updatedWorkspace.logoKey,
      primaryColor: updatedWorkspace.primaryColor || "#2B4FCC",
      slogan: updatedWorkspace.slogan,
      watermarkUrl: updatedWorkspace.watermarkUrl,
      watermarkKey: updatedWorkspace.watermarkKey,
      workoutCoverUrl: updatedWorkspace.workoutCoverUrl,
      workoutCoverKey: updatedWorkspace.workoutCoverKey,
    },
  };
}
