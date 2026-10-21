import type { ProviderEnvironment } from "@prisma/client";
import type { GymTransactionClient } from "@/modules/workspaces/application/transaction";
import { enqueueDelivery } from "@/lib/delivery/outbox";
import { getFromEmail } from "@/lib/emails/service";
import { getPaymentReceiptStudentEmailTemplate, getPaymentConfirmedTrainerEmailTemplate } from "@/lib/emails/templates/billing.templates";
import { getPayoutCompletedTrainerEmailTemplate } from "@/lib/emails/templates/wallet.templates";
import { getNextBillingStatusForEvent, getBillingLedgerCreditKey } from "../domain/billing-state-machine";
import { applyPersonalTransferEvent } from "./personal-transfer-event";
import { resolvePersonalBillingStudent } from "./personal-billing-student";
import type { NormalizedFinancialEvent } from "../domain/types";

export class WebhookReviewRequired extends Error {}
const currency = (cents: bigint) => {
  const absolute = cents < BigInt(0) ? -cents : cents;
  return `${cents < BigInt(0) ? "-" : ""}R$ ${(absolute / BigInt(100)).toLocaleString("pt-BR")},${(absolute % BigInt(100)).toString().padStart(2, "0")}`;
};
const formattedDate = (date: Date) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(date);

