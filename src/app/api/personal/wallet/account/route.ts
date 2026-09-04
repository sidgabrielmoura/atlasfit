import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { paymentService } from "@/modules/payments/application/payment-service";
import {
  enforceWalletRateLimit,
  sanitizeWalletAccount
} from "@/modules/payments/security/wallet-security";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // 1. Rate Limit Enforcement
    const rateLimitResult = await enforceWalletRateLimit(req, "WALLET_ACCOUNT_READ", session.user.id);
    if (!rateLimitResult.allowed) {
      return rateLimitResult.response;
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

    let overview = await paymentService.getWalletOverview(userId);

    if (!overview) {
      overview = await paymentService.healOrphanedAccountIfAny(userId);
    }

    const hasValidWallet = !!overview &&
      Boolean(overview.providerAccountId) &&
      overview.status !== "NOT_STARTED";

    // 2. Data Minimization: sanitize and strip sensitive credentials before returning
    const sanitizedAccount = hasValidWallet ? sanitizeWalletAccount(overview) : null;

    return NextResponse.json({
      account: sanitizedAccount,
      hasWallet: hasValidWallet,
      isLocked
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
