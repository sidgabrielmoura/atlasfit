import { NextRequest, NextResponse } from "next/server";
import { webhookProcessor } from "@/modules/payments/webhooks/webhook-processor";
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
    return NextResponse.json({ success: true, ...result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao processar webhook";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
