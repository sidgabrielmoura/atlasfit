import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { isValidCPF } from "@/lib/cpf-validator";
import { validateAgeEligibility, validateGymMinorEligibility } from "@/lib/privacy/age-validator";
import { calculateDocumentHash } from "@/lib/privacy/legal-acceptance.service";
import { newSetupTokenExpiry } from "@/lib/auth/setup-token-policy";
import { permitsOwnAccount } from "@/lib/auth/account-eligibility";
import { WorkspaceAccessError } from "../domain/types";
import { hasStudentMembership } from "../domain/student-membership";
import { claimGuardianInvitationSchema, guardianInvitationTokenSchema } from "../domain/guardian-ingress";
import { authorizeGymStudent } from "./student-authority";
import { idempotentSerializableTransaction, serializableTransaction, type GymTransactionClient } from "./transaction";

const prefix = "GYM_GUARDIAN_INVITE:";
const digest = (value: string) => createHash("sha256").update(value).digest("hex");
const unavailable = () => new WorkspaceAccessError(409, "INVALID_STATUS", "Convite indisponível, alterado, expirado ou utilizado. Solicite uma nova conferência à academia.");
async function currentGuardian(tx: GymTransactionClient, workspaceId: string, guardianId: string, actorId: string) {
  const guardian = await tx.gymGuardian.findFirst({ where: { id: guardianId, workspaceId, revokedAt: null }, select: {
    id: true, workspaceId: true, studentMemberId: true, guardianUserId: true, cpf: true, email: true, name: true, phone: true, relationship: true, verifiedAt: true, updatedAt: true,
    isLegalRepresentative: true, isFinancialResponsible: true, hasHealthAccess: true, isEmergencyContact: true,
    workspace: { select: { name: true, type: true, isActive: true } },
  } });
  if (!guardian) throw unavailable();
  const student = await authorizeGymStudent(workspaceId, guardian.studentMemberId, actorId, "students.manage", {}, tx);
  const birth = await tx.user.findUnique({ where: { id: student.userId }, select: { birthDate: true } });
  const age = validateGymMinorEligibility(birth?.birthDate);
  const email = guardian.email?.trim().toLowerCase();
  if (!guardian.workspace.isActive || guardian.workspace.type !== "GYM" || !student.isActive || !hasStudentMembership(student) || !age.isValid || !age.isMinor || !guardian.verifiedAt || !isValidCPF(guardian.cpf) || !email || !z.string().email().max(254).safeParse(email).success || !(guardian.isLegalRepresentative || guardian.isFinancialResponsible || guardian.hasHealthAccess)) throw unavailable();
  if (student.unitId && !await tx.gymUnit.findFirst({ where: { id: student.unitId, workspaceId, isActive: true }, select: { id: true } })) throw unavailable();
  return { guardian, email, student };
}
function fingerprint(context: Awaited<ReturnType<typeof currentGuardian>>) {
  const g = context.guardian;
  return digest(JSON.stringify([g.id, g.workspaceId, g.studentMemberId, g.guardianUserId, g.cpf, context.email, g.name, g.phone, g.relationship, g.verifiedAt?.toISOString(), g.updatedAt.toISOString(), g.isLegalRepresentative, g.isFinancialResponsible, g.hasHealthAccess, g.isEmergencyContact]));
}
async function invitation(tx: GymTransactionClient, token: string) {
  if (!guardianInvitationTokenSchema.safeParse(token).success) throw unavailable();
  const record = await tx.verificationToken.findFirst({ where: { token: digest(token), identifier: { startsWith: prefix }, expires: { gt: new Date() } }, select: { identifier: true, token: true, expires: true } });
  if (!record) throw unavailable();
  let storedMetadata: unknown;
  try { storedMetadata = JSON.parse(record.identifier.slice(prefix.length)); } catch { throw unavailable(); }
  const metadata = z.object({ workspaceId: z.string(), guardianId: z.string(), issuerId: z.string(), fingerprint: z.string() }).strict().safeParse(storedMetadata);
  if (!metadata.success) throw unavailable();
  const context = await currentGuardian(tx, metadata.data.workspaceId, metadata.data.guardianId, metadata.data.issuerId);
  if (fingerprint(context) !== metadata.data.fingerprint) throw unavailable();
  return { record, issuerId: metadata.data.issuerId, ...context };
}
async function documents(tx: GymTransactionClient) {
  const now = new Date();
  const read = async (type: "TERMS" | "PRIVACY") => {
    const doc = await tx.legalDocument.findFirst({ where: { type, status: "PUBLISHED", publishedAt: { lte: now }, effectiveAt: { lte: now } }, orderBy: [{ effectiveAt: "desc" }, { publishedAt: "desc" }, { id: "desc" }], select: { id: true, title: true, version: true, content: true, contentHash: true, type: true } });
    if (!doc || doc.contentHash !== calculateDocumentHash(doc.content)) throw new WorkspaceAccessError(409, "INVALID_STATUS", "Documentos publicados indisponíveis. Procure a academia.");
    return doc;
  };
  return { terms: await read("TERMS"), privacy: await read("PRIVACY") };
}
/** No mail or account mutation: staff explicitly delivers this one-time capability. */
export async function issueGuardianInvitation(workspaceId: string, guardianId: string, actorId: string) {
  const token = randomBytes(32).toString("hex");
  return serializableTransaction(async tx => {
    const context = await currentGuardian(tx, workspaceId, guardianId, actorId);
    const marker = `${prefix}{"workspaceId":${JSON.stringify(workspaceId)},"guardianId":${JSON.stringify(guardianId)},`;
    await tx.verificationToken.deleteMany({ where: { identifier: { startsWith: marker } } });
    const expires = newSetupTokenExpiry();
    await tx.verificationToken.create({ data: { token: digest(token), identifier: prefix + JSON.stringify({ workspaceId, guardianId, issuerId: actorId, fingerprint: fingerprint(context) }), expires } });
    await tx.auditLog.create({ data: { userId: actorId, action: `GYM_GUARDIAN_INVITATION_ISSUED:${guardianId}`, entity: "WORKSPACE", entityId: workspaceId } });
    return { invitationPath: `/auth/guardian-invite?token=${token}`, expiresAt: expires.toISOString() };
  });
}
export async function getGuardianInvitation(token: string) {
  return serializableTransaction(async tx => {
    const context = await invitation(tx, token);
    const docs = await documents(tx);
    const dto = (doc: typeof docs.terms) => ({ id: doc.id, title: doc.title, version: doc.version, content: doc.content, hash: doc.contentHash });
    return { workspaceName: context.guardian.workspace.name, email: context.email, expiresAt: context.record.expires.toISOString(), terms: dto(docs.terms), privacy: dto(docs.privacy) };
  });
}
export async function claimGuardianInvitation(raw: unknown, actorId?: string, metadata: { ip?: string; userAgent?: string } = {}) {
  const parsed = claimGuardianInvitationSchema.safeParse(raw);
  if (!parsed.success) throw new WorkspaceAccessError(400, "INVALID_REQUEST", "Confira a identidade, senha e os documentos exibidos.");
  const data = parsed.data;
  if (data.mode === "LINK" && !actorId) throw new WorkspaceAccessError(401, "UNAUTHORIZED", "Entre com a conta destinatária para confirmar o vínculo.");
  if (data.mode === "CREATE" && actorId) throw new WorkspaceAccessError(403, "GUARDIAN_NOT_AUTHORIZED", "Use a conta autenticada para confirmar o vínculo ou saia dela antes de criar uma conta.");
  if (data.password && Buffer.byteLength(data.password, "utf8") > 72) throw new WorkspaceAccessError(400, "INVALID_REQUEST", "A senha deve ter de 8 a 72 bytes.");
  const password = data.password ? await bcrypt.hash(data.password, 10) : null;
  return idempotentSerializableTransaction(async tx => {
    const context = await invitation(tx, data.token);
    const docs = await documents(tx);
    if (docs.terms.id !== data.termsId || docs.terms.contentHash !== data.termsHash || docs.privacy.id !== data.privacyId || docs.privacy.contentHash !== data.privacyHash) throw new WorkspaceAccessError(409, "INVALID_STATUS", "Os documentos mudaram. Recarregue e confirme o conteúdo atual.");
    let userId: string;
    if (data.mode === "LINK" && actorId) {
      const actor = await tx.user.findUnique({ where: { id: actorId }, select: { id: true, email: true, cpfCnpj: true, birthDate: true } });
      if (!actor || actor.email?.trim().toLowerCase() !== context.email || actor.cpfCnpj?.replace(/\D/g, "") !== context.guardian.cpf.replace(/\D/g, "") || !validateAgeEligibility(actor.birthDate).isValid || !await permitsOwnAccount(actor.id, tx)) throw new WorkspaceAccessError(403, "GUARDIAN_NOT_AUTHORIZED", "A conta autenticada deve corresponder ao e-mail, CPF e maioridade conferidos.");
      userId = actor.id;
    } else {
      const age = validateAgeEligibility(data.birthDate);
      if (!password || data.cpf !== context.guardian.cpf.replace(/\D/g, "") || !age.isValid || !age.birthDate) throw new WorkspaceAccessError(403, "GUARDIAN_NOT_AUTHORIZED", "Confira o CPF e nascimento do responsável adulto.");
      const existingEmail = await tx.user.findFirst({ where: { email: { equals: context.email, mode: "insensitive" } }, select: { id: true } });
      // Historical profiles can contain punctuation or whitespace in the fiscal identity.
      const existingCpf = await tx.$queryRaw<{ id: string }[]>`SELECT "id" FROM "User" WHERE regexp_replace(COALESCE("cpfCnpj", ''), '[^0-9]', '', 'g') = ${data.cpf} LIMIT 1`;
      if (existingEmail || existingCpf.length || context.guardian.guardianUserId) throw new WorkspaceAccessError(409, "INVALID_STATUS", "Não foi possível criar uma nova conta. Entre com a conta correspondente ou procure o suporte para conferir a identidade.");
      userId = (await tx.user.create({ data: { email: context.email, name: context.guardian.name, cpfCnpj: data.cpf, birthDate: age.birthDate, password, role: "USER" }, select: { id: true } })).id;
    }
    if (userId === context.student.userId || (context.guardian.guardianUserId && context.guardian.guardianUserId !== userId)) throw new WorkspaceAccessError(403, "GUARDIAN_NOT_AUTHORIZED", "O convite não permite substituir uma identidade vinculada.");
    const consumed = await tx.verificationToken.deleteMany({ where: { token: context.record.token, identifier: context.record.identifier, expires: { gt: new Date() } } });
    if (consumed.count !== 1) throw unavailable();
    await tx.gymGuardian.update({ where: { id: context.guardian.id }, data: { guardianUserId: userId } });
    for (const doc of [docs.terms, docs.privacy]) await tx.legalAcceptance.create({ data: { userId, documentId: doc.id, documentType: doc.type, documentVersion: doc.version, documentHash: doc.contentHash, acceptanceType: doc.type === "TERMS" ? "TERMS_ACCEPTED" : "PRIVACY_ACKNOWLEDGED", source: "GUARDIAN_INGRESS", ipAddress: metadata.ip?.slice(0, 80), userAgent: metadata.userAgent?.slice(0, 500) } });
    await tx.auditLog.create({ data: { userId, action: `GYM_GUARDIAN_INVITATION_CLAIMED:${context.guardian.id}:issuer=${context.issuerId}`, entity: "WORKSPACE", entityId: context.guardian.workspaceId } });
    return { success: true as const, destination: "/guardian/dependents" };
  });
}
