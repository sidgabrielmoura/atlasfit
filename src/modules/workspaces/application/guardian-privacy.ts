import { hasVerifiedGuardianIdentity } from "./guardian-identity";
import type { GymTransactionClient } from "./transaction";
import { validateGymMinorEligibility } from "@/lib/privacy/age-validator";
import { WorkspaceAccessError } from "../domain/types";

/** Representation of privacy rights remains available after commercial closure. */
export async function assertGuardianPrivacyAuthority(tx: GymTransactionClient, workspaceId: string, guardianId: string, actorUserId: string) {
  const guardian = await tx.gymGuardian.findFirst({ where: { id: guardianId, workspaceId, guardianUserId: actorUserId, revokedAt: null, verifiedAt: { not: null }, isLegalRepresentative: true }, include: { workspace: { select: { type: true } }, studentMember: { select: { userId: true, workspaceId: true, user: { select: { birthDate: true } } } } } });
  const age = validateGymMinorEligibility(guardian?.studentMember.user.birthDate);
  if (!guardian || guardian.workspace.type !== "GYM" || guardian.studentMember.workspaceId !== workspaceId || !age.isValid || !age.isMinor || !await hasVerifiedGuardianIdentity(guardian, actorUserId, tx)) throw new WorkspaceAccessError(403, "GUARDIAN_NOT_AUTHORIZED", "Representação legal atual e identidade conferida obrigatórias.");
  return guardian;
}
export async function assertPrivacyRequestRepresentation(tx: GymTransactionClient, workspaceId: string, value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return;
  const meta = value as { identityRepresentationGuardianId?: string; identityVerifiedBy?: string };
  if (meta.identityRepresentationGuardianId) {
    if (!meta.identityVerifiedBy) throw new WorkspaceAccessError(409, "INVALID_STATUS", "Representação do pedido exige nova conferência.");
    await assertGuardianPrivacyAuthority(tx, workspaceId, meta.identityRepresentationGuardianId, meta.identityVerifiedBy);
  }
}
