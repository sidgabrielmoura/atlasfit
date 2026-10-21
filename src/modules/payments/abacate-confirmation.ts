import { createHash } from "node:crypto";
import prisma from "@/lib/prisma";
import type { GymTransactionClient } from "@/modules/workspaces/application/transaction";

type ConfirmationClient = Pick<GymTransactionClient, "creditPurchase" | "user">;

/** The status transition and balance change must commit together, across every ingress. */
export async function confirmCreditPurchase(tx: ConfirmationClient, purchaseId: string) {
  const purchase = await tx.creditPurchase.findUnique({ where: { id: purchaseId }, select: { id: true, userId: true, credits: true } });
  if (!purchase) throw new Error("CREDIT_PURCHASE_NOT_FOUND");
  const claimed = await tx.creditPurchase.updateMany({ where: { id: purchaseId, status: "PENDING" }, data: { status: "PAID", paidAt: new Date() } });
  if (!claimed.count) return false;
  await tx.user.update({ where: { id: purchase.userId }, data: { importCredits: { increment: purchase.credits } } });
  return true;
}

export function settleCreditPurchase(purchaseId: string) {
  return prisma.$transaction(tx => confirmCreditPurchase(tx, purchaseId));
}

/** A replay receipt contains identifiers/hashes, never the customer's payload. */
export function abacateEventIdentity(payload: Record<string, any>) {
  const eventType = String(payload.event || "");
  const data = payload.data || {};
  const paymentId = data.payment?.id || data.billing?.id;
  const eventId = payload.id;
  if (!eventId && !paymentId) throw new Error("ABACATE_EVENT_ID_REQUIRED");
  const environment = payload.devMode === true ? "TEST" : "LIVE";
  const key = `${environment}:${eventType}:${paymentId || eventId}`;
  const canonical = (value: any): any => Array.isArray(value) ? value.map(canonical) : value && typeof value === "object" ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
  return { key, eventType, payloadHash: createHash("sha256").update(JSON.stringify(canonical({ eventType, environment, data }))).digest("hex") };
}

export async function claimAbacateEvent(tx: GymTransactionClient, payload: Record<string, any>) {
  const identity = abacateEventIdentity(payload);
  // ON CONFLICT waits for the competing transaction, then claims exactly once.
  const result = await tx.abacateWebhookReceipt.createMany({ data: identity, skipDuplicates: true });
  if (!result.count) {
    const retained = await tx.abacateWebhookReceipt.findUniqueOrThrow({ where: { key: identity.key } });
    if (retained.payloadHash !== identity.payloadHash) throw new Error("ABACATE_EVENT_FINGERPRINT_CONFLICT");
  }
  return result.count > 0;
}
