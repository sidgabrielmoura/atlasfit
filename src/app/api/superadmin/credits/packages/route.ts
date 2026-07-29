import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { AbacatePay } from "@/lib/abacatepay";

async function requireSuperAdmin() {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "SUPERADMIN") {
    return null;
  }
  return session;
}

export async function GET() {
  const session = await requireSuperAdmin();
  if (!session) return new NextResponse("Não autorizado.", { status: 401 });

  try {
    const packages = await prisma.creditPackage.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      include: {
        _count: { select: { purchases: { where: { status: "PAID" } } } },
      },
    });
    return NextResponse.json(packages);
  } catch {
    return new NextResponse("Erro ao listar pacotes.", { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await requireSuperAdmin();
  if (!session) return new NextResponse("Não autorizado.", { status: 401 });

  try {
    const body = await req.json();
    const { name, description, credits, priceInCents, isHighlighted, sortOrder } = body;

    if (!name || !credits || !priceInCents) {
      return new NextResponse("Campos obrigatórios ausentes.", { status: 400 });
    }

    if (parseInt(priceInCents) < 100) {
      return new NextResponse("O preço mínimo permitido pelo AbacatePay é R$ 1,00 (100 centavos).", { status: 400 });
    }

    const pkg = await prisma.creditPackage.create({
      data: {
        name,
        description: description || null,
        credits: parseInt(credits),
        priceInCents: parseInt(priceInCents),
        isHighlighted: isHighlighted ?? false,
        sortOrder: sortOrder ?? 0,
      },
    });

    try {
      const apiKey = process.env.ABACATEPAY_API_KEY;
      if (apiKey && apiKey !== "abc_dev_placeholder") {
        const abacatePay = AbacatePay({ secret: apiKey });
        const product = await abacatePay.products.create({
          externalId: pkg.id,
          name: pkg.name,
          price: pkg.priceInCents,
          currency: "BRL",
          description: pkg.description || `${pkg.credits} créditos de importação AtlasFit`,
        });
        await prisma.creditPackage.update({
          where: { id: pkg.id },
          data: { abacatePayProductId: product.id },
        });
        return NextResponse.json({ ...pkg, abacatePayProductId: product.id }, { status: 201 });
      }
    } catch {
      // Non-blocking AbacatePay sync
    }

    return NextResponse.json(pkg, { status: 201 });
  } catch {
    return new NextResponse("Erro ao criar pacote.", { status: 500 });
  }
}
