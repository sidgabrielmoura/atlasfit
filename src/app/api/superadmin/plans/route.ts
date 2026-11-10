import { withRequestMemo } from "@/lib/request-memo";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { AbacatePay, resolvePublicImageUrl } from "@/lib/abacatepay";
import { logSystemError } from "@/lib/logger";

async function handleGET() {
  const session = await auth();

  if (session?.user?.role !== "SUPERADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const plans = await prisma.plan.findMany({
      where: { customWorkspaceId: null },
      include: {
        _count: {
          select: {
            subscriptions: { where: { status: { in: ["active", "ACTIVE"] } } },
            workspaceSubscriptions: { where: { status: { in: ["ACTIVE", "TRIAL"] } } },
          },
        },
      },
      orderBy: { price: "asc" },
    });
    return NextResponse.json(plans);
  } catch (error) {
    await logSystemError({ action: "GET_PLANS", error, entity: "PLAN" });
    return new NextResponse("Internal Error", { status: 500 });
  }
}
export const GET = withRequestMemo(handleGET);

export async function POST(req: Request) {
  const session = await auth();

  if (session?.user?.role !== "SUPERADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, price, interval, features, maxWorkspaces, maxStudents, maxStaff, importQuota, storageLimitMb, paymentMethods, imageUrl, type } = body;

    if (!name || price === undefined) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    const planType = type === "GYM" ? "GYM" : "PERSONAL";

    const plan = await prisma.plan.create({
      data: {
        name,
        price: parseFloat(price),
        interval: interval || "month",
        features,
        type: planType,
        imageUrl: imageUrl ? imageUrl.trim() : null,
        maxWorkspaces: maxWorkspaces !== undefined ? parseInt(maxWorkspaces) : 1,
        maxStaff: maxStaff !== undefined && maxStaff !== "" && maxStaff !== null ? parseInt(maxStaff) : (planType === "GYM" ? 10 : null),
        maxStudents: maxStudents !== undefined && maxStudents !== "" && maxStudents !== null ? parseInt(maxStudents) : null,
        importQuota: importQuota !== undefined && importQuota !== "" && importQuota !== null ? parseInt(importQuota) : 25,
        storageLimitMb: storageLimitMb !== undefined && storageLimitMb !== "" && storageLimitMb !== null ? parseInt(storageLimitMb) : 1024,
        paymentMethods: paymentMethods || "PIX"
      }
    });

    // Sincronizar com o AbacatePay
    try {
      const apiKey = process.env.ABACATEPAY_API_KEY;
      if (apiKey && apiKey !== "abc_dev_placeholder") {
        const abacate = AbacatePay({ secret: apiKey });
        const cycle = plan.interval === "year" ? "ANNUALLY" : "MONTHLY";
        const publicImage = resolvePublicImageUrl(plan.imageUrl);
        await abacate.products.create({
          externalId: plan.id,
          name: plan.name,
          price: Math.round(plan.price * 100), // convert to cents
          currency: "BRL",
          description: plan.features || `Plano ${plan.name}`,
          cycle,
          ...(publicImage ? { image: publicImage, imageUrl: publicImage } : {})
        });
        console.log(`Product synced successfully with AbacatePay (${cycle}): ${plan.id}`);
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
