import { NextRequest, NextResponse } from "next/server";
import { webhookProcessor } from "@/modules/payments/webhooks/webhook-processor";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const headersObj: Record<string, string> = {};
    req.headers.forEach((val, key) => {
      headersObj[key] = val;
    });

    const result = await webhookProcessor.receiveWebhook(headersObj, rawBody);
    return NextResponse.json({ success: true, ...result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
