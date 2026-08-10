import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { encryptSubAccountApiKey } from "@/modules/payments/providers/asaas/subaccount-crypto";

const ASAAS_BASE = () => {
  const env = process.env.ASAAS_ENVIRONMENT || "sandbox";
  return env === "production"
    ? "https://www.asaas.com/api/v3"
    : "https://sandbox.asaas.com/api/v3";
};

async function generateSubAccountApiKey(providerAccountId: string): Promise<string> {
  const res = await fetch(`${ASAAS_BASE()}/accounts/${providerAccountId}/accessTokens`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "access_token": (process.env.ASAAS_API_KEY || "").trim(),
      "User-Agent": "AtlasFit/1.0"
    }
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Asaas /accessTokens retornou ${res.status}: ${text}`);
  }

  const data = await res.json();
  if (!data.apiKey) {
    throw new Error("Resposta da Asaas não contém apiKey");
  }
  return data.apiKey as string;
}

export async function POST() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Acesso restrito a SuperAdmin" }, { status: 403 });
  }

  const accounts = await prisma.paymentProviderAccount.findMany({
    where: {
      providerApiKeyEncrypted: null,
      providerAccountId: { not: "" }
    },
    select: {
      id: true,
      providerAccountId: true
    }
  });

  const results: Array<{ id: string; action: string; error?: string }> = [];

  for (const account of accounts) {
    try {
      const rawKey = await generateSubAccountApiKey(account.providerAccountId);
      const { encrypted, keyVersion } = encryptSubAccountApiKey(rawKey);

      await prisma.paymentProviderAccount.update({
        where: { id: account.id },
        data: {
          providerApiKeyEncrypted: encrypted,
          providerApiKeyKeyVersion: keyVersion
        }
      });

      results.push({ id: account.id, action: "provisioned" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      results.push({ id: account.id, action: "error", error: msg });
    }
  }

  return NextResponse.json({ total: accounts.length, results });
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Acesso restrito a SuperAdmin" }, { status: 403 });
  }

  const body = await req.json() as { providerAccountDbId?: string };
  if (!body.providerAccountDbId) {
    return NextResponse.json({ error: "providerAccountDbId obrigatório" }, { status: 400 });
  }

  const account = await prisma.paymentProviderAccount.findUnique({
    where: { id: body.providerAccountDbId }
  });

  if (!account) {
    return NextResponse.json({ error: "Conta não encontrada" }, { status: 404 });
  }

  try {
    const rawKey = await generateSubAccountApiKey(account.providerAccountId);
    const { encrypted, keyVersion } = encryptSubAccountApiKey(rawKey);

    await prisma.paymentProviderAccount.update({
      where: { id: account.id },
      data: {
        providerApiKeyEncrypted: encrypted,
        providerApiKeyKeyVersion: keyVersion
      }
    });

    return NextResponse.json({ id: account.id, action: "rotated" });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
