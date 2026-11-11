import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getOrCreatePersonalPlanCharge,
  checkAndConfirmPersonalCharge,
  getActivePersonalCharge,
} from "@/lib/asaas-personal-billing";
import { logSystemError } from "@/lib/logger";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Sessão não autenticada." }, { status: 401 });
    }

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const result = await getOrCreatePersonalPlanCharge(session.user.id, body?.cpf);
    return NextResponse.json(result);
  } catch (error: any) {
    await logSystemError({
      action: "API_ASAAS_PERSONAL_CHARGE_POST",
      error: error?.message || error,
      entity: "SUBSCRIPTION",
    });

    const isCpfError =
      error?.code === "CPF_REQUIRED" ||
      error?.code === "INVALID_CPF" ||
      /cpf|cnpj/i.test(error?.message || "");

    return NextResponse.json(
      {
        error: error?.message || "Não foi possível gerar a cobrança no momento.",
        code: error?.code || (isCpfError ? "CPF_REQUIRED" : undefined),
      },
      { status: 400 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Sessão não autenticada." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const fetchActive = searchParams.get("active") === "true";

    if (fetchActive) {
      const active = await getActivePersonalCharge(session.user.id);
      return NextResponse.json({ activeCharge: active });
    }

    const transactionId = searchParams.get("transactionId") || undefined;
    const result = await checkAndConfirmPersonalCharge(session.user.id, transactionId);
    return NextResponse.json(result);
  } catch (error: any) {
    await logSystemError({
      action: "API_ASAAS_PERSONAL_CHARGE_GET",
      error: error?.message || error,
      entity: "SUBSCRIPTION",
    });
    return NextResponse.json(
      { error: error?.message || "Não foi possível verificar o pagamento." },
      { status: 400 }
    );
  }
}
