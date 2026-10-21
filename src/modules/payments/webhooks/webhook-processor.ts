import prisma from "@/lib/prisma";
import { AsaasAdapter } from "../providers/asaas/asaas-adapter";
import {
  PaymentProvider,
  ProviderEnvironment,
  WebhookProcessingStatus
} from "@prisma/client";
import crypto from "crypto";
import { z } from "zod";
import { encryptSubAccountApiKey, decryptSubAccountApiKey } from "../providers/asaas/subaccount-crypto";
import { resolveGymLegacyWebhookScope } from "./gym-legacy-scope";
import type { NormalizedFinancialEvent } from "../domain/types";
import { serializableTransaction } from "@/modules/workspaces/application/transaction";
import { applyPersonalWebhookEffects, WebhookReviewRequired } from "./personal-webhook-effects";

export class WebhookIngressError extends Error {
  constructor(public readonly statusCode: 400 | 503, message: string) { super(message); }
}
const safeProcessingFailures = new Set([
  "TRANSFER_AMBIGUOUS_LINK_REVIEW_REQUIRED", "TRANSFER_UNLINKED_REVIEW_REQUIRED",
  "GYM_LEGACY_RECONCILIATION_REQUIRED", "RECOVERY_CONFLICT_REVIEW_REQUIRED",
  "RECOVERY_RESERVATION_REVIEW_REQUIRED", "PAYOUT_CONFLICT_REVIEW_REQUIRED",
  "PAYOUT_RESERVATION_REVIEW_REQUIRED", "BILLING_OWNER_REVIEW_REQUIRED",
  "BILLING_WORKSPACE_REVIEW_REQUIRED",
  "TRANSFER_ACCOUNT_REVIEW_REQUIRED",
]);
function retainedOccurrence(event: NormalizedFinancialEvent, receivedAt: Date): NormalizedFinancialEvent {
  const payload=z.object({dateCreated:z.string().optional()}).passthrough().parse(event.rawPayload);
  // An absent provider timestamp uses the first receipt, consistently on every replay.
  return payload.dateCreated ? event : {...event,occurredAt:receivedAt};
}

export class WebhookProcessor {
  private adapter = new AsaasAdapter();

  async receiveWebhook(headers: Record<string, string>, rawBody: string) {
    if (!await this.adapter.verifyWebhook(headers, rawBody)) throw new WebhookIngressError(400, "Autenticação do webhook inválida.");
    let normalized: NormalizedFinancialEvent;
    try { normalized = await this.adapter.normalizeWebhook(rawBody); }
    catch { throw new WebhookIngressError(400, "Payload do webhook inválido."); }
    return this.retainVerifiedEvent(normalized, rawBody);
  }

  /** Server-only reconciliation of a successful provider GET, using the same reducer. */
  async recordProviderPaymentSnapshot(input: { billingId: string; providerAccountId: string; payment: unknown }) {
    const payment = z.object({ id: z.string().min(1), status: z.enum(["RECEIVED", "CONFIRMED", "DUNNING_RECEIVED", "RECEIVED_IN_CASH"]), paymentDate: z.string().nullable().optional(), confirmedDate: z.string().nullable().optional() }).parse(input.payment);
    const billing = await prisma.studentBilling.findUniqueOrThrow({ where: { id: input.billingId }, include: { account: true } });
    const environment = process.env.ASAAS_ENVIRONMENT === "production" ? "PRODUCTION" : "SANDBOX";
    if (billing.providerAccountId !== input.providerAccountId || billing.providerBillingId !== payment.id || billing.account.environment !== environment || !billing.account.personalUserId) throw new WebhookIngressError(400, "Cobrança externa incompatível com a conta.");
    const eventType = `PAYMENT_${payment.status}`;
    const dateCreated = payment.status === "CONFIRMED" ? payment.confirmedDate : payment.paymentDate;
    const snapshot = { event: eventType, ...(dateCreated ? { dateCreated } : {}), payment: { id: payment.id, status: payment.status } };
    const id = `API_SNAPSHOT_${crypto.createHash("sha256").update(JSON.stringify([billing.id, snapshot])).digest("hex")}`;
    const rawBody = JSON.stringify({ id, ...snapshot });
    return this.retainVerifiedEvent(await this.adapter.normalizeWebhook(rawBody), rawBody);
  }

