import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { paymentService } from "@/modules/payments/application/payment-service";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    await paymentService.resendAccountActivationEmail(session.user.id);

    return NextResponse.json({ success: true, message: "E-mail de ativação reenviado com sucesso!" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
