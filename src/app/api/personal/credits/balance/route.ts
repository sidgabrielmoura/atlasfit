import { requirePersonalWorkspaceAccess, handleWorkspaceAccessError } from "@/modules/workspaces/application/guard";
import { withRequestMemo } from "@/lib/request-memo";
import { settleCreditPurchase } from "@/modules/payments/abacate-confirmation";
import { personalCommercialContextResponse } from "@/lib/personal-commercial-context";
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
          await settleCreditPurchase(purchase.id);
        }
      } catch {}
    }
  } catch {}
}

async function handleGET(req: Request) {
  const restricted = await personalCommercialContextResponse(); if (restricted) return restricted;
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
    await requirePersonalWorkspaceAccess({ workspaceId, allowedRoles: ["OWNER", "TRAINER"] });
    if (req.method === "POST") await reconcilePendingPurchases(session.user.id);
    const quota = await checkImportQuota(workspaceId, session.user.id);
    return NextResponse.json(quota);
  } catch (error) {
    const denied = handleWorkspaceAccessError(error); if (denied) return denied;
    return new NextResponse("Erro ao verificar saldo.", { status: 500 });
  }
}
export const GET = withRequestMemo(handleGET);

export const POST = handleGET;
