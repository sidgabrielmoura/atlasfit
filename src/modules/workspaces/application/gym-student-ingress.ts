import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { permitsOwnAccount } from "@/lib/auth/account-eligibility";
import { newSetupTokenExpiry } from "@/lib/auth/setup-token-policy";
import { validateApplicationOrigin } from "@/lib/auth/application-origin";
import { publishedSetupDocuments } from "@/lib/auth/password-setup-service";
import { isValidCPF } from "@/lib/cpf-validator";
import { validateAgeEligibility } from "@/lib/privacy/age-validator";
import { enqueueDelivery } from "@/lib/delivery/outbox";
import { hasStudentMembership } from "../domain/student-membership";
import { gymStudentInvitationSchema } from "../domain/gym-student-ingress";
import { WorkspaceAccessError } from "../domain/types";
import { authorizeGymStudent } from "./student-authority";
import { idempotentSerializableTransaction, serializableTransaction, type GymTransactionClient } from "./transaction";

const prefix = "GYM_STUDENT_INVITE_V1:", digest = (value: string) => createHash("sha256").update(value).digest("hex");
const metadataSchema = z.object({ workspaceId: z.string(), memberId: z.string(), targetId: z.string(), targetVersion: z.number().int(), issuerId: z.string(), issuerVersion: z.number().int(), email: z.string().nullable(), delivery: z.enum(["MANUAL_LINK", "EMAIL"]) }).strict();
const unavailable = () => new WorkspaceAccessError(409, "INVALID_STATUS", "Convite indisponível, expirado ou utilizado. Solicite um novo convite à academia.");
const selectUser = { id: true, email: true, cpfCnpj: true, birthDate: true, password: true, sessionVersion: true } satisfies Prisma.UserSelect;
async function lockUsers(tx: GymTransactionClient, ids: string[]) { await tx.$queryRaw(Prisma.sql`SELECT id FROM "User" WHERE id IN (${Prisma.join([...new Set(ids)].sort())}) ORDER BY id FOR UPDATE`); }

export async function currentStudentInvitation(tokenHash: string, tx: GymTransactionClient = prisma) {
  if (!/^[a-f0-9]{64}$/.test(tokenHash)) throw unavailable();
  const record = await tx.verificationToken.findUnique({ where: { token: tokenHash } });
  if (!record || record.expires <= new Date() || !record.identifier.startsWith(prefix) || record.identifier.length > 2048) throw unavailable();
  let data: z.infer<typeof metadataSchema>;
  try { data = metadataSchema.parse(JSON.parse(Buffer.from(record.identifier.slice(prefix.length + 65), "base64url").toString("utf8"))); } catch { throw unavailable(); }
  const student = await authorizeGymStudent(data.workspaceId, data.memberId, data.issuerId, "students.manage", {}, tx);
  const [target, issuer] = await Promise.all([tx.user.findUnique({ where: { id: data.targetId }, select: selectUser }), tx.user.findUnique({ where: { id: data.issuerId }, select: { sessionVersion: true, password: true } })]);
  if (!student.isActive || !hasStudentMembership(student) || student.userId !== data.targetId || student.isMinor || !target || target.password !== null || target.sessionVersion !== data.targetVersion || target.email !== data.email || !issuer?.password || issuer.sessionVersion !== data.issuerVersion || !await permitsOwnAccount(target.id, tx) || !await permitsOwnAccount(data.issuerId, tx)) throw unavailable();
  return { record, data, target, student };
}

