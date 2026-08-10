import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { paymentService } from "@/modules/payments/application/payment-service";
import { z } from "zod";

const payoutSchema = z.object({
  amountInCents: z.number().positive(),
  pixKeyType: z.string().min(2),
  pixKey: z.string().min(3),
  idempotencyKey: z.string().min(8)
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const validated = payoutSchema.parse(body);

    const payout = await paymentService.requestPayout({
      personalUserId: session.user.id,
      amountInCents: BigInt(validated.amountInCents),
      pixKeyType: validated.pixKeyType,
      pixKey: validated.pixKey,
      idempotencyKey: validated.idempotencyKey
    });

    const sanitizedPayout = JSON.parse(JSON.stringify(payout, (key, value) =>
      typeof value === "bigint" ? value.toString() : value
    ));

    return NextResponse.json({ success: true, payout: sanitizedPayout });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
