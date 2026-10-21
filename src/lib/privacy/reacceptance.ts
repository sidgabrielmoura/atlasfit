import { z } from "zod";
import { calculateDocumentHash } from "./legal-acceptance.service";
import { permitsOwnAccount } from "@/lib/auth/account-eligibility";
import { serializableTransaction } from "@/modules/workspaces/application/transaction";

export const reacceptanceSchema = z.object({
  documentType: z.enum(["TERMS", "PRIVACY"]),
  documentId: z.string().min(1).max(128),
  documentVersion: z.string().min(1).max(128),
  documentHash: z.string().regex(/^[a-f0-9]{64}$/),
  accepted: z.literal(true),
}).strict();

export class LegalReacceptanceError extends Error {
  constructor(public readonly status: 400 | 403 | 409, message: string) { super(message); }
}

/** The document displayed by the client is checked again inside the write transaction. */
export async function reacceptOwnDocument(userId: string, input: unknown, metadata: { ipAddress?: string | null; userAgent?: string | null } = {}) {
  const parsed = reacceptanceSchema.safeParse(input);
  if (!parsed.success) throw new LegalReacceptanceError(400, "Confirme o documento e o conteúdo exibidos.");
  const body = parsed.data;
  return serializableTransaction(async tx => {
    if (!await permitsOwnAccount(userId, tx)) throw new LegalReacceptanceError(403, "Esta conta não pode registrar um aceite próprio.");
    const now = new Date();
    const doc = await tx.legalDocument.findFirst({
      where: { type: body.documentType, status: "PUBLISHED", publishedAt: { lte: now }, effectiveAt: { lte: now } },
      orderBy: [{ effectiveAt: "desc" }, { publishedAt: "desc" }, { id: "desc" }],
    });
    if (!doc || doc.id !== body.documentId || doc.version !== body.documentVersion || doc.contentHash !== body.documentHash || calculateDocumentHash(doc.content) !== doc.contentHash) {
      throw new LegalReacceptanceError(409, "O documento mudou. Recarregue, leia e confirme a versão atual.");
    }
    const existing = await tx.legalAcceptance.findFirst({ where: { userId, documentId: doc.id, documentType: doc.type, documentVersion: doc.version, documentHash: doc.contentHash, representedUserId: null } });
    if (existing) return { id: existing.id, alreadyAccepted: true };
    const acceptance = await tx.legalAcceptance.create({ data: {
      userId, documentId: doc.id, documentType: doc.type, documentVersion: doc.version, documentHash: doc.contentHash,
      acceptanceType: "REACCEPTANCE", representedUserId: null, workspaceId: null, source: "IN_APP_MODAL",
      ipAddress: metadata.ipAddress?.slice(0, 128) || null, userAgent: metadata.userAgent?.slice(0, 500) || null,
    } });
    await tx.auditLog.create({ data: { userId, action: "USER_LEGAL_REACCEPTED", entity: "LEGAL_ACCEPTANCE", entityId: acceptance.id } });
    return { id: acceptance.id, alreadyAccepted: false };
  });
}
