import { timingSafeEqual } from "node:crypto";
import { assertCreditPaymentAmount, settleCreditPurchase } from "@/modules/payments/abacate-confirmation";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { headers } from "next/headers";

export async function POST(req: Request) {
  try {
    const headersList = await headers();
    const devToken = headersList.get("x-dev-token") || headersList.get("authorization");
    const expectedToken = process.env.ABACATEPAY_WEBHOOK_TOKEN || process.env.ABACATEPAY_API_KEY;

    const received = Buffer.from((devToken || "").replace(/^Bearer /, ""));
    const expected = Buffer.from(expectedToken || "");
    if (!expected.length || received.length !== expected.length || !timingSafeEqual(received, expected)) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    if (body.devMode === true && process.env.NODE_ENV === "production") return new NextResponse("Test payment rejected", { status: 422 });
    const event = body?.event;
    const billing = body?.data || body;

    if (event !== "billing.paid" && billing?.status !== "PAID") {
      return NextResponse.json({ received: true });
    }

    const billingId = billing?.id as string | undefined;
    const metadata = billing?.metadata as Record<string, string> | undefined;

    if (!billingId && !metadata?.workspaceId && !metadata?.userId) {
      return NextResponse.json({ received: true });
    }

    const purchase = billingId
      ? await prisma.creditPurchase.findUnique({ where: { abacatePayBillingId: billingId } })
      : billing?.externalId ? await prisma.creditPurchase.findUnique({ where: { id: billing.externalId } }) : null;

    if (!purchase) {
      return NextResponse.json({ received: true });
    }

    if (purchase.status === "PAID") {
      return NextResponse.json({ received: true });
    }

    try { assertCreditPaymentAmount(purchase, billing.payment || billing); }
    catch { return new NextResponse("Payment amount mismatch", { status: 409 }); }
    await settleCreditPurchase(purchase.id);

    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json({ received: true });
  }
}