export async function issueStudentInvitation(principal: { id: string; sessionVersion: number; isImpersonated?: boolean }, memberId: string, input: unknown) {
  const parsed = gymStudentInvitationSchema.safeParse(input);
  if (!parsed.success) throw new WorkspaceAccessError(400, "INVALID_REQUEST", "Confirme a emissão e escolha a entrega do convite.");
  if (principal.isImpersonated) throw new WorkspaceAccessError(403, "FORBIDDEN_RESOURCE", "Emita convites de credenciais na própria conta.");
  const data = parsed.data;
  return idempotentSerializableTransaction(async tx => {
    const student = await authorizeGymStudent(data.workspaceId, memberId, principal.id, "students.manage", {}, tx);
    await lockUsers(tx, [principal.id, student.userId]);
    const target = await tx.user.findUniqueOrThrow({ where: { id: student.userId }, select: selectUser });
    const actor = await tx.user.findUniqueOrThrow({ where: { id: principal.id }, select: { sessionVersion: true, password: true } });
    if (!actor.password || actor.sessionVersion !== principal.sessionVersion || !await permitsOwnAccount(principal.id, tx)) throw new WorkspaceAccessError(403, "UNAUTHORIZED", "Entre novamente para emitir o convite.");
    if (!student.isActive || !hasStudentMembership(student) || student.isMinor || !await permitsOwnAccount(target.id, tx)) throw new WorkspaceAccessError(403, "FORBIDDEN_RESOURCE", "Aluno indisponível; menores ingressam pela conta do responsável.");
    if (target.password !== null) return { delivery: "LOGIN_OWN" as const, loginPath: "/auth/student" as const, message: "A conta já possui senha. O aluno deve entrar com suas próprias credenciais; recuperação ocorre pelo login." };
    if (data.delivery === "EMAIL" && (!target.email || !process.env.RESEND_API_KEY || !(process.env.EMAIL_FROM || process.env.RESEND_FROM_EMAIL))) throw new WorkspaceAccessError(409, "INVALID_STATUS", "E-mail do aluno ou serviço de envio indisponível. Use a entrega manual do link.");
    const marker = prefix + digest(JSON.stringify([principal.id, data.requestKey])) + ":";
    const previous = await tx.verificationToken.findFirst({ where: { identifier: { startsWith: marker } } });
    if (previous) {
      const existing = await currentStudentInvitation(previous.token, tx);
      if (existing.data.workspaceId !== data.workspaceId || existing.data.memberId !== memberId || existing.data.delivery !== data.delivery) throw new WorkspaceAccessError(409, "IDEMPOTENCY_CONFLICT", "Esta operação já foi usada com outros dados.");
      if (data.delivery === "MANUAL_LINK") throw new WorkspaceAccessError(409, "IDEMPOTENCY_CONFLICT", "Link já emitido uma vez. Se não o conservou, emita outro convite para invalidar o anterior.");
      const job = await tx.deliveryOutbox.findUniqueOrThrow({ where: { requestKey: `gym-student-invite:${principal.id}:${data.requestKey}` } });
      return { delivery: "EMAIL" as const, deliveryId: job.id, status: job.status, expiresAt: previous.expires.toISOString() };
    }
    const token = "gym_" + randomBytes(32).toString("hex"), tokenHash = digest(token), expires = newSetupTokenExpiry();
    const updated = await tx.user.update({ where: { id: target.id }, data: { setupToken: null, setupTokenExpiresAt: null, sessionVersion: { increment: 1 } }, select: { sessionVersion: true } });
    const metadata = { workspaceId: data.workspaceId, memberId, targetId: target.id, targetVersion: updated.sessionVersion, issuerId: principal.id, issuerVersion: actor.sessionVersion, email: target.email, delivery: data.delivery };
    await tx.verificationToken.create({ data: { token: tokenHash, workspaceId: data.workspaceId, identifier: marker + Buffer.from(JSON.stringify(metadata)).toString("base64url"), expires } });
    const path = `/auth/setup-password?token=${token}`;
    let job: { id: string; status: string } | null = null;
    if (data.delivery === "EMAIL") {
      const url = validateApplicationOrigin(process.env.AUTH_URL || process.env.NEXTAUTH_URL || process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "https://app.atlasfit.site") + path;
      job = await enqueueDelivery(tx, { workspaceId: data.workspaceId, requestKey: `gym-student-invite:${principal.id}:${data.requestKey}`, channel: "EMAIL", payload: { from: process.env.EMAIL_FROM || process.env.RESEND_FROM_EMAIL!, to: target.email!, subject: "AtlasFit — acesso ao portal do aluno", html: `<p>Configure seu acesso ao portal do aluno pelo link abaixo. Ele vence em 48 horas e pode ser usado uma vez.</p><p><a href="${url}">Configurar acesso</a></p><p>Se não reconhece este convite, ignore a mensagem.</p>`, text: `Configure seu acesso ao portal do aluno: ${url}\nVálido por 48 horas e uso único. Se não reconhece este convite, ignore a mensagem.`, guard: { kind: "GYM_STUDENT_INVITE", tokenHash } } });
    }
    await tx.auditLog.create({ data: { userId: principal.id, action: "GYM_STUDENT_INVITATION_ISSUED", entity: "WORKSPACE", entityId: data.workspaceId, metadata: { memberId, delivery: data.delivery, deliveryId: job?.id } } });
    return job ? { delivery: "EMAIL" as const, deliveryId: job.id, status: job.status, expiresAt: expires.toISOString() } : { delivery: "MANUAL_LINK" as const, invitationPath: path, expiresAt: expires.toISOString() };
  });
}

export async function getStudentInvitationInfo(token: string) {
  if (!/^gym_[a-f0-9]{64}$/.test(token)) throw unavailable();
  return serializableTransaction(async tx => {
    const context = await currentStudentInvitation(digest(token), tx), docs = await publishedSetupDocuments(tx);
    if (!docs) throw new WorkspaceAccessError(409, "INVALID_STATUS", "Termos e política publicados indisponíveis. Procure o suporte.");
    return { success: true as const, needsCpf: !context.target.cpfCnpj, needsBirthDate: !context.target.birthDate, needsEmail: !context.target.email, termsDocumentId: docs.terms.id, privacyDocumentId: docs.privacy.id, termsDocumentHash: docs.terms.contentHash, privacyDocumentHash: docs.privacy.contentHash, terms: { version: docs.terms.version, content: docs.terms.content }, privacy: { version: docs.privacy.version, content: docs.privacy.content } };
  });
}

