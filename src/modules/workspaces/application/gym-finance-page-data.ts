import { serializableTransaction } from "./transaction";
import { getGymUnitAccess } from "./gym-unit-access";
import { studentMembershipWhere } from "../domain/student-membership";
import type { WorkspaceCapability } from "../domain/roles";

/** Capabilities describe available controls; commands still authorize their specific resource. */
export function getGymFinancePageData(workspaceId: string, actorUserId: string) {
  return serializableTransaction(async tx => {
    const access = await getGymUnitAccess(tx, workspaceId, actorUserId, "invoices.read");
    const settings = await tx.gymSettings.findUnique({ where: { workspaceId }, select: { timezone: true } });
    const capabilities = [...new Set<WorkspaceCapability>([
      ...access.unassignedCapabilities,
      ...access.units.flatMap(unit => unit.capabilities),
    ])];
    function scope(capability: WorkspaceCapability) {
      return { OR: [
        { unitId: { in: access.units.filter(unit => unit.capabilities.includes(capability)).map(unit => unit.id) } },
        ...(access.unassignedCapabilities.includes(capability) ? [{ unitId: null }] : []),
      ] };
    }
    const issue = scope("invoices.issue");
    const students = await tx.workspaceMember.findMany({
      where: { workspaceId, isActive: true, AND: [studentMembershipWhere, issue] },
      select: { id: true, isMinor: true, user: { select: { name: true, email: true } } },
      take: 100, orderBy: [{ user: { name: "asc" } }, { id: "asc" }],
    });
    const enrollments = await tx.gymEnrollment.findMany({
      where: { workspaceId, ...issue, planVersion: { plan: { workspaceId } }, studentMember: { workspaceId } },
      select: { id: true, studentMemberId: true, planVersion: { select: { name: true } }, studentMember: { select: { userId: true, user: { select: { name: true } } } }, billingPayerName: true, billingPayerCpf: true },
      take: 100, orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });
    const guardians = await tx.gymGuardian.findMany({
      where: { workspaceId, studentMember: { workspaceId, ...issue }, revokedAt: null, isFinancialResponsible: true, verifiedAt: { not: null } },
      select: { id: true, studentMemberId: true, name: true, cpf: true, email: true, phone: true, relationship: true, isFinancialResponsible: true },
      take: 100, orderBy: { id: "asc" },
    });
    const accounts = await tx.gymFinancialAccount.findMany({
      where: { workspaceId, ...scope("payments.record"), isActive: true, accountType: { not: "GATEWAY_ONLINE" } },
      select: { id: true, name: true, accountType: true }, take: 100, orderBy: [{ name: "asc" }, { id: "asc" }],
    });
    return { capabilities, students, enrollments, guardians, accounts, reportTimezone: settings?.timezone || "America/Sao_Paulo" };
  });
}
