import { assertGymOperationalWorkspace, isGymLicenseCurrent } from "./gym-license";
import type { Prisma } from "@prisma/client";
import { validateGymMinorEligibility } from "@/lib/privacy/age-validator";
import { guardianIdentityMatches } from "./guardian-identity";
import { serializableTransaction, type GymTransactionClient } from "./transaction";
import { hasStudentMembership } from "../domain/student-membership";
import { WorkspaceAccessError } from "../domain/types";
import { guardianFinanceQuerySchema } from "../domain/guardian-portal";
import { readGymStudentStatement } from "./gym-student-finance";

const guardianSelect = {
  id: true, workspaceId: true, guardianUserId: true, cpf: true, relationship: true, verifiedAt: true, revokedAt: true,
  isLegalRepresentative: true, isFinancialResponsible: true, isEmergencyContact: true, hasHealthAccess: true,
  workspace: { select: { id: true, name: true, slug: true, logoUrl: true, type: true, isActive: true, subscription: { select: { status: true, endDate: true, trialEndsAt: true } }, settings: { select: { requireGuardianSignature: true } } } },
  studentMember: { select: {
    id: true, workspaceId: true, userId: true, role: true, isActive: true, unitId: true, plan: true, modality: true,
    roleGrants: { select: { role: true, revokedAt: true, unitId: true } },
    user: { select: { name: true, birthDate: true } },
    unit: { select: { id: true, name: true, code: true, workspaceId: true, isActive: true } },
    assignedStaff: { select: { workspaceId: true, isActive: true, user: { select: { name: true } } } },
    studentProfile: { select: { memberId: true, registrationNumber: true, medicalClearance: true } },
    gymEnrollments: { where: { status: { in: ["PENDING_ACCEPTANCE", "PENDING_ACTIVATION", "ACTIVE", "PAUSED"] } }, select: { id: true, workspaceId: true, unitId: true, status: true, planVersion: { select: { name: true, plan: { select: { workspaceId: true } } } } }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 20 },
  } },
} satisfies Prisma.GymGuardianSelect;
type Context = Prisma.GymGuardianGetPayload<{ select: typeof guardianSelect }>;
async function actorIdentity(tx: GymTransactionClient, userId: string) {
  const actor = await tx.user.findUnique({ where: { id: userId }, select: { id: true, cpfCnpj: true, birthDate: true } });
  if (!actor) throw new WorkspaceAccessError(401, "UNAUTHORIZED", "Conta do responsável indisponível.");
  return actor;
}
function currentContext(guardian: Context, actor: Awaited<ReturnType<typeof actorIdentity>>) {
  const member = guardian.studentMember;
  const age = validateGymMinorEligibility(member.user.birthDate);
  return guardianIdentityMatches(guardian, actor) && guardian.workspace.type === "GYM" && guardian.workspace.isActive && isGymLicenseCurrent(guardian.workspace.subscription) && member.isActive && member.workspaceId === guardian.workspaceId && hasStudentMembership(member) && age.isValid && age.isMinor && (!member.unitId || (member.unit?.id === member.unitId && member.unit.workspaceId === guardian.workspaceId && member.unit.isActive));
}
/** Powers are independent: legal representation never implies financial access. */
export async function guardianPortalAuthority(tx: GymTransactionClient, workspaceId: string, guardianId: string, actorUserId: string, power: "LEGAL" | "FINANCE") {
  await assertGymOperationalWorkspace(workspaceId, tx);
  const actor = await actorIdentity(tx, actorUserId);
  const guardian = await tx.gymGuardian.findFirst({ where: { id: guardianId, workspaceId, guardianUserId: actorUserId }, select: guardianSelect });
  if (!guardian || !currentContext(guardian, actor) || !(power === "LEGAL" ? guardian.isLegalRepresentative : guardian.isFinancialResponsible)) throw new WorkspaceAccessError(403, "GUARDIAN_NOT_AUTHORIZED", "O vínculo do menor, a identidade conferida e o poder necessário devem estar ativos.");
  return guardian;
}
export async function listGuardianDependents(actorUserId: string) {
  return serializableTransaction(async tx => {
    const actor = await actorIdentity(tx, actorUserId);
    const rows = await tx.gymGuardian.findMany({ where: { guardianUserId: actorUserId, verifiedAt: { not: null }, revokedAt: null, workspace: { type: "GYM", isActive: true }, studentMember: { isActive: true }, OR: [{ isLegalRepresentative: true }, { isFinancialResponsible: true }, { hasHealthAccess: true }] }, select: guardianSelect, orderBy: [{ createdAt: "asc" }, { id: "asc" }], take: 100 });
    return rows.filter(row => currentContext(row, actor)).map(g => {
      const member = g.studentMember;
      const canSeeAge = g.isLegalRepresentative || g.hasHealthAccess;
      const age = validateGymMinorEligibility(member.user.birthDate);
      return {
        guardianId: g.id, relationship: g.relationship, verifiedAt: g.verifiedAt!.toISOString(),
        powers: { isLegalRepresentative: g.isLegalRepresentative, isFinancialResponsible: g.isFinancialResponsible, isEmergencyContact: g.isEmergencyContact, hasHealthAccess: g.hasHealthAccess },
        workspace: { id: g.workspace.id, name: g.workspace.name, slug: g.workspace.slug, logoUrl: g.workspace.logoUrl, settings: g.workspace.settings },
        contracts: g.isLegalRepresentative ? member.gymEnrollments.filter(contract => contract.workspaceId === g.workspaceId && contract.unitId === member.unitId && contract.planVersion.plan.workspaceId === g.workspaceId).map(contract => ({ id: contract.id, status: contract.status, planName: contract.planVersion.name })) : [],
        student: { memberId: member.id, userId: member.userId, name: member.user.name || "Dependente", birthDate: canSeeAge ? member.user.birthDate?.toISOString() || null : null, age: canSeeAge ? age.age : undefined, isMinor: true as const, isActive: true as const, plan: member.plan, modality: member.modality,
          unit: member.unit ? { id: member.unit.id, name: member.unit.name, code: member.unit.code } : null,
          assignedStaff: member.assignedStaff?.workspaceId === g.workspaceId && member.assignedStaff.isActive ? { name: member.assignedStaff.user.name || "Instrutor" } : null,
          registrationNumber: member.studentProfile?.registrationNumber || null, medicalClearance: g.hasHealthAccess ? member.studentProfile?.medicalClearance ?? null : null, notes: null },
      };
    });
  });
}
export async function getGuardianFinance(guardianId: string, actorUserId: string, raw: unknown) {
  const parsed = guardianFinanceQuerySchema.safeParse(raw);
  if (!parsed.success) throw new WorkspaceAccessError(400, "INVALID_REQUEST", "Academia ou página inválida.");
  return serializableTransaction(async tx => {
    const guardian = await guardianPortalAuthority(tx, parsed.data.workspaceId, guardianId, actorUserId, "FINANCE");
    return readGymStudentStatement(tx, guardian.workspaceId, guardian.studentMember.id, guardian.studentMember.userId, guardian.workspace.name, parsed.data.page);
  });
}
