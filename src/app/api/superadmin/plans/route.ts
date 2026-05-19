import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

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

    return NextResponse.json(plan);
  } catch (error) {
    return new NextResponse("Internal Error", { status: 500 });
  }
}
