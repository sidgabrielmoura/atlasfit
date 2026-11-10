import prisma from "@/lib/prisma";
import { claimAbacateEvent } from "./abacate-confirmation";
import { serializableTransaction } from "@/modules/workspaces/application/transaction";

function nextPeriod(start: Date, annual: boolean) {
  const end = new Date(start), day = end.getUTCDate();
  end.setUTCDate(1); end.setUTCMonth(end.getUTCMonth() + (annual ? 12 : 1));
  const last = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 0)).getUTCDate();
  end.setUTCDate(Math.min(day, last)); return end;
}
/** Returns null only for events unrelated to an organizational license. */
export async function processGymPlatformWebhook(payload: Record<string, any>, target: Record<string, any>, subscriptionId?: string, customerId?: string) {
  const externalId = target.externalId || payload.data?.checkout?.externalId;
  const checkoutId = target.checkoutId || payload.data?.checkout?.id || (String(payload.event).startsWith("checkout.") ? target.id : undefined);
  const candidates = externalId || checkoutId ? await prisma.transaction.findMany({ where: { OR: [...(externalId ? [{ id: externalId }] : []), ...(checkoutId ? [{ providerCheckoutId: checkoutId }] : [])] }, take: 2 }) : [];
  if (candidates.length > 1) throw new Error("GYM_ORDER_IDENTITY_CONFLICT");
  const order = candidates[0];
  const license = subscriptionId ? await prisma.workspaceSubscription.findUnique({ where: { externalSubscriptionId: subscriptionId } }) : null;
  const workspace = order?.workspaceId ? await prisma.workspace.findUnique({ where: { id: order.workspaceId }, select: { id: true, type: true } }) : null;
  const metadata = target.metadata || payload.data?.subscription?.metadata || {};
  if (workspace?.type !== "GYM" && !license) {
    if (metadata.purpose === "GYM_SUBSCRIPTION") throw new Error("GYM_ORDER_NOT_AVAILABLE");
    return null;
  }
  const workspaceId = license?.workspaceId || workspace!.id;
  if (workspace && workspace.id !== workspaceId) throw new Error("GYM_ORDER_WORKSPACE_MISMATCH");
  if (metadata.workspaceId && metadata.workspaceId !== workspaceId) throw new Error("GYM_ORDER_WORKSPACE_MISMATCH");
  if (order && metadata.userId && order.userId !== metadata.userId) throw new Error("GYM_ORDER_OWNER_MISMATCH");
  if (payload.devMode === true && process.env.NODE_ENV === "production") throw new Error("GYM_TEST_PAYMENT_IN_PRODUCTION");
  const event = String(payload.event);
  const activation = ["checkout.completed", "billing.paid", "subscription.completed"].includes(event);
  const renewal = event === "subscription.renewed";
  if (renewal && !payload.data?.payment?.id && !payload.data?.billing?.id) throw new Error("GYM_PAYMENT_ID_REQUIRED");
  const cancellation = event === "subscription.cancelled";
  const failure = ["subscription.payment_failed", "billing.failed", "charge.failed"].includes(event);
  const reversal = ["checkout.refunded", "checkout.disputed", "checkout.lost"].includes(event);
  if (!activation && !renewal && !cancellation && !failure && !reversal) return { handled: true, ignored: true };
  const identifiedOrder = order;
  return serializableTransaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "Workspace" WHERE id=${workspaceId} FOR UPDATE`;
    if (!await claimAbacateEvent(tx, payload)) return { handled: true, duplicate: true };
    const order = identifiedOrder ? await tx.transaction.findUniqueOrThrow({ where: { id: identifiedOrder.id } }) : null;
    if (order && order.workspaceId !== workspaceId) throw new Error("GYM_ORDER_WORKSPACE_MISMATCH");
    const current = await tx.workspaceSubscription.findUnique({ where: { workspaceId } });
    const planId = activation ? order?.platformPlanId : current?.planId;
    if (!planId) throw new Error("GYM_ORDER_RECONCILIATION_REQUIRED");
    const plan = await tx.plan.findUnique({ where: { id: planId } });
    if (!plan || plan.type !== "GYM" || (plan.customWorkspaceId && plan.customWorkspaceId !== workspaceId)) throw new Error("GYM_PLAN_MISMATCH");
    if (metadata.planId && metadata.planId !== planId) throw new Error("GYM_ORDER_PLAN_MISMATCH");
    if (activation || renewal) {
      if (event === "checkout.completed" && target.status !== "PAID") throw new Error("GYM_CHECKOUT_NOT_PAID");
      if (activation && !order) throw new Error("GYM_ORDER_REQUIRED");
      if (activation && order!.status === "APPROVED") {
        if (current?.platformOrderId === order!.id && subscriptionId && !current.externalSubscriptionId) await tx.workspaceSubscription.update({ where: { workspaceId }, data: { externalSubscriptionId: subscriptionId, externalCustomerId: customerId } });
        return { handled: true, duplicate: true };
      }
      if (renewal && (!current?.externalSubscriptionId || current.externalSubscriptionId !== subscriptionId)) throw new Error("GYM_SUBSCRIPTION_MISMATCH");
      const amount = payload.data?.payment?.amount ?? payload.data?.billing?.amount ?? target.amount ?? target.totalAmount;
      const expected = activation ? order!.expectedAmountInCents : current?.priceInCents;
      if (!Number.isSafeInteger(amount) || !Number.isSafeInteger(expected) || amount !== expected || (target.currency && target.currency !== "BRL")) throw new Error("GYM_PAYMENT_AMOUNT_MISMATCH");
      const now = new Date();
      const start = renewal && current?.endDate && current.endDate > now ? current.endDate : now;
      const endDate = nextPeriod(start, plan.interval === "year");
      const values = { planId, status: "ACTIVE" as const, endDate, nextDueDate: endDate,
        ...(activation ? { platformOrderId: order!.id } : {}),
        priceInCents: expected, periodicity: plan.interval === "year" ? "ANUAL" : "MENSAL",
        maxStudents: plan.maxStudents ?? 500, maxStaff: plan.maxStaff ?? 30, maxUnits: plan.maxWorkspaces ?? 1, storageLimitMb: plan.storageLimitMb,
        ...(subscriptionId ? { externalSubscriptionId: subscriptionId } : {}), ...(customerId ? { externalCustomerId: customerId } : {}) };
      await tx.workspaceSubscription.upsert({ where: { workspaceId }, create: { ...values, workspaceId, startDate: now }, update: values });
      if (activation) await tx.transaction.update({ where: { id: order!.id }, data: { status: "APPROVED", paymentMethod: target.method || target.paymentMethod || "PIX" } });
      else await tx.transaction.create({ data: { workspaceId, userId: order?.userId || (await tx.workspace.findUniqueOrThrow({ where: { id: workspaceId }, select: { ownerId: true } })).ownerId, platformPlanId: planId, expectedAmountInCents: amount, amount: amount / 100, status: "APPROVED", description: "Renovação da licença da academia" } });
    } else {
      // An old subscription cannot cancel or suspend its replacement.
      if (subscriptionId && current?.externalSubscriptionId && current.externalSubscriptionId !== subscriptionId) throw new Error("GYM_SUBSCRIPTION_MISMATCH");
      if (reversal && order && current?.platformOrderId !== order.id) {
        await tx.transaction.update({ where: { id: order.id }, data: { status: "REFUNDED" } });
        return { handled: true, historicalOrder: true };
      }
      if (cancellation && (!subscriptionId || current?.externalSubscriptionId !== subscriptionId)) throw new Error("GYM_SUBSCRIPTION_MISMATCH");
      if (failure && order?.status === "PENDING") await tx.transaction.update({ where: { id: order.id }, data: { status: "FAILED" } });
      // A failed new proposal does not suspend an already valid license.
      if (current && (!failure || subscriptionId === current.externalSubscriptionId)) await tx.workspaceSubscription.update({ where: { workspaceId }, data: { status: cancellation ? "CANCELED" : "PAST_DUE" } });
      if (reversal && order) await tx.transaction.update({ where: { id: order.id }, data: { status: "REFUNDED" } });
    }
    await tx.auditLog.create({ data: { userId: order?.userId, entity: "WORKSPACE", entityId: workspaceId, action: `GYM_PLATFORM_${event}`, severity: "info" } });
    return { handled: true };
  });
}
