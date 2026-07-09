"use server";

import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function getPersonalWorkspaces() {
  const session = await auth();
  if (!session?.user) return [];

  const members = await prisma.workspaceMember.findMany({
    where: { userId: session.user.id },
    include: {
      workspace: true,
    },
  });

  const colors = ["#0ea5e9", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6"];

  return await Promise.all(
    members.map(async (member, index) => {
      const ws = member.workspace;

      // Find the owner of the workspace and their active subscription
      const owner = await prisma.user.findUnique({
        where: { id: ws.ownerId },
        include: {
          subscription: {
            include: {
              plan: true,
            },
          },
        },
      });

      const logo = ws.name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();

      return {
        id: ws.id,
        name: ws.name,
        slug: ws.slug,
        logo,
        logoUrl: ws.logoUrl,
        primaryColor: ws.primaryColor || "#0ea5e9",
        plan: owner?.subscription?.plan?.name || "Free Trial",
        slogan: ws.slogan,
        watermarkUrl: ws.watermarkUrl,
        workoutCoverUrl: ws.workoutCoverUrl,
      };
    })
  );
}

function slugify(text: string) {
  return text
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/[^\w\s-]/g, "") // Remove non-word chars
    .replace(/[\s_]+/g, "-") // Replace spaces/underscores with hyphens
    .replace(/--+/g, "-") // Replace multiple hyphens
    .trim();
}

export async function getAvailablePlans() {
  try {
    return await prisma.plan.findMany({
      orderBy: { price: "asc" },
    });
  } catch (error) {
    console.error("Failed to fetch available plans:", error);
    return [];
  }
}

export async function getTrainerWorkspaceLimit() {
  const session = await auth();
  if (!session?.user) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isTestAccount: true },
  });

  const isTestAccount = user?.isTestAccount || false;

  const sub = await prisma.subscription.findUnique({
    where: { userId: session.user.id },
    include: { plan: true },
  });

  const count = await prisma.workspace.count({
    where: { ownerId: session.user.id },
  });

  const domainSetting = await prisma.systemSetting.findUnique({
    where: { key: "primary_domain" }
  });

  return {
    current: count,
    limit: isTestAccount ? 999999 : (sub?.plan?.maxWorkspaces || 1),
    isTestAccount,
    planName: isTestAccount ? "Conta de Teste" : (sub?.plan?.name || "Free Trial"),
    primaryDomain: domainSetting?.value || "atlasfit.app",
  };
}

export async function createWorkspace(data: {
  name: string;
  slug?: string;
}) {
  const session = await auth();
  if (!session?.user) {
    return { error: "Não autorizado. Por favor, faça login." };
  }

  const name = data.name.trim();
  if (!name) {
    return { error: "O nome do workspace é obrigatório." };
  }

  const generatedSlug = data.slug?.trim() || slugify(name);
  if (!generatedSlug) {
    return { error: "Não foi possível gerar um endereço (slug) válido para o workspace." };
  }

  try {
    // Check if slug is unique
    const existing = await prisma.workspace.findUnique({
      where: { slug: generatedSlug.toLowerCase() },
    });
    if (existing) {
      return { error: "Este endereço (slug) já está em uso por outro workspace." };
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isTestAccount: true },
    });

    const isTestAccount = user?.isTestAccount || false;

    // Query active user subscription and limit
    const sub = await prisma.subscription.findUnique({
      where: { userId: session.user.id },
      include: { plan: true },
    });

    const freeTrial = await prisma.freeTrial.findUnique({
      where: { userId: session.user.id }
    });

    const isTrialActive = freeTrial && new Date() < new Date(freeTrial.endDate);
    const maxWorkspaces = isTrialActive ? 1 : (sub?.plan?.maxWorkspaces || 1);

    const ownedCount = await prisma.workspace.count({
      where: { ownerId: session.user.id },
    });

    if (!isTestAccount && ownedCount >= maxWorkspaces) {
      if (isTrialActive) {
        return { error: "Durante o período de Free Trial, você só pode criar no máximo 1 workspace." };
      }
      return { error: `Limite de workspaces atingido para o seu plano (${maxWorkspaces}). Faça o upgrade para criar mais.` };
    }

    const newWorkspace = await prisma.$transaction(async (tx) => {
      // Create Workspace
      const ws = await tx.workspace.create({
        data: {
          name,
          slug: generatedSlug.toLowerCase(),
          ownerId: session.user.id,
        },
      });

      // Create Workspace Member as OWNER
      await tx.workspaceMember.create({
        data: {
          userId: session.user.id,
          workspaceId: ws.id,
          role: "OWNER",
        },
      });

      return ws;
    });

    const logo = newWorkspace.name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

    return {
      success: true,
      workspace: {
        id: newWorkspace.id,
        name: newWorkspace.name,
        slug: newWorkspace.slug,
        logo,
        logoUrl: newWorkspace.logoUrl,
        primaryColor: newWorkspace.primaryColor || "#0ea5e9",
        plan: sub?.plan?.name || "Free Trial",
        slogan: newWorkspace.slogan,
        watermarkUrl: newWorkspace.watermarkUrl,
        workoutCoverUrl: newWorkspace.workoutCoverUrl,
      },
    };
  } catch (error) {
    console.error("Failed to create workspace:", error);
    return { error: "Ocorreu um erro ao criar o workspace. Tente novamente." };
  }
}

