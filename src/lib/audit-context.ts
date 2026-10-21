import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import { redactLogValue, redactPrivateText } from "./privacy/log-redaction";

export type AuditIdentity = { actorUserId: string; effectiveUserId: string; impersonated: boolean };
type AuditContext = { identity?: AuditIdentity; correlationId: string };
// Next can load this module in several route bundles or reload it during development.
// The Prisma singleton and every request must share the same storage instance.
const auditGlobal = globalThis as typeof globalThis & { __atlasfitAuditContext?: AsyncLocalStorage<AuditContext> };
const auditContext = auditGlobal.__atlasfitAuditContext ??= new AsyncLocalStorage<AuditContext>();

/** Internal server context. Never populated from headers, body or query parameters. */
export function withAuditIdentity<T>(identity: AuditIdentity | undefined, operation: () => T): T {
  return auditContext.run({ identity, correlationId: randomUUID() }, operation);
}
export function withCommandAudit<T>(operation: () => T): T {
  return auditContext.getStore() ? operation() : withAuditIdentity(undefined, operation);
}
export function auditedData<T extends { userId?: string | null; action: string; metadata?: unknown }>(data: T) {
  data = { ...data, action: redactPrivateText(data.action), ...(data.metadata === undefined ? {} : { metadata: redactLogValue(data.metadata) }) };
  const context = auditContext.getStore();
  if (!context) return data;
  const identity = context.identity;
  const details: Record<string, unknown> = data.metadata && typeof data.metadata === "object" && !Array.isArray(data.metadata) ? data.metadata as Record<string, unknown> : {};
  return { ...data, userId: identity?.actorUserId ?? data.userId, metadata: { ...details, version: 1, correlationId: context.correlationId, actorUserId: identity?.actorUserId ?? data.userId ?? null, effectiveUserId: identity?.effectiveUserId ?? data.userId ?? null, impersonated: identity?.impersonated ?? false, phase: details.phase ?? "LOCAL_COMMIT" } };
}
export function currentAuditIdentity() { return auditContext.getStore()?.identity; }
export function auditedEnrollmentEvent<T extends { actorId?: string | null; reason?: string | null }>(data: T): T {
  const context = auditContext.getStore();
  if (!context?.identity?.impersonated) return data;
  return { ...data, actorId: context.identity.actorUserId, reason: `${data.reason ?? ""} | audit=${JSON.stringify({ correlationId: context.correlationId, effectiveUserId: context.identity.effectiveUserId })}` };
}
