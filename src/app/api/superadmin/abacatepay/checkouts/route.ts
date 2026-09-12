import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { AbacatePay, maskTaxId, maskPhone, maskEmail } from "@/lib/abacatepay";
import { logSystemError } from "@/lib/logger";

export async function GET() {
  try {
    const session = await auth();
    if (session?.user?.role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Acesso restrito a SuperAdmin" }, { status: 403 });
    }

    const apiKey = process.env.ABACATEPAY_API_KEY;
    if (!apiKey || apiKey === "abc_dev_placeholder") {
      return NextResponse.json({
        summary: {
          totalCount: 0,
          totalAmountInCents: 0,
          totalPaidInCents: 0,
          statusCounts: { PAID: 0, PENDING: 0, EXPIRED: 0, CANCELLED: 0, REFUNDED: 0 },
        },
        checkouts: [],
      });
    }

    const abacate = AbacatePay({ secret: apiKey });
    let rawCheckouts: any[] = [];

    try {
      const res = await abacate.checkouts.list();
      if (Array.isArray(res)) {
        rawCheckouts = res;
      } else if (res && Array.isArray((res as any).data)) {
        rawCheckouts = (res as any).data;
      }
    } catch (err) {
      console.warn("Aviso ao buscar checkouts no AbacatePay:", err);
    }

    let totalAmountInCents = 0;
    let totalPaidInCents = 0;
    const statusCounts: Record<string, number> = {
      PAID: 0,
      PENDING: 0,
      EXPIRED: 0,
      CANCELLED: 0,
      REFUNDED: 0,
    };

    // Processamento com sanitização Zero-Leak de PII (LGPD)
    const sanitizedCheckouts = rawCheckouts.map((item: any) => {
      const amount = typeof item.amount === "number" ? item.amount : 0;
      const paidAmount = typeof item.paidAmount === "number" ? item.paidAmount : (item.status === "PAID" ? amount : 0);
      const status = (item.status || "PENDING").toUpperCase();

      totalAmountInCents += amount;
      if (status === "PAID") {
        totalPaidInCents += paidAmount || amount;
      }
      statusCounts[status] = (statusCounts[status] || 0) + 1;

      // Mascaramento estrito de dados pessoais do cliente
      const customer = item.customer ? {
        name: item.customer.name || "Cliente",
        email: maskEmail(item.customer.email),
        taxId: maskTaxId(item.customer.taxId),
        cellphone: maskPhone(item.customer.cellphone),
      } : null;

      return {
        id: item.id || "",
        amount,
        paidAmount,
        status,
        devMode: Boolean(item.devMode),
        url: item.url || null,
        receiptUrl: item.receiptUrl || null,
        externalId: item.externalId || null,
        methods: Array.isArray(item.methods) ? item.methods : ["PIX"],
        itemsCount: Array.isArray(item.items) ? item.items.length : 1,
        customer,
        createdAt: item.createdAt || new Date().toISOString(),
        updatedAt: item.updatedAt || item.createdAt || new Date().toISOString(),
      };
    });

    // Ordena pelo mais recente
    sanitizedCheckouts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({
      summary: {
        totalCount: sanitizedCheckouts.length,
        totalAmountInCents,
        totalPaidInCents,
        statusCounts,
      },
      checkouts: sanitizedCheckouts,
    });
  } catch (error: any) {
    console.error("Erro ao listar checkouts AbacatePay:", error);
    await logSystemError({ action: "GET_ABACATEPAY_CHECKOUTS", error, entity: "ABACATEPAY" });
    return NextResponse.json(
      { error: "Erro interno ao listar histórico de cobranças do AbacatePay." },
      { status: 500 }
    );
  }
}
