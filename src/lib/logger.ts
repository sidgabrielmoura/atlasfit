import prisma from "@/lib/prisma";
import { auth } from "@/auth";

/**
 * Sanitizes and redacts PII and sensitive data before persisting to audit logs or stdout.
 */
export function redactSensitiveData(input: string): string {
  if (!input) return "";

  return input
    // Redact password parameters
    .replace(/(password|senha|secret|token|apiKey|access_token|refresh_token)\s*[:=]\s*["']?[^"',\s}]+["']?/gi, "$1: [REDACTED]")
    // Redact Bearer tokens
    .replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, "Bearer [REDACTED]")
    // Redact CPFs
    .replace(/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g, "[CPF_REDACTED]")
    // Redact Credit Card Numbers
    .replace(/\b\d{4}[ -]?\d{4}[ -]?\d{4}[ -]?\d{4}\b/g, "[CARD_REDACTED]")
    // Redact CVV
    .replace(/(cvv|cvc)\s*[:=]\s*["']?\d{3,4}["']?/gi, "$1: [REDACTED]");
}

interface SystemErrorParams {
  action: string;
  error: any;
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

    const rawErrorMessage = error instanceof Error ? error.message : String(error);
    const sanitizedError = redactSensitiveData(rawErrorMessage);
    const logAction = `${action.toUpperCase()}_FAIL: ${sanitizedError}`.substring(0, 190);

    // Save to the database
    const createdLog = await prisma.auditLog.create({
      data: {
        userId: finalUserId || undefined,
        action: logAction,
        entity: entity || "SYSTEM",
        entityId: entityId || null,
        ip: ip ? redactSensitiveData(ip) : null,
        severity: "danger", // Errors are always recorded as danger severity
      },
    });

    return createdLog;
  } catch (logErr) {
    console.error("[SYSTEM_ERROR_LOG_FAILURE] Failed to record system error:", logErr);
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

    const createdLog = await prisma.auditLog.create({
      data: {
        userId: finalUserId || null,
        action: sanitizedAction,
        entity: entity || null,
        entityId: entityId || null,
        ip: ip ? redactSensitiveData(ip) : null,
        severity,
      },
    });

    return createdLog;
  } catch (logErr) {
    console.error("[AUDIT_LOG_FAILURE] Failed to record audit log:", logErr);
    return null;
  }
}
