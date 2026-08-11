import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(req.url);

    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.max(1, Math.min(100, parseInt(searchParams.get("pageSize") || "15", 10)));
    const search = (searchParams.get("search") || "").trim().toLowerCase();
    const typeFilter = (searchParams.get("type") || "ALL").toUpperCase();
    const statusFilter = (searchParams.get("status") || "ALL").toUpperCase();
    const methodFilter = (searchParams.get("method") || "ALL").toUpperCase();

    const account = await prisma.paymentProviderAccount.findUnique({
      where: { personalUserId: userId }
    });

    if (!account) {
      return NextResponse.json({
        transactions: [],
        pagination: { page: 1, pageSize, totalItems: 0, totalPages: 0 }
      });
    }

    const billings = typeFilter === "PAYOUT" ? [] : await prisma.studentBilling.findMany({
      where: { providerAccountId: account.id },
      orderBy: { createdAt: "desc" },
      take: 200
    });

    const payouts = typeFilter === "BILLING" ? [] : await prisma.walletPayoutRequest.findMany({
      where: { providerAccountId: account.id },
      orderBy: { requestedAt: "desc" },
      take: 200
    });

    const studentIds = Array.from(new Set(billings.map((b) => b.studentUserId).filter(Boolean))) as string[];
    const students = studentIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: studentIds } },
          select: { id: true, name: true, email: true }
        })
      : [];
    const studentMap = new Map(students.map((s) => [s.id, s]));

    type UnifiedItem = {
      id: string;
      itemType: "BILLING" | "PAYOUT";
      title: string;
      subtitle?: string;
      studentName?: string;
      amountInCents: string;
      netAmountInCents?: string;
      status: string;
      paymentMethod?: string;
      createdAt: string;
      destinationMasked?: string;
      hostedInvoiceUrl?: string;
      billingReference?: string;
    };

    let items: UnifiedItem[] = [];

    for (const b of billings) {
      const student = b.studentUserId ? studentMap.get(b.studentUserId) : null;
      const studentName = student?.name || "Aluno";

      items.push({
        id: b.id,
        itemType: "BILLING",
        title: b.title || "Cobrança de Mensalidade",
        subtitle: `Aluno: ${studentName}`,
        studentName,
        amountInCents: b.grossAmountInCents.toString(),
        netAmountInCents: b.personalNetEstimatedInCents.toString(),
        status: b.status,
        paymentMethod: b.paymentMethod,
        createdAt: b.createdAt.toISOString(),
        hostedInvoiceUrl: b.hostedInvoiceUrl || undefined,
        billingReference: b.billingReference || undefined
      });
    }

    for (const p of payouts) {
      items.push({
        id: p.id,
        itemType: "PAYOUT",
        title: `Saque Pix (${p.destinationMasked || "Chave Pix"})`,
        subtitle: "Transferência enviada para sua conta",
        amountInCents: p.amountInCents.toString(),
        netAmountInCents: p.amountInCents.toString(),
        status: p.status,
        createdAt: p.requestedAt.toISOString(),
        destinationMasked: p.destinationMasked || undefined
      });
    }

    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (search) {
      items = items.filter((item) => {
        const titleMatch = item.title.toLowerCase().includes(search);
        const subMatch = (item.subtitle || "").toLowerCase().includes(search);
        const studentMatch = (item.studentName || "").toLowerCase().includes(search);
        const refMatch = (item.billingReference || "").toLowerCase().includes(search);
        const destMatch = (item.destinationMasked || "").toLowerCase().includes(search);
        return titleMatch || subMatch || studentMatch || refMatch || destMatch;
      });
    }

    if (statusFilter !== "ALL") {
      items = items.filter((item) => {
        if (statusFilter === "PAID" || statusFilter === "SETTLED") {
          return item.status === "SETTLED" || item.status === "CONFIRMED" || item.status === "COMPLETED";
        }
        if (statusFilter === "PENDING") {
          return item.status === "PENDING" || item.status === "PROCESSING" || item.status === "SUBMITTED";
        }
        if (statusFilter === "CANCELLED" || statusFilter === "FAILED") {
          return item.status === "CANCELLED" || item.status === "FAILED" || item.status === "REJECTED";
        }
        return item.status.toUpperCase() === statusFilter;
      });
    }

    if (methodFilter !== "ALL") {
      items = items.filter((item) => {
        if (!item.paymentMethod) return methodFilter === "PIX";
        return item.paymentMethod.toUpperCase() === methodFilter;
      });
    }

    const totalItems = items.length;
    const totalPages = Math.ceil(totalItems / pageSize) || 1;
    const startIndex = (page - 1) * pageSize;
    const paginatedItems = items.slice(startIndex, startIndex + pageSize);

    return NextResponse.json({
      transactions: paginatedItems,
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages
      }
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[WALLET_TRANSACTIONS_ERROR]", message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
