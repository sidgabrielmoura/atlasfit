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
import { paymentService } from "../application/payment-service";
import { EmailService } from "@/lib/emails/service";

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

        if (isSettled) {
          await paymentService.processActivationFeeRecovery(
            billing.providerAccountId,
            billing.personalNetEstimatedInCents,
            billing.id
          );
        }

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

        // Dispatch transactional emails asynchronously
        try {
          const [studentUser, trainerUser] = await Promise.all([
            billing.studentUserId ? prisma.user.findUnique({ where: { id: billing.studentUserId }, select: { name: true, email: true } }) : null,
            account?.personalUserId ? prisma.user.findUnique({ where: { id: account.personalUserId }, select: { name: true, email: true } }) : null,
          ]);

          const amountFormatted = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
            Number(billing.grossAmountInCents) / 100
          );
          const netAmountFormatted = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
            Number(billing.personalNetEstimatedInCents) / 100
          );
          const paidAtFormatted = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(
            new Date(billing.paidAt || Date.now())
          );

          if (studentUser?.email) {
            EmailService.sendPaymentReceiptStudent({
              to: studentUser.email,
              studentName: studentUser.name || "Aluno(a)",
              trainerName: trainerUser?.name || "Seu Personal",
              planName: billing.title || "Consultoria",
              amountFormatted,
              paymentMethod: billing.paymentMethod || "PIX",
              paidAtFormatted,
            }).catch((err) => console.warn("[WebhookReceipt] Student email error:", err));
          }

          if (trainerUser?.email) {
            EmailService.sendPaymentConfirmedTrainer({
              to: trainerUser.email,
              trainerName: trainerUser.name || "Personal",
              studentName: studentUser?.name || "Aluno(a)",
              amountFormatted,
              netAmountFormatted,
              paymentMethod: billing.paymentMethod || "PIX",
            }).catch((err) => console.warn("[WebhookReceipt] Trainer email error:", err));
          }
        } catch (emailErr) {
          console.warn("[WebhookProcessor] Email trigger error:", emailErr);
        }
      }
    } else if (eventType.startsWith("TRANSFER_")) {
      const rawPayload = normalized.rawPayload as any;
      const transferObj = rawPayload?.transfer || rawPayload;
      const extRef = transferObj?.externalReference as string | undefined;
      const opIdFromExt = extRef && extRef.startsWith("atlas_activation_fee_")
        ? extRef.replace("atlas_activation_fee_", "")
        : undefined;

      const recoveryOp = await prisma.activationFeeRecoveryOperation.findFirst({
        where: {
          OR: [
            { providerTransferId: resourceId },
            ...(extRef ? [{ externalReference: extRef }] : []),
            ...(opIdFromExt ? [{ id: opIdFromExt }] : [])
          ]
        }
      });

      if (recoveryOp) {
        if (eventType === "TRANSFER_DONE") {
          if (recoveryOp.status !== "COMPLETED") {
            await prisma.$transaction(async (tx) => {
              const currentOp = await tx.activationFeeRecoveryOperation.findUnique({
                where: { id: recoveryOp.id }
              });
              if (currentOp?.status === "COMPLETED") return;

              await tx.activationFeeRecoveryOperation.update({
                where: { id: recoveryOp.id },
                data: {
                  status: "COMPLETED",
                  providerTransferId: currentOp?.providerTransferId || resourceId
                }
              });

              const account = await tx.paymentProviderAccount.findUnique({
                where: { id: recoveryOp.providerAccountId }
              });

              if (account) {
                const newRecovered = account.activationFeeRecoveredInCents + recoveryOp.amountInCents;
                const newReserved = account.activationFeeReservedInCents > recoveryOp.amountInCents
                  ? account.activationFeeReservedInCents - recoveryOp.amountInCents
                  : BigInt(0);
                const isFullyRecovered = newRecovered >= account.activationFeeTotalInCents;

                await tx.paymentProviderAccount.update({
                  where: { id: account.id },
                  data: {
                    activationFeeRecoveredInCents: newRecovered,
                    activationFeeReservedInCents: newReserved,
                    activationFeeStatus: isFullyRecovered ? "COMPLETED" : "PARTIALLY_RECOVERED"
                  }
                });

                await tx.walletLedgerEntry.upsert({
                  where: { idempotencyKey: `LEDGER_ACTIVATION_RECOVERY_DONE_${recoveryOp.id}` },
                  create: {
                    providerAccountId: account.id,
                    billingId: recoveryOp.billingId,
                    idempotencyKey: `LEDGER_ACTIVATION_RECOVERY_DONE_${recoveryOp.id}`,
                    type: LedgerEntryType.ACTIVATION_FEE_RECOVERY,
                    direction: LedgerDirection.DEBIT,
                    amountInCents: recoveryOp.amountInCents,
                    occurredAt: normalized.occurredAt,
                    description: `Recuperação efetiva da taxa de abertura de conta financeira (R$ ${(Number(recoveryOp.amountInCents) / 100).toFixed(2)})`
                  },
                  update: {}
                });
              }
            });
          }
        } else if (eventType === "TRANSFER_FAILED" || eventType === "TRANSFER_CANCELLED") {
          if (recoveryOp.status !== "FAILED" && recoveryOp.status !== "CANCELLED") {
            await prisma.$transaction(async (tx) => {
              await tx.activationFeeRecoveryOperation.update({
                where: { id: recoveryOp.id },
                data: {
                  status: eventType === "TRANSFER_CANCELLED" ? "CANCELLED" : "FAILED",
                  providerTransferId: recoveryOp.providerTransferId || resourceId
                }
              });

              const account = await tx.paymentProviderAccount.findUnique({
                where: { id: recoveryOp.providerAccountId }
              });

              if (account) {
                const newReserved = account.activationFeeReservedInCents > recoveryOp.amountInCents
                  ? account.activationFeeReservedInCents - recoveryOp.amountInCents
                  : BigInt(0);

                await tx.paymentProviderAccount.update({
                  where: { id: account.id },
                  data: {
                    activationFeeReservedInCents: newReserved
                  }
                });
              }
            });
          }
        } else if (eventType === "TRANSFER_BLOCKED") {
          await prisma.activationFeeRecoveryOperation.update({
            where: { id: recoveryOp.id },
            data: {
              status: "BLOCKED",
              providerTransferId: recoveryOp.providerTransferId || resourceId
            }
          });
        }
      }

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

          if (isCompleted) {
            prisma.user.findUnique({
              where: { id: account.personalUserId },
              select: { name: true, email: true },
            }).then((u) => {
              if (u?.email) {
                const amountFormatted = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                  Number(payout.amountInCents) / 100
                );
                const completedAtFormatted = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(
                  new Date()
                );
                EmailService.sendPayoutCompletedTrainer({
                  to: u.email,
                  trainerName: u.name || "Personal",
                  amountFormatted,
                  pixKeyMasked: payout.destinationMasked || "Chave PIX",
                  completedAtFormatted,
                }).catch((err) => console.warn("[PayoutCompletedEmail] Dispatch failed:", err));
              }
            }).catch((err) => console.warn("[WebhookProcessor] Error finding trainer user:", err));
          }
        }
      }
    } else if (eventType === "TRANSFER_FAILED" || eventType === "TRANSFER_CANCELLED") {
      const recoveryOp = await prisma.activationFeeRecoveryOperation.findFirst({
        where: { providerTransferId: resourceId }
      });

      if (recoveryOp && recoveryOp.status !== "FAILED") {
        await prisma.$transaction(async (tx) => {
          await tx.activationFeeRecoveryOperation.update({
            where: { id: recoveryOp.id },
            data: { status: "FAILED" }
          });

          const account = await tx.paymentProviderAccount.findUnique({
            where: { id: recoveryOp.providerAccountId }
          });

          if (account) {
            const newReserved = account.activationFeeReservedInCents > recoveryOp.amountInCents
              ? account.activationFeeReservedInCents - recoveryOp.amountInCents
              : BigInt(0);

            await tx.paymentProviderAccount.update({
              where: { id: account.id },
              data: {
                activationFeeReservedInCents: newReserved
              }
            });
          }
        });
      }

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
