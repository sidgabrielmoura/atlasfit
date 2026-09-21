import prisma from "@/lib/prisma";
import { slugify } from "@/lib/utils";

export { slugify };

/**
 * Busca um workspace de forma resiliente por slug ou apelidos/nomes:
 * 1. Correspondência direta de workspace.slug
 * 2. Correspondência sem diferenciar maiúsculas/minúsculas de workspace.slug
 * 3. Correspondência por nome do workspace (ex: "AtlasFit" -> /t/atlasfit)
 * 4. Correspondência pelo nome do Personal Trainer dono do workspace (ex: "Gabriel" ou "Marcos Almeida" -> /t/gabriel)
 * 5. Correspondência pelo referralCode do Personal Trainer
 */
export async function findWorkspaceBySlugOrAlias(rawSlug: string) {
  if (!rawSlug) return null;

  const decoded = decodeURIComponent(rawSlug).trim();
  const cleanSlug = slugify(decoded);

  // 1. Busca direta pelo slug normalizado
  if (cleanSlug) {
    const directMatch = await prisma.workspace.findUnique({
      where: { slug: cleanSlug },
    });
    if (directMatch && directMatch.isActive) {
      return directMatch;
    }
  }

  // 2. Busca case-insensitive pelo slug bruto decodificado ou limpo
  const caseInsensitiveMatch = await prisma.workspace.findFirst({
    where: {
      OR: [
        { slug: { equals: cleanSlug, mode: "insensitive" } },
        { slug: { equals: decoded.toLowerCase(), mode: "insensitive" } },
      ],
      isActive: true,
    },
  });
  if (caseInsensitiveMatch) {
    return caseInsensitiveMatch;
  }

  // 3. Busca por nome do Workspace (ex: se o workspace se chama "AtlasFit", acessar /t/atlasfit encontra)
  const nameMatch = await prisma.workspace.findFirst({
    where: {
      OR: [
        { name: { equals: decoded, mode: "insensitive" } },
        { name: { equals: cleanSlug, mode: "insensitive" } },
      ],
      isActive: true,
    },
  });
  if (nameMatch) {
    return nameMatch;
  }

  // 4. Busca por nome ou código de indicação do Personal Trainer (dono do workspace)
  const trainerMatch = await prisma.user.findFirst({
    where: {
      role: "TRAINER",
      OR: [
        { name: { equals: decoded, mode: "insensitive" } },
        { referralCode: { equals: cleanSlug, mode: "insensitive" } },
        { referralCode: { equals: decoded, mode: "insensitive" } },
      ],
    },
    include: {
      workspaces: {
        where: { role: "OWNER", isActive: true },
        include: { workspace: true },
      },
    },
  });

  if (trainerMatch && trainerMatch.workspaces.length > 0) {
    const activeWsMember = trainerMatch.workspaces.find((w) => w.workspace.isActive);
    if (activeWsMember) {
      return activeWsMember.workspace;
    }
  }

  // 5. Fallback por slugificação dos nomes dos personals cadastrados
  // (útil quando o slug tem hífen, ex: "gabriel-silva" para o personal "Gabriel Silva")
  const allTrainers = await prisma.user.findMany({
    where: { role: "TRAINER" },
    select: {
      id: true,
      name: true,
      workspaces: {
        where: { role: "OWNER", isActive: true },
        include: { workspace: true },
      },
    },
  });

  for (const trainer of allTrainers) {
    if (trainer.name && slugify(trainer.name) === cleanSlug) {
      const activeWs = trainer.workspaces.find((w) => w.workspace.isActive);
      if (activeWs) {
        return activeWs.workspace;
      }
    }
  }

  return null;
}
