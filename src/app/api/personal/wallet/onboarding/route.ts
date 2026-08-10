import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { paymentService } from "@/modules/payments/application/payment-service";
import { z } from "zod";

const onboardingSchema = z.object({
  name: z.string().min(3),
  email: z.string().email(),
  cpfCnpj: z.string().min(11),
  mobilePhone: z.string().min(10),
  postalCode: z.string().min(8),
  address: z.string().min(3),
  addressNumber: z.string().min(1),
  province: z.string().min(2),
  companyType: z.string().optional(),
  incomeValue: z.number().optional(),
  birthDate: z.string().optional()
});

export async function POST(req: NextRequest) {
  try {
    console.log("[ASAAS_DEBUG_KEY]", JSON.stringify(process.env.ASAAS_API_KEY));
    console.log("[ASAAS_DEBUG_ENV]", process.env.ASAAS_ENVIRONMENT);

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const validated = onboardingSchema.parse(body);

    const account = await paymentService.onboardPersonalAccount({
      personalUserId: session.user.id,
      ...validated
    });

    return NextResponse.json({ success: true, account });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[WALLET_ONBOARDING_ERROR]", message);
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
