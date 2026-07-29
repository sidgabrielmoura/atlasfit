import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { AbacatePay } from "@/lib/abacatepay";

async function requireSuperAdmin() {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "SUPERADMIN") return null;
  return session;
}

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSuperAdmin();
  if (!session) return new NextResponse("Não autorizado.", { status: 401 });

  const { id } = await params;

  try {
    const pkg = await prisma.creditPackage.findUnique({ where: { id } });
    if (!pkg) return new NextResponse("Pacote não encontrado.", { status: 404 });

    const apiKey = process.env.ABACATEPAY_API_KEY;
    if (!apiKey || apiKey === "abc_dev_placeholder") {
      return NextResponse.json({ error: "Chave de API do AbacatePay não configurada." }, { status: 400 });
    }

    const abacatePay = AbacatePay({ secret: apiKey });
    let abacatePayProductId = pkg.abacatePayProductId;

    if (abacatePayProductId) {
      try {
        await abacatePay.products.update(abacatePayProductId, {
          name: pkg.name,
          description: pkg.description || `${pkg.credits} créditos de importação AtlasFit`,
          price: pkg.priceInCents,
        });
      } catch (err: any) {
        if (err.message?.includes("Not found") || err.message?.includes("400") || err.message?.includes("404")) {
          abacatePayProductId = null;
        } else {
          throw err;
        }
      }
    }

    if (!abacatePayProductId) {
      const listRes = await abacatePay.products.list().catch(() => null);
      let products: any[] = [];
      if (Array.isArray(listRes)) {
        products = listRes;
      } else if (listRes && typeof listRes === "object") {
        if (Array.isArray((listRes as any).data)) products = (listRes as any).data;
        else if (Array.isArray((listRes as any).products)) products = (listRes as any).products;
      }

      const existing = products.find((p: any) => p.externalId === pkg.id);
      if (existing) {
        abacatePayProductId = existing.id;
        await prisma.creditPackage.update({
          where: { id },
          data: { abacatePayProductId },
        });
      } else {
        const product = await abacatePay.products.create({
          externalId: pkg.id,
          name: pkg.name,
          price: pkg.priceInCents,
          currency: "BRL",
          description: pkg.description || `${pkg.credits} créditos de importação AtlasFit`,
        });
        abacatePayProductId = product.id;
        await prisma.creditPackage.update({
          where: { id },
          data: { abacatePayProductId },
        });
      }
    }

    return NextResponse.json({ synced: true, abacatePayProductId });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Erro ao sincronizar com AbacatePay." },
      { status: 500 }
    );
  }
}
