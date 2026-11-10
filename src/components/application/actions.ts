"use server";

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { calculateDefaultRoute } from "@/modules/workspaces/application/context-service";
import { resolveNavigationRoles } from "@/modules/workspaces/domain/access-roles";
import { normalizeWorkspaceColor } from "@/modules/workspaces/domain/branding";
import { activeStudentMembershipWhere } from "@/lib/student-auth";

export async function getPersonalWorkspaces() {
  const session = await auth();
  if (!session?.user) return [];

  const members = await prisma.workspaceMember.findMany({
    where: {
      userId: session.user.id,
      isActive: true,
      workspace: { isActive: true },
    },
    include: {
      workspace: { include: { units: { where: { isActive: true }, select: { id: true } }, subscription: { select: { plan: { select: { name: true } } } } } },
      roleGrants: { select: { role: true, unitId: true, revokedAt: true } },
    },
  });

  return await Promise.all(
    members.map(async (member) => {
      const ws = member.workspace;
      const roles = resolveNavigationRoles(member.role, member.roleGrants, ws.units.map(unit => unit.id));
      if (ws.ownerId === session.user.id && !roles.includes("OWNER")) roles.push("OWNER");

      // Find the owner of the workspace and their active subscription
      let owner: { subscription: { plan: { name: string } } | null } | null = null;
      try {
        if (ws.type === "PERSONAL") owner = await prisma.user.findUnique({
          where: { id: ws.ownerId },
          select: {
            id: true,
            subscription: {
              select: {
                plan: {
                  select: { name: true },
                },
              },
            },
          },
        });
      } catch (err) {
        console.warn("[getPersonalWorkspaces] Error fetching workspace owner plan:", err);
      }

      const logo = ws.name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();

      return {
        id: ws.id,
        type: ws.type,
        roles,
        defaultRoute: calculateDefaultRoute(ws.type, roles),
        name: ws.name,
        slug: ws.slug,
        logo,
        logoUrl: ws.logoUrl,
        primaryColor: normalizeWorkspaceColor(ws.primaryColor),
        plan: ws.type === "GYM" ? ws.subscription?.plan?.name || "Academia" : owner?.subscription?.plan?.name || "Free Trial",
        slogan: ws.slogan,
        watermarkUrl: ws.watermarkUrl,
        workoutCoverUrl: ws.workoutCoverUrl,
        ownerId: ws.ownerId,
      };
    })
  );
}

