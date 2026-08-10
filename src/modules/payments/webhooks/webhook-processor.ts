import prisma from "@/lib/prisma";
import { AsaasAdapter } from "../providers/asaas/asaas-adapter";
import {
  PaymentProvider,
  ProviderEnvironment,
  WebhookProcessingStatus,
  StudentBillingStatus,
  WalletPayoutStatus,
  LedgerEntryType,
  LedgerDirection
} from "@prisma/client";
import crypto from "crypto";
import { publishToChannel } from "@/lib/ably";

export class WebhookProcessor {
  private adapter = new AsaasAdapter();

  async receiveWebhook(headers: Record<string, string>, rawBody: string) {
    const isValid = await this.adapter.verifyWebhook(headers, rawBody);
    if (!isValid) {
      throw new Error("Assinatura do webhook inválida");
    }

    const normalized = await this.adapter.normalizeWebhook(rawBody);
    const payloadHash = crypto.createHash("sha256").update(rawBody).digest("hex");

    const providerEnv = (process.env.ASAAS_ENVIRONMENT || "sandbox") === "production"
      ? ProviderEnvironment.PRODUCTION
      : ProviderEnvironment.SANDBOX;

    const existingEvent = await prisma.paymentWebhookEvent.findUnique({
      where: {
        provider_environment_providerEventId: {
          provider: PaymentProvider.ASAAS,
          environment: providerEnv,
          providerEventId: normalized.providerEventId
        }
      }
    });

    if (existingEvent) {
      return { status: "DUPLICATE", eventId: existingEvent.id };
    }

    const webhookEvent = await prisma.paymentWebhookEvent.create({
      data: {
        provider: PaymentProvider.ASAAS,
        environment: providerEnv,
        providerEventId: normalized.providerEventId,
        eventType: normalized.eventType,
        resourceType: normalized.resourceType,
        resourceId: normalized.resourceId,
        authenticityValidated: true,
        payloadHash,
        processingStatus: WebhookProcessingStatus.QUEUED,
        queuedAt: new Date()
      }
    });

    try {
      await this.processEvent(webhookEvent.id, normalized);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      await prisma.paymentWebhookEvent.update({
        where: { id: webhookEvent.id },
        data: {
          processingStatus: WebhookProcessingStatus.FAILED_RETRYABLE,
          lastErrorSanitized: errMsg,
          processingAttempts: { increment: 1 }
        }
      });
    }

    return { status: "PROCESSED", eventId: webhookEvent.id };
  }

