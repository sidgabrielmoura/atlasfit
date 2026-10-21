import { redactPrivateText } from "./privacy/log-redaction";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { currentAuditIdentity, withAuditIdentity, type AuditIdentity } from "./audit-context";

async function resolveLogIdentity(fallbackUserId?: string | null): Promise<AuditIdentity | undefined> {
  const current = currentAuditIdentity();
  if (current) return current;
  try {
    const user = (await auth())?.user;
    if (user?.id) {
      if (user.isImpersonated && !user.originalAdminUserId) throw new Error("INVALID_AUDIT_IDENTITY");
      return { actorUserId: user.isImpersonated ? user.originalAdminUserId! : user.id, effectiveUserId: user.id, impersonated: Boolean(user.isImpersonated) };
    }
  } catch { /* Background commands have no request session. */ }
  return fallbackUserId ? { actorUserId: fallbackUserId, effectiveUserId: fallbackUserId, impersonated: false } : undefined;
}

/**
 * Sanitizes and redacts PII and sensitive data before persisting to audit logs or stdout.
 */
export const redactSensitiveData = redactPrivateText;

interface SystemErrorParams {
  action: string;
  error: unknown;
  entity?: string;
  entityId?: string;
  userId?: string;
  ip?: string;
}

export async function logSystemError({
  action,
  error,
  entity,
  entityId,
  userId,
  ip,
}: SystemErrorParams) {
  try {
    // Resolve user ID if not provided explicitly
    let finalUserId: string | undefined = userId || undefined;
    if (!finalUserId) {
      try {
        const session = await auth();
        if (session?.user?.id) {
          finalUserId = session.user.id;
        }
      } catch {
        // Ignore auth failures outside request context
      }
    }

    const rawErrorMessage = error instanceof Error ? error.name : "UnknownError";
    const sanitizedError = redactSensitiveData(rawErrorMessage);
    const logAction = `${action.toUpperCase()}_FAIL: ${sanitizedError}`.substring(0, 190);

    // Save to the database
    const identity = await resolveLogIdentity(finalUserId);
    const createdLog = await withAuditIdentity(identity, () => prisma.auditLog.create({
      data: {
        userId: finalUserId || undefined,
        action: logAction,
        entity: entity || "SYSTEM",
        entityId: entityId || null,
        ip: ip ? redactSensitiveData(ip) : null,
        severity: "danger", // Errors are always recorded as danger severity
        metadata: { phase: "FAILED" },
      },
    }));

    return createdLog;
  } catch (logErr) {
    console.error("[SYSTEM_ERROR_LOG_FAILURE] Failed to record system error:");
    return null;
  }
}

interface AuditLogParams {
  action: string;
  userId?: string | null;
  entity?: string | null;
  entityId?: string | null;
  severity?: "info" | "success" | "warning" | "danger" | "critical";
  ip?: string | null;
}

export async function logAuditEvent({
  action,
  userId,
  entity,
  entityId,
  severity = "info",
  ip,
}: AuditLogParams) {
  try {
    let finalUserId: string | undefined = userId || undefined;
    if (!finalUserId) {
      try {
        const session = await auth();
        if (session?.user?.id) {
          finalUserId = session.user.id;
        }
      } catch {
        // Ignore auth errors outside request context
      }
    }

    const sanitizedAction = redactSensitiveData(action.toUpperCase());

    const identity = await resolveLogIdentity(finalUserId);
    const createdLog = await withAuditIdentity(identity, () => prisma.auditLog.create({
      data: {
        userId: finalUserId || null,
        action: sanitizedAction,
        entity: entity || null,
        entityId: entityId || null,
        ip: ip ? redactSensitiveData(ip) : null,
        severity,
      },
    }));

    return createdLog;
  } catch (logErr) {
    console.error("[AUDIT_LOG_FAILURE] Failed to record audit log:", logErr);
    return null;
  }
}
