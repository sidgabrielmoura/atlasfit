import { createHash, randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { serializableTransaction, type GymTransactionClient } from "@/modules/workspaces/application/transaction";
import { WorkspaceAccessError } from "@/modules/workspaces/domain/types";
import { permitsOwnAccount } from "./account-eligibility";
import { withAuditIdentity } from "@/lib/audit-context";

const prefix = "IMPERSONATION_V2:";
const id = z.string().min(1).max(100), version = z.number().int().nonnegative().safe();
const grantSchema = z.object({ purpose: z.enum(["START", "RETURN"]), actorId: id, actorVersion: version, targetId: id, targetVersion: version, sourceId: id, sourceVersion: version }).strict();
export const impersonationStartSchema = z.object({ targetUserId: id, reason: z.string().trim().min(5).max(1000) }).strict();
export type ImpersonationPrincipal = { id: string; sessionVersion: number; isImpersonated?: boolean; originalAdminUserId?: string; originalAdminSessionVersion?: number };
const userSelect = { id: true, name: true, email: true, role: true, password: true, sessionVersion: true } satisfies Prisma.UserSelect;
const digest = (value: string) => createHash("sha256").update(value).digest("hex");
const denied = () => new WorkspaceAccessError(403, "UNAUTHORIZED", "Sessão revogada ou operação de suporte não autorizada.");

async function lockUsers(tx: GymTransactionClient, ids: string[]) {
  const unique = [...new Set(ids)].sort();
  await tx.$queryRaw(Prisma.sql`SELECT id FROM "User" WHERE id IN (${Prisma.join(unique)}) ORDER BY id FOR UPDATE`);
}
async function storeGrant(tx: GymTransactionClient, payload: z.infer<typeof grantSchema>, email: string, reason?: string) {
  const token = randomBytes(32).toString("hex");
  await tx.verificationToken.create({ data: { token: digest(token), identifier: prefix + Buffer.from(JSON.stringify(payload)).toString("base64url"), expires: new Date(Date.now() + 120000) } });
  await withAuditIdentity({ actorUserId: payload.actorId, effectiveUserId: payload.sourceId, impersonated: payload.purpose === "RETURN" }, () => tx.auditLog.create({ data: { userId: payload.actorId, action: payload.purpose === "START" ? "IMPERSONATION_STARTED" : "IMPERSONATION_RETURN_ISSUED", entity: "USER", entityId: payload.targetId, severity: "warning", metadata: { targetUserId: payload.targetId, purpose: payload.purpose, ...(reason ? { reason } : {}) } } }));
  return { token, email };
}

export async function issueImpersonationStart(principal: ImpersonationPrincipal, input: unknown) {
  const parsed = impersonationStartSchema.safeParse(input);
  if (!parsed.success) throw new WorkspaceAccessError(400, "INVALID_REQUEST", "Informe usuário e justificativa válidos.");
  if (principal.isImpersonated || principal.id === parsed.data.targetUserId) throw denied();
  return serializableTransaction(async tx => {
    await lockUsers(tx, [principal.id, parsed.data.targetUserId]);
    const actor = await tx.user.findUnique({ where: { id: principal.id }, select: userSelect });
    const target = await tx.user.findUnique({ where: { id: parsed.data.targetUserId }, select: userSelect });
    if (!actor?.password || actor.role !== "SUPERADMIN" || actor.sessionVersion !== principal.sessionVersion || !await permitsOwnAccount(actor.id, tx)) throw denied();
    if (!target?.email || target.role === "SUPERADMIN" || !await permitsOwnAccount(target.id, tx)) throw new WorkspaceAccessError(403, "FORBIDDEN_RESOURCE", "Usuário indisponível para suporte; contas administrativas exigem login próprio.");
    return storeGrant(tx, { purpose: "START", actorId: actor.id, actorVersion: actor.sessionVersion, targetId: target.id, targetVersion: target.sessionVersion, sourceId: actor.id, sourceVersion: actor.sessionVersion }, target.email, parsed.data.reason);
  });
}

export async function issueImpersonationReturn(principal: ImpersonationPrincipal) {
  if (!principal.isImpersonated || !principal.originalAdminUserId || principal.originalAdminSessionVersion === undefined) throw denied();
  return serializableTransaction(async tx => {
    await lockUsers(tx, [principal.id, principal.originalAdminUserId!]);
    const source = await tx.user.findUnique({ where: { id: principal.id }, select: userSelect });
    const actor = await tx.user.findUnique({ where: { id: principal.originalAdminUserId }, select: userSelect });
    if (!source || source.sessionVersion !== principal.sessionVersion || !await permitsOwnAccount(source.id, tx)) throw denied();
    if (!actor?.password || !actor.email || actor.role !== "SUPERADMIN" || actor.sessionVersion !== principal.originalAdminSessionVersion || !await permitsOwnAccount(actor.id, tx)) throw denied();
    return storeGrant(tx, { purpose: "RETURN", actorId: actor.id, actorVersion: actor.sessionVersion, targetId: actor.id, targetVersion: actor.sessionVersion, sourceId: source.id, sourceVersion: source.sessionVersion }, actor.email);
  });
}

export async function consumeImpersonationGrant(raw: unknown) {
  if (typeof raw !== "string" || !/^[a-f0-9]{64}$/.test(raw)) return null;
  return serializableTransaction(async tx => {
    const record = await tx.verificationToken.findUnique({ where: { token: digest(raw) } });
    if (!record || record.expires <= new Date() || !record.identifier.startsWith(prefix) || record.identifier.length > 2048) return null;
    let parsed: ReturnType<typeof grantSchema.safeParse>;
    try { parsed = grantSchema.safeParse(JSON.parse(Buffer.from(record.identifier.slice(prefix.length), "base64url").toString("utf8"))); } catch { return null; }
    if (!parsed.success) return null;
    const grant = parsed.data;
    if (grant.purpose === "RETURN" ? grant.targetId !== grant.actorId : grant.sourceId !== grant.actorId || grant.targetId === grant.actorId) return null;
    await lockUsers(tx, [grant.actorId, grant.targetId, grant.sourceId]);
    const actor = await tx.user.findUnique({ where: { id: grant.actorId }, select: userSelect });
    const target = await tx.user.findUnique({ where: { id: grant.targetId }, select: userSelect });
    const source = await tx.user.findUnique({ where: { id: grant.sourceId }, select: { sessionVersion: true } });
    if (!actor?.password || actor.role !== "SUPERADMIN" || actor.sessionVersion !== grant.actorVersion || !target?.email || target.sessionVersion !== grant.targetVersion || source?.sessionVersion !== grant.sourceVersion) return null;
    if (grant.purpose === "START" && target.role === "SUPERADMIN") return null;
    if (!await permitsOwnAccount(actor.id, tx) || !await permitsOwnAccount(target.id, tx) || !await permitsOwnAccount(grant.sourceId, tx)) return null;
    const consumed = await tx.verificationToken.deleteMany({ where: { token: record.token, identifier: record.identifier, expires: { gt: new Date() } } });
    if (consumed.count !== 1) return null;
    const isImpersonated = grant.purpose === "START";
    await withAuditIdentity({ actorUserId: actor.id, effectiveUserId: target.id, impersonated: isImpersonated }, () => tx.auditLog.create({ data: { userId: actor.id, action: isImpersonated ? "IMPERSONATION_CONSUMED" : "IMPERSONATION_RETURN_CONSUMED", entity: "USER", entityId: target.id, severity: "warning" } }));
    return { id: target.id, name: target.name, email: target.email, role: target.role, sessionVersion: target.sessionVersion, isImpersonated, originalAdminEmail: isImpersonated ? actor.email || undefined : undefined, originalAdminUserId: isImpersonated ? actor.id : undefined, originalAdminSessionVersion: isImpersonated ? actor.sessionVersion : undefined };
  });
}
