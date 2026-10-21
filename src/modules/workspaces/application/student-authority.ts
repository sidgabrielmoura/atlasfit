import prisma from "@/lib/prisma";
import type { GymTransactionClient } from "./transaction";
import { resolveGymAccessRoles } from "../domain/access-roles";
import { assertGymOperationalWorkspace } from "./gym-license";
import { resolveEffectiveCapabilities, type WorkspaceCapability } from "../domain/roles";
import { WorkspaceAccessError } from "../domain/types";
import { hasVerifiedGuardianIdentity } from "./guardian-identity";
import { permitsOwnAccount } from "@/lib/auth/account-eligibility";
import { hasStudentMembership } from "../domain/student-membership";
import { validateGymMinorEligibility } from "@/lib/privacy/age-validator";

export async function authorizeGymStudent(workspaceId: string, studentMemberId: string, actorUserId: string, capability: WorkspaceCapability, options: { allowSelf?: boolean; guardianId?: string | null; allowGuardian?: boolean } = {}, db: GymTransactionClient = prisma) {
  await assertGymOperationalWorkspace(workspaceId, db);
  const workspace = await db.workspace.findUnique({ where: { id: workspaceId }, select: { type: true, ownerId: true, isActive: true } });
  const student = await db.workspaceMember.findFirst({ where: { id: studentMemberId, workspaceId }, include: { studentProfile: true, guardians: { where: { workspaceId, revokedAt: null, verifiedAt: { not: null } } }, roleGrants: true } });
  if (!workspace || workspace.type !== "GYM" || !student || !(student.studentProfile || student.role === "STUDENT" || student.roleGrants.some(grant => grant.role === "STUDENT" && !grant.revokedAt))) throw new WorkspaceAccessError(404, "STUDENT_NOT_FOUND", "Aluno não encontrado nesta academia.");
  if (student.studentProfile?.privacyRestrictedAt && (capability.startsWith("health.") || capability.startsWith("workouts."))) throw new WorkspaceAccessError(409, "GYM_DATA_RETENTION_REQUIRED", "Tratamento suspenso por solicitação de privacidade. A gestão deve revisar a finalidade antes de retomar.");
  const user = await db.user.findUnique({ where: { id: actorUserId }, select: { role: true } });
  if (!workspace.isActive) throw new WorkspaceAccessError(403, "WORKSPACE_SUSPENDED", "Academia suspensa.");
  if (student.unitId && !await db.gymUnit.findFirst({ where: { id: student.unitId, workspaceId, isActive: true }, select: { id: true } })) throw new WorkspaceAccessError(403, "TENANT_MISMATCH", "Unidade do aluno exige reconciliação.");
  if (user?.role === "SUPERADMIN") return student;
  if (options.allowSelf && student.userId === actorUserId && student.isActive && hasStudentMembership(student) && await permitsOwnAccount(actorUserId, db)) return student;
  if (options.allowGuardian) {
    const identity = await db.user.findUnique({ where: { id: student.userId }, select: { birthDate: true } });
    const age = validateGymMinorEligibility(identity?.birthDate);
    const guardian = student.guardians.find(guardian => guardian.guardianUserId === actorUserId && (!options.guardianId || guardian.id === options.guardianId));
    const health = capability.startsWith("health.");
    const canRepresent = guardian && (health ? guardian.hasHealthAccess : capability.startsWith("workouts.") ? guardian.isLegalRepresentative : capability === "students.read" && (guardian.isLegalRepresentative || guardian.isFinancialResponsible || guardian.hasHealthAccess));
    if (canRepresent && guardian && age.isValid && age.isMinor && await hasVerifiedGuardianIdentity(guardian, actorUserId, db)) return student;
    if (options.guardianId) throw new WorkspaceAccessError(403, "GUARDIAN_NOT_AUTHORIZED", "O responsável deve ter identidade, representação e poder válidos para este aluno.");
  }
  const actor = await db.workspaceMember.findUnique({ where: { userId_workspaceId: { userId: actorUserId, workspaceId } }, include: { roleGrants: true } });
  if (!actor?.isActive) throw new WorkspaceAccessError(403, "NOT_A_MEMBER", "Vínculo ativo obrigatório.");
  if (!actor.roleGrants.length && actor.unitId && actor.unitId !== student.unitId && workspace.ownerId !== actorUserId) throw new WorkspaceAccessError(403, "INSUFFICIENT_PERMISSIONS", "Papel legado restrito à unidade do vínculo.");
  const roles = resolveGymAccessRoles(actor, student.unitId);
  if (workspace.ownerId === actorUserId) return student;
  const capabilities = resolveEffectiveCapabilities(roles);
  if (!capabilities.has(capability)) throw new WorkspaceAccessError(403, "INSUFFICIENT_PERMISSIONS", "Sem permissão para este recurso e unidade.");
  if (!roles.some(role => ["OWNER", "MANAGER"].includes(role)) && roles.includes("TRAINER") && student.assignedStaffId !== actor.id) throw new WorkspaceAccessError(403, "FORBIDDEN_RESOURCE", "O aluno deve estar atribuído ao profissional.");
  return student;
}
