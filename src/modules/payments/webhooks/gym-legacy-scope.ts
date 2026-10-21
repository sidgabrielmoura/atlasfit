import prisma from "@/lib/prisma";
import { z } from "zod";
import type { NormalizedFinancialEvent } from "../domain/types";

const objectId = z.object({ id: z.string().optional() }).passthrough();
const links = z.object({
  payment: z.object({ subscription: z.string().optional() }).passthrough().optional(),
  transfer: z.object({ externalReference: z.string().optional() }).passthrough().optional(),
  account: z.union([z.string(), objectId]).optional(),
}).passthrough();

/** Identifies legacy GYM events without consulting the provider or creating any wallet resource. */
export async function resolveGymLegacyWebhookScope(event: NormalizedFinancialEvent) {
  const payload = links.safeParse(event.rawPayload);
  const subscriptionId = payload.success ? payload.data.payment?.subscription : undefined;
  const accountId = payload.success ? typeof payload.data.account === "string" ? payload.data.account : payload.data.account?.id : undefined;
  const externalReference = payload.success ? payload.data.transfer?.externalReference : undefined;
  const [contracts, billing, payout, account, recovery] = await Promise.all([
    subscriptionId ? prisma.gymEnrollment.findMany({ where: { OR: [{ providerSubscriptionId: subscriptionId }, { retiredProviderSubscriptionId: subscriptionId }], workspace: { type: "GYM" } }, select: { workspaceId: true }, take: 2 }) : [],
    event.resourceType === "PAYMENT" ? prisma.studentBilling.findFirst({ where: { providerBillingId: event.resourceId, OR: [{ workspace: { type: "GYM" } }, { account: { workspace: { type: "GYM" } } }] }, select: { workspaceId: true, account: { select: { workspaceId: true } } } }) : null,
    event.resourceType === "TRANSFER" ? prisma.walletPayoutRequest.findFirst({ where: { providerTransferId: event.resourceId, account: { workspace: { type: "GYM" } } }, select: { account: { select: { workspaceId: true } } } }) : null,
    accountId ? prisma.paymentProviderAccount.findFirst({ where: { providerAccountId: accountId, workspace: { type: "GYM" } }, select: { workspaceId: true } }) : null,
    event.resourceType === "TRANSFER" ? prisma.activationFeeRecoveryOperation.findFirst({ where: { account: { workspace: { type: "GYM" } }, OR: [{ providerTransferId: event.resourceId }, ...(externalReference ? [{ externalReference }] : [])] }, select: { account: { select: { workspaceId: true } } } }) : null,
  ]);
  const ids = new Set(contracts.map(contract => contract.workspaceId));
  for (const workspaceId of [billing?.workspaceId, billing?.account.workspaceId, payout?.account.workspaceId, account?.workspaceId, recovery?.account.workspaceId]) if (workspaceId) ids.add(workspaceId);
  if (!ids.size) return null;
  return { workspaceId: ids.size === 1 ? [...ids][0] : null, reason: ids.size === 1 ? "GYM_LEGACY_RECONCILIATION_REQUIRED" : "GYM_LEGACY_AMBIGUOUS_LINK_REVIEW_REQUIRED" };
}
