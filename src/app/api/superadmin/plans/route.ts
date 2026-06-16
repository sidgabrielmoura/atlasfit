import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { AbacatePay } from "@/lib/abacatepay";
import { logSystemError } from "@/lib/logger";

export async function GET() {
  const session = await auth();

  if (session?.user?.role !== "SUPERADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const plans = await prisma.plan.findMany({
      include: {
        _count: {
          select: { subscriptions: { where: { status: { in: ["active", "ACTIVE"] } } } }
        }
      }
    });
    return NextResponse.json(plans);
  } catch (error) {
    await logSystemError({ action: "GET_PLANS", error, entity: "PLAN" });
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
    const { name, price, interval, features, maxWorkspaces, maxStudents } = body;

    if (!name || price === undefined) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    const plan = await prisma.plan.create({
      data: {
        name,
        price: parseFloat(price),
        interval: interval || "month",
        features,
        maxWorkspaces: maxWorkspaces !== undefined ? parseInt(maxWorkspaces) : 1,
        maxStudents: maxStudents !== undefined && maxStudents !== "" && maxStudents !== null ? parseInt(maxStudents) : null
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
      await logSystemError({ action: "POST_PLAN_SYNC_ABACATEPAY", error: abacateError, entity: "PLAN", entityId: plan.id });
    }

    return NextResponse.json(plan);
  } catch (error) {
    await logSystemError({ action: "POST_PLAN", error, entity: "PLAN" });
    return new NextResponse("Internal Error", { status: 500 });
  }
}
