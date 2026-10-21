"use server";

import { personalCommercialContextResponse } from "@/lib/personal-commercial-context";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { slugify } from "@/lib/utils";
import { updateWorkspaceBranding } from "@/modules/workspaces/application/branding-service";

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
  const restricted = await personalCommercialContextResponse(); if (restricted) throw new Error("Selecione sua assessoria própria para editar o perfil.");
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
      image: data.image?.startsWith("/api/user/avatar?") ? undefined : data.image || null,
      imageKey: data.image?.startsWith("/api/user/avatar?") ? undefined : data.imageKey || null,
      specialty: data.specialty || null,
      bio: data.bio || null,
      whatsapp: data.whatsapp || null,
      instagram: data.instagram || null,
      linkedin: data.linkedin || null,
      city: data.city || null,
      experience: data.experience || null,
      cref: data.cref || null,
    },
    select: { id: true, name: true, image: true, imageKey: true, specialty: true, bio: true, whatsapp: true, instagram: true, linkedin: true, city: true, experience: true, cref: true },
  });

  // Se o nome do treinador mudou, sincroniza o workspace caso o slug ainda refletisse o nome antigo
  if (userBefore?.name && userBefore.name.trim() !== data.name.trim()) {
    const oldSlug = slugify(userBefore.name);
    const newSlug = slugify(data.name);

    if (oldSlug && newSlug && oldSlug !== newSlug) {
      const ownedWorkspace = await prisma.workspace.findFirst({
        where: {
          ownerId: session.user.id,
          type: "PERSONAL",
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
  const restricted = await personalCommercialContextResponse(); if (restricted) throw new Error("Selecione sua assessoria própria para editar a marca.");
  const session = await auth();
  if (!session?.user?.id) throw new Error('Não autorizado.');
  const workspace = await updateWorkspaceBranding(workspaceId, session.user.id, 'PERSONAL', {
    ...data,
    slug: data.slug?.trim() ? slugify(data.slug.trim()) : undefined,
    primaryColor: data.primaryColor?.trim() || '#2B4FCC',
  });
  return { success: true, workspace };
}
