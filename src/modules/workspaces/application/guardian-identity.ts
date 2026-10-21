import prisma from "@/lib/prisma";
import { isValidCPF } from "@/lib/cpf-validator";
import { validateAgeEligibility } from "@/lib/privacy/age-validator";
import type { GymTransactionClient } from "./transaction";

/** Verification belongs to a specific identity, not only a mutable User ID. */
export function guardianIdentityMatches(guardian: { guardianUserId: string | null; cpf: string; verifiedAt: Date | null; revokedAt: Date | null }, actor: { id: string; cpfCnpj: string | null; birthDate: Date | null }) {
  const cpf = guardian.cpf.replace(/\D/g, "");
  return Boolean(guardian.verifiedAt && !guardian.revokedAt && guardian.guardianUserId === actor.id && isValidCPF(cpf) && actor.cpfCnpj?.replace(/\D/g, "") === cpf && validateAgeEligibility(actor.birthDate).isValid);
}
export async function hasVerifiedGuardianIdentity(guardian: { guardianUserId: string | null; cpf: string; verifiedAt: Date | null; revokedAt: Date | null }, actorUserId: string, db: GymTransactionClient = prisma) {
  if (!guardian.verifiedAt || guardian.revokedAt || guardian.guardianUserId !== actorUserId) return false;
  const cpf = guardian.cpf.replace(/\D/g, "");
  if (!isValidCPF(cpf)) return false;
  const user = await db.user.findUnique({ where: { id: actorUserId }, select: { id: true, cpfCnpj: true, birthDate: true } });
  return Boolean(user && guardianIdentityMatches(guardian, user));
}
