import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { AbacatePay } from "@abacatepay/sdk";

export async function GET() {
  const session = await auth();

  if (session?.user?.role !== "SUPERADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const plans = await prisma.plan.findMany({
      include: {
        _count: {
          select: { subscriptions: { where: { status: "active" } } }
        }
      }
    });
    return NextResponse.json(plans);
  } catch (error) {
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth();

  if (session?.user?.role !== "SUPERADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, price, interval, features, maxWorkspaces } = body;

    if (!name || price === undefined) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    const plan = await prisma.plan.create({
      data: {
        name,
        price: parseFloat(price),
        interval: interval || "month",
        features,
        maxWorkspaces: maxWorkspaces !== undefined ? parseInt(maxWorkspaces) : 1
      }
    });

    // Sincronizar com o AbacatePay
    try {
      const apiKey = process.env.ABACATEPAY_API_KEY;
      if (apiKey && apiKey !== "abc_dev_placeholder") {
        const abacate = AbacatePay({ secret: apiKey });
        await abacate.products.create({
          externalId: plan.id,
          name: plan.name,
          price: Math.round(plan.price * 100), // convert to cents
          currency: "BRL",
          description: plan.features || `Plano ${plan.name}`
        });
        console.log(`Product synced successfully with AbacatePay: ${plan.id}`);
      }
    } catch (abacateError) {
      console.error("Erro ao sincronizar produto com AbacatePay:", abacateError);
    }

    return NextResponse.json(plan);
  } catch (error) {
    return new NextResponse("Internal Error", { status: 500 });
  }
}
