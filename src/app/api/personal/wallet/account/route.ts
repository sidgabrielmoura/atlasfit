import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { paymentService } from "@/modules/payments/application/payment-service";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const userId = session.user.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isTestAccount: true }
    });

    const subscription = await prisma.subscription.findUnique({
      where: { userId }
    });

    const isSubscriptionActive = subscription
      ? (subscription.status.toLowerCase() === "active" ||
         (subscription.status.toLowerCase() === "canceled" && subscription.endDate && new Date() < new Date(subscription.endDate)))
      : false;

    const isLocked = !isSubscriptionActive && !user?.isTestAccount;

    const overview = await paymentService.getWalletOverview(userId);
    const sanitizedOverview = overview
      ? JSON.parse(JSON.stringify(overview, (key, value) =>
          typeof value === "bigint" ? value.toString() : value
        ))
      : null;

    const hasValidWallet = !!sanitizedOverview &&
      Boolean(sanitizedOverview.providerAccountId) &&
      sanitizedOverview.status !== "NOT_STARTED";

    return NextResponse.json({
      account: hasValidWallet ? sanitizedOverview : null,
      hasWallet: hasValidWallet,
      isLocked
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
