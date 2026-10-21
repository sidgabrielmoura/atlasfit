import { workspaceRequestFacts, memberRequestFacts } from "@/lib/workspace-request-facts";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { resolveAccessRoles, resolveGymAccessRoles } from "../domain/access-roles";
import { assertGymOperationalWorkspace } from "./gym-license";
import { WorkspaceContextService } from "./context-service";
import {
  WorkspaceRole,
  WorkspaceCapability,
  ALL_CAPABILITIES,
  resolveEffectiveCapabilities,
} from "../domain/roles";
import {
  WorkspaceContext,
  RequireWorkspaceAccessOptions,
  WorkspaceAccessError,
} from "../domain/types";

/**
 * Enforces workspace authentication, tenant membership, role verification,
 * and capability checks on the server side.
 * 
 * Complies with Global Security Rules:
 * AUTHENTICATION -> PERMISSION -> RESOURCE OWNERSHIP -> TENANT -> BUSINESS RULE.
 */
export async function requireWorkspaceAccess(
  options: RequireWorkspaceAccessOptions
): Promise<WorkspaceContext> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new WorkspaceAccessError(
      401,
      "UNAUTHORIZED",
      "Sessão não autenticada. Faça login para continuar."
    );
  }

  const { workspaceId } = options;
  if (!workspaceId || typeof workspaceId !== "string" || !workspaceId.trim()) {
    throw new WorkspaceAccessError(
      400,
      "WORKSPACE_REQUIRED",
      "O identificador do workspace é obrigatório."
    );
  }

  const sanitizedWorkspaceId = workspaceId.trim();
  if (options.requireActiveContext && session.user.role !== "SUPERADMIN") {
    const activeId = await WorkspaceContextService.getActiveWorkspaceIdFromCookie();
    if (activeId && activeId !== sanitizedWorkspaceId) throw new WorkspaceAccessError(409, "WORKSPACE_CONTEXT_MISMATCH", "O workspace ativo mudou. Recarregue ou selecione a academia antes de continuar.");
  }

  // 1. Fetch workspace to ensure existence and identify owner
  const workspace = await workspaceRequestFacts(sanitizedWorkspaceId);

  if (!workspace) {
    throw new WorkspaceAccessError(
      404,
      "WORKSPACE_NOT_FOUND",
      "Workspace não encontrado."
    );
  }
  if (options.expectedType && workspace.type !== options.expectedType) throw new WorkspaceAccessError(403, "FORBIDDEN_RESOURCE", "Workspace incompatível com esta operação.");

  const isSuperAdmin = session.user.role === "SUPERADMIN";
  if (workspace.type === "GYM") await assertGymOperationalWorkspace(sanitizedWorkspaceId);
  if (!workspace.isActive && !isSuperAdmin) {
    throw new WorkspaceAccessError(403, "WORKSPACE_SUSPENDED", "Academia suspensa. Procure o administrador para regularizar o acesso.");
  }

  if (options.unitId) {
    const unit = await prisma.gymUnit.findFirst({
      where: { id: options.unitId, workspaceId: sanitizedWorkspaceId, isActive: true },
      select: { id: true },
    });
    if (!unit) throw new WorkspaceAccessError(404, "UNIT_NOT_FOUND", "Unidade indisponível neste workspace.");
  }

  // 2. Fetch user's membership in this workspace, including active role grants
  const member = await memberRequestFacts(sanitizedWorkspaceId, session.user.id);

  // If user is not a member and not a superadmin, deny access
  if (!member && !isSuperAdmin) {
    throw new WorkspaceAccessError(
      403,
      "NOT_A_MEMBER",
      "Acesso negado: você não possui vínculo com este workspace."
    );
  }

  // 3. Check membership active status
  if (member && !member.isActive && !options.allowInactive && !isSuperAdmin) {
    throw new WorkspaceAccessError(
      403,
      "MEMBER_INACTIVE",
      "Seu vínculo com este workspace está desativado ou suspenso."
    );
  }

  // 4. Resolve effective roles (from active roleGrants with legacy member.role fallback)
  if (workspace.type === "GYM" && options.unitId && member?.unitId && !member.roleGrants.length && member.unitId !== options.unitId && workspace.ownerId !== session.user.id && !isSuperAdmin) throw new WorkspaceAccessError(403, "INSUFFICIENT_PERMISSIONS", "Papel legado restrito à unidade do vínculo.");
  const roles: WorkspaceRole[] = isSuperAdmin ? ["OWNER"] : member
    ? workspace.type === "GYM" ? resolveGymAccessRoles(member, options.unitId) : resolveAccessRoles(member.role, member.roleGrants, options.unitId) : [];
  const isOwner = workspace.ownerId === session.user.id || roles.includes("OWNER");
  if (isOwner && !roles.includes("OWNER")) roles.push("OWNER");

  // 5. Resolve effective capabilities
  let capabilities: Set<WorkspaceCapability>;
  if (isSuperAdmin || isOwner) {
    capabilities = new Set(ALL_CAPABILITIES);
  } else {
    capabilities = resolveEffectiveCapabilities(roles);
  }

  const context: WorkspaceContext = {
    userId: session.user.id,
    userEmail: session.user.email || null,
    userRole: session.user.role || "USER",
    workspaceId: workspace.id,
    workspaceName: workspace.name,
    workspaceSlug: workspace.slug,
    workspaceType: workspace.type,
    isOwner,
    memberId: member?.id || "",
    memberRole: isOwner ? "OWNER" : (roles[0] || member?.role || "STUDENT"),
    roles,
    capabilities,
    hasCapability: (cap) => capabilities.has(cap),
    isActive: member ? member.isActive : true,
    isSuperAdmin,
  };

  // 6. Capability verification
  if (options.capability && !context.capabilities.has(options.capability)) {
    throw new WorkspaceAccessError(
      403,
      "INSUFFICIENT_PERMISSIONS",
      `Permissão insuficiente: operação requer a capacidade '${options.capability}'.`
    );
  }

  const allCaps = options.allCapabilities || options.requiredCapabilities;
  if (allCaps) {
    for (const cap of allCaps) {
      if (!context.capabilities.has(cap)) {
        throw new WorkspaceAccessError(
          403,
          "INSUFFICIENT_PERMISSIONS",
          `Permissão insuficiente: operação requer a capacidade '${cap}'.`
        );
      }
    }
  }

  if (options.anyCapability && options.anyCapability.length > 0) {
    const hasAny = options.anyCapability.some((cap) => context.capabilities.has(cap));
    if (!hasAny) {
      throw new WorkspaceAccessError(
        403,
        "INSUFFICIENT_PERMISSIONS",
        "Permissão insuficiente: nenhuma das capacidades necessárias foi encontrada."
      );
    }
  }

  // 7. Role-based restrictions (if explicitly specified)
  if (options.allowedRoles && options.allowedRoles.length > 0) {
    const hasAllowedRole = context.roles.some((r) => options.allowedRoles!.includes(r));
    if (!hasAllowedRole) {
      throw new WorkspaceAccessError(
        403,
        "INSUFFICIENT_PERMISSIONS",
        "Seu perfil neste workspace não possui autorização para esta operação."
      );
    }
  }

  // 8. Resource ownership / IDOR check
  if (options.resourceOwnerId) {
    const isResourceOwner = options.resourceOwnerId === session.user.id;
    const canManageStudents = context.capabilities.has("students.read") || context.capabilities.has("students.manage");

    if (!isResourceOwner && !canManageStudents) {
      throw new WorkspaceAccessError(
        403,
        "FORBIDDEN_RESOURCE",
        "Acesso negado: você não tem permissão para acessar os dados deste usuário."
      );
    }
  }

  return context;
}

