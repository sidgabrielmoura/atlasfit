import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET() {
  const session = await auth();

  if (session?.user?.role !== "SUPERADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const coupons = await prisma.coupon.findMany({
      orderBy: { createdAt: "desc" }
    });

    // Lógica para desativar automaticamente cupons expirados
    const now = new Date();
    const updatedCoupons = await Promise.all(coupons.map(async (coupon) => {
      if (coupon.isActive && coupon.expirationDate && new Date(coupon.expirationDate) < now) {
        return await prisma.coupon.update({
          where: { id: coupon.id },
          data: { isActive: false }
        });
      }
      return coupon;
    }));

    return NextResponse.json(updatedCoupons);
  } catch (error) {
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const session = await auth();

  if (session?.user?.role !== "SUPERADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, isActive } = body;

    if (!id) {
      return new NextResponse("Missing coupon ID", { status: 400 });
    }

    const coupon = await prisma.coupon.update({
      where: { id },
      data: { isActive }
    });

    return NextResponse.json(coupon);
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
    const { code, discountPercent, maxUses, expirationDate } = body;

    if (!code || !discountPercent) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    const coupon = await prisma.coupon.create({
      data: {
        code: code.toUpperCase(),
        discountPercent: parseInt(discountPercent),
        maxUses: maxUses ? parseInt(maxUses) : null,
        expirationDate: expirationDate ? new Date(expirationDate) : null
      }
    });

    return NextResponse.json(coupon);
  } catch (error) {
    if ((error as any).code === 'P2002') {
      return new NextResponse("Coupon code already exists", { status: 400 });
    }
    return new NextResponse("Internal Error", { status: 500 });
  }
}
