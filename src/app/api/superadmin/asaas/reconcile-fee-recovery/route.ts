import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { AsaasAdapter } from "@/modules/payments/providers/asaas/asaas-adapter";
import { LedgerEntryType, LedgerDirection } from "@prisma/client";
import { decryptSubAccountApiKey } from "@/modules/payments/providers/asaas/subaccount-crypto";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Acesso restrito a SuperAdmin" }, { status: 403 });
  }

  const adapter = new AsaasAdapter();
  const cutoff = new Date(Date.now() - 30 * 60 * 1000);

  const staleOps = await prisma.activationFeeRecoveryOperation.findMany({
    where: {
      status: { in: ["SUBMITTED", "RECONCILING", "BLOCKED"] },
      updatedAt: { lt: cutoff }
    },
    include: { account: true }
  });

  const results: Array<{ id: string; action: string; newStatus?: string; error?: string }> = [];

  for (const op of staleOps) {
    try {
      if (!op.account.providerApiKeyEncrypted) {
        results.push({ id: op.id, action: "skipped_no_api_key" });
        continue;
      }

      let subAccountApiKey: string;
      try {
        subAccountApiKey = decryptSubAccountApiKey(op.account.providerApiKeyEncrypted);
      } catch {
        results.push({ id: op.id, action: "error", error: "Falha na descriptografia da API Key" });
        continue;
      }

      const asaasTransfer = await adapter.getTransferStatus(
        op.providerTransferId || undefined,
        op.externalReference || undefined,
        subAccountApiKey
      );

      if (!asaasTransfer) {
        results.push({ id: op.id, action: "no_transfer_found" });
        continue;
      }

      const asaasStatus = asaasTransfer.status;

      if (asaasStatus === "DONE" || asaasStatus === "CONFIRMED") {
        await prisma.$transaction(async (tx) => {
          const currentOp = await tx.activationFeeRecoveryOperation.findUnique({
            where: { id: op.id }
          });
          if (currentOp?.status === "COMPLETED") return;

          await tx.activationFeeRecoveryOperation.update({
            where: { id: op.id },
            data: {
              status: "COMPLETED",
              providerTransferId: currentOp?.providerTransferId || asaasTransfer.id
            }
          });

          const account = await tx.paymentProviderAccount.findUnique({
            where: { id: op.providerAccountId }
          });

          if (account) {
            const newRecovered = account.activationFeeRecoveredInCents + op.amountInCents;
            const newReserved = account.activationFeeReservedInCents > op.amountInCents
              ? account.activationFeeReservedInCents - op.amountInCents
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
              where: { idempotencyKey: `LEDGER_ACTIVATION_RECOVERY_DONE_${op.id}` },
              create: {
                providerAccountId: account.id,
                billingId: op.billingId,
                idempotencyKey: `LEDGER_ACTIVATION_RECOVERY_DONE_${op.id}`,
                type: LedgerEntryType.ACTIVATION_FEE_RECOVERY,
                direction: LedgerDirection.DEBIT,
                amountInCents: op.amountInCents,
                occurredAt: new Date(),
                description: `Recuperação efetiva da taxa de abertura de conta (reconciliação watchdog)`
              },
              update: {}
            });
          }
        });
        results.push({ id: op.id, action: "reconciled", newStatus: "COMPLETED" });
      } else if (asaasStatus === "FAILED" || asaasStatus === "CANCELLED") {
        await prisma.$transaction(async (tx) => {
          await tx.activationFeeRecoveryOperation.update({
            where: { id: op.id },
            data: { status: asaasStatus === "CANCELLED" ? "CANCELLED" : "FAILED" }
          });

          const account = await tx.paymentProviderAccount.findUnique({
            where: { id: op.providerAccountId }
          });

          if (account) {
            const newReserved = account.activationFeeReservedInCents > op.amountInCents
              ? account.activationFeeReservedInCents - op.amountInCents
              : BigInt(0);

            await tx.paymentProviderAccount.update({
              where: { id: account.id },
              data: { activationFeeReservedInCents: newReserved }
            });
          }
        });
        results.push({ id: op.id, action: "reconciled", newStatus: asaasStatus === "CANCELLED" ? "CANCELLED" : "FAILED" });
      } else if (asaasStatus === "BLOCKED" || asaasStatus === "PENDING" || asaasStatus === "IN_BANK_PROCESSING") {
        await prisma.activationFeeRecoveryOperation.update({
          where: { id: op.id },
          data: { status: "BLOCKED" }
        });
        results.push({ id: op.id, action: "still_pending", newStatus: "BLOCKED" });
      } else {
        results.push({ id: op.id, action: "unknown_status", newStatus: asaasStatus });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      results.push({ id: op.id, action: "error", error: msg });
    }
  }

  return NextResponse.json({ reconciled: results.length, results });
}
