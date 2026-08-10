import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { AsaasAdapter } from "@/modules/payments/providers/asaas/asaas-adapter";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
    }

    const customers = await prisma.gatewayCustomer.findMany({
      take: 100,
      orderBy: { createdAt: "asc" }
    });

    const adapter = new AsaasAdapter();
    let successCount = 0;
    let failedCount = 0;

    for (const cust of customers) {
      try {
        const account = await prisma.paymentProviderAccount.findFirst({
          where: { personalUserId: cust.personalUserId }
        });

        if (!account?.providerAccountId) {
          failedCount++;
          continue;
        }

        const res = await fetch(`https://${process.env.ASAAS_ENVIRONMENT === "production" ? "www" : "sandbox"}.asaas.com/api/v3/customers/${cust.providerCustomerId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "access_token": (process.env.ASAAS_API_KEY || "").trim(),
            "asaas-account": account.providerAccountId,
            "User-Agent": "AtlasFit/1.0"
          },
          body: JSON.stringify({ notificationDisabled: true })
        });

        if (res.ok) {
          successCount++;
        } else {
          failedCount++;
        }
      } catch {
        failedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      processedCount: customers.length,
      successCount,
      failedCount
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro ao desabilitar mensageria";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
