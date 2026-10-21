import type { GymTransactionClient } from "./transaction";
import { assertActorAuthority } from "./actor-authority";
import { WorkspaceAccessError } from "../domain/types";
import type { WorkspaceCapability } from "../domain/roles";
import { getGymUnitAccess } from "./gym-unit-access";
import { resolveAccessRoles } from "../domain/access-roles";
import { resolveEffectiveCapabilities } from "../domain/roles";
import type { Prisma } from "@prisma/client";
import { assertGymOperationalWorkspace } from "./gym-license";

export async function assertGymFinanceAuthority(tx: GymTransactionClient, workspaceId: string, actorUserId: string, capability: WorkspaceCapability, unitId?: string | null) {
  const member = await tx.workspaceMember.findUnique({ where: { userId_workspaceId: { workspaceId, userId: actorUserId } }, select: { unitId: true, roleGrants: { select: { id: true } } } });
  const workspace = await tx.workspace.findUnique({ where: { id: workspaceId }, select: { ownerId: true } });
  const user = await tx.user.findUnique({ where: { id: actorUserId }, select: { role: true } });
  if (!unitId && member?.unitId && !member.roleGrants.length && workspace?.ownerId !== actorUserId && user?.role !== "SUPERADMIN") throw new WorkspaceAccessError(403, "UNIT_REQUIRED", "Papel legado da unidade não concede autoridade financeira global.");
  await assertActorAuthority(tx, workspaceId, actorUserId, capability, unitId);
}

export async function gymFinanceUnitReadScope(tx: GymTransactionClient, workspaceId: string, actorUserId: string, capability: "invoices.read" | "payments.read", requestedUnitId?: string) {
  const scope = await getGymUnitAccess(tx, workspaceId, actorUserId, capability);
  if (requestedUnitId && !scope.units.some(unit => unit.id === requestedUnitId)) throw new WorkspaceAccessError(403, "INSUFFICIENT_PERMISSIONS", "Unidade indisponível para esta consulta.");
  const workspace = await tx.workspace.findUniqueOrThrow({ where: { id: workspaceId }, select: { ownerId: true } });
  const user = await tx.user.findUnique({ where: { id: actorUserId }, select: { role: true } });
  const member = await tx.workspaceMember.findUnique({ where: { userId_workspaceId: { workspaceId, userId: actorUserId } }, include: { roleGrants: true } });
  const roles = member && !(member.unitId && !member.roleGrants.length) ? resolveAccessRoles(member.role, member.roleGrants) : [];
  const unassigned = !requestedUnitId && (workspace.ownerId === actorUserId || user?.role === "SUPERADMIN" || resolveEffectiveCapabilities(roles).has(capability));
  const ids = requestedUnitId ? [requestedUnitId] : scope.units.map(unit => unit.id);
  return { unitIds: ids, includeUnassigned: unassigned };
}

export async function gymFinanceInvoiceReadScope(tx: GymTransactionClient, workspaceId: string, actorUserId: string, capability: "invoices.read" | "payments.read", requestedUnitId?: string): Promise<Prisma.GymInvoiceWhereInput> {
  const { unitIds: ids, includeUnassigned: unassigned } = await gymFinanceUnitReadScope(tx, workspaceId, actorUserId, capability, requestedUnitId);
  const unit = { OR: [{ unitId: { in: ids } }, ...(unassigned ? [{ unitId: null }] : [])] };
  return { workspaceId, studentMember: { workspaceId }, OR: [{ enrollment: { workspaceId, ...unit } }, { enrollmentId: null, studentMember: { workspaceId, ...unit } }] };
}

export async function assertGymFinanceWorkspace(tx: GymTransactionClient, workspaceId: string) {
  await assertGymOperationalWorkspace(workspaceId, tx);
  const workspace = await tx.workspace.findUnique({ where: { id: workspaceId }, select: { type: true, isActive: true, settings: { select: { timezone: true } } } });
  if (workspace?.type !== "GYM") throw new WorkspaceAccessError(403, "FORBIDDEN_RESOURCE", "Operação financeira exclusiva da academia.");
  if (!workspace.isActive) throw new WorkspaceAccessError(403, "WORKSPACE_SUSPENDED", "Academia suspensa.");
  return workspace;
}

/** An avulsa is scoped by its student even when no enrollment is attached. */
export async function assertInvoiceFinanceAuthority(tx: GymTransactionClient, workspaceId: string, actorUserId: string, capability: WorkspaceCapability, invoice: { workspaceId: string; studentMemberId: string; studentUserId: string; enrollmentId: string | null }) {
  const student = await tx.workspaceMember.findFirst({ where: { id: invoice.studentMemberId, workspaceId }, select: { userId: true, unitId: true } });
  const enrollment = invoice.enrollmentId ? await tx.gymEnrollment.findFirst({ where: { id: invoice.enrollmentId, workspaceId, studentMemberId: invoice.studentMemberId }, select: { unitId: true } }) : null;
  if (invoice.workspaceId !== workspaceId || !student || student.userId !== invoice.studentUserId || (invoice.enrollmentId && !enrollment)) throw new WorkspaceAccessError(409, "TENANT_MISMATCH", "Vínculos da obrigação exigem reconciliação antes do recebimento ou reversão.");
  // Existing obligations retain the contracted unit when the member moves later.
  const unitId = enrollment ? enrollment.unitId : student.unitId;
  await assertGymFinanceAuthority(tx, workspaceId, actorUserId, capability, unitId);
  return unitId;
}
