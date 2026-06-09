"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/auth";

export async function updateProfile(data: {
  name: string;
  image?: string;
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

  const updatedUser = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name: data.name,
      image: data.image || null,
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

  return { success: true, user: updatedUser };
}

export async function updateBrandSettings(
  workspaceId: string,
  data: {
    name: string;
    slogan?: string | null;
    primaryColor?: string | null;
    logoUrl?: string | null;
    watermarkUrl?: string | null;
    workoutCoverUrl?: string | null;
  }
) {
  const session = await auth();
  if (!session || !session.user || !session.user.id) {
    throw new Error("Não autorizado");
  }

  // Ensure member has permission (OWNER or ADMIN)
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

  const updatedWorkspace = await prisma.workspace.update({
    where: { id: workspaceId },
    data: {
      name: data.name.trim(),
      slogan: data.slogan?.trim() || null,
      primaryColor: data.primaryColor?.trim() || "#0ea5e9",
      logoUrl: data.logoUrl?.trim() || null,
      watermarkUrl: data.watermarkUrl?.trim() || null,
      workoutCoverUrl: data.workoutCoverUrl?.trim() || null,
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
      primaryColor: updatedWorkspace.primaryColor || "#0ea5e9",
      slogan: updatedWorkspace.slogan,
      watermarkUrl: updatedWorkspace.watermarkUrl,
      workoutCoverUrl: updatedWorkspace.workoutCoverUrl,
    },
  };
}
