import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { paymentService } from "@/modules/payments/application/payment-service";
import { z } from "zod";
import { isValidCpfCnpj } from "@/lib/cpf-validator";
import {
  enforceWalletRateLimit,
  sanitizeWalletAccount
} from "@/modules/payments/security/wallet-security";

const onboardingSchema = z.object({
  name: z.string().trim().min(3, "Nome deve ter pelo menos 3 caracteres.").max(120, "Nome muito longo."),
  email: z.string().trim().email("E-mail inválido.").max(100),
  cpfCnpj: z
    .string()
    .transform((val) => val.replace(/\D/g, ""))
    .refine((val) => isValidCpfCnpj(val), {
      message: "CPF ou CNPJ informado é inválido."
    }),
  mobilePhone: z
    .string()
    .transform((val) => val.replace(/\D/g, ""))
    .refine((val) => val.length >= 10 && val.length <= 11, {
      message: "Celular/Telefone deve conter DDD e 8 ou 9 dígitos."
    }),
  postalCode: z
    .string()
    .transform((val) => val.replace(/\D/g, ""))
    .refine((val) => val.length === 8, {
      message: "CEP deve conter exatamente 8 dígitos numéricos."
    }),
  address: z.string().trim().min(3, "Endereço deve ter pelo menos 3 caracteres.").max(200),
  addressNumber: z.string().trim().min(1, "Número do endereço obrigatório.").max(20),
  province: z.string().trim().min(2, "Bairro obrigatório.").max(100),
  companyType: z.enum(["INDIVIDUAL", "MEI", "LIMITED", "ASSOCIATION"]).optional(),
  incomeValue: z.number().positive("Renda/faturamento deve ser positivo.").max(10000000, "Valor acima do limite permitido.").optional(),
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data de nascimento deve estar no formato AAAA-MM-DD.")
    .optional()
}).strict();

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // 1. Rate Limit Enforcement (Prevenção de ataques de força bruta e criação abusiva de contas)
    const rateLimitResult = await enforceWalletRateLimit(req, "WALLET_ONBOARDING", session.user.id);
    if (!rateLimitResult.allowed) {
      return rateLimitResult.response;
    }

    // 2. Input Validation & Strict Sanitization
    const body = await req.json();
    const validated = onboardingSchema.parse(body);

    // 3. Execution via Payment Service
    const account = await paymentService.onboardPersonalAccount({
      personalUserId: session.user.id,
      ...validated
    });

    // 4. Output Sanitization (Nunca expor chaves de API encriptadas ou credenciais de gateway)
    const sanitizedAccount = sanitizeWalletAccount(account);

    return NextResponse.json({ success: true, account: sanitizedAccount });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      const firstIssue = error.issues[0]?.message || "Dados de cadastro inválidos.";
      return NextResponse.json({ success: false, error: firstIssue }, { status: 400 });
    }

    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
