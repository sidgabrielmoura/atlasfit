"use server";

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { WorkspaceContextService, calculateDefaultRoute } from "./context-service";
import { resolveNavigationRoles } from "../domain/access-roles";
import { normalizeWorkspaceColor } from "../domain/branding";
import { assertGymOperationalWorkspace } from "./gym-license";
import { WorkspaceAccessError } from "../domain/types";

/**
 * Server action to securely select and activate a workspace for the authenticated session.
 * Enforces membership check before setting cookies.
 */
export async function selectActiveWorkspace(workspaceId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Sessão não autenticada." };
  }

  if (!workspaceId || typeof workspaceId !== "string") {
    return { error: "Identificador de workspace inválido." };
  }

  const membership = await prisma.workspaceMember.findFirst({
    where: {
      userId: session.user.id,
      workspaceId: workspaceId.trim(),
      isActive: true,
    },
    include: {
      workspace: {
        include: {
          units: { where: { isActive: true }, select: { id: true } },
        },
      },
      roleGrants: {
        select: { role: true, unitId: true, revokedAt: true },
      },
    },
  });

  if (!membership) {
    return { error: "Acesso negado: você não possui vínculo ativo com este workspace." };
  }

  if (membership.workspace.isActive === false) {
    return { error: "Este workspace está suspenso. Procure o suporte para regularizar o acesso." };
  }

  if (membership.workspace.type === "PERSONAL" && membership.workspace.ownerId) {
    const owner = await prisma.user.findUnique({
      where: { id: membership.workspace.ownerId },
      select: { isBlocked: true },
    });
    if (owner?.isBlocked) {
      return { error: "Este workspace está suspenso. Procure o suporte para regularizar o acesso." };
    }
  }
  if (membership.workspace.type === "GYM") {
    try { await assertGymOperationalWorkspace(membership.workspaceId); }
    catch (error) { if (error instanceof WorkspaceAccessError) return { error: error.message }; throw error; }
  }

  const roles = resolveNavigationRoles(membership.role, membership.roleGrants, membership.workspace.units.map(unit => unit.id));
  if (membership.workspace.ownerId === session.user.id && !roles.includes("OWNER")) roles.push("OWNER");
  if (!roles.length) return { error: "Seu vínculo não possui papel operacional ativo neste workspace." };
  await WorkspaceContextService.setActiveWorkspaceCookie(membership.workspaceId);
  const defaultRoute = calculateDefaultRoute(membership.workspace.type, roles);

  return {
    success: true,
    workspace: {
      id: membership.workspace.id,
      name: membership.workspace.name,
      slug: membership.workspace.slug,
      type: membership.workspace.type,
      primaryColor: normalizeWorkspaceColor(membership.workspace.primaryColor),
      logoUrl: membership.workspace.logoUrl,
      logo: membership.workspace.name.slice(0, 2).toUpperCase(),
      plan: membership.workspace.type === "GYM" ? "Academia" : "Personal",
      roles,
      slogan: membership.workspace.slogan,
      watermarkUrl: membership.workspace.watermarkUrl,
      workoutCoverUrl: membership.workspace.workoutCoverUrl,
    },
    defaultRoute,
  };
}

/**
 * Server action to clear active workspace cookies (e.g. on logout or workspace exit).
 */
export async function clearActiveWorkspace() {
  await WorkspaceContextService.clearActiveWorkspaceCookies();
  return { success: true };
}
