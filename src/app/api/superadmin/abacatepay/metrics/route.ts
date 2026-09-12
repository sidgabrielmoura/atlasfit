import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { AbacatePay } from "@/lib/abacatepay";
import { logSystemError } from "@/lib/logger";

export async function GET() {
  try {
    const session = await auth();
    if (session?.user?.role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Acesso restrito a SuperAdmin" }, { status: 403 });
    }

    const apiKey = process.env.ABACATEPAY_API_KEY;
    if (!apiKey || apiKey === "abc_dev_placeholder") {
      return NextResponse.json({
        configured: false,
        environment: "not_configured",
        store: {
          id: "",
          name: "AbacatePay (Não Configurado)",
          balance: { available: 0, pending: 0, blocked: 0 },
        },
        mrr: { mrr: 0, totalActiveSubscriptions: 0 },
        revenue: { totalRevenue: 0, totalTransactions: 0, transactionsPerDay: {} },
        merchant: { name: "", website: "", createdAt: "" },
      });
    }

    const isDev = apiKey.startsWith("abc_dev_");
    const abacate = AbacatePay({ secret: apiKey });

    const now = new Date();
    const endDate = now.toISOString().split("T")[0];
    const startDate = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];

    // Busca métricas com tratamento resiliente e paralelo (sub-segundo)
    const [storeResult, mrrResult, revenueResult, merchantResult] = await Promise.allSettled([
      abacate.store.get(),
      abacate.mrr.get(),
      abacate.mrr.revenue({ startDate, endDate }),
      abacate.mrr.merchant(),
    ]);

    const store = storeResult.status === "fulfilled" && storeResult.value
      ? storeResult.value
      : { id: "abacate_store", name: "AtlasFit Store", balance: { available: 0, pending: 0, blocked: 0 } };

    const mrr = mrrResult.status === "fulfilled" && mrrResult.value
      ? mrrResult.value
      : { mrr: 0, totalActiveSubscriptions: 0 };

    const revenue = revenueResult.status === "fulfilled" && revenueResult.value
      ? revenueResult.value
      : { totalRevenue: 0, totalTransactions: 0, transactionsPerDay: {} };

    const merchant = merchantResult.status === "fulfilled" && merchantResult.value
      ? merchantResult.value
      : { name: store.name || "AtlasFit", website: "https://app.atlasfit.site", createdAt: new Date().toISOString() };

    return NextResponse.json({
      configured: true,
      environment: isDev ? "development" : "production",
      store,
      mrr,
      revenue,
      merchant,
    });
  } catch (error: any) {
    console.error("Erro ao carregar métricas AbacatePay:", error);
    await logSystemError({ action: "GET_ABACATEPAY_METRICS", error, entity: "ABACATEPAY" });
    return NextResponse.json(
      { error: "Erro interno ao carregar métricas do AbacatePay." },
      { status: 500 }
    );
  }
}
