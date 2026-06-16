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
    const coupons = await prisma.coupon.findMany({
      orderBy: { createdAt: "desc" }
    });

    const now = new Date();
    const updatedCoupons = await Promise.all(coupons.map(async (coupon) => {
      if (coupon.isActive && coupon.expirationDate && new Date(coupon.expirationDate) < now) {
        const updated = await prisma.coupon.update({
          where: { id: coupon.id },
          data: { isActive: false }
        });

        // Desativar no AbacatePay se expirado
        try {
          const apiKey = process.env.ABACATEPAY_API_KEY;
          if (apiKey && apiKey !== "abc_dev_placeholder") {
            const abacate = AbacatePay({ secret: apiKey });
            try {
              const existing = await abacate.coupons.get(coupon.code);
              if (existing && (existing.status === "ACTIVE" || existing.status === "active")) {
                await abacate.coupons.toggleStatus(existing.id);
                console.log(`Cupom expirado ${coupon.code} desativado no AbacatePay.`);
              }
            } catch (err: any) {
              console.error(`Cupom expirado ${coupon.code} não pôde ser encontrado no AbacatePay:`, err.message);
              await logSystemError({ action: "EXPIRE_COUPON_GET_ABACATEPAY", error: err, entity: "COUPON", entityId: coupon.id });
            }
          }
        } catch (abacateError) {
          console.error(`Erro ao desativar cupom expirado ${coupon.code} no AbacatePay:`, abacateError);
          await logSystemError({ action: "EXPIRE_COUPON_ABACATEPAY", error: abacateError, entity: "COUPON", entityId: coupon.id });
        }

        return updated;
      }
      return coupon;
    }));

    return NextResponse.json(updatedCoupons);
  } catch (error) {
    await logSystemError({ action: "GET_COUPONS", error, entity: "COUPON" });
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

    // Alternar status no AbacatePay
    try {
      const apiKey = process.env.ABACATEPAY_API_KEY;
      if (apiKey && apiKey !== "abc_dev_placeholder") {
        const abacate = AbacatePay({ secret: apiKey });
        try {
          const existing = await abacate.coupons.get(coupon.code);
          if (existing) {
            const abacateActive = existing.status === "ACTIVE" || existing.status === "active";
            if (abacateActive !== isActive) {
              await abacate.coupons.toggleStatus(existing.id);
              console.log(`Status do cupom ${coupon.code} sincronizado com AbacatePay para: ${isActive}`);
            }
          }
        } catch (err: any) {
          console.error(`Cupom ${coupon.code} não pôde ser encontrado no AbacatePay para sincronizar status:`, err.message);
          await logSystemError({ action: "PATCH_COUPON_GET_ABACATEPAY", error: err, entity: "COUPON", entityId: coupon.id });
        }
      }
    } catch (abacateError) {
      console.error("Erro ao sincronizar status do cupom no AbacatePay:", abacateError);
      await logSystemError({ action: "PATCH_COUPON_SYNC_ABACATEPAY", error: abacateError, entity: "COUPON", entityId: coupon.id });
    }

    return NextResponse.json(coupon);
  } catch (error) {
    await logSystemError({ action: "PATCH_COUPON", error, entity: "COUPON" });
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

    // Criar cupom correspondente no AbacatePay
    try {
      const apiKey = process.env.ABACATEPAY_API_KEY;
      if (apiKey && apiKey !== "abc_dev_placeholder") {
        const abacate = AbacatePay({ secret: apiKey });
        await abacate.coupons.create({
          code: coupon.code,
          discount: coupon.discountPercent * 100,
          discountKind: "PERCENTAGE",
          maxRedeems: coupon.maxUses ?? -1,
          notes: `Cupom de ${coupon.discountPercent}% gerado pelo AtlasFit`
        });
        console.log(`Cupom ${coupon.code} criado e sincronizado no AbacatePay.`);
      }
    } catch (abacateError) {
      console.error("Erro ao criar cupom no AbacatePay:", abacateError);
      await logSystemError({ action: "POST_COUPON_CREATE_ABACATEPAY", error: abacateError, entity: "COUPON", entityId: coupon.id });
    }

    return NextResponse.json(coupon);
  } catch (error) {
    if ((error as any).code === 'P2002') {
      return new NextResponse("Coupon code already exists", { status: 400 });
    }
    await logSystemError({ action: "POST_COUPON", error, entity: "COUPON" });
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await auth();

  if (session?.user?.role !== "SUPERADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return new NextResponse("Missing coupon ID", { status: 400 });
    }

    const coupon = await prisma.coupon.findUnique({
      where: { id }
    });

    if (!coupon) {
      return new NextResponse("Coupon not found", { status: 404 });
    }

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "DELETION",
        entity: "COUPON",
        entityId: id,
        severity: "warning"
      }
    });

    await prisma.coupon.delete({
      where: { id }
    });

    try {
      const apiKey = process.env.ABACATEPAY_API_KEY;
      if (apiKey && apiKey !== "abc_dev_placeholder") {
        const abacate = AbacatePay({ secret: apiKey });
        try {
          await abacate.coupons.delete(coupon.code);
          console.log(`Cupom ${coupon.code} deletado no AbacatePay.`);
        } catch (err: any) {
          console.error(`Erro ao deletar cupom ${coupon.code} no AbacatePay:`, err.message);
          await logSystemError({ action: "DELETE_COUPON_ABACATEPAY_API", error: err, entity: "COUPON", entityId: coupon.id });
        }
      }
    } catch (abacateError) {
      console.error("Erro ao sincronizar exclusão do cupom no AbacatePay:", abacateError);
      await logSystemError({ action: "DELETE_COUPON_ABACATEPAY_SYNC", error: abacateError, entity: "COUPON", entityId: coupon.id });
    }

    return new NextResponse("Coupon deleted successfully", { status: 200 });
  } catch (error) {
    console.error("DELETE_COUPON_ERROR", error);
    await logSystemError({ action: "DELETE_COUPON", error, entity: "COUPON" });
    return new NextResponse("Internal Error", { status: 500 });
  }
}

