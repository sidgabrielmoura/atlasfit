import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";


export async function GET(req: Request) {
  const session = await auth();

  if (session?.user?.role !== "SUPERADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "APPROVED";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const userId = searchParams.get("userId") || "";
    const planId = searchParams.get("planId") || "";
    const dateRange = searchParams.get("dateRange") || "all";

    console.log("[API/FINANCE/TRANSACTIONS] status requested:", status, "userId:", userId, "planId:", planId, "dateRange:", dateRange);

    const skip = (page - 1) * limit;

    const where: any = {
      status: { equals: status, mode: "insensitive" }
    };

    if (userId) {
      where.userId = userId;
    }

    if (planId) {
      where.user = {
        subscription: {
          planId: planId
        }
      };
    }

    if (dateRange !== "all") {
      const now = new Date();
      let limitDate = new Date();
      if (dateRange === "7days") {
        limitDate.setDate(now.getDate() - 7);
        where.createdAt = { gte: limitDate };
      } else if (dateRange === "30days") {
        limitDate.setDate(now.getDate() - 30);
        where.createdAt = { gte: limitDate };
      } else if (dateRange === "thisyear") {
        limitDate = new Date(now.getFullYear(), 0, 1);
        where.createdAt = { gte: limitDate };
      }
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            include: {
              subscription: {
                include: { plan: true }
              }
            }
          }
        }
      }),
      prisma.transaction.count({ where })
    ]);

    const formattedTransactions = transactions.map((tx) => {
      const sub = tx.user?.subscription;
      return {
        ...tx,
        workspace: {
          name: tx.user?.name || "Conta de Personal",
          logo: tx.user?.name?.slice(0, 2).toUpperCase() || "CP",
          subscription: sub ? { ...sub, status: sub.status.toLowerCase() } : null
        }
      };
    });

    const pages = Math.ceil(total / limit);

    return NextResponse.json({
      data: formattedTransactions,
      pagination: {
        total,
        page,
        pages,
        limit
      }
    });

  } catch (error) {
    console.error("[FINANCE_TRANSACTIONS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
