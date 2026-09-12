import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
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
      return NextResponse.json({ products: [] });
    }

    const abacate = AbacatePay({ secret: apiKey });

    const [abacateProductsRes, localPlans, localCreditPackages] = await Promise.all([
      abacate.products.list().catch(() => []),
      prisma.plan.findMany({
        select: { id: true, name: true, price: true, imageUrl: true },
      }),
      prisma.creditPackage.findMany({
        select: { id: true, name: true, abacatePayProductId: true, priceInCents: true, imageUrl: true },
      }),
    ]);

    const rawProducts: any[] = Array.isArray(abacateProductsRes)
      ? abacateProductsRes
      : Array.isArray((abacateProductsRes as any)?.data)
      ? (abacateProductsRes as any).data
      : [];

    // Mapas locais para correlação inteligente
    const planById = new Map<string, (typeof localPlans)[number]>(localPlans.map((p) => [p.id, p]));
    const pkgByAbacateId = new Map<string, (typeof localCreditPackages)[number]>(
      localCreditPackages.filter((p) => p.abacatePayProductId).map((p) => [p.abacatePayProductId!, p])
    );
    const pkgById = new Map<string, (typeof localCreditPackages)[number]>(localCreditPackages.map((p) => [p.id, p]));

    const products = rawProducts.map((prod: any) => {
      let linkedType: "PLAN" | "CREDIT_PACKAGE" | "NONE" = "NONE";
      let linkedName: string | null = null;
      let linkedId: string | null = null;
      let localImageUrl: string | null = null;

      const planMatch = (prod.externalId && planById.get(prod.externalId)) || (prod.id && planById.get(prod.id));
      if (planMatch) {
        linkedType = "PLAN";
        linkedName = `Plano: ${planMatch.name}`;
        linkedId = planMatch.id;
        localImageUrl = planMatch.imageUrl;
      } else {
        const pkgMatch = (prod.id && pkgByAbacateId.get(prod.id)) || (prod.externalId && pkgById.get(prod.externalId));
        if (pkgMatch) {
          linkedType = "CREDIT_PACKAGE";
          linkedName = `Pacote: ${pkgMatch.name}`;
          linkedId = pkgMatch.id;
          localImageUrl = pkgMatch.imageUrl;
        }
      }

      return {
        id: prod.id,
        externalId: prod.externalId || null,
        name: prod.name || "Produto Sem Nome",
        priceInCents: typeof prod.price === "number" ? prod.price : 0,
        currency: prod.currency || "BRL",
        status: (prod.status || "ACTIVE").toUpperCase(),
        cycle: prod.cycle || (prod.frequency?.cycle ? prod.frequency.cycle : null),
        imageUrl: prod.imageUrl || prod.image || localImageUrl || null,
        description: prod.description || null,
        devMode: Boolean(prod.devMode),
        createdAt: prod.createdAt || new Date().toISOString(),
        linkedType,
        linkedName,
        linkedId,
      };
    });

    return NextResponse.json({ products });
  } catch (error: any) {
    console.error("Erro ao listar produtos do AbacatePay:", error);
    await logSystemError({ action: "GET_ABACATEPAY_PRODUCTS", error, entity: "ABACATEPAY" });
    return NextResponse.json(
      { error: "Erro interno ao listar produtos do AbacatePay." },
      { status: 500 }
    );
  }
}
