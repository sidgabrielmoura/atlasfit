import { withAuditedRequest } from "@/lib/audited-request";
import { NextResponse } from "next/server";
import { z } from "zod";
import { serializableTransaction } from "@/modules/workspaces/application/transaction";
import { assertGymFinanceAuthority } from "@/modules/workspaces/application/manual-finance-authority";
import { requireGymWorkspaceAccess as requireWorkspaceAccess, handleWorkspaceAccessError } from "@/modules/workspaces/application/guard";

/** Read-only local inventory. No provider polling, balance synchronization or financial command. */
export const GET = withAuditedRequest(async function GET(req: Request) {
  try {
    const parsed = z.object({ workspaceId: z.string().trim().min(1).max(100) }).strict().safeParse(Object.fromEntries(new URL(req.url).searchParams));
    if (!parsed.success) return NextResponse.json({ error: { code: "INVALID_REQUEST", message: "Academia obrigatória." } }, { status: 400 });
    const context = await requireWorkspaceAccess({ workspaceId: parsed.data.workspaceId });
    const data = await serializableTransaction(async tx => {
    await assertGymFinanceAuthority(tx, context.workspaceId, context.userId, "reports.finance");
    const account = await tx.paymentProviderAccount.findUnique({
      where: { workspaceId: context.workspaceId },
      select: { id: true, provider: true, environment: true, status: true, lastProviderSyncAt: true, _count: { select: { billings: true, payouts: true, ledgerEntries: true } }, balanceSnapshots: { orderBy: { capturedAt: "desc" }, take: 1, select: { availableAmountInCents: true, pendingAmountInCents: true, capturedAt: true } } },
    });
    const subscriptions = await tx.gymEnrollment.findMany({ where: { workspaceId: context.workspaceId, providerSubscriptionId: { not: null } }, select: { id: true, status: true, subscriptionStatus: true, recurrenceMode: true, nextDueDate: true }, take: 100, orderBy: [{ createdAt: "desc" }, { id: "desc" }] });
    const [pendingEvents, pendingEventCount] = await Promise.all([
      tx.paymentWebhookEvent.findMany({ where: { gymWorkspaceId: context.workspaceId, processingStatus: "REVIEW_REQUIRED" }, select: { id: true, eventType: true, receivedAt: true, processingStatus: true }, take: 100, orderBy: [{ receivedAt: "desc" }, { id: "desc" }] }),
      tx.paymentWebhookEvent.count({ where: { gymWorkspaceId: context.workspaceId, processingStatus: "REVIEW_REQUIRED" } }),
    ]);
    return { mode: "LEGACY_READ_ONLY", account: account ? { ...account, balanceSnapshots: account.balanceSnapshots.map((snapshot) => ({ ...snapshot, availableAmountInCents: snapshot.availableAmountInCents.toString(), pendingAmountInCents: snapshot.pendingAmountInCents.toString() })) } : null, subscriptions, pendingEvents, pendingEventCount, externalStateVerified: false, requiresProviderReconciliation: Boolean(account || subscriptions.length || pendingEventCount), nextStep: "Revisar pendências externas com o administrador; nenhuma operação externa foi cancelada automaticamente." };
    });
    return NextResponse.json({ data });
  } catch (error) { return handleWorkspaceAccessError(error) || NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Não foi possível consultar o histórico legado." } }, { status: 500 }); }
});
