import { calculateDocumentHash } from "@/lib/privacy/legal-acceptance.service";
import { WorkspaceAccessError } from "../domain/types";
import { serializableTransaction, type GymTransactionClient } from "./transaction";
import { guardianPortalAuthority } from "./guardian-portal";
import { guardianLegalAcceptanceSchema } from "../domain/guardian-portal";
export { guardianLegalAcceptanceSchema } from "../domain/guardian-portal";

async function activeDocument(db: GymTransactionClient, type: "TERMS" | "PRIVACY") {
  const now = new Date();
  const document = await db.legalDocument.findFirst({ where: { type, status: "PUBLISHED", publishedAt: { lte: now }, effectiveAt: { lte: now } }, orderBy: [{ effectiveAt: "desc" }, { publishedAt: "desc" }, { id: "desc" }], select: { id: true, type: true, title: true, version: true, content: true, contentHash: true } });
  if (!document || document.contentHash !== calculateDocumentHash(document.content)) throw new WorkspaceAccessError(409, "INVALID_STATUS", "Documento publicado indisponível. Procure a academia.");
  return document;
}

export async function getGuardianLegalDocument(workspaceId: string, guardianId: string, actorUserId: string, type: "TERMS" | "PRIVACY") {
  return serializableTransaction(async tx => {
    const guardian = await guardianPortalAuthority(tx, workspaceId, guardianId, actorUserId, "LEGAL");
    const document = await activeDocument(tx, type);
    const acceptance = await tx.legalAcceptance.findFirst({ where: { userId: actorUserId, representedUserId: guardian.studentMember.userId, workspaceId, documentId: document.id, documentHash: document.contentHash, source: "GUARDIAN_PORTAL" }, orderBy: { acceptedAt: "desc" }, select: { acceptedAt: true } });
    return { id: document.id, type: document.type, title: document.title, version: document.version, content: document.content, documentHash: document.contentHash, acceptedAt: acceptance?.acceptedAt.toISOString() || null };
  });
}

export async function recordGuardianLegalAcceptance(input: { workspaceId: string; guardianId: string; guardianUserId: string; documentType: string; documentId?: string; documentHash?: string; accepted?: boolean; documentVersion?: string; ipAddress?: string | null; userAgent?: string | null }) {
  return serializableTransaction(async tx => {
    const guardian = await guardianPortalAuthority(tx, input.workspaceId, input.guardianId, input.guardianUserId, "LEGAL");
    const parsed = guardianLegalAcceptanceSchema.safeParse({ workspaceId: input.workspaceId, documentType: input.documentType, documentId: input.documentId, documentHash: input.documentHash, accepted: input.accepted });
    if (!parsed.success || input.documentVersion !== undefined) throw new WorkspaceAccessError(400, "INVALID_REQUEST", "Confirme explicitamente o documento exibido.");
    const document = await activeDocument(tx, parsed.data.documentType);
    if (document.id !== parsed.data.documentId || document.contentHash !== parsed.data.documentHash) throw new WorkspaceAccessError(409, "INVALID_STATUS", "O documento mudou. Recarregue e confirme a versão atual.");
    const previous = await tx.legalAcceptance.findFirst({ where: { userId: input.guardianUserId, representedUserId: guardian.studentMember.userId, workspaceId: input.workspaceId, documentId: document.id, documentHash: document.contentHash, source: "GUARDIAN_PORTAL" }, select: { id: true, acceptedAt: true, documentId: true, documentType: true, documentVersion: true } });
    if (previous) return previous;
    const acceptance = await tx.legalAcceptance.create({ data: { userId: input.guardianUserId, representedUserId: guardian.studentMember.userId, representationRole: guardian.relationship, workspaceId: input.workspaceId, documentId: document.id, documentType: document.type, documentVersion: document.version, documentHash: document.contentHash, acceptanceType: document.type === "PRIVACY" ? "PRIVACY_ACKNOWLEDGED" : "TERMS_ACCEPTED", source: "GUARDIAN_PORTAL", ipAddress: input.ipAddress?.slice(0, 80), userAgent: input.userAgent?.slice(0, 500) }, select: { id: true, acceptedAt: true, documentId: true, documentType: true, documentVersion: true } });
    await tx.auditLog.create({ data: { userId: input.guardianUserId, action: `GYM_REPRESENTED_LEGAL_ACCEPTANCE:${acceptance.id}:guardian=${guardian.id}:student=${guardian.studentMember.id}:document=${document.id}`, entity: "WORKSPACE", entityId: input.workspaceId } });
    return acceptance;
  });
}
