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

    // 1. Rate Limit Enforcement (Prevenção de spam de disparo de e-mails)
    const rateLimitResult = await enforceWalletRateLimit(req, "WALLET_RESEND_ACTIVATION", session.user.id);
    if (!rateLimitResult.allowed) {
      return rateLimitResult.response;
    }

    await paymentService.resendAccountActivationEmail(session.user.id);

    return NextResponse.json({ success: true, message: "E-mail de ativação reenviado com sucesso!" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
