import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { paymentService } from "@/modules/payments/application/payment-service";
import { WalletPaymentMethod } from "@prisma/client";
import { z } from "zod";

const createBillingSchema = z.object({
  studentUserId: z.string().min(1),
  studentCpfCnpj: z.string().optional(),
  title: z.string().min(3),
  description: z.string().optional(),
  amountInCents: z.number().positive().min(100, "O valor mínimo para cobrança é R$ 1,00.").max(10000000, "O valor máximo para cobrança é R$ 100.000,00."),
  paymentMethod: z.string().transform((val) => {
    if (val === "CREDIT_CARD_RECURRING") return WalletPaymentMethod.CREDIT_CARD;
    return val as WalletPaymentMethod;
  }),
  dueDate: z.string().transform((str) => new Date(str)),
  idempotencyKey: z.string().min(8)
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const validated = createBillingSchema.parse(body);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const maxFuture = new Date();
    maxFuture.setDate(maxFuture.getDate() + 365);
    maxFuture.setHours(23, 59, 59, 999);

    const dueDateObj = new Date(validated.dueDate);
    if (dueDateObj < today) {
      return NextResponse.json({ success: false, error: "A data de vencimento não pode ser no passado." }, { status: 400 });
    }

    if (dueDateObj > maxFuture) {
      return NextResponse.json({ success: false, error: "A data de vencimento não pode ser superior a 1 ano." }, { status: 400 });
    }

    const billing = await paymentService.createStudentBilling({
      personalUserId: session.user.id,
      studentUserId: validated.studentUserId,
      studentCpfCnpj: validated.studentCpfCnpj,
      title: validated.title,
      description: validated.description,
      amountInCents: BigInt(validated.amountInCents),
      paymentMethod: validated.paymentMethod,
      dueDate: validated.dueDate,
      idempotencyKey: validated.idempotencyKey
    });

    const sanitizedBilling = JSON.parse(JSON.stringify(billing, (key, value) =>
      typeof value === "bigint" ? value.toString() : value
    ));

    return NextResponse.json({ success: true, billing: sanitizedBilling });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
