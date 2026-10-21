import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { serializableTransaction, type GymTransactionClient } from "@/modules/workspaces/application/transaction";
import { isValidCPF } from "@/lib/cpf-validator";
import { validateAgeEligibility } from "@/lib/privacy/age-validator";
import { calculateDocumentHash } from "@/lib/privacy/legal-acceptance.service";
import { permitsOwnAccount } from "./account-eligibility";

export async function publishedSetupDocuments(tx: GymTransactionClient) {
  const now = new Date();
  const active = (type: "TERMS" | "PRIVACY") => tx.legalDocument.findFirst({ where: { type, status: "PUBLISHED", effectiveAt: { lte: now }, publishedAt: { lte: now } }, orderBy: [{ effectiveAt: "desc" }, { publishedAt: "desc" }, { id: "desc" }], select: { id: true, type: true, version: true, contentHash: true, content: true } });
  const terms = await active("TERMS"); const privacy = await active("PRIVACY");
  if (!terms || !privacy || terms.contentHash !== calculateDocumentHash(terms.content) || privacy.contentHash !== calculateDocumentHash(privacy.content)) return null;
  return { terms, privacy };
}
export async function getPasswordSetupInfo(token: string) {
  if (typeof token !== "string" || token.length < 16 || token.length > 256) return { error: "Link de ativação inválido, expirado ou já utilizado." };
  const user = await prisma.user.findUnique({ where: { setupToken: token }, select: { id: true, password: true, setupTokenExpiresAt: true, cpfCnpj: true, birthDate: true } });
  if (!user || user.password !== null || !user.setupTokenExpiresAt || user.setupTokenExpiresAt <= new Date()) return { error: "Link de ativação inválido ou expirado. Solicite um novo convite." };
  if (!await permitsOwnAccount(user.id)) return { error: "O acesso do menor deve ocorrer pela conta do responsável. Procure a academia." };
  const docs = await publishedSetupDocuments(prisma);
  if (!docs) return { error: "Termos e política publicados indisponíveis. Procure o suporte." };
  return { success: true, needsCpf: !user.cpfCnpj, needsBirthDate: !user.birthDate, termsDocumentId: docs.terms.id, privacyDocumentId: docs.privacy.id, termsDocumentHash: docs.terms.contentHash, privacyDocumentHash: docs.privacy.contentHash, terms: { version: docs.terms.version, content: docs.terms.content }, privacy: { version: docs.privacy.version, content: docs.privacy.content } };
}
export type PasswordSetupResult = { success: true; error?: never } | { error: string; success?: never };
export async function completePasswordSetup(input: { token: string; password: string; cpfCnpj?: string; birthDate?: string; acceptedTerms?: boolean; acceptedPrivacy?: boolean; termsDocumentId?: string; privacyDocumentId?: string; termsDocumentHash?: string; privacyDocumentHash?: string; ip?: string; userAgent?: string }): Promise<PasswordSetupResult> {
  const values = z.object({ token: z.string().min(16).max(256), password: z.string().min(6).max(72).refine(value => Buffer.byteLength(value, "utf8") <= 72), cpfCnpj: z.string().max(32).optional(), birthDate: z.string().max(40).optional(), acceptedTerms: z.literal(true), acceptedPrivacy: z.literal(true), termsDocumentId: z.string().min(1).max(100), privacyDocumentId: z.string().min(1).max(100), termsDocumentHash: z.string().regex(/^[a-f0-9]{64}$/), privacyDocumentHash: z.string().regex(/^[a-f0-9]{64}$/) }).safeParse(input);
  if (!values.success) return { error: "Confirme os documentos e informe uma senha válida de 6 a 72 bytes." };
  const passwordHash = await bcrypt.hash(values.data.password, 10);
  return serializableTransaction<PasswordSetupResult>(async tx => {
    const now = new Date();
    const user = await tx.user.findUnique({ where: { setupToken: values.data.token }, select: { id: true, password: true, cpfCnpj: true, birthDate: true, setupTokenExpiresAt: true } });
    if (!user || user.password !== null || !user.setupTokenExpiresAt || user.setupTokenExpiresAt <= now) return { error: "Link de ativação inválido, expirado ou já utilizado. Solicite um novo convite." };
    if (!await permitsOwnAccount(user.id, tx)) return { error: "O acesso do menor deve ocorrer pela conta do responsável. Procure a academia." };
    const cpf = user.cpfCnpj || values.data.cpfCnpj;
    if (!cpf || !isValidCPF(cpf)) return { error: "O CPF informado é inválido." };
    const age = validateAgeEligibility(user.birthDate || values.data.birthDate, 18);
    if (!age.isValid || !age.birthDate) return { error: age.error || "Data de nascimento inválida." };
    const docs = await publishedSetupDocuments(tx);
    if (!docs || docs.terms.id !== values.data.termsDocumentId || docs.privacy.id !== values.data.privacyDocumentId || docs.terms.contentHash !== values.data.termsDocumentHash || docs.privacy.contentHash !== values.data.privacyDocumentHash) return { error: "Os documentos mudaram ou estão indisponíveis. Recarregue e confirme os documentos atuais." };
    const claimed = await tx.user.updateMany({ where: { id: user.id, setupToken: values.data.token, password: null, setupTokenExpiresAt: { gt: new Date() } }, data: { password: passwordHash, setupToken: null, setupTokenExpiresAt: null, sessionVersion: { increment: 1 }, ...(!user.cpfCnpj ? { cpfCnpj: cpf.replace(/\D/g, "") } : {}), ...(!user.birthDate ? { birthDate: age.birthDate } : {}) } });
    if (claimed.count !== 1) return { error: "Link de ativação inválido, expirado ou já utilizado." };
    for (const [doc, acceptanceType] of [[docs.terms, "TERMS_ACCEPTED"], [docs.privacy, "PRIVACY_ACKNOWLEDGED"]] as const) await tx.legalAcceptance.create({ data: { userId: user.id, documentId: doc.id, documentType: doc.type, documentVersion: doc.version, documentHash: doc.contentHash, acceptanceType, source: "SETUP_PASSWORD", ipAddress: input.ip?.slice(0, 80), userAgent: input.userAgent?.slice(0, 500) } });
    await tx.auditLog.create({ data: { userId: user.id, action: "PASSWORD_SETUP_WITH_LEGAL_ACCEPTANCE", entity: "USER", entityId: user.id, severity: "success", ip: input.ip?.slice(0, 80) } });
    return { success: true };
  });
}
