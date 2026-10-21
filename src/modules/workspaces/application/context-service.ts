import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { WorkspaceRole, WorkspaceType } from "@prisma/client";
import { resolveNavigationRoles } from "../domain/access-roles";
import { normalizeWorkspaceColor } from "../domain/branding";

export const ACTIVE_WORKSPACE_COOKIE = "atlasfit_active_workspace_id";
export const LEGACY_STUDENT_COOKIE = "student_active_workspace_id";

export interface ResolvedWorkspaceContext {
  status: "RESOLVED" | "NEEDS_SELECTION" | "NO_MEMBERSHIPS";
  workspaceId?: string;
  workspaceName?: string;
  workspaceSlug?: string;
  workspaceType?: WorkspaceType;
  memberId?: string;
  roles?: WorkspaceRole[];
  defaultRoute?: string;
  availableWorkspaces?: Array<{
    id: string;
    name: string;
    slug: string;
    type: WorkspaceType;
    logoUrl?: string | null;
    primaryColor: string;
    roles: WorkspaceRole[];
    unitsCount: number;
    plan: string;
  }>;
}

/**
 * Calculates the default operational landing route based on workspace type and effective member roles.
 */
export function calculateDefaultRoute(
  workspaceType: WorkspaceType,
  roles: WorkspaceRole[]
): string {
  if (workspaceType === "GYM") {
    if (roles.includes("FINANCE") && !roles.some((role) => role === "OWNER" || role === "MANAGER")) return "/gym/finance";
    if (roles.length === 1 && roles[0] === "ASSISTANT") return "/gym/students";
    // If user is receptionist and not a manager/owner/finance, route directly to fast reception desk
    const isOnlyReceptionist =
      roles.includes(WorkspaceRole.RECEPTIONIST) &&
      !roles.some((r) => ([WorkspaceRole.OWNER, WorkspaceRole.MANAGER, WorkspaceRole.FINANCE] as WorkspaceRole[]).includes(r));

    if (isOnlyReceptionist) {
      return "/gym/reception";
    }

    // If user is strictly a student in this gym
    const isOnlyStudent =
      roles.includes(WorkspaceRole.STUDENT) &&
      !roles.some((r) => r !== WorkspaceRole.STUDENT);

    if (isOnlyStudent) {
      return "/student/dashboard";
    }

    if (roles.includes("TRAINER") && !roles.some(role => ["OWNER", "MANAGER", "FINANCE", "RECEPTIONIST"].includes(role))) return "/personal/academy";

    return "/gym/dashboard";
  }

  // PERSONAL WORKSPACE
  if (
    roles.includes(WorkspaceRole.STUDENT) &&
    !roles.some((r) => ([WorkspaceRole.OWNER, WorkspaceRole.TRAINER, WorkspaceRole.ASSISTANT] as WorkspaceRole[]).includes(r))
  ) {
    return "/student/dashboard";
  }

  return "/personal/dashboard";
}

export class WorkspaceContextService {
  /**
   * Reads active workspace ID from secure cookies.
   */
  static async getActiveWorkspaceIdFromCookie(): Promise<string | null> {
    try {
      const cookieStore = await cookies();
      const id = cookieStore.get(ACTIVE_WORKSPACE_COOKIE)?.value || cookieStore.get(LEGACY_STUDENT_COOKIE)?.value;
      return id && id.trim() ? id.trim() : null;
    } catch {
      return null;
    }
  }

  /**
   * Sets active workspace cookie with long-term validity (1 year) and backwards compatibility.
   * Only call from Server Actions or Route Handlers. A failure must reach the caller.
   */
  static async setActiveWorkspaceCookie(workspaceId: string): Promise<void> {
      const cookieStore = await cookies();
      const cookieOptions = {
        path: "/",
        maxAge: 31536000, // 1 year
        sameSite: "lax" as const,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
      };

      cookieStore.set(ACTIVE_WORKSPACE_COOKIE, workspaceId, cookieOptions);
      // Maintain legacy cookie for existing student routes and prisma middleware
      cookieStore.set(LEGACY_STUDENT_COOKIE, workspaceId, cookieOptions);
  }

