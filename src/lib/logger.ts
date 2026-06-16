import prisma from "@/lib/prisma";
import { auth } from "@/auth";

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
  ip
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

    const errorMessage = error instanceof Error ? error.message : String(error);
    const logAction = `${action.toUpperCase()}_FAIL: ${errorMessage}`.substring(0, 190);

    // Save to the database
    const createdLog = await prisma.auditLog.create({
      data: {
        userId: finalUserId || undefined,
        action: logAction,
        entity: entity || "SYSTEM",
        entityId: entityId || null,
        ip: ip || null,
        severity: "danger" // Errors are always recorded as danger severity
      }
    });

    console.log(`[SYSTEM_ERROR_LOG] Created log ID ${createdLog.id}: ${logAction}`);
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
  severity?: "info" | "success" | "warning" | "danger";
  ip?: string | null;
}

export async function logAuditEvent({
  action,
  userId,
  entity,
  entityId,
  severity = "info",
  ip
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

    const createdLog = await prisma.auditLog.create({
      data: {
        userId: finalUserId || null,
        action: action.toUpperCase(),
        entity: entity || null,
        entityId: entityId || null,
        ip: ip || null,
        severity
      }
    });

    console.log(`[AUDIT_LOG] Created log ID ${createdLog.id}: ${action}`);
    return createdLog;
  } catch (logErr) {
    console.error("[AUDIT_LOG_FAILURE] Failed to record audit log:", logErr);
    return null;
  }
}
