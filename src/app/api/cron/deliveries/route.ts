import { recordCronResult, recordCronFailure } from "@/lib/cron-health";
import { isCronAuthorized } from "@/lib/cron-authorization";
import { NextResponse } from "next/server";
import { processDeliveryBatch } from "@/lib/delivery/outbox";
import { deliveryHandler } from "@/lib/delivery/worker";
import { webhookProcessor } from "@/modules/payments/webhooks/webhook-processor";
import { retainWebhookReceipts } from "@/modules/payments/webhooks/webhook-retention";

export const runtime = "nodejs";
export async function GET(request: Request) {
  if (!isCronAuthorized(request)) return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  const started = Date.now();
  try {
    const webhooks = await webhookProcessor.processRetryBatch();
    const deliveries = await processDeliveryBatch(deliveryHandler);
    const retention = await retainWebhookReceipts();
    const failed = webhooks.results.some(result => ["FAILED_RETRYABLE", "REPLAY_UNAVAILABLE", "REVIEW_REQUIRED"].includes(result.status)) || deliveries.results.some(result => ["RETRY", "REVIEW_REQUIRED"].includes(result.status));
    const result = { success: !failed, durationMs: Date.now() - started, webhooks, deliveries, retention };
    console.info("[DELIVERY_CRON]", { success: result.success, durationMs: result.durationMs, webhooks: webhooks.results.length, deliveries: deliveries.results.length });
    await recordCronResult("deliveries", !failed, Date.now() - started);
    return NextResponse.json(result, { status: failed ? 503 : 200 });
  } catch {
    await recordCronFailure("deliveries");
    console.error("[DELIVERY_CRON]", { code: "PROCESSING_UNAVAILABLE", durationMs: Date.now() - started });
    return NextResponse.json({ success: false, error: { code: "PROCESSING_UNAVAILABLE" } }, { status: 503 });
  }
}
