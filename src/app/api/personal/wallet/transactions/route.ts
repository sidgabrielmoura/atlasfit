import { walletTransactionsQuery } from "@/modules/payments/wallet-transactions-query";
import { withRequestMemo } from "@/lib/request-memo";
import { personalCommercialContextResponse } from "@/lib/personal-commercial-context";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { enforceWalletRateLimit } from "@/modules/payments/security/wallet-security";

const VALID_TYPES = new Set(["ALL", "BILLING", "PAYOUT"]);
const VALID_STATUSES = new Set(["ALL", "PAID", "SETTLED", "PENDING", "CANCELLED", "FAILED"]);
const VALID_METHODS = new Set(["ALL", "PIX", "CREDIT_CARD"]);

async function handleGET(req: NextRequest) {
  const restricted = await personalCommercialContextResponse(); if (restricted) return restricted;
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // 1. Rate Limit Enforcement
    const rateLimitResult = await enforceWalletRateLimit(req, "WALLET_TRANSACTIONS_READ", session.user.id);
    if (!rateLimitResult.allowed) {
      return rateLimitResult.response;
    }

    const userId = session.user.id;
    const { searchParams } = new URL(req.url);

    // 2. Input Sanitization & Bounds Checking
    const rawPage = parseInt(searchParams.get("page") || "1", 10);
    const page = Number.isInteger(rawPage) && rawPage > 0 ? Math.min(rawPage, 1000) : 1;

    const rawPageSize = parseInt(searchParams.get("pageSize") || "15", 10);
    const pageSize = Number.isInteger(rawPageSize) && rawPageSize > 0 ? Math.min(rawPageSize, 100) : 15;

    const rawSearch = (searchParams.get("search") || "").trim().slice(0, 60).toLowerCase();
    // Strip control characters or dangerous injection patterns
    const search = rawSearch.replace(/[\u0000-\u001F\u007F-\u009F]/g, "");

    const rawType = (searchParams.get("type") || "ALL").toUpperCase();
    const typeFilter = VALID_TYPES.has(rawType) ? rawType : "ALL";

    const rawStatus = (searchParams.get("status") || "ALL").toUpperCase();
    const statusFilter = VALID_STATUSES.has(rawStatus) ? rawStatus : "ALL";

    const rawMethod = (searchParams.get("method") || "ALL").toUpperCase();
    const methodFilter = VALID_METHODS.has(rawMethod) ? rawMethod : "ALL";

    const account = await prisma.paymentProviderAccount.findUnique({
      where: { personalUserId: userId },
      select: { id: true }
    });

    if (!account) {
      return NextResponse.json({
        transactions: [],
        pagination: { page: 1, pageSize, totalItems: 0, totalPages: 0 }
      });
    }

    return NextResponse.json(await walletTransactionsQuery({ accountId: account.id, page, pageSize, search, typeFilter, statusFilter, methodFilter }));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[WALLET_TRANSACTIONS_ERROR]", message);
    return NextResponse.json({ success: false, error: "Erro ao consultar extrato." }, { status: 500 });
  }
}
export const GET = withRequestMemo(handleGET);
