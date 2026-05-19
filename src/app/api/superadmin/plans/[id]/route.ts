import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (session?.user?.role !== "SUPERADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const { name, price, interval, features, maxWorkspaces } = body;

    const plan = await prisma.plan.update({
      where: { id },
      data: {
        name,
        price: price ? parseFloat(price) : undefined,
        interval,
        features,
        maxWorkspaces: maxWorkspaces !== undefined ? parseInt(maxWorkspaces) : undefined
      }
    });

    return NextResponse.json(plan);
  } catch (error) {
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (session?.user?.role !== "SUPERADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { id } = await params;

  try {
    // Check if there are active subscriptions before deleting
    const subscriptionsCount = await prisma.subscription.count({
      where: { planId: id, status: "active" }
    });

    if (subscriptionsCount > 0) {
      return new NextResponse("Cannot delete plan with active subscriptions", { status: 400 });
    }

    await prisma.plan.delete({
      where: { id }
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return new NextResponse("Internal Error", { status: 500 });
  }
}
