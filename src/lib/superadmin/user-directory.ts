/** Directory labels only. Workspace authority is still checked by its domain. */
export interface DirectoryWorkspace {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
  ownerId?: string;
}
export interface DirectoryMembership {
  role: string;
  isActive: boolean;
  workspace: DirectoryWorkspace;
  roleGrants?: readonly { role: string; revokedAt: Date | string | null; unit?: { isActive: boolean } | null }[];
  staffProfile?: { id: string } | null;
  studentProfile?: { id: string } | null;
}
export interface UserWorkspaceContext extends DirectoryWorkspace {
  roles: string[];
  membershipActive: boolean;
  isStaff: boolean;
  isStudent: boolean;
}
export interface DirectoryUser {
  role: string;
  name?: string | null;
  email?: string | null;
  workspaceContexts?: readonly UserWorkspaceContext[];
}
export type UserDirectoryCategory = "all" | "personal" | "gym" | "aluno" | "superadmin";

export const workspaceRoleLabels: Record<string, string> = {
  OWNER: "Dono", MANAGER: "Gerente", RECEPTIONIST: "Recepcionista",
  FINANCE: "Financeiro", TRAINER: "Treinador", ASSISTANT: "Assistente", STUDENT: "Aluno",
};

export function userWorkspaceContexts(userId: string, memberships: readonly DirectoryMembership[], owned: readonly DirectoryWorkspace[] = []): UserWorkspaceContext[] {
  const contexts = new Map<string, UserWorkspaceContext>();
  for (const member of memberships) {
    const grants = member.roleGrants || [];
    // Once grants exist, a revoked/local inactive grant cannot revive the legacy role.
    const roles = grants.length ? grants.filter(grant => !grant.revokedAt && grant.unit?.isActive !== false).map(grant => grant.role) : [member.role];
    if (member.workspace.ownerId === userId) roles.unshift("OWNER");
    const uniqueRoles = [...new Set(roles)];
    contexts.set(member.workspace.id, {
      ...member.workspace, roles: uniqueRoles, membershipActive: member.isActive,
      isStaff: Boolean(member.staffProfile) || uniqueRoles.some(role => role !== "STUDENT"),
      isStudent: Boolean(member.studentProfile) || uniqueRoles.includes("STUDENT"),
    });
  }
  for (const workspace of owned) {
    const existing = contexts.get(workspace.id);
    if (existing) { existing.roles = [...new Set(["OWNER", ...existing.roles])]; existing.isStaff = true; }
    else contexts.set(workspace.id, { ...workspace, roles: ["OWNER"], membershipActive: true, isStaff: true, isStudent: false });
  }
  return [...contexts.values()];
}

export function matchesUserDirectoryCategory(user: DirectoryUser, category: UserDirectoryCategory | string) {
  const contexts = user.workspaceContexts || [];
  switch (category) {
    case "all": return true;
    case "gym": return contexts.some(context => context.type === "GYM" && context.isStaff);
    case "personal": return user.role === "TRAINER" || contexts.some(context => context.type === "PERSONAL" && context.isStaff);
    case "aluno": return user.role === "STUDENT" || contexts.some(context => context.isStudent);
    case "superadmin": return user.role === "SUPERADMIN";
    default: return false;
  }
}

export function matchesUserDirectorySearch(user: DirectoryUser, query: string) {
  const term = query.trim().toLocaleLowerCase("pt-BR");
  if (!term) return true;
  return [user.name, user.email, ...(user.workspaceContexts || []).flatMap(context => [context.name, ...context.roles.map(role => workspaceRoleLabels[role] || role)])]
    .some(value => value?.toLocaleLowerCase("pt-BR").includes(term));
}
