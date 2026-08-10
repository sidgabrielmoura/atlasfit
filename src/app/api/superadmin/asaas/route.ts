import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { AsaasAdapter } from "@/modules/payments/providers/asaas/asaas-adapter";
import { StudentBillingStatus, WalletPayoutStatus, FinancialAccountStatus, WalletKycStatus } from "@prisma/client";

const adapter = new AsaasAdapter();

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Acesso restrito a SuperAdmin" }, { status: 403 });
    }

    const masterBalanceResult = await adapter.getMasterBalance();
    const masterAvailableInCents = masterBalanceResult.availableAmountInCents.toString();

    const accounts = await prisma.paymentProviderAccount.findMany({
      include: {
        billings: true,
        payouts: true,
      }
    });

    const userIds = Array.from(new Set(accounts.map((a) => a.personalUserId)));
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true }
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    let totalGrossMovedInCents = BigInt(0);
    let totalPlatformFeeInCents = BigInt(0);
    let totalPersonalNetInCents = BigInt(0);
    let totalPendingInCents = BigInt(0);
    let totalPayoutsCompletedInCents = BigInt(0);
    let totalPayoutsProcessingInCents = BigInt(0);

    const subaccountsList = accounts.map((acc) => {
      const user = userMap.get(acc.personalUserId);
      const paidBillings = acc.billings.filter(
        (b) => b.status === StudentBillingStatus.SETTLED || b.status === StudentBillingStatus.CONFIRMED
      );
      const pendingBillings = acc.billings.filter(
        (b) => b.status === StudentBillingStatus.PENDING || b.status === StudentBillingStatus.OVERDUE
      );

      const accMovedInCents = paidBillings.reduce((accVal, b) => accVal + b.grossAmountInCents, BigInt(0));
      const accPlatformFeeInCents = paidBillings.reduce((accVal, b) => accVal + b.platformFeeEstimatedInCents, BigInt(0));
      const accNetInCents = paidBillings.reduce((accVal, b) => accVal + b.personalNetEstimatedInCents, BigInt(0));
      const accPendingInCents = pendingBillings.reduce((accVal, b) => accVal + b.grossAmountInCents, BigInt(0));

      const completedPayouts = acc.payouts.filter((p) => p.status === WalletPayoutStatus.COMPLETED);
      const accPayoutsInCents = completedPayouts.reduce((accVal, p) => accVal + p.amountInCents, BigInt(0));

      totalGrossMovedInCents += accMovedInCents;
      totalPlatformFeeInCents += accPlatformFeeInCents;
      totalPersonalNetInCents += accNetInCents;
      totalPendingInCents += accPendingInCents;
      totalPayoutsCompletedInCents += accPayoutsInCents;

      const processingPayouts = acc.payouts.filter((p) => p.status === WalletPayoutStatus.PROCESSING);
      totalPayoutsProcessingInCents += processingPayouts.reduce((accVal, p) => accVal + p.amountInCents, BigInt(0));

      return {
        id: acc.id,
        providerAccountId: acc.providerAccountId,
        personalUserId: acc.personalUserId,
        userName: user?.name || "Personal Trainer",
        userEmail: user?.email || "N/A",
        legalNameMasked: acc.legalNameMasked || user?.name || "Personal",
        documentLast4: acc.documentLast4 || "8160",
        status: acc.status,
        kycStatus: acc.kycStatus,
        providerStatus: acc.providerStatus,
        totalMovedInCents: accMovedInCents.toString(),
        totalPlatformFeeInCents: accPlatformFeeInCents.toString(),
        totalPersonalNetInCents: accNetInCents.toString(),
        totalPendingInCents: accPendingInCents.toString(),
        totalPayoutsInCents: accPayoutsInCents.toString(),
        billingsCount: paidBillings.length,
        pendingBillingsCount: pendingBillings.length,
        payoutsCount: completedPayouts.length,
        createdAt: acc.createdAt.toISOString(),
        lastProviderSyncAt: acc.lastProviderSyncAt ? acc.lastProviderSyncAt.toISOString() : null,
      };
    });

    subaccountsList.sort((a, b) => Number(BigInt(b.totalMovedInCents) - BigInt(a.totalMovedInCents)));

    const totalSubaccountsCount = accounts.length;
    const approvedSubaccountsCount = accounts.filter(
      (a) => a.status === FinancialAccountStatus.APPROVED || a.kycStatus === WalletKycStatus.APPROVED
    ).length;

    const pendingSubaccountsCount = accounts.filter(
      (a) =>
        a.status === FinancialAccountStatus.UNDER_REVIEW ||
        a.status === FinancialAccountStatus.PENDING_DOCUMENTS ||
        a.kycStatus === WalletKycStatus.PENDING
    ).length;

    const rejectedSubaccountsCount = accounts.filter(
      (a) => a.status === FinancialAccountStatus.REJECTED || a.kycStatus === WalletKycStatus.REJECTED
    ).length;

    const activeMoverAccounts = subaccountsList.filter((a) => BigInt(a.totalMovedInCents) > BigInt(0)).length;
    const avgVolumePerSubaccountInCents = activeMoverAccounts > 0
      ? (totalGrossMovedInCents / BigInt(activeMoverAccounts)).toString()
      : "0";

    const allBillings = await prisma.studentBilling.findMany({
      orderBy: { createdAt: "asc" }
    });

    const monthlyMap = new Map<string, { gross: bigint; fee: bigint; net: bigint; count: number }>();
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthlyMap.set(key, { gross: BigInt(0), fee: BigInt(0), net: BigInt(0), count: 0 });
    }

    for (const b of allBillings) {
      if (b.status === StudentBillingStatus.SETTLED || b.status === StudentBillingStatus.CONFIRMED) {
        const dateObj = b.paidAt || b.createdAt;
        const key = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}`;
        if (monthlyMap.has(key)) {
          const entry = monthlyMap.get(key)!;
          entry.gross += b.grossAmountInCents;
          entry.fee += b.platformFeeEstimatedInCents;
          entry.net += b.personalNetEstimatedInCents;
          entry.count += 1;
        }
      }
    }

    const monthlyChartData = Array.from(monthlyMap.entries()).map(([key, value]) => {
      const [year, monthNum] = key.split("-");
      const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
      const label = `${monthNames[parseInt(monthNum, 10) - 1]}/${year.slice(2)}`;
      return {
        month: label,
        grossVolume: Number(value.gross) / 100,
        splitFees: Number(value.fee) / 100,
        netPersonal: Number(value.net) / 100,
        count: value.count
      };
    });

    const methodMap = new Map<string, { volume: bigint; count: number }>();
    for (const b of allBillings) {
      if (b.status === StudentBillingStatus.SETTLED || b.status === StudentBillingStatus.CONFIRMED) {
        const method = b.paymentMethod || "PIX";
        const entry = methodMap.get(method) || { volume: BigInt(0), count: 0 };
        entry.volume += b.grossAmountInCents;
        entry.count += 1;
        methodMap.set(method, entry);
      }
    }

    const paymentMethodsData = Array.from(methodMap.entries()).map(([method, val]) => ({
      method,
      volume: Number(val.volume) / 100,
      count: val.count,
    }));

    const statusMap = new Map<string, { count: number; volume: bigint }>();
    for (const b of allBillings) {
      const st = b.status;
      const entry = statusMap.get(st) || { count: 0, volume: BigInt(0) };
      entry.count += 1;
      entry.volume += b.grossAmountInCents;
      statusMap.set(st, entry);
    }

    const statusBreakdownData = Array.from(statusMap.entries()).map(([status, val]) => ({
      status,
      count: val.count,
      volume: Number(val.volume) / 100,
    }));

    const recentEvents = await prisma.paymentWebhookEvent.findMany({
      orderBy: { queuedAt: "desc" },
      take: 15,
      select: {
        id: true,
        eventType: true,
        processingStatus: true,
        providerEventId: true,
        queuedAt: true,
        processedAt: true,
        lastErrorSanitized: true
      }
    });

    return NextResponse.json({
      environment: process.env.ASAAS_ENVIRONMENT || "sandbox",
      masterAvailableInCents,
      summary: {
        totalGrossMovedInCents: totalGrossMovedInCents.toString(),
        totalPlatformFeeInCents: totalPlatformFeeInCents.toString(),
        totalPersonalNetInCents: totalPersonalNetInCents.toString(),
        totalPendingInCents: totalPendingInCents.toString(),
        totalPayoutsCompletedInCents: totalPayoutsCompletedInCents.toString(),
        totalPayoutsProcessingInCents: totalPayoutsProcessingInCents.toString(),
        totalSubaccountsCount,
        approvedSubaccountsCount,
        pendingSubaccountsCount,
        rejectedSubaccountsCount,
        activeMoverAccounts,
        avgVolumePerSubaccountInCents,
      },
      subaccountsList,
      monthlyChartData,
      paymentMethodsData,
      statusBreakdownData,
      recentEvents: recentEvents.map((e) => ({
        ...e,
        queuedAt: e.queuedAt ? e.queuedAt.toISOString() : new Date().toISOString(),
        processedAt: e.processedAt ? e.processedAt.toISOString() : null
      }))
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
