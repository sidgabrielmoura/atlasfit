import prisma from "@/lib/prisma";
import type { GymTransactionClient } from "./transaction";
import { WorkspaceAccessError } from "../domain/types";
import { resolveAccessRoles } from "../domain/access-roles";
import { resolveEffectiveCapabilities, type WorkspaceCapability, type WorkspaceRole } from "../domain/roles";

/** PERSONAL journeys may share entities, but cannot be an alternate command path for GYM. */
export async function authorizePersonalStudent(workspaceId: string | null, studentUserId: string, actorUserId: string, capability: WorkspaceCapability, db: GymTransactionClient = prisma) {
  if (!workspaceId) throw new WorkspaceAccessError(404, "WORKSPACE_NOT_FOUND", "Assessoria não encontrada.");
  const workspace = await db.workspace.findUnique({ where: { id: workspaceId }, select: { type: true, ownerId: true, isActive: true } });
  if (!workspace || workspace.type !== "PERSONAL") throw new WorkspaceAccessError(403, "FORBIDDEN_RESOURCE", "Esta operação atende apenas assessorias PERSONAL.");
  const student = await db.workspaceMember.findUnique({ where: { userId_workspaceId: { userId: studentUserId, workspaceId } }, include: { roleGrants: true, studentProfile: { select: { id: true } } } });
  if (!student?.isActive || !(student.studentProfile || resolveAccessRoles(student.role, student.roleGrants, student.unitId ?? undefined).includes("STUDENT"))) throw new WorkspaceAccessError(404, "STUDENT_NOT_FOUND", "Aluno ativo não encontrado nesta assessoria.");
  const user = await db.user.findUnique({ where: { id: actorUserId }, select: { role: true } });
  if (user?.role === "SUPERADMIN") return { student, capabilities: resolveEffectiveCapabilities(["OWNER"]) };
  if (!workspace.isActive) throw new WorkspaceAccessError(403, "WORKSPACE_SUSPENDED", "Assessoria suspensa.");
  const actor = await db.workspaceMember.findUnique({ where: { userId_workspaceId: { userId: actorUserId, workspaceId } }, include: { roleGrants: true } });
  if (!actor?.isActive) throw new WorkspaceAccessError(403, "NOT_A_MEMBER", "Vínculo ativo necessário.");
  const roles: WorkspaceRole[] = workspace.ownerId === actorUserId ? ["OWNER"] : resolveAccessRoles(actor.role, actor.roleGrants);
  const capabilities = resolveEffectiveCapabilities(roles);
  if (!capabilities.has(capability)) throw new WorkspaceAccessError(403, "INSUFFICIENT_PERMISSIONS", "Sem permissão para este recurso da assessoria.");
  // PERSONAL team access remains shared; GYM assignment rules are deliberately separate.
  return { student, capabilities };
}
