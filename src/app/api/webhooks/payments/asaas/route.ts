import { NextRequest, NextResponse } from "next/server";
import { webhookProcessor, WebhookIngressError } from "@/modules/payments/webhooks/webhook-processor";
import { enforceWalletRateLimit } from "@/modules/payments/security/wallet-security";

export async function POST(req: NextRequest) {
  try {
    // 1. Rate Limit Enforcement (Proteção contra flooding e DDoS no endpoint de webhook)
    const rateLimitResult = await enforceWalletRateLimit(req, "WEBHOOK_INGRESS");
    if (!rateLimitResult.allowed) {
      return rateLimitResult.response;
    }

    const rawBody = await req.text();
    const headersObj: Record<string, string> = {};
    req.headers.forEach((val, key) => {
      headersObj[key.toLowerCase()] = val;
    });

    const result = await webhookProcessor.receiveWebhook(headersObj, rawBody);
    const accepted = ["PROCESSED", "DUPLICATE", "REVIEW_REQUIRED"].includes(result.status);
    return NextResponse.json({ success: accepted, ...result }, { status: accepted ? 200 : 503 });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: error instanceof WebhookIngressError ? error.message : "Recepção do evento indisponível." }, { status: error instanceof WebhookIngressError ? error.statusCode : 503 });
  }
}