  private async retainVerifiedEvent(normalized: NormalizedFinancialEvent, rawBody: string) {
    const payloadHash = crypto.createHash("sha256").update(rawBody).digest("hex");
    const providerEnv = (process.env.ASAAS_ENVIRONMENT || "sandbox") === "production" ? ProviderEnvironment.PRODUCTION : ProviderEnvironment.SANDBOX;
    const gymScope = await resolveGymLegacyWebhookScope(normalized);
    let payloadEncrypted: string;
    try { payloadEncrypted = encryptSubAccountApiKey(rawBody).encrypted; }
    catch { throw new WebhookIngressError(503, "Armazenamento seguro do webhook indisponível."); }
    await prisma.paymentWebhookEvent.createMany({ skipDuplicates: true, data: [{ provider: PaymentProvider.ASAAS, environment: providerEnv, providerEventId: normalized.providerEventId, eventType: normalized.eventType, resourceType: normalized.resourceType, resourceId: normalized.resourceId, authenticityValidated: true, payloadHash, payloadEncrypted, processingStatus: WebhookProcessingStatus.QUEUED, queuedAt: new Date(), gymWorkspaceId: gymScope?.workspaceId }] });
    const event = await prisma.paymentWebhookEvent.findUniqueOrThrow({ where: { provider_environment_providerEventId: { provider: PaymentProvider.ASAAS, environment: providerEnv, providerEventId: normalized.providerEventId } } });
    if (event.payloadHash !== payloadHash) throw new WebhookIngressError(400, "Identificador de evento reutilizado com conteúdo divergente.");
    if (event.processingStatus === WebhookProcessingStatus.PROCESSED) return { status: "DUPLICATE", eventId: event.id };
    if (event.processingStatus === WebhookProcessingStatus.REVIEW_REQUIRED) return { status: "REVIEW_REQUIRED", eventId: event.id };
    if (gymScope) {
      // Retain the complete event and local linkage; no invoices, payouts, cash or access are changed.
      await prisma.paymentWebhookEvent.update({ where: { id: event.id }, data: { gymWorkspaceId: gymScope.workspaceId, payloadEncrypted: event.payloadEncrypted || payloadEncrypted, processingStatus: WebhookProcessingStatus.REVIEW_REQUIRED, lastErrorSanitized: gymScope.reason, processedAt: null } });
      return { status: "REVIEW_REQUIRED", eventId: event.id };
    }
    return this.processRetainedEvent(event.id, retainedOccurrence(normalized,event.receivedAt));
  }

  async replayEvent(webhookId: string) {
    const event = await prisma.paymentWebhookEvent.findUnique({ where: { id: webhookId } });
    if (!event) throw new WebhookIngressError(400, "Evento não encontrado.");
    if (event.processingStatus === WebhookProcessingStatus.REVIEW_REQUIRED || event.gymWorkspaceId) return { status: "REVIEW_REQUIRED", eventId: event.id };
    if (event.processingStatus === WebhookProcessingStatus.PROCESSED) return { status: "DUPLICATE", eventId: event.id };
    let normalized: NormalizedFinancialEvent;
    try {
      if (!event.payloadEncrypted || !event.authenticityValidated) throw new Error("UNRECOVERABLE_EVENT");
      const rawBody = decryptSubAccountApiKey(event.payloadEncrypted);
      if (crypto.createHash("sha256").update(rawBody).digest("hex") !== event.payloadHash) throw new Error("UNRECOVERABLE_EVENT");
      normalized = await this.adapter.normalizeWebhook(rawBody);
      if (normalized.providerEventId !== event.providerEventId || normalized.eventType !== event.eventType || normalized.resourceId !== event.resourceId) throw new Error("UNRECOVERABLE_EVENT");
    } catch {
      await prisma.paymentWebhookEvent.updateMany({ where: { id: event.id, processingStatus: { notIn: ["PROCESSED", "REVIEW_REQUIRED"] } }, data: { processingStatus: "REVIEW_REQUIRED", processingStartedAt: null, nextRetryAt: null, lastErrorSanitized: "WEBHOOK_PAYLOAD_REVIEW_REQUIRED" } });
      const current = await prisma.paymentWebhookEvent.findUniqueOrThrow({ where: { id: event.id }, select: { processingStatus: true } });
      return { status: current.processingStatus === "PROCESSED" ? "DUPLICATE" : current.processingStatus, eventId: event.id };
    }
    const gymScope = await resolveGymLegacyWebhookScope(normalized);
    if (gymScope) {
      await prisma.paymentWebhookEvent.update({ where: { id: event.id }, data: { gymWorkspaceId: gymScope.workspaceId, processingStatus: WebhookProcessingStatus.REVIEW_REQUIRED, lastErrorSanitized: gymScope.reason, processedAt: null } });
      return { status: "REVIEW_REQUIRED", eventId: event.id };
    }
    return this.processRetainedEvent(event.id, retainedOccurrence(normalized,event.receivedAt));
  }

