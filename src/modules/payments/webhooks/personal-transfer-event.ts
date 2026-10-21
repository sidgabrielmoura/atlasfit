import { z } from "zod";
import type { ProviderEnvironment } from "@prisma/client";
import { serializableTransaction, type GymTransactionClient } from "@/modules/workspaces/application/transaction";
import type { NormalizedFinancialEvent } from "../domain/types";

/** Applies provider facts only; never requests a transfer, payout or recovery. */
export async function applyPersonalTransferEvent(event: NormalizedFinancialEvent, client?: GymTransactionClient, environment?: ProviderEnvironment) {
  const payload = z.object({ transfer: z.object({ externalReference: z.string().optional() }).passthrough().optional(), externalReference: z.string().optional() }).passthrough().parse(event.rawPayload);
  const externalReference = payload.transfer?.externalReference || payload.externalReference;
  const completed = event.eventType === "TRANSFER_DONE";
  const failed = event.eventType === "TRANSFER_FAILED" || event.eventType === "TRANSFER_CANCELLED";
  const apply = async (tx: GymTransactionClient) => {
    const accountScope = environment ? { account: { provider: "ASAAS" as const, environment } } : {};
    const [recoveries, payouts] = await Promise.all([
      tx.activationFeeRecoveryOperation.findMany({ where: { ...accountScope, OR: [{ providerTransferId: event.resourceId }, ...(externalReference ? [{ externalReference }] : [])] }, take: 2 }),
      tx.walletPayoutRequest.findMany({ where: { ...accountScope, providerTransferId: event.resourceId }, take: 2 }),
    ]);
    if (recoveries.length + payouts.length !== 1) throw new Error(recoveries.length + payouts.length ? "TRANSFER_AMBIGUOUS_LINK_REVIEW_REQUIRED" : "TRANSFER_UNLINKED_REVIEW_REQUIRED");
    const recovery = recoveries[0], payout = payouts[0];
    if (recovery && payout) throw new Error("TRANSFER_AMBIGUOUS_LINK_REVIEW_REQUIRED");
    const accountId = recovery?.providerAccountId || payout?.providerAccountId;
    if (!accountId) throw new Error("TRANSFER_UNLINKED_REVIEW_REQUIRED");
    await tx.$queryRaw`SELECT id FROM "PaymentProviderAccount" WHERE id = ${accountId} FOR NO KEY UPDATE`;
    const account = await tx.paymentProviderAccount.findUniqueOrThrow({ where: { id: accountId }, include: { workspace: { select: { type: true } } } });
    if (account.workspace?.type === "GYM") throw new Error("GYM_LEGACY_RECONCILIATION_REQUIRED");
    if (environment && (account.environment !== environment || account.provider !== "ASAAS" || !account.personalUserId)) throw new Error("TRANSFER_ACCOUNT_REVIEW_REQUIRED");
    if (recovery) {
      if (["COMPLETED", "FAILED", "CANCELLED"].includes(recovery.status)) {
        if ((completed && recovery.status !== "COMPLETED") || (failed && recovery.status === "COMPLETED")) throw new Error("RECOVERY_CONFLICT_REVIEW_REQUIRED");
        return { changed: false, personalUserId: account.personalUserId, payoutId: null, amountInCents: recovery.amountInCents, destinationMasked: null };
      }
      if (completed || failed) {
        if (account.activationFeeReservedInCents < recovery.amountInCents) throw new Error("RECOVERY_RESERVATION_REVIEW_REQUIRED");
        const recovered = account.activationFeeRecoveredInCents + (completed ? recovery.amountInCents : BigInt(0));
        await tx.paymentProviderAccount.update({ where: { id: account.id }, data: { activationFeeReservedInCents: { decrement: recovery.amountInCents }, ...(completed ? { activationFeeRecoveredInCents: { increment: recovery.amountInCents }, activationFeeStatus: recovered >= account.activationFeeTotalInCents ? "COMPLETED" : "PARTIALLY_RECOVERED" } : {}) } });
        await tx.activationFeeRecoveryOperation.update({ where: { id: recovery.id }, data: { status: completed ? "COMPLETED" : event.eventType === "TRANSFER_CANCELLED" ? "CANCELLED" : "FAILED", providerTransferId: recovery.providerTransferId || event.resourceId } });
        if (completed) await tx.walletLedgerEntry.upsert({ where: { idempotencyKey: `LEDGER_ACTIVATION_RECOVERY_DONE_${recovery.id}` }, create: { providerAccountId: account.id, billingId: recovery.billingId, idempotencyKey: `LEDGER_ACTIVATION_RECOVERY_DONE_${recovery.id}`, type: "ACTIVATION_FEE_RECOVERY", direction: "DEBIT", amountInCents: recovery.amountInCents, occurredAt: event.occurredAt, description: "Recuperação confirmada da taxa de abertura" }, update: {} });
      } else if (event.eventType === "TRANSFER_BLOCKED") {
        await tx.activationFeeRecoveryOperation.update({ where: { id: recovery.id }, data: { status: "BLOCKED", providerTransferId: recovery.providerTransferId || event.resourceId } });
      }
      return { changed: completed || failed, personalUserId: account.personalUserId, payoutId: null, amountInCents: recovery.amountInCents, destinationMasked: null };
    }
    if (!payout) throw new Error("TRANSFER_LINK_MISSING");
    if (["COMPLETED", "FAILED_FINAL", "CANCELLED"].includes(payout.status)) {
      if ((completed && payout.status !== "COMPLETED") || (failed && payout.status === "COMPLETED")) throw new Error("PAYOUT_CONFLICT_REVIEW_REQUIRED");
      return { changed: false, personalUserId: account.personalUserId, payoutId: payout.id, amountInCents: payout.amountInCents, destinationMasked: payout.destinationMasked };
    }
    if (completed || failed) {
      const reservation = await tx.walletLedgerEntry.findUnique({ where: { idempotencyKey: `LEDGER_PAYOUT_${payout.id}` } });
      if (!reservation || reservation.providerAccountId !== account.id || reservation.amountInCents !== payout.amountInCents || reservation.direction !== "DEBIT") throw new Error("PAYOUT_RESERVATION_REVIEW_REQUIRED");
      await tx.walletPayoutRequest.update({ where: { id: payout.id }, data: { providerStatus: event.eventType, status: completed ? "COMPLETED" : "FAILED_FINAL", ...(completed ? { completedAt: event.occurredAt } : { failedAt: event.occurredAt }) } });
      if (failed) await tx.walletLedgerEntry.upsert({ where: { idempotencyKey: `LEDGER_REVERSAL_PAYOUT_${payout.id}` }, create: { providerAccountId: account.id, payoutId: payout.id, idempotencyKey: `LEDGER_REVERSAL_PAYOUT_${payout.id}`, type: "ADJUSTMENT", direction: "CREDIT", amountInCents: payout.amountInCents, occurredAt: event.occurredAt, description: "Compensação de saque não concluído" }, update: {} });
    }
    return { changed: completed || failed, personalUserId: account.personalUserId, payoutId: payout.id, amountInCents: payout.amountInCents, destinationMasked: payout.destinationMasked };
  };
  return client ? apply(client) : serializableTransaction(apply);
}
