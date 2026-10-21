import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { serializableTransaction, type GymTransactionClient } from "./transaction";
import { assertActorAuthority } from "./actor-authority";
import { assertGymOperationalWorkspace } from "./gym-license";
import { permitsOwnAccount } from "@/lib/auth/account-eligibility";
import { hasVerifiedGuardianIdentity } from "./guardian-identity";
import { validateGymMinorEligibility } from "@/lib/privacy/age-validator";
import { WorkspaceAccessError } from "../domain/types";

const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const metadataSchema = z.object({ purpose: z.literal("GYM_IDENTITY_LINK"), tokenHash: z.string(), unitId: z.string(), issuedBy: z.string(), expiresAt: z.iso.datetime(), verifiedAt: z.iso.datetime().nullable(), verifiedBy: z.string().nullable(), consumedAt: z.iso.datetime().nullable() });
function denied(): never { throw new WorkspaceAccessError(403, "FORBIDDEN_RESOURCE", "Autorização do titular ausente, expirada ou incompatível."); }
async function canAuthorize(tx: GymTransactionClient, subjectId: string, actorId: string) {
  const subject = await tx.user.findUnique({ where: { id: subjectId }, select: { birthDate: true } });
  const age = validateGymMinorEligibility(subject?.birthDate);
  if (!age.isValid) return false;
  if (subjectId === actorId) return !age.isMinor && await permitsOwnAccount(actorId, tx);
  if (!age.isMinor || !await permitsOwnAccount(actorId, tx)) return false;
  const guardians = await tx.gymGuardian.findMany({ where: { guardianUserId: actorId, isLegalRepresentative: true, revokedAt: null, verifiedAt: { not: null }, studentMember: { userId: subjectId, isActive: true } } });
  for (const guardian of guardians) if (await hasVerifiedGuardianIdentity(guardian, actorId, tx)) return true;
  return false;
}
export async function issueGymIdentityLink(input: { workspaceId: string; unitId: string; targetUserId: string; actorUserId: string; email?: string; cpf?: string }) {
  return serializableTransaction(async tx => {
    await assertActorAuthority(tx, input.workspaceId, input.actorUserId, "students.manage", input.unitId);
    const user = await tx.user.findUnique({ where: { id: input.targetUserId }, select: { id: true, email: true, cpfCnpj: true } });
    if (!user || !((input.email && input.email.trim().toLowerCase() === user.email?.toLowerCase()) || (input.cpf && input.cpf.replace(/\D/g, "") === user.cpfCnpj?.replace(/\D/g, "")))) denied();
    const token = randomBytes(32).toString("hex");
    const metadata = { purpose: "GYM_IDENTITY_LINK", tokenHash: hash(token), unitId: input.unitId, issuedBy: input.actorUserId, expiresAt: new Date(Date.now() + 48 * 3600000).toISOString(), verifiedAt: null, verifiedBy: null, consumedAt: null };
    const request = await tx.dataSubjectRequest.create({ data: { workspaceId: input.workspaceId, requesterUserId: user.id, type: "OTHER", status: "IDENTITY_VERIFICATION", metadata } });
    await tx.auditLog.create({ data: { userId: input.actorUserId, action: "GYM_IDENTITY_LINK_REQUESTED", entity: "DATA_SUBJECT_REQUEST", entityId: request.id } });
    return { requestId: request.id, path: `/account/gym-link?requestId=${encodeURIComponent(request.id)}&token=${token}`, expiresAt: metadata.expiresAt, delivery: "MANUAL" };
  });
}
export async function readGymIdentityLink(requestId: string, token: string, userId: string) {
  return serializableTransaction(async tx => {
    const request = await tx.dataSubjectRequest.findFirst({ where: { id: requestId, type: "OTHER" } });
    const parsed = metadataSchema.safeParse(request?.metadata);
    if (!request?.workspaceId || !parsed.success || parsed.data.tokenHash !== hash(token) || new Date(parsed.data.expiresAt) <= new Date() || parsed.data.consumedAt) denied();
    if (!await canAuthorize(tx, request.requesterUserId, userId)) denied();
    await assertGymOperationalWorkspace(request.workspaceId, tx);
    const unit = await tx.gymUnit.findFirst({ where: { id: parsed.data.unitId, workspaceId: request.workspaceId, isActive: true }, select: { name: true } });
    if (!unit) denied();
    const workspace = await tx.workspace.findUniqueOrThrow({ where: { id: request.workspaceId }, select: { name: true } });
    return { request, metadata: parsed.data, gymName: workspace.name, unitName: unit.name };
  });
}
export async function acceptGymIdentityLink(requestId: string, token: string, userId: string) {
  return serializableTransaction(async tx => {
    const request = await tx.dataSubjectRequest.findFirst({ where: { id: requestId, type: "OTHER" } });
    const parsed = metadataSchema.safeParse(request?.metadata);
    if (!request?.workspaceId || !parsed.success || parsed.data.tokenHash !== hash(token) || new Date(parsed.data.expiresAt) <= new Date() || parsed.data.consumedAt) denied();
    await assertActorAuthority(tx, request.workspaceId, parsed.data.issuedBy, "students.manage", parsed.data.unitId);
    if (!await canAuthorize(tx, request.requesterUserId, userId)) denied();
    if (parsed.data.verifiedAt) return { success: true, requestId };
    await tx.dataSubjectRequest.update({ where: { id: requestId }, data: { status: "IN_REVIEW", metadata: { ...parsed.data, verifiedAt: new Date().toISOString(), verifiedBy: userId } } });
    await tx.auditLog.create({ data: { userId, action: "GYM_IDENTITY_LINK_AUTHORIZED_BY_SUBJECT", entity: "DATA_SUBJECT_REQUEST", entityId: requestId } });
    return { success: true, requestId };
  });
}
export async function consumeGymIdentityLink(tx: GymTransactionClient, proofId: string | null | undefined, workspaceId: string, unitId: string, userId: string, actorUserId: string) {
  if (!proofId) denied();
  const request = await tx.dataSubjectRequest.findFirst({ where: { id: proofId, workspaceId, requesterUserId: userId, type: "OTHER", status: "IN_REVIEW" } });
  const parsed = metadataSchema.safeParse(request?.metadata);
  if (!parsed.success || parsed.data.unitId !== unitId || parsed.data.issuedBy !== actorUserId || !parsed.data.verifiedAt || parsed.data.consumedAt || new Date(parsed.data.expiresAt) <= new Date()) denied();
  if (!parsed.data.verifiedBy || !await canAuthorize(tx, userId, parsed.data.verifiedBy)) denied();
  await tx.dataSubjectRequest.update({ where: { id: proofId }, data: { status: "COMPLETED", completedAt: new Date(), handledBy: actorUserId, metadata: { ...parsed.data, consumedAt: new Date().toISOString() } } });
}