  private async processRetainedEvent(webhookId: string, normalized: NormalizedFinancialEvent) {
    const now = new Date();
    try {
      return await serializableTransaction(async tx => {
        await tx.$queryRaw`SELECT id FROM "PaymentWebhookEvent" WHERE id = ${webhookId} FOR UPDATE`;
        const event = await tx.paymentWebhookEvent.findUniqueOrThrow({ where: { id: webhookId } });
        if (event.processingStatus === "PROCESSED") return { status: "DUPLICATE", eventId: webhookId };
        if (event.processingStatus === "REVIEW_REQUIRED" || event.gymWorkspaceId) return { status: "REVIEW_REQUIRED", eventId: webhookId };
        if (!event.authenticityValidated) throw new WebhookReviewRequired("WEBHOOK_AUTHENTICITY_REVIEW_REQUIRED");
        if (event.processingStatus === "FAILED_FINAL") return { status: "FAILED_FINAL", eventId: webhookId };
        if (event.processingStatus === "PROCESSING" && event.processingStartedAt && event.processingStartedAt > new Date(now.getTime() - 300_000)) return { status: "PROCESSING", eventId: webhookId };
        if (event.nextRetryAt && event.nextRetryAt > now) return { status: event.processingStatus, eventId: webhookId };
        await tx.paymentWebhookEvent.update({ where: { id: webhookId }, data: { processingStatus: "PROCESSING", processingStartedAt: now, processingAttempts: { increment: 1 }, lastErrorSanitized: null } });
        await applyPersonalWebhookEffects(tx, webhookId, event.environment, normalized);
        await tx.paymentWebhookEvent.update({ where: { id: webhookId }, data: { processingStatus: "PROCESSED", processedAt: now, processingStartedAt: null, nextRetryAt: null } });
        return { status: "PROCESSED", eventId: webhookId };
      });
    } catch (error) {
      const code = error instanceof WebhookReviewRequired ? error.message : error instanceof Error && safeProcessingFailures.has(error.message) ? error.message : "PROCESSING_FAILED";
      // A second worker may have completed while this transaction rolled back. Never regress it.
      return serializableTransaction(async tx => {
        await tx.$queryRaw`SELECT id FROM "PaymentWebhookEvent" WHERE id = ${webhookId} FOR UPDATE`;
        const current = await tx.paymentWebhookEvent.findUniqueOrThrow({ where: { id: webhookId } });
        if (["PROCESSED", "REVIEW_REQUIRED", "FAILED_FINAL"].includes(current.processingStatus)) return { status: current.processingStatus === "PROCESSED" ? "DUPLICATE" : current.processingStatus, eventId: webhookId };
        const attempts = current.processingAttempts + 1;
        const review = error instanceof WebhookReviewRequired || attempts >= 12;
        const status = review ? "REVIEW_REQUIRED" as const : "FAILED_RETRYABLE" as const;
        await tx.paymentWebhookEvent.update({ where: { id: webhookId }, data: { processingStatus: status, processingAttempts: attempts, processingStartedAt: null, lastErrorSanitized: code, processedAt: null, nextRetryAt: review ? null : new Date(now.getTime() + Math.min(3_600_000, 30_000 * 2 ** Math.min(attempts - 1, 7))) } });
        return { status, eventId: webhookId };
      });
    }
  }

  async processRetryBatch(now = new Date(), limit = 100) {
    if(!Number.isFinite(now.getTime()) || !Number.isSafeInteger(limit) || limit<1 || limit>100) throw new Error("INVALID_WEBHOOK_RETRY_BATCH");
    const events = await prisma.paymentWebhookEvent.findMany({ where: { gymWorkspaceId: null, OR: [
      { processingStatus: { in: ["QUEUED", "RECEIVED", "FAILED_RETRYABLE"] }, OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: now } }] },
      { processingStatus: "PROCESSING", OR: [{ processingStartedAt: null }, { processingStartedAt: { lte: new Date(now.getTime() - 300_000) } }] },
    ] }, select: { id: true }, orderBy: [{ receivedAt: "asc" }, { id: "asc" }], take: Math.max(1, Math.min(100, limit)) });
    const results = [];
    for (const event of events) {
      try { results.push(await this.replayEvent(event.id)); }
      catch { results.push({ status: "REPLAY_UNAVAILABLE", eventId: event.id }); }
    }
    return { results, hasMore: events.length === Math.max(1, Math.min(100, limit)) };
  }
}
export const webhookProcessor = new WebhookProcessor();