/** Namespace GYM has an explicit tenant type and cannot silently target the previous cookie context. */
export function requireGymWorkspaceAccess(options: RequireWorkspaceAccessOptions): Promise<WorkspaceContext> {
  return requireWorkspaceAccess({ ...options, expectedType: "GYM", requireActiveContext: true });
}

export function requirePersonalWorkspaceAccess(options: RequireWorkspaceAccessOptions): Promise<WorkspaceContext> {
  return requireWorkspaceAccess({ ...options, expectedType: "PERSONAL", requireActiveContext: true });
}

/**
 * Retrieves workspace context if valid, or null if unauthenticated / not a member.
 * Safe for conditional checks that don't throw.
 */
export async function getWorkspaceContext(
  workspaceId: string
): Promise<WorkspaceContext | null> {
  try {
    return await requireWorkspaceAccess({ workspaceId });
  } catch {
    return null;
  }
}

/**
 * Asserts that the current context holds a specific capability, throwing WorkspaceAccessError if not.
 */
export function assertWorkspaceCapability(
  context: WorkspaceContext,
  capability: WorkspaceCapability
): void {
  if (!context.capabilities.has(capability)) {
    throw new WorkspaceAccessError(
      403,
      "INSUFFICIENT_PERMISSIONS",
      `Permissão insuficiente: requer a capacidade '${capability}'.`
    );
  }
}

/**
 * Checks whether the current context holds a specific capability.
 */
export function hasWorkspaceCapability(
  context: WorkspaceContext,
  capability: WorkspaceCapability
): boolean {
  return context.capabilities.has(capability);
}

/**
 * Handles errors caught in route handlers, returning a structured NextResponse
 * if the error is a WorkspaceAccessError, or null otherwise.
 */
export function handleWorkspaceAccessError(error: unknown): NextResponse | null {
  if (error instanceof WorkspaceAccessError) {
    return error.toResponse();
  }
  return null;
}
