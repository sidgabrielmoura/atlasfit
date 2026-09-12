import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { AbacatePay } from "@/lib/abacatepay";
import { logSystemError } from "@/lib/logger";

export async function GET() {
  try {
    const session = await auth();
    if (session?.user?.role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Acesso restrito a SuperAdmin" }, { status: 403 });
    }

    const apiKey = process.env.ABACATEPAY_API_KEY;
    if (!apiKey || apiKey === "abc_dev_placeholder") {
      return NextResponse.json({ coupons: [] });
    }

    const abacate = AbacatePay({ secret: apiKey });

    const [abacateCouponsRes, localCoupons] = await Promise.all([
      abacate.coupons.list().catch(() => []),
      prisma.coupon.findMany({
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const rawCoupons: any[] = Array.isArray(abacateCouponsRes)
      ? abacateCouponsRes
      : Array.isArray((abacateCouponsRes as any)?.data)
      ? (abacateCouponsRes as any).data
      : [];

    const localMapByCode = new Map(localCoupons.map((c) => [c.code.toUpperCase(), c]));

    const coupons = rawCoupons.map((c: any) => {
      const code = (c.id || c.code || "").toUpperCase();
      const local = localMapByCode.get(code);

      const status = (c.status || (c.isActive ? "ACTIVE" : "INACTIVE")).toUpperCase();
      return {
        id: c.id,
        code,
        discountKind: c.discountKind || "PERCENTAGE",
        discount: typeof c.discount === "number" ? c.discount : (local?.discountPercent ? local.discountPercent : 0),
        status,
        isActive: status === "ACTIVE",
        maxRedeems: typeof c.maxRedeems === "number" ? c.maxRedeems : (local?.maxUses ?? -1),
        redeemsCount: typeof c.redeemsCount === "number" ? c.redeemsCount : (local?.usedCount ?? 0),
        notes: c.notes || null,
        devMode: Boolean(c.devMode),
        createdAt: c.createdAt || local?.createdAt?.toISOString() || new Date().toISOString(),
        localId: local?.id || null,
      };
    });

    // Adiciona cupons que estão apenas no banco local (se houver algum não sincronizado)
    const abacateCodes = new Set(coupons.map((c) => c.code));
    localCoupons.forEach((local) => {
      if (!abacateCodes.has(local.code.toUpperCase())) {
        coupons.push({
          id: local.id,
          code: local.code.toUpperCase(),
          discountKind: "PERCENTAGE",
          discount: local.discountPercent,
          status: local.isActive ? "ACTIVE" : "INACTIVE",
          isActive: local.isActive,
          maxRedeems: local.maxUses ?? -1,
          redeemsCount: local.usedCount ?? 0,
          notes: "Cadastrado localmente",
          devMode: false,
          createdAt: local.createdAt.toISOString(),
          localId: local.id,
        });
      }
    });

    return NextResponse.json({ coupons });
  } catch (error: any) {
    console.error("Erro ao listar cupons do AbacatePay:", error);
    await logSystemError({ action: "GET_ABACATEPAY_COUPONS", error, entity: "ABACATEPAY" });
    return NextResponse.json(
      { error: "Erro interno ao listar cupons do AbacatePay." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (session?.user?.role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Acesso restrito a SuperAdmin" }, { status: 403 });
    }

    const body = await req.json();
    const { code, discount, discountKind = "PERCENTAGE", maxRedeems = -1, notes } = body;

    if (!code || typeof discount !== "number" || discount <= 0) {
      return NextResponse.json({ error: "Código e desconto válidos são obrigatórios." }, { status: 400 });
    }

    const cleanCode = code.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "");
    if (!cleanCode) {
      return NextResponse.json({ error: "Código de cupom inválido." }, { status: 400 });
    }

    const apiKey = process.env.ABACATEPAY_API_KEY;
    if (!apiKey || apiKey === "abc_dev_placeholder") {
      return NextResponse.json({ error: "AbacatePay não está configurado." }, { status: 400 });
    }

    const abacate = AbacatePay({ secret: apiKey });

    // Criação no AbacatePay
    // Se PERCENTAGE, a API espera percentual inteiro (ex: 20 para 20%) ou valor em centavos para FIXED
    const abacateDiscountVal = discountKind === "PERCENTAGE" ? discount : Math.round(discount * 100);

    const createdAbacate = await abacate.coupons.create({
      code: cleanCode,
      discount: abacateDiscountVal,
      discountKind,
      maxRedeems: maxRedeems ? parseInt(maxRedeems) : -1,
      notes: notes || `Cupom criado pelo SuperAdmin AtlasFit`,
    });

    // Sincroniza com o banco local
    try {
      await prisma.coupon.upsert({
        where: { code: cleanCode },
        create: {
          code: cleanCode,
          discountPercent: discountKind === "PERCENTAGE" ? discount : 0,
          maxUses: maxRedeems && maxRedeems > 0 ? parseInt(maxRedeems) : null,
          isActive: true,
        },
        update: {
          discountPercent: discountKind === "PERCENTAGE" ? discount : 0,
          maxUses: maxRedeems && maxRedeems > 0 ? parseInt(maxRedeems) : null,
          isActive: true,
        },
      });
    } catch (dbErr) {
      console.warn("Aviso ao salvar cupom no banco local:", dbErr);
    }

    return NextResponse.json({ success: true, coupon: createdAbacate });
  } catch (error: any) {
    console.error("Erro ao criar cupom no AbacatePay:", error);
    await logSystemError({ action: "POST_ABACATEPAY_COUPON", error, entity: "ABACATEPAY" });
    return NextResponse.json(
      { error: error.message || "Erro ao criar cupom no AbacatePay." },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (session?.user?.role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Acesso restrito a SuperAdmin" }, { status: 403 });
    }

    const body = await req.json();
    const { id, code } = body;

    if (!id && !code) {
      return NextResponse.json({ error: "Identificador do cupom é obrigatório." }, { status: 400 });
    }

    const apiKey = process.env.ABACATEPAY_API_KEY;
    if (!apiKey || apiKey === "abc_dev_placeholder") {
      return NextResponse.json({ error: "AbacatePay não configurado." }, { status: 400 });
    }

    const abacate = AbacatePay({ secret: apiKey });
    const targetId = id || code;

    const toggled = await abacate.coupons.toggleStatus(targetId);

    if (code) {
      try {
        const local = await prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });
        if (local) {
          await prisma.coupon.update({
            where: { id: local.id },
            data: { isActive: !local.isActive },
          });
        }
      } catch {}
    }

    return NextResponse.json({ success: true, coupon: toggled });
  } catch (error: any) {
    console.error("Erro ao alternar status do cupom:", error);
    await logSystemError({ action: "TOGGLE_ABACATEPAY_COUPON", error, entity: "ABACATEPAY" });
    return NextResponse.json(
      { error: error.message || "Erro ao alternar status do cupom." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (session?.user?.role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Acesso restrito a SuperAdmin" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const code = searchParams.get("code");

    if (!id && !code) {
      return NextResponse.json({ error: "ID ou código do cupom é obrigatório." }, { status: 400 });
    }

    const apiKey = process.env.ABACATEPAY_API_KEY;
    if (!apiKey || apiKey === "abc_dev_placeholder") {
      return NextResponse.json({ error: "AbacatePay não configurado." }, { status: 400 });
    }

    const abacate = AbacatePay({ secret: apiKey });
    const target = id || code!;

    await abacate.coupons.delete(target);

    if (code) {
      try {
        await prisma.coupon.deleteMany({
          where: { code: code.toUpperCase() },
        });
      } catch {}
    }

    return NextResponse.json({ success: true, message: "Cupom excluído com sucesso." });
  } catch (error: any) {
    console.error("Erro ao excluir cupom do AbacatePay:", error);
    await logSystemError({ action: "DELETE_ABACATEPAY_COUPON", error, entity: "ABACATEPAY" });
    return NextResponse.json(
      { error: error.message || "Erro ao excluir cupom do AbacatePay." },
      { status: 500 }
    );
  }
}
