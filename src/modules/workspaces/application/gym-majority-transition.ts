import { serializableTransaction, type GymTransactionClient } from "./transaction";
import prisma from "@/lib/prisma";
import { gymOperationalWorkspaceWhere } from "./gym-license";
import { assertActorAuthority } from "./actor-authority";
import { validateGymMinorEligibility } from "@/lib/privacy/age-validator";
import { WorkspaceAccessError } from "../domain/types";

export async function transitionGymMajority(workspaceId: string, studentMemberId: string, actorUserId: string) {
  return serializableTransaction(tx => applyGymMajorityTransition(tx, workspaceId, studentMemberId, actorUserId));
}
export async function applyGymMajorityTransition(tx: GymTransactionClient, workspaceId: string, studentMemberId: string, actorUserId: string) {
    const member = await tx.workspaceMember.findFirst({ where: { id: studentMemberId, workspaceId }, select: { userId: true, isMinor: true, unitId: true, user: { select: { birthDate: true } } } });
    if (!member) throw new WorkspaceAccessError(404, "STUDENT_NOT_FOUND", "Aluno não encontrado.");
    await assertActorAuthority(tx, workspaceId, actorUserId, "students.manage", member.unitId);
    const age = validateGymMinorEligibility(member.user.birthDate);
    if (!age.isValid) throw new WorkspaceAccessError(409, "INVALID_STATUS", "Identidade inconsistente. Verifique o nascimento no fluxo da conta antes da transição.");
    if (age.isMinor || !member.isMinor) return { transitioned: false, isMinor: member.isMinor, age: age.age };
    await tx.workspaceMember.update({ where: { id: studentMemberId }, data: { isMinor: false } });
    // Financial contracts keep their historical payer; former representation grants no health access.
    await tx.gymGuardian.updateMany({ where: { workspaceId, studentMemberId, revokedAt: null }, data: { isLegalRepresentative: false, hasHealthAccess: false } });
    await tx.auditLog.create({ data: { userId: actorUserId, action: "GYM_MAJORITY_TRANSITION_COMPLETED", entity: "WORKSPACE_MEMBER", entityId: studentMemberId, metadata: { fromMinor: true, toMinor: false, healthRepresentationRevoked: true, payerSnapshotsPreserved: true, ownAcceptanceRequired: true } } });
    return { transitioned: true, isMinor: false, age: age.age, ownAcceptanceRequired: true };
}
export async function processGymMajorityTransitions() {
  const parts = new Intl.DateTimeFormat("en", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const part = (type: string) => Number(parts.find(p => p.type === type)?.value);
  const cutoff = new Date(Date.UTC(part("year") - 18, part("month") - 1, part("day")));
  const candidates = await prisma.workspaceMember.findMany({ where: { isMinor: true, workspace: gymOperationalWorkspaceWhere(), user: { birthDate: { lte: cutoff } } }, select: { id: true, workspaceId: true, user: { select: { birthDate: true } }, workspace: { select: { ownerId: true } } }, orderBy: { id: "asc" }, take: 100 });
  let processed = 0; const failures: { memberId: string; code: string }[] = [];
  for (const candidate of candidates) {
    const age = validateGymMinorEligibility(candidate.user.birthDate); if (age.isValid && age.isMinor) continue;
    if (processed + failures.length >= 100) break;
    try { if ((await transitionGymMajority(candidate.workspaceId, candidate.id, candidate.workspace.ownerId)).transitioned) processed++; }
    catch (e) { failures.push({ memberId: candidate.id, code: e instanceof WorkspaceAccessError ? e.code : "INTERNAL_ERROR" }); }
  }
  return { processed, failures };
}
