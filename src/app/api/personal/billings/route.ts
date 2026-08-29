import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { paymentService } from "@/modules/payments/application/payment-service";
import { WalletPaymentMethod } from "@prisma/client";
import { z } from "zod";
import {
  enforceWalletRateLimit,
  sanitizeBilling
} from "@/modules/payments/security/wallet-security";

const createBillingSchema = z.object({
  studentUserId: z.string().trim().min(1, "ID do aluno obrigatório.").max(64),
  studentCpfCnpj: z.string().trim().max(18).optional(),
  title: z.string().trim().min(3, "Título deve ter no mínimo 3 caracteres.").max(100, "Título muito longo."),
  description: z.string().trim().max(500, "Descrição muito longa.").optional(),
  amountInCents: z
    .number()
    .int("O valor deve ser um número inteiro em centavos.")
    .positive()
    .min(100, "O valor mínimo para cobrança é R$ 1,00.")
    .max(10000000, "O valor máximo para cobrança é R$ 100.000,00."),
  paymentMethod: z.string().transform((val) => {
    const upper = val.toUpperCase();
    if (upper === "CREDIT_CARD_RECURRING") return WalletPaymentMethod.CREDIT_CARD;
    if (upper === "CREDIT_CARD") return WalletPaymentMethod.CREDIT_CARD;
    return WalletPaymentMethod.PIX;
  }),
  dueDate: z.string().transform((str) => new Date(str)),
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

    // 1. Rate Limit Enforcement
    const rateLimitResult = await enforceWalletRateLimit(req, "WALLET_CREATE_BILLING", session.user.id);
    if (!rateLimitResult.allowed) {
      return rateLimitResult.response;
    }

    // 2. Strict Input Validation
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

    // 3. IDOR Defense: Garantir que o aluno pertence a um workspace do personal trainer autenticado
    const studentMembership = await prisma.workspaceMember.findFirst({
      where: {
        userId: validated.studentUserId,
        role: "STUDENT",
        workspace: {
          ownerId: session.user.id
        }
      }
    });

    if (!studentMembership) {
      return NextResponse.json({
        success: false,
        error: "Acesso negado: o aluno informado não pertence aos seus workspaces."
      }, { status: 403 });
    }

    // 4. Execution
    const cleanStudentCpf = validated.studentCpfCnpj ? validated.studentCpfCnpj.replace(/\D/g, "") : undefined;

    const billing = await paymentService.createStudentBilling({
      personalUserId: session.user.id,
      studentUserId: validated.studentUserId,
      studentCpfCnpj: cleanStudentCpf,
      title: validated.title,
      description: validated.description,
      amountInCents: BigInt(validated.amountInCents),
      paymentMethod: validated.paymentMethod,
      dueDate: validated.dueDate,
      idempotencyKey: validated.idempotencyKey
    });

    // 5. Output Sanitization
    const sanitizedBilling = sanitizeBilling(billing);

    return NextResponse.json({ success: true, billing: sanitizedBilling });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      const firstIssue = error.issues[0]?.message || "Dados de cobrança inválidos.";
      return NextResponse.json({ success: false, error: firstIssue }, { status: 400 });
    }

    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
