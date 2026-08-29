import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { paymentService } from "@/modules/payments/application/payment-service";
import { enforceWalletRateLimit } from "@/modules/payments/security/wallet-security";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // 1. Rate Limit Enforcement (Prevenção de spam de chamadas para API externa do BaaS)
    const rateLimitResult = await enforceWalletRateLimit(req, "WALLET_SYNC", session.user.id);
    if (!rateLimitResult.allowed) {
      return rateLimitResult.response;
    }

    const snapshot = await paymentService.syncAccountBalance(session.user.id);

    // 2. Data Minimization
    const sanitizedSnapshot = {
      id: snapshot.id,
      availableAmountInCents: snapshot.availableAmountInCents?.toString() || "0",
      pendingAmountInCents: snapshot.pendingAmountInCents?.toString() || "0",
      blockedAmountInCents: snapshot.blockedAmountInCents?.toString() || "0",
      capturedAt: snapshot.capturedAt instanceof Date ? snapshot.capturedAt.toISOString() : snapshot.capturedAt
    };

    return NextResponse.json({ success: true, snapshot: sanitizedSnapshot });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