  private async processEvent(webhookId: string, normalized: ReturnType<typeof this.adapter.normalizeWebhook> extends Promise<infer T> ? T : never) {
    await prisma.paymentWebhookEvent.update({
      where: { id: webhookId },
      data: { processingStatus: WebhookProcessingStatus.PROCESSING }
    });

    const eventType = normalized.eventType;
    const resourceId = normalized.resourceId;

    if (eventType === "PAYMENT_CONFIRMED" || eventType === "PAYMENT_RECEIVED") {
      const billing = await prisma.studentBilling.findFirst({
        where: { providerBillingId: resourceId }
      });

      if (billing) {
        const isSettled = eventType === "PAYMENT_RECEIVED";
        const newStatus = isSettled ? StudentBillingStatus.SETTLED : StudentBillingStatus.CONFIRMED;

        await prisma.$transaction(async (tx) => {
          await tx.studentBilling.update({
            where: { id: billing.id },
            data: {
              status: newStatus,
              confirmedAt: billing.confirmedAt || new Date(),
              settledAt: isSettled ? new Date() : billing.settledAt,
              paidAt: billing.paidAt || new Date()
            }
          });

          await tx.walletLedgerEntry.upsert({
            where: { idempotencyKey: `LEDGER_CONFIRM_${billing.id}_${eventType}` },
            create: {
              providerAccountId: billing.providerAccountId,
              billingId: billing.id,
              idempotencyKey: `LEDGER_CONFIRM_${billing.id}_${eventType}`,
              type: isSettled ? LedgerEntryType.PAYMENT_SETTLED : LedgerEntryType.PAYMENT_CONFIRMED,
              direction: LedgerDirection.CREDIT,
              amountInCents: billing.personalNetEstimatedInCents,
              occurredAt: normalized.occurredAt,
              description: `Pagamento ${isSettled ? "liquidado" : "confirmado"} para ${billing.title}`
            },
            update: {}
          });
        });

        const studentMember = await prisma.workspaceMember.findFirst({
          where: { userId: billing.studentUserId, role: "STUDENT" }
        });

        if (studentMember) {
          await prisma.workspacePayment.updateMany({
            where: {
              workspaceId: studentMember.workspaceId,
              status: "pendente"
            },
            data: {
              status: "pago"
            }
          });

          await publishToChannel(`workspace:${studentMember.workspaceId}`, "financial:updated", {
            type: "FINANCIAL_PAYMENT_UPDATED",
            workspaceId: studentMember.workspaceId,
            billingId: billing.id,
            timestamp: new Date().toISOString()
          });
        }

        const account = await prisma.paymentProviderAccount.findFirst({
          where: { providerAccountId: billing.providerAccountId }
        });
        if (account?.personalUserId) {
          await publishToChannel(`user:${account.personalUserId}`, "wallet:updated", {
            type: "BALANCE_UPDATED",
            eventType,
            billingId: billing.id,
            timestamp: new Date().toISOString()
          });
        }

        if (billing.studentUserId) {
          await publishToChannel(`user:${billing.studentUserId}`, "wallet:updated", {
            type: "BALANCE_UPDATED",
            eventType,
            billingId: billing.id,
            timestamp: new Date().toISOString()
          });
        }
      }
    } else if (eventType === "TRANSFER_DONE" || eventType === "TRANSFER_CREATED") {
      const payout = await prisma.walletPayoutRequest.findFirst({
        where: { providerTransferId: resourceId }
      });

      if (payout) {
        const isCompleted = eventType === "TRANSFER_DONE";
        await prisma.walletPayoutRequest.update({
          where: { id: payout.id },
          data: {
            status: isCompleted ? WalletPayoutStatus.COMPLETED : WalletPayoutStatus.PROCESSING,
            completedAt: isCompleted ? new Date() : payout.completedAt
          }
        });

        const account = await prisma.paymentProviderAccount.findFirst({
          where: { providerAccountId: payout.providerAccountId }
        });
        if (account?.personalUserId) {
          await publishToChannel(`user:${account.personalUserId}`, "wallet:updated", {
            type: "BALANCE_UPDATED",
            eventType,
            payoutId: payout.id,
            timestamp: new Date().toISOString()
          });
        }
      }
    } else if (eventType === "TRANSFER_FAILED" || eventType === "TRANSFER_CANCELLED") {
      const payout = await prisma.walletPayoutRequest.findFirst({
        where: { providerTransferId: resourceId }
      });

      if (payout) {
        await prisma.$transaction(async (tx) => {
          await tx.walletPayoutRequest.update({
            where: { id: payout.id },
            data: {
              status: WalletPayoutStatus.FAILED_FINAL,
              failedAt: new Date()
            }
          });

          await tx.walletLedgerEntry.upsert({
            where: { idempotencyKey: `LEDGER_REVERSAL_PAYOUT_${payout.id}` },
            create: {
              providerAccountId: payout.providerAccountId,
              payoutId: payout.id,
              idempotencyKey: `LEDGER_REVERSAL_PAYOUT_${payout.id}`,
              type: LedgerEntryType.ADJUSTMENT,
              direction: LedgerDirection.CREDIT,
              amountInCents: payout.amountInCents,
              occurredAt: new Date(),
              description: `Estorno de saque falhado ID ${payout.id}`
            },
            update: {}
          });
        });

        const account = await prisma.paymentProviderAccount.findFirst({
          where: { providerAccountId: payout.providerAccountId }
        });
        if (account?.personalUserId) {
          await publishToChannel(`user:${account.personalUserId}`, "wallet:updated", {
            type: "BALANCE_UPDATED",
            eventType,
            payoutId: payout.id,
            timestamp: new Date().toISOString()
          });
        }
      }
    }

    await prisma.paymentWebhookEvent.update({
      where: { id: webhookId },
      data: {
        processingStatus: WebhookProcessingStatus.PROCESSED,
        processedAt: new Date()
      }
    });
  }
}

export const webhookProcessor = new WebhookProcessor();
