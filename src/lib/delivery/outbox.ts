import { createHash, randomUUID } from "node:crypto";
import prisma from "@/lib/prisma";
import { serializableTransaction, type GymTransactionClient } from "@/modules/workspaces/application/transaction";
import { encryptSubAccountApiKey, decryptSubAccountApiKey } from "@/modules/payments/providers/asaas/subaccount-crypto";

export type DeliveryChannel = "ABLY" | "EMAIL" | "ACTIVATION_FEE" | "PUSH" | "NOTIFICATION";
export class DeliveryError extends Error {
  constructor(public readonly code: string, public readonly review = false) { super(code); }
}
export async function enqueueDelivery(tx: GymTransactionClient, input: { requestKey: string; channel: DeliveryChannel; payload: unknown; webhookId?: string; workspaceId?: string }) {
  const serialized = JSON.stringify(input.payload);
  if (!serialized || Buffer.byteLength(serialized) > 256_000 || input.requestKey.length > 256) throw new DeliveryError("INVALID_DELIVERY", true);
  const fingerprint = createHash("sha256").update(JSON.stringify([input.channel, input.webhookId || null, serialized])).digest("hex");
  await tx.deliveryOutbox.createMany({ skipDuplicates: true, data: [{ requestKey: input.requestKey, fingerprint, channel: input.channel, webhookId: input.webhookId, workspaceId: input.workspaceId, payloadEncrypted: encryptSubAccountApiKey(serialized).encrypted }] });
  const retained = await tx.deliveryOutbox.findUniqueOrThrow({ where: { requestKey: input.requestKey } });
  if (retained.fingerprint !== fingerprint) throw new DeliveryError("DELIVERY_IDEMPOTENCY_CONFLICT", true);
  // Old receipts predate the tenant column. Attach their scope only when the
  // unchanged payload already establishes it; never move a scoped receipt.
  if (!retained.workspaceId && input.workspaceId) {
    const payload = input.payload && typeof input.payload === "object" ? input.payload as Record<string, unknown> : {};
    const guard = payload.guard && typeof payload.guard === "object" ? payload.guard as Record<string, unknown> : {};
    const scopes = [payload.workspaceId, guard.workspaceId].filter((scope): scope is string => typeof scope === "string" && !!scope);
    if (guard.kind === "GYM_STUDENT_INVITE" && typeof guard.tokenHash === "string") {
      const invitation = await tx.verificationToken.findUnique({ where: { token: guard.tokenHash }, select: { workspaceId: true } });
      if (invitation?.workspaceId) scopes.push(invitation.workspaceId);
    }
    if (scopes.length && scopes.every(scope => scope === input.workspaceId)) {
      return tx.deliveryOutbox.update({ where: { id: retained.id }, data: { workspaceId: input.workspaceId } });
    }
  }
  if ((retained.workspaceId ?? null) !== (input.workspaceId ?? null)) throw new DeliveryError("DELIVERY_IDEMPOTENCY_CONFLICT", true);
  return retained;
}

export type DeliveryHandler = (input: { id: string; channel: DeliveryChannel; payload: unknown; attempts: number; firstAttemptAt: Date; now: Date; previousErrorCode?: string | null }) => Promise<{ receiptId?: string; skipped?: boolean }>;
const leaseMs = 120_000;
export async function processDelivery(id: string, handler: DeliveryHandler, now = new Date()) {
  const token = randomUUID();
  const job = await serializableTransaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "DeliveryOutbox" WHERE id = ${id} FOR UPDATE`;
    const current = await tx.deliveryOutbox.findUnique({ where: { id } });
    if (!current || !["QUEUED", "RETRY", "PROCESSING"].includes(current.status) || current.nextAttemptAt > now || (current.status === "PROCESSING" && current.leaseExpiresAt && current.leaseExpiresAt > now)) return null;
    const updated = await tx.deliveryOutbox.update({ where: { id }, data: { status: "PROCESSING", leaseToken: token, leaseExpiresAt: new Date(now.getTime() + leaseMs), attempts: { increment: 1 }, firstAttemptAt: current.firstAttemptAt || now, lastErrorCode: null } });
    return { ...updated, previousErrorCode: current.lastErrorCode };
  });
  if (!job) return { status: "NOT_CLAIMED" };
  try {
    if (!job.payloadEncrypted) throw new DeliveryError("PAYLOAD_UNAVAILABLE", true);
    const payload: unknown = JSON.parse(decryptSubAccountApiKey(job.payloadEncrypted));
    const result = await handler({ id: job.id, channel: job.channel as DeliveryChannel, payload, attempts: job.attempts, firstAttemptAt: job.firstAttemptAt!, now, previousErrorCode: job.previousErrorCode });
    const updated = await prisma.deliveryOutbox.updateMany({ where: { id, status: "PROCESSING", leaseToken: token }, data: { status: result.skipped ? "SKIPPED" : "SENT", completedAt: now, providerReceiptId: result.receiptId, leaseToken: null, leaseExpiresAt: null } });
    return { status: updated.count ? result.skipped ? "SKIPPED" : "SENT" : "LEASE_REPLACED" };
  } catch (error) {
    const code = error instanceof DeliveryError ? error.code : "DELIVERY_FAILED";
    const review = (error instanceof DeliveryError && error.review) || job.attempts >= 12;
    const updated = await prisma.deliveryOutbox.updateMany({ where: { id, status: "PROCESSING", leaseToken: token }, data: { status: review ? "REVIEW_REQUIRED" : "RETRY", lastErrorCode: code, nextAttemptAt: new Date(now.getTime() + Math.min(3_600_000, 30_000 * 2 ** Math.min(job.attempts - 1, 7))), leaseToken: null, leaseExpiresAt: null } });
    return { status: updated.count ? review ? "REVIEW_REQUIRED" : "RETRY" : "LEASE_REPLACED", code };
  }
}

export async function processDeliveryBatch(handler: DeliveryHandler, now = new Date(), limit = 100) {
  const jobs = await prisma.deliveryOutbox.findMany({ where: { status: { in: ["QUEUED", "RETRY", "PROCESSING"] }, nextAttemptAt: { lte: now }, OR: [{ leaseExpiresAt: null }, { leaseExpiresAt: { lte: now } }] }, select: { id: true }, orderBy: [{ nextAttemptAt: "asc" }, { id: "asc" }], take: Math.max(1, Math.min(100, limit)) });
  const results: { id: string; status: string; code?: string }[] = [];
  for (const job of jobs) results.push({ id: job.id, ...await processDelivery(job.id, handler, now) });
  return { results, hasMore: jobs.length === Math.max(1, Math.min(100, limit)) };
}

/** Keep delivery receipts/deduplication keys; remove completed operational content only. */
export async function minimizeDeliveredPayloads(before: Date) {
  if (!Number.isFinite(before.getTime()) || before > new Date(Date.now() - 86_400_000)) throw new DeliveryError("INVALID_MINIMIZATION_DATE", true);
  return prisma.deliveryOutbox.updateMany({ where: { status: { in: ["SENT", "SKIPPED"] }, completedAt: { lt: before }, payloadEncrypted: { not: null } }, data: { payloadEncrypted: null } });
}
