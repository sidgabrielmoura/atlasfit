import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { paymentService } from "@/modules/payments/application/payment-service";
import { z } from "zod";
import {
  enforceWalletRateLimit,
  validatePixKey,
  sanitizePayout
} from "@/modules/payments/security/wallet-security";

const payoutSchema = z.object({
  amountInCents: z
    .number()
    .int("O valor deve ser um número inteiro em centavos.")
    .positive("O valor deve ser maior que zero.")
    .min(1000, "O valor mínimo para saque é R$ 10,00 (1000 centavos).")
    .max(10000000, "O valor máximo permitido por transação de saque é R$ 100.000,00."),
  pixKeyType: z.enum(["CPF", "CNPJ", "EMAIL", "PHONE", "EVP"], {
    message: "Tipo de chave Pix inválido. Use CPF, CNPJ, EMAIL, PHONE ou EVP."
  }),
  pixKey: z.string().trim().min(3).max(100),
  idempotencyKey: z
    .string()
    .trim()
    .min(8, "Chave de idempotência deve ter no mínimo 8 caracteres.")
    .max(64, "Chave de idempotência muito longa.")
    .regex(/^[a-zA-Z0-9_-]+$/, "Chave de idempotência contém caracteres inválidos.")
}).strict();

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // 1. Rate Limit Enforcement (Prevenção de força bruta, spam de saques e esgotamento de fundos)
    const rateLimitResult = await enforceWalletRateLimit(req, "WALLET_PAYOUT", session.user.id);
    if (!rateLimitResult.allowed) {
      return rateLimitResult.response;
    }

    // 2. Strict Input Validation
    const body = await req.json();
    const validated = payoutSchema.parse(body);

    // 3. Strict Pix Key Validation
    const pixValidation = validatePixKey(validated.pixKeyType, validated.pixKey);
    if (!pixValidation.isValid) {
      return NextResponse.json({ success: false, error: pixValidation.error }, { status: 400 });
    }

    // 4. Request Payout Execution
    const payout = await paymentService.requestPayout({
      personalUserId: session.user.id,
      amountInCents: BigInt(validated.amountInCents),
      pixKeyType: validated.pixKeyType,
      pixKey: pixValidation.sanitizedKey,
      idempotencyKey: validated.idempotencyKey
    });

    // 5. Output Data Minimization (Ocultar hashes internos e chaves confidenciais)
    const sanitized = sanitizePayout(payout);

    return NextResponse.json({ success: true, payout: sanitized });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      const firstIssue = error.issues[0]?.message || "Dados de saque inválidos.";
      return NextResponse.json({ success: false, error: firstIssue }, { status: 400 });
    }

    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