  /**
   * Clears active workspace cookies on logout or account switch.
   * Only call from Server Actions or Route Handlers.
   */
  static async clearActiveWorkspaceCookies(): Promise<void> {
      const cookieStore = await cookies();
      cookieStore.delete(ACTIVE_WORKSPACE_COOKIE);
      cookieStore.delete(LEGACY_STUDENT_COOKIE);
  }

  /**
   * Resolves the active workspace context for an authenticated user.
   * Verifies membership, isolates tenant boundaries, and calculates the appropriate default route.
   */
  static async resolveUserWorkspaceContext(
    userId: string,
    requestedWorkspaceId?: string
  ): Promise<ResolvedWorkspaceContext> {
    // 1. Determine candidate workspace ID (explicit parameter > cookie)
    const candidateId = requestedWorkspaceId || (await this.getActiveWorkspaceIdFromCookie());

    // 2. Fetch all active memberships for this user
    const memberships = await prisma.workspaceMember.findMany({
      where: {
        userId,
        isActive: true,
        workspace: { isActive: true },
      },
      include: {
        workspace: {
          include: {
            units: { where: { isActive: true }, select: { id: true } },
            subscription: { select: { plan: { select: { name: true } } } },
          },
        },
        roleGrants: {
          select: { role: true, unitId: true, revokedAt: true },
        },
      },
    });

    if (memberships.length === 0) {
      return { status: "NO_MEMBERSHIPS" };
    }

    // 3. If a candidate ID exists, check if user is an active member of that workspace
    if (candidateId) {
      const match = memberships.find((m) => m.workspaceId === candidateId);
      if (match) {
        // Collect effective roles combining roleGrants and legacy member.role
        const roles = resolveNavigationRoles(match.role, match.roleGrants, match.workspace.units.map(unit => unit.id));
        if (match.workspace.ownerId === userId && !roles.includes("OWNER")) roles.push("OWNER");
        const defaultRoute = calculateDefaultRoute(match.workspace.type, roles);

        return {
          status: "RESOLVED",
          workspaceId: match.workspace.id,
          workspaceName: match.workspace.name,
          workspaceSlug: match.workspace.slug,
          workspaceType: match.workspace.type,
          memberId: match.id,
          roles,
          defaultRoute,
        };
      }
    }

    // A stale/foreign explicit context must never silently operate another workspace.
    // Without a selected context, the sole membership can provide the initial landing.
    if (!candidateId && memberships.length === 1) {
      const single = memberships[0];
      const roles = resolveNavigationRoles(single.role, single.roleGrants, single.workspace.units.map(unit => unit.id));
      if (single.workspace.ownerId === userId && !roles.includes("OWNER")) roles.push("OWNER");
      const defaultRoute = calculateDefaultRoute(single.workspace.type, roles);

      return {
        status: "RESOLVED",
        workspaceId: single.workspace.id,
        workspaceName: single.workspace.name,
        workspaceSlug: single.workspace.slug,
        workspaceType: single.workspace.type,
        memberId: single.id,
        roles,
        defaultRoute,
      };
    }

    // 5. Multiple memberships exist: user must select which workspace/role to activate
    const availableWorkspaces = memberships.map((m) => {
      const roles = resolveNavigationRoles(m.role, m.roleGrants, m.workspace.units.map(unit => unit.id));
      if (m.workspace.ownerId === userId && !roles.includes("OWNER")) roles.push("OWNER");

      return {
        id: m.workspace.id,
        name: m.workspace.name,
        slug: m.workspace.slug,
        type: m.workspace.type,
        logoUrl: m.workspace.logoUrl,
        primaryColor: normalizeWorkspaceColor(m.workspace.primaryColor),
        roles,
        unitsCount: m.workspace.units.length,
        plan: m.workspace.subscription?.plan?.name || (m.workspace.type === "GYM" ? "Plano Academia" : "Personal"),
      };
    });

    return {
      status: "NEEDS_SELECTION",
      availableWorkspaces,
    };
  }
}