export async function getStudentWorkspaces() {
  const session = await auth();
  if (!session?.user?.id) return [];
  const memberships = await prisma.workspaceMember.findMany({ where: { ...activeStudentMembershipWhere(), userId: session.user.id }, select: { workspaceId: true } });
  const ids = new Set(memberships.map(member => member.workspaceId));
  return (await getPersonalWorkspaces()).filter(workspace => ids.has(workspace.id));
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

export async function getAvailablePlans(type: "PERSONAL" | "GYM" = "PERSONAL") {
  try {
    return await prisma.plan.findMany({
      where: { customWorkspaceId: null, type },
      orderBy: { price: "asc" },
    });
  } catch (error) {
    console.error("Failed to fetch available plans:", error);
    return [];
  }
}

export async function getTrainerWorkspaceLimit() {
  const session = await auth(); if (!session?.user?.id) return null;
  const { getPersonalWorkspaceAllowance } = await import("@/modules/workspaces/application/personal-affiliation");
  const allowance = await getPersonalWorkspaceAllowance(session.user.id).catch(error => {
    if (error instanceof Error && "statusCode" in error && error.statusCode === 403) return { current: 0, limit: 0, isTestAccount: false, entitled: false, firstTrialEligible: false, planName: "Assessoria própria" };
    throw error;
  });
  const domain = await prisma.systemSetting.findUnique({ where: { key: "primary_domain" } });
  return { ...allowance, primaryDomain: domain?.value || "atlasfit.app" };
}

export async function createWorkspace(data: { name: string; slug?: string }) {
  const session = await auth(); if (!session?.user?.id) return { error: "Não autorizado. Por favor, faça login." };
  try {
    const { createPrivatePersonalWorkspace } = await import("@/modules/workspaces/application/personal-affiliation");
    const { workspace, planName } = await createPrivatePersonalWorkspace(session.user.id, { name: data.name, slug: data.slug?.trim() || slugify(data.name) });
    return { success: true, workspace: { id: workspace.id, type: workspace.type, roles: ["OWNER" as const], defaultRoute: "/personal/dashboard", name: workspace.name, slug: workspace.slug, logo: workspace.name.slice(0, 2).toUpperCase(), logoUrl: workspace.logoUrl, primaryColor: normalizeWorkspaceColor(workspace.primaryColor), plan: planName, slogan: workspace.slogan, watermarkUrl: workspace.watermarkUrl, workoutCoverUrl: workspace.workoutCoverUrl, ownerId: workspace.ownerId } };
  } catch (error) { return { error: error instanceof Error ? error.message : "Não foi possível criar a assessoria." }; }
}

export async function getGymBranchLimit() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, isTestAccount: true },
  });
  if (!user) return null;

  const current = await prisma.workspace.count({
    where: { ownerId: user.id, type: "GYM", isActive: true },
  });

  const activeSub = await prisma.workspaceSubscription.findFirst({
    where: {
      workspace: { ownerId: user.id, type: "GYM", isActive: true },
      OR: [
        { status: "ACTIVE" },
        { status: "TRIAL", trialEndsAt: { gt: new Date() } },
      ],
    },
    include: { plan: true },
    orderBy: { createdAt: "desc" },
  });

  const domain = await prisma.systemSetting.findUnique({ where: { key: "primary_domain" } });
  const isTestAccount = Boolean(user.isTestAccount);
  const limit = isTestAccount ? 999999 : (activeSub?.plan?.maxWorkspaces ?? activeSub?.maxUnits ?? 1);
  const planName = isTestAccount ? "Conta de Teste" : (activeSub?.plan?.name ?? (activeSub?.status === "TRIAL" ? "Trial Gratuito" : "Plano Academia"));
  const entitled = isTestAccount || Boolean(activeSub);

  return {
    current,
    limit,
    isTestAccount,
    entitled,
    planName,
    primaryDomain: domain?.value || "atlasfit.app",
  };
}

