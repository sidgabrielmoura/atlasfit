import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { AbacatePay } from "@/lib/abacatepay";
import { randomUUID } from "crypto";

async function getOrCreateAbacateProduct(abacatePay: any, pkg: any) {
  if (pkg.abacatePayProductId) {
    return pkg.abacatePayProductId;
  }

  const findInList = async () => {
    try {
      const listRes = await abacatePay.products.list({ limit: 100 });
      let products: any[] = [];
      if (Array.isArray(listRes)) {
        products = listRes;
      } else if (listRes && typeof listRes === "object") {
        if (Array.isArray(listRes.data)) products = listRes.data;
        else if (Array.isArray(listRes.products)) products = listRes.products;
      }
      return products.find((p: any) => p.externalId === pkg.id || p.name === pkg.name);
    } catch {
      return null;
    }
  };

  const existingInList = await findInList();
  if (existingInList) {
    await prisma.creditPackage.update({
      where: { id: pkg.id },
      data: { abacatePayProductId: existingInList.id },
    });
    return existingInList.id;
  }

  try {
    const newProduct = await abacatePay.products.create({
      externalId: pkg.id,
      name: pkg.name,
      price: pkg.priceInCents,
      currency: "BRL",
      description: pkg.description || `${pkg.credits} créditos de importação AtlasFit`,
    });
    await prisma.creditPackage.update({
      where: { id: pkg.id },
      data: { abacatePayProductId: newProduct.id },
    });
    return newProduct.id;
  } catch (createErr: any) {
    const fallbackExisting = await findInList();
    if (fallbackExisting) {
      await prisma.creditPackage.update({
        where: { id: pkg.id },
        data: { abacatePayProductId: fallbackExisting.id },
      });
      return fallbackExisting.id;
    }
    throw createErr;
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Não autorizado.", { status: 401 });
  }

  try {
    const body = await req.json();
    const { packageId, workspaceId } = body;

    if (!packageId || !workspaceId) {
      return new NextResponse("packageId e workspaceId são obrigatórios.", { status: 400 });
    }

    const member = await prisma.workspaceMember.findFirst({
      where: {
        userId: session.user.id,
        workspaceId,
        role: { in: ["OWNER", "TRAINER"] },
      },
    });

    if (!member) {
      return new NextResponse("Acesso negado a este workspace.", { status: 403 });
    }

    const pkg = await prisma.creditPackage.findUnique({
      where: { id: packageId, isActive: true },
    });

    if (!pkg) {
      return new NextResponse("Pacote não encontrado.", { status: 404 });
    }

    if (pkg.priceInCents < 100) {
      return NextResponse.json(
        { error: "O valor mínimo para checkout no AbacatePay é R$ 1,00. Ajuste o valor deste pacote no painel SuperAdmin." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true, whatsapp: true },
    });

    const apiKey = process.env.ABACATEPAY_API_KEY;
    if (!apiKey || apiKey === "abc_dev_placeholder") {
      return NextResponse.json({ error: "Chave de API do AbacatePay não configurada." }, { status: 400 });
    }

    const abacatePay = AbacatePay({ secret: apiKey });

    const abacateProductId = await getOrCreateAbacateProduct(abacatePay, pkg);

    const rawOrigin = req.headers.get("origin") || req.headers.get("referer") || process.env.NEXTAUTH_URL || "http://localhost:3000";
    let baseUrl = "http://localhost:3000";
    try {
      const parsed = new URL(rawOrigin);
      baseUrl = parsed.origin;
    } catch {
      baseUrl = "http://localhost:3000";
    }

    const returnUrl = `${baseUrl}/personal/credits?status=success`;
    const completionUrl = `${baseUrl}/api/webhooks/abacatepay/credits`;

    const createCheckoutPayload = (prodId: string) => ({
      methods: ["PIX"],
      items: [
        {
          id: prodId,
          quantity: 1,
        },
      ],
      customer: {
        name: user?.name || "Personal Trainer",
        email: user?.email || "trainer@atlasfit.com",
        cellphone: user?.whatsapp || "11999999999",
        taxId: "12345678909",
      },
      returnUrl,
      completionUrl,
      metadata: {
        workspaceId,
        packageId,
        userId: session.user.id,
      },
    });

    let checkout: any;
    try {
      checkout = await abacatePay.checkouts.create(createCheckoutPayload(abacateProductId) as any);
    } catch (err: any) {
      const fallbackProductId = await getOrCreateAbacateProduct(abacatePay, pkg);
      checkout = await abacatePay.checkouts.create(createCheckoutPayload(fallbackProductId) as any);
    }

    const checkoutUrl = (checkout as any)?.url || (checkout as any)?.checkoutUrl || "";
    const billingId = (checkout as any)?.id || randomUUID();

    const purchase = await prisma.creditPurchase.create({
      data: {
        workspaceId,
        packageId,
        userId: session.user.id,
        amountInCents: pkg.priceInCents,
        credits: pkg.credits,
        status: "PENDING",
        abacatePayBillingId: billingId,
        abacatePayUrl: checkoutUrl,
      },
    });

    return NextResponse.json({
      purchaseId: purchase.id,
      checkoutUrl,
    });
  } catch (error: any) {
    const errorMessage = typeof error === "string" ? error : error?.message || error?.error || JSON.stringify(error) || "Erro ao iniciar compra.";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