export async function completeStudentInvitation(input: unknown, authenticatedUserId?: string) {
  if (authenticatedUserId) throw new WorkspaceAccessError(403, "FORBIDDEN_RESOURCE", "Saia da conta atual antes de configurar o acesso próprio do aluno.");
  const values = z.object({ token: z.string().regex(/^gym_[a-f0-9]{64}$/), password: z.string().min(6).max(72).refine(value => Buffer.byteLength(value, "utf8") <= 72), cpfCnpj: z.string().max(32).optional(), birthDate: z.string().max(40).optional(), email: z.string().trim().email().max(254).optional(), acceptedTerms: z.literal(true), acceptedPrivacy: z.literal(true), termsDocumentId: z.string().min(1).max(100), privacyDocumentId: z.string().min(1).max(100), termsDocumentHash: z.string().regex(/^[a-f0-9]{64}$/), privacyDocumentHash: z.string().regex(/^[a-f0-9]{64}$/), ip: z.string().max(80).optional(), userAgent: z.string().max(500).optional() }).strict().safeParse(input);
  if (!values.success) throw new WorkspaceAccessError(400, "INVALID_REQUEST", "Confira senha, e-mail, CPF e documentos exibidos.");
  const data = values.data, password = await bcrypt.hash(data.password, 10);
  return serializableTransaction(async tx => {
    const preliminary = await currentStudentInvitation(digest(data.token), tx);
    await lockUsers(tx, [preliminary.target.id, preliminary.data.issuerId]);
    const context = await currentStudentInvitation(digest(data.token), tx);
    const age = validateAgeEligibility(context.target.birthDate || data.birthDate);
    if (!age.isValid || !age.birthDate) throw new WorkspaceAccessError(400, "INVALID_REQUEST", "Nascimento válido de adulto é obrigatório; menores ingressam pelo responsável.");
    const email = context.target.email || data.email?.toLowerCase(), cpf = context.target.cpfCnpj || data.cpfCnpj;
    if (!email || !cpf || !isValidCPF(cpf) || (data.email && context.target.email && data.email.toLowerCase() !== context.target.email.toLowerCase()) || (data.cpfCnpj && context.target.cpfCnpj && data.cpfCnpj.replace(/\D/g, "") !== context.target.cpfCnpj.replace(/\D/g, ""))) throw new WorkspaceAccessError(400, "INVALID_REQUEST", "Confirme a identidade e um e-mail próprio válido.");
    if (!context.target.email && await tx.user.findFirst({ where: { id: { not: context.target.id }, email: { equals: email, mode: "insensitive" } }, select: { id: true } })) throw new WorkspaceAccessError(409, "INVALID_STATUS", "Não foi possível usar esse e-mail. Entre com a conta correspondente ou procure o suporte.");
    if (!context.target.cpfCnpj && (await tx.$queryRaw<{ id: string }[]>`SELECT id FROM "User" WHERE id <> ${context.target.id} AND regexp_replace(COALESCE("cpfCnpj", ''), '[^0-9]', '', 'g') = ${cpf.replace(/\D/g, "")} LIMIT 1`).length) throw new WorkspaceAccessError(409, "INVALID_STATUS", "Identidade indisponível para nova conta. Procure o suporte.");
    const docs = await publishedSetupDocuments(tx);
    if (!docs || docs.terms.id !== data.termsDocumentId || docs.privacy.id !== data.privacyDocumentId || docs.terms.contentHash !== data.termsDocumentHash || docs.privacy.contentHash !== data.privacyDocumentHash) throw new WorkspaceAccessError(409, "INVALID_STATUS", "Os documentos mudaram. Recarregue e confirme os documentos atuais.");
    if ((await tx.verificationToken.deleteMany({ where: { token: context.record.token, identifier: context.record.identifier, expires: { gt: new Date() } } })).count !== 1) throw unavailable();
    await tx.user.update({ where: { id: context.target.id }, data: { password, email, cpfCnpj: cpf.replace(/\D/g, ""), ...(!context.target.birthDate ? { birthDate: age.birthDate } : {}), setupToken: null, setupTokenExpiresAt: null, sessionVersion: { increment: 1 } } });
    await tx.passwordResetToken.deleteMany({ where: { email } });
    for (const doc of [docs.terms, docs.privacy]) await tx.legalAcceptance.create({ data: { userId: context.target.id, documentId: doc.id, documentType: doc.type, documentVersion: doc.version, documentHash: doc.contentHash, acceptanceType: doc.type === "TERMS" ? "TERMS_ACCEPTED" : "PRIVACY_ACKNOWLEDGED", source: "GYM_STUDENT_INGRESS", ipAddress: data.ip, userAgent: data.userAgent } });
    await tx.auditLog.create({ data: { userId: context.target.id, action: "GYM_STUDENT_INVITATION_CLAIMED", entity: "WORKSPACE", entityId: context.data.workspaceId, metadata: { memberId: context.student.id, issuerId: context.data.issuerId } } });
    return { success: true as const };
  });
}
