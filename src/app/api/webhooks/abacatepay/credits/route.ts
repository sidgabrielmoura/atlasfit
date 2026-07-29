import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { headers } from "next/headers";

export async function POST(req: Request) {
  try {
    const headersList = await headers();
    const devToken = headersList.get("x-dev-token") || headersList.get("authorization");
    const expectedToken = process.env.ABACATEPAY_WEBHOOK_TOKEN || process.env.ABACATEPAY_API_KEY;

    if (!devToken || !expectedToken || !devToken.includes(expectedToken.slice(0, 20))) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
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
      : null;

    if (!purchase && metadata?.userId && metadata?.packageId) {
      const pkg = await prisma.creditPackage.findUnique({ where: { id: metadata.packageId } });
      if (!pkg) return NextResponse.json({ received: true });

      const existing = await prisma.creditPurchase.findFirst({
        where: {
          userId: metadata.userId,
          packageId: metadata.packageId,
          status: "PAID",
          paidAt: { gte: new Date(Date.now() - 60_000) },
        },
      });
      if (existing) return NextResponse.json({ received: true });

      await prisma.$transaction([
        prisma.user.update({
          where: { id: metadata.userId },
          data: { importCredits: { increment: pkg.credits } },
        }),
        prisma.creditPurchase.create({
          data: {
            workspaceId: metadata.workspaceId || "",
            packageId: metadata.packageId,
            userId: metadata.userId,
            amountInCents: pkg.priceInCents,
            credits: pkg.credits,
            status: "PAID",
            abacatePayBillingId: billingId,
            paidAt: new Date(),
          },
        }),
      ]);

      return NextResponse.json({ received: true });
    }

    if (!purchase) {
      return NextResponse.json({ received: true });
    }

    if (purchase.status === "PAID") {
      return NextResponse.json({ received: true });
    }

    await prisma.$transaction([
      prisma.creditPurchase.update({
        where: { id: purchase.id },
        data: { status: "PAID", paidAt: new Date() },
      }),
      prisma.user.update({
        where: { id: purchase.userId },
        data: { importCredits: { increment: purchase.credits } },
      }),
    ]);

    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json({ received: true });
  }
}
