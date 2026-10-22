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

export async function getAvailablePlans() {
  try {
    return await prisma.plan.findMany({
      where: { customWorkspaceId: null },
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
    return { success: true, workspace: { id: workspace.id, type: workspace.type, roles: ["OWNER" as const], defaultRoute: "/personal/dashboard", name: workspace.name, slug: workspace.slug, logo: workspace.name.slice(0, 2).toUpperCase(), logoUrl: workspace.logoUrl, primaryColor: normalizeWorkspaceColor(workspace.primaryColor), plan: planName, slogan: workspace.slogan, watermarkUrl: workspace.watermarkUrl, workoutCoverUrl: workspace.workoutCoverUrl } };
  } catch (error) { return { error: error instanceof Error ? error.message : "Não foi possível criar a assessoria." }; }
}
