"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/auth";

export async function updateProfile(data: {
  name: string;
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