/** Financial facts and their deliveries commit together; no provider is called here. */
export async function applyPersonalWebhookEffects(tx: GymTransactionClient, webhookId: string, environment: ProviderEnvironment, event: NormalizedFinancialEvent) {
  const publish = (key: string, channelName: string, eventName: string, data: unknown) => enqueueDelivery(tx, { requestKey: key, channel: "ABLY", webhookId, payload: { channelName, eventName, data } });
  const email = (key: string, to: string, content: { subject: string; html: string; text: string }) => enqueueDelivery(tx, { requestKey: key, channel: "EMAIL", webhookId, payload: { from: getFromEmail(), to, ...content } });
  if (event.eventType.startsWith("TRANSFER_")) {
    if (!["TRANSFER_CREATED", "TRANSFER_PENDING", "TRANSFER_IN_BANK_PROCESSING", "TRANSFER_DONE", "TRANSFER_FAILED", "TRANSFER_CANCELLED", "TRANSFER_BLOCKED"].includes(event.eventType)) throw new WebhookReviewRequired("WEBHOOK_EVENT_UNSUPPORTED");
    const result = await applyPersonalTransferEvent(event, tx, environment);
    if (result.changed && result.personalUserId) {
      await publish(`webhook:${webhookId}:wallet`, `user:${result.personalUserId}`, "wallet:updated", { type: "BALANCE_UPDATED", eventType: event.eventType, payoutId: result.payoutId, timestamp: event.occurredAt.toISOString() });
      if (event.eventType === "TRANSFER_DONE" && result.payoutId) {
        const user = await tx.user.findUnique({ where: { id: result.personalUserId }, select: { name: true, email: true } });
        if (user?.email) await email(`payout:${result.payoutId}:receipt`, user.email, getPayoutCompletedTrainerEmailTemplate({ trainerName: user.name || "Personal", amountFormatted: currency(result.amountInCents), pixKeyMasked: result.destinationMasked || "Chave PIX", completedAtFormatted: formattedDate(event.occurredAt), recipientEmail: user.email }));
      }
    }
    return;
  }
  if (event.resourceType !== "PAYMENT") throw new WebhookReviewRequired("WEBHOOK_EVENT_UNSUPPORTED");
  const links = await tx.studentBilling.findMany({ where: { providerBillingId: event.resourceId, account: { provider: "ASAAS", environment } }, select: { id: true, providerAccountId: true }, take: 2 });
  if (links.length !== 1) throw new WebhookReviewRequired("BILLING_LINK_REVIEW_REQUIRED");
  await tx.$queryRaw`SELECT id FROM "PaymentProviderAccount" WHERE id = ${links[0].providerAccountId} FOR NO KEY UPDATE`;
  const billing = await tx.studentBilling.findUniqueOrThrow({ where: { id: links[0].id }, include: { account: { include: { workspace: { select: { type: true } } } }, workspacePayment: true } });
  if (billing.account.workspace?.type === "GYM") throw new WebhookReviewRequired("GYM_LEGACY_RECONCILIATION_REQUIRED");
  const settled = ["PAYMENT_RECEIVED", "PAYMENT_DUNNING_RECEIVED", "RECEIVED_IN_CASH", "PAYMENT_RECEIVED_IN_CASH"].includes(event.eventType);
  const confirmed = event.eventType === "PAYMENT_CONFIRMED" || event.eventType === "CONFIRMED";
  if (settled || confirmed) {
    const nextStatus = getNextBillingStatusForEvent(billing.status, event.eventType);
    // Late receipts never recreate a credit on refunded/cancelled/chargeback billings.
    if (!nextStatus && !["CONFIRMED", "SETTLED", "AVAILABLE"].includes(billing.status)) throw new WebhookReviewRequired("BILLING_STATE_REVIEW_REQUIRED");
    const creditKey = getBillingLedgerCreditKey(billing.id);
    const previous = await tx.walletLedgerEntry.findUnique({ where: { idempotencyKey: creditKey } });
    const firstSettlement = settled && !billing.settledAt && previous?.type !== "PAYMENT_SETTLED";
    if (firstSettlement) {
      const member = await resolvePersonalBillingStudent(billing.workspaceId, billing.studentUserId, billing.account.personalUserId, tx);
      // Never guess the next debt from a name. Historical missing links need reconciliation.
      if (!billing.workspacePayment || billing.workspacePayment.workspaceId !== member.workspaceId) throw new WebhookReviewRequired("BILLING_OBLIGATION_REVIEW_REQUIRED");
      if (!["pendente", "atrasado", "pago"].includes(billing.workspacePayment.status)) throw new WebhookReviewRequired("BILLING_OBLIGATION_REVIEW_REQUIRED");
      if (billing.workspacePayment.status !== "pago") await tx.workspacePayment.update({ where: { id: billing.workspacePayment.id }, data: { status: "pago", paidAt: event.occurredAt, paidBy: "GATEWAY", actionType: "AUTOMATIC" } });
      await publish(`billing:${billing.id}:financial-settled`, `workspace:${member.workspaceId}`, "financial:updated", { type: "FINANCIAL_PAYMENT_UPDATED", workspaceId: member.workspaceId, billingId: billing.id, paymentId: billing.workspacePayment.id, timestamp: event.occurredAt.toISOString() });
      await enqueueDelivery(tx, { requestKey: `billing:${billing.id}:activation`, channel: "ACTIVATION_FEE", webhookId, payload: { providerAccountId: billing.providerAccountId, billingId: billing.id, availableNetCents: billing.personalNetEstimatedInCents.toString(), environment } });
    }
    await tx.studentBilling.update({ where: { id: billing.id }, data: { ...(nextStatus ? { status: nextStatus } : {}), confirmedAt: billing.confirmedAt || event.occurredAt, ...(settled ? { settledAt: billing.settledAt || event.occurredAt, paidAt: billing.paidAt || event.occurredAt } : {}) } });
    await tx.walletLedgerEntry.upsert({ where: { idempotencyKey: creditKey }, create: { providerAccountId: billing.providerAccountId, billingId: billing.id, idempotencyKey: creditKey, type: settled ? "PAYMENT_SETTLED" : "PAYMENT_CONFIRMED", direction: "CREDIT", amountInCents: billing.personalNetEstimatedInCents, occurredAt: event.occurredAt, description: "Pagamento confirmado pelo provedor" }, update: settled ? { type: "PAYMENT_SETTLED" } : {} });
    for (const userId of new Set([billing.account.personalUserId, billing.studentUserId].filter((id): id is string => !!id))) await publish(`webhook:${webhookId}:wallet:${userId}`, `user:${userId}`, "wallet:updated", { type: "BALANCE_UPDATED", eventType: event.eventType, billingId: billing.id, timestamp: event.occurredAt.toISOString() });
    if (firstSettlement) {
      const student = await tx.user.findUnique({ where: { id: billing.studentUserId }, select: { name: true, email: true } });
      const trainer = billing.account.personalUserId ? await tx.user.findUnique({ where: { id: billing.account.personalUserId }, select: { name: true, email: true } }) : null;
      if (student?.email) await email(`billing:${billing.id}:student-receipt`, student.email, getPaymentReceiptStudentEmailTemplate({ studentName: student.name || "Aluno(a)", trainerName: trainer?.name || "Seu Personal", planName: billing.title, amountFormatted: currency(billing.grossAmountInCents), paymentMethod: billing.paymentMethod, paidAtFormatted: formattedDate(event.occurredAt), recipientEmail: student.email }));
      if (trainer?.email) await email(`billing:${billing.id}:trainer-receipt`, trainer.email, getPaymentConfirmedTrainerEmailTemplate({ trainerName: trainer.name || "Personal", studentName: student?.name || "Aluno(a)", amountFormatted: currency(billing.grossAmountInCents), netAmountFormatted: currency(billing.personalNetEstimatedInCents), paymentMethod: billing.paymentMethod, recipientEmail: trainer.email }));
    }
    return;
  }
  if (["PAYMENT_REFUNDED", "PAYMENT_PARTIALLY_REFUNDED", "PAYMENT_RECEIVED_IN_CASH_UNDONE"].includes(event.eventType)) throw new WebhookReviewRequired("REFUND_ACTUAL_AMOUNTS_REVIEW_REQUIRED");
  if (["PAYMENT_OVERDUE", "PAYMENT_DELETED"].includes(event.eventType)) {
    const status = getNextBillingStatusForEvent(billing.status, event.eventType);
    if (status) await tx.studentBilling.update({ where: { id: billing.id }, data: { status } });
    return;
  }
  throw new WebhookReviewRequired("WEBHOOK_EVENT_UNSUPPORTED");
}