export async function createGymBranch(data: { name: string; slug?: string }) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Não autorizado. Por favor, faça login." };
  }

  const name = data.name?.trim();
  if (!name || name.length < 1 || name.length > 120) {
    return { error: "Nome da filial inválido (deve ter entre 1 e 120 caracteres)." };
  }

  let finalSlug = slugify(data.slug?.trim() || name);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(finalSlug)) {
    return { error: "Endereço exclusivo (slug) inválido." };
  }

  try {
    const { serializableTransaction } = await import("@/modules/workspaces/application/transaction");
    const { GymFeatureFlagsService } = await import("@/modules/workspaces/application/gym-feature-flags-service");
    const { provisionExpenseCategories } = await import("@/modules/workspaces/application/gym-expense-catalog");

    const result = await serializableTransaction(async (tx) => {
      // Row lock on user to serialize branch creations
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${session.user.id} FOR UPDATE`;

      const user = await tx.user.findUniqueOrThrow({
        where: { id: session.user.id },
        select: { id: true, isTestAccount: true },
      });

      const current = await tx.workspace.count({
        where: { ownerId: user.id, type: "GYM", isActive: true },
      });

      const activeSub = await tx.workspaceSubscription.findFirst({
        where: {
          workspace: { ownerId: user.id, type: "GYM", isActive: true },
          OR: [
            { status: "ACTIVE" },
            { status: "TRIAL", trialEndsAt: { gt: new Date() } },
          ],
        },
        include: { plan: true },
        orderBy: { createdAt: "desc" },
      });

      const limit = user.isTestAccount ? 999999 : (activeSub?.plan?.maxWorkspaces ?? activeSub?.maxUnits ?? 1);
      if (!user.isTestAccount && current >= limit) {
        throw new Error(`Limite de filiais atingido (${current}/${limit}). Faça upgrade do plano da sua franquia para criar novas filiais.`);
      }

      // Check slug uniqueness
      const existing = await tx.workspace.findUnique({
        where: { slug: finalSlug },
        select: { id: true },
      });
      if (existing) {
        finalSlug = `${finalSlug.slice(0, 85)}-${Math.random().toString(36).substring(2, 7)}`;
      }

      const defaults = await GymFeatureFlagsService.getGymGlobalConfigs(tx);

      const workspace = await tx.workspace.create({
        data: {
          name,
          slug: finalSlug,
          ownerId: session.user.id,
          type: "GYM",
          isActive: true,
        },
      });

      await tx.workspaceMember.create({
        data: {
          workspaceId: workspace.id,
          userId: session.user.id,
          role: "OWNER",
          isActive: true,
          roleGrants: {
            create: { role: "OWNER", grantedBy: session.user.id },
          },
        },
      });

      await tx.gymSettings.create({
        data: {
          workspaceId: workspace.id,
          billingGracePeriodDays: defaults.defaultBillingGraceDays,
          requireGuardianSignature: defaults.defaultRequireGuardianSignature,
          maxReceptionistDiscountPercentage: defaults.defaultMaxReceptionistDiscountPercent,
          maxReceptionistDiscountInCents: BigInt(defaults.defaultMaxReceptionistDiscountCents),
        },
      });

      await tx.gymUnit.create({
        data: {
          workspaceId: workspace.id,
          name: "Unidade Principal",
          slug: `${finalSlug}-principal`,
          code: "U01",
        },
      });

      await provisionExpenseCategories(tx, workspace.id);

      // Create WorkspaceSubscription for the new filial matching owner's active subscription
      await tx.workspaceSubscription.create({
        data: {
          workspaceId: workspace.id,
          planId: activeSub?.planId || null,
          status: activeSub?.status || "TRIAL",
          startDate: activeSub?.startDate || new Date(),
          endDate: activeSub?.endDate || null,
          trialEndsAt: activeSub?.trialEndsAt || new Date(Date.now() + 30 * 86400000),
          maxStudents: activeSub?.plan?.maxStudents ?? activeSub?.maxStudents ?? defaults.defaultMaxStudents,
          maxStaff: activeSub?.plan?.maxStaff ?? activeSub?.maxStaff ?? defaults.defaultMaxStaff,
          maxUnits: 1,
          storageLimitMb: activeSub?.plan?.storageLimitMb ?? activeSub?.storageLimitMb ?? defaults.defaultStorageLimitMb,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: "GYM_BRANCH_CREATED",
          entity: "WORKSPACE",
          entityId: workspace.id,
          severity: "success",
        },
      });

      return {
        workspace,
        planName: user.isTestAccount ? "Conta de Teste" : (activeSub?.plan?.name || "Plano Academia"),
      };
    });

    return {
      success: true,
      workspace: {
        id: result.workspace.id,
        type: result.workspace.type,
        roles: ["OWNER" as const],
        defaultRoute: "/gym/dashboard",
        name: result.workspace.name,
        slug: result.workspace.slug,
        logo: result.workspace.name.slice(0, 2).toUpperCase(),
        logoUrl: result.workspace.logoUrl,
        primaryColor: normalizeWorkspaceColor(result.workspace.primaryColor),
        plan: result.planName,
        slogan: result.workspace.slogan,
        watermarkUrl: result.workspace.watermarkUrl,
        workoutCoverUrl: result.workspace.workoutCoverUrl,
        ownerId: result.workspace.ownerId,
      },
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Não foi possível criar a filial da academia.",
    };
  }
}

