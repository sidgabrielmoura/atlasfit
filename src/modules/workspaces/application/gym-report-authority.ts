import type { Prisma } from "@prisma/client";
import type { GymTransactionClient } from "./transaction";
import { getGymUnitAccess } from "./gym-unit-access";
import { WorkspaceAccessError } from "../domain/types";

type UnitScope = Awaited<ReturnType<typeof getGymUnitAccess>>;
async function optionalScope(tx: GymTransactionClient, workspaceId: string, actorUserId: string, financial: boolean): Promise<UnitScope | null> {
  try { return await getGymUnitAccess(tx, workspaceId, actorUserId, financial ? "reports.finance" : "reports.operational"); }
  catch (error) {
    if (error instanceof WorkspaceAccessError && error.code === "INSUFFICIENT_PERMISSIONS") return null;
    throw error;
  }
}

/** Reports resolve their own authority inside the same snapshot as the facts. */
export async function gymReportAuthority(tx: GymTransactionClient, workspaceId: string, actorUserId: string, options: { requireFinancial?: boolean; preferFinancial?: boolean; unitId?: string; assignedStaffId?: string } = {}) {
  if (!actorUserId) throw new WorkspaceAccessError(401, "UNAUTHORIZED", "Ator obrigatório para consultar ou exportar indicadores.");
  let financial = options.requireFinancial === true || options.preferFinancial !== false;
  let scope = await optionalScope(tx, workspaceId, actorUserId, financial);
  if (scope && options.unitId && !scope.units.some(unit => unit.id === options.unitId)) scope = null;
  if (!scope && !options.requireFinancial) { financial = !financial; scope = await optionalScope(tx, workspaceId, actorUserId, financial); }
  if (!scope) throw new WorkspaceAccessError(403, "INSUFFICIENT_PERMISSIONS", "Relatório indisponível para este perfil.");
  if (options.unitId && !scope.units.some(unit => unit.id === options.unitId)) throw new WorkspaceAccessError(403, "INSUFFICIENT_PERMISSIONS", "Unidade indisponível para este relatório.");
  const units = options.unitId ? scope.units.filter(unit => unit.id === options.unitId) : scope.units;
  const includeUnassigned = !options.unitId && scope.includeUnassigned;
  const member = await tx.workspaceMember.findUnique({ where: { userId_workspaceId: { workspaceId, userId: actorUserId } }, select: { id: true } });
  const unitWhere = { OR: [{ unitId: { in: units.map(unit => unit.id) } }, ...(includeUnassigned ? [{ unitId: null }] : [])] };
  const assignment = (canManage: boolean) => {
    if (financial || canManage) return {};
    if (!member) throw new WorkspaceAccessError(403, "NOT_A_MEMBER", "Vínculo necessário para consultar a carteira.");
    return { assignedStaffId: member.id };
  };
  const portfolio: Prisma.WorkspaceMemberWhereInput = { workspaceId, OR: [
    ...units.map(unit => ({ unitId: unit.id, ...assignment(unit.canManageStudents) })),
    ...(includeUnassigned ? [{ unitId: null, ...assignment(scope.canManageUnassignedStudents) }] : []),
  ] };
  if (options.assignedStaffId) {
    if (!financial && !scope.canManageUnassignedStudents && units.every(unit => !unit.canManageStudents) && options.assignedStaffId !== member?.id) throw new WorkspaceAccessError(403, "INSUFFICIENT_PERMISSIONS", "Este perfil consulta somente sua carteira de alunos.");
    if (!await tx.workspaceMember.findFirst({ where: { id: options.assignedStaffId, workspaceId, isActive: true }, select: { id: true } })) throw new WorkspaceAccessError(404, "STAFF_NOT_FOUND", "Profissional indisponível nesta academia.");
    portfolio.AND = [{ assignedStaffId: options.assignedStaffId }];
  }
  const enrollmentWhere: Prisma.GymEnrollmentWhereInput = { workspaceId, ...unitWhere, studentMember: financial ? { workspaceId, ...(options.assignedStaffId ? { assignedStaffId: options.assignedStaffId } : {}) } : portfolio, planVersion: { plan: { workspaceId } } };
  const invoiceWhere: Prisma.GymInvoiceWhereInput = { workspaceId, studentMember: { workspaceId }, OR: [
    { enrollment: enrollmentWhere },
    { enrollmentId: null, studentMember: { AND: [financial ? { workspaceId, ...unitWhere } : portfolio, ...(options.assignedStaffId ? [{ assignedStaffId: options.assignedStaffId }] : [])] } },
  ] };
  return { financial, unitWhere, portfolio, enrollmentWhere, invoiceWhere, units, includeUnassigned };
}
