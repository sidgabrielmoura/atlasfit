import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { checkImportQuota } from "@/lib/migration/quota.service";
import { AbacatePay } from "@/lib/abacatepay";

async function reconcilePendingPurchases(userId: string) {
  try {
    const pendingPurchases = await prisma.creditPurchase.findMany({
      where: { userId, status: "PENDING" },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    if (pendingPurchases.length === 0) return;

    const apiKey = process.env.ABACATEPAY_API_KEY;
    if (!apiKey || apiKey === "abc_dev_placeholder") return;

    const abacatePay = AbacatePay({ secret: apiKey });

    for (const purchase of pendingPurchases) {
      if (!purchase.abacatePayBillingId) continue;
      try {
        const checkout = await abacatePay.checkouts.get(purchase.abacatePayBillingId as any).catch(() => null);
        const isPaid = checkout && ((checkout as any).status === "PAID" || (checkout as any).status === "paid");

        if (isPaid) {
          await prisma.$transaction([
            prisma.creditPurchase.update({
              where: { id: purchase.id },
              data: { status: "PAID", paidAt: new Date() },
            }),
            prisma.user.update({
              where: { id: userId },
              data: { importCredits: { increment: purchase.credits } },
            }),
          ]);
        }
      } catch {}
    }
  } catch {}
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Não autorizado.", { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspaceId");

  if (!workspaceId) {
    return new NextResponse("workspaceId é obrigatório.", { status: 400 });
  }

  try {
    await reconcilePendingPurchases(session.user.id);
    const quota = await checkImportQuota(workspaceId, session.user.id);
    return NextResponse.json(quota);
  } catch {
    return new NextResponse("Erro ao verificar saldo.", { status: 500 });
  }
}
