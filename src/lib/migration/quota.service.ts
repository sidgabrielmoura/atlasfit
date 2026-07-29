import prisma from "@/lib/prisma";

export type QuotaSource = "SUBSCRIPTION" | "CREDITS" | "NONE";

export interface QuotaCheckResult {
  allowed: boolean;
  source: QuotaSource;
  remaining: number;
  quotaUsed: number;
  quotaTotal: number;
  credits: number;
}

function isNewMonth(resetAt: Date | null): boolean {
  if (!resetAt) return true;
  const now = new Date();
  return now.getFullYear() !== resetAt.getFullYear() || now.getMonth() !== resetAt.getMonth();
}

export async function checkImportQuota(workspaceId: string, userId: string): Promise<QuotaCheckResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { importCredits: true },
  });

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { importCredits: true },
  });

  const userCredits = user?.importCredits ?? 0;
  const wsCredits = workspace?.importCredits ?? 0;
  const credits = userCredits > 0 ? userCredits : wsCredits;

  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    include: { plan: { select: { importQuota: true } } },
  });

  if (!subscription) {
    return {
      allowed: credits > 0,
      source: credits > 0 ? "CREDITS" : "NONE",
      remaining: credits,
      quotaUsed: 0,
      quotaTotal: 0,
      credits,
    };
  }

  let quotaUsed = subscription.importQuotaUsed;
  const quotaTotal = subscription.plan.importQuota;

  if (isNewMonth(subscription.importQuotaResetAt)) {
    await prisma.subscription.update({
      where: { userId },
      data: { importQuotaUsed: 0, importQuotaResetAt: new Date() },
    });
    quotaUsed = 0;
  }

  const quotaRemaining = Math.max(0, quotaTotal - quotaUsed);

  if (quotaRemaining > 0) {
    return {
      allowed: true,
      source: "SUBSCRIPTION",
      remaining: quotaRemaining,
      quotaUsed,
      quotaTotal,
      credits,
    };
  }

  if (credits > 0) {
    return {
      allowed: true,
      source: "CREDITS",
      remaining: credits,
      quotaUsed,
      quotaTotal,
      credits,
    };
  }

  return {
    allowed: false,
    source: "NONE",
    remaining: 0,
    quotaUsed,
    quotaTotal,
    credits,
  };
}

export async function consumeImportQuota(workspaceId: string, userId: string, source: QuotaSource): Promise<void> {
  if (source === "SUBSCRIPTION") {
    await prisma.subscription.update({
      where: { userId },
      data: { importQuotaUsed: { increment: 1 } },
    });
    return;
  }

  if (source === "CREDITS") {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { importCredits: true },
    });

    if (user && user.importCredits > 0) {
      await prisma.user.update({
        where: { id: userId },
        data: { importCredits: { decrement: 1 } },
      });
    } else {
      await prisma.workspace.update({
        where: { id: workspaceId },
        data: { importCredits: { decrement: 1 } },
      });
    }
    return;
  }
}

export async function getWorkspaceImportBalance(workspaceId: string, userId: string): Promise<QuotaCheckResult> {
  return checkImportQuota(workspaceId, userId);
}
