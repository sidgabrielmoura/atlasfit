import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export type QuotaSource = "SUBSCRIPTION" | "CREDITS" | "COMBINED" | "NONE";

export interface QuotaCheckResult {
  allowed: boolean;
  source: QuotaSource;
  remaining: number;          // Total de créditos disponíveis (franquia + créditos avulsos)
  quotaRemaining: number;     // Saldo restante da franquia do plano
  quotaUsed: number;          // Quantidade de créditos consumidos da franquia
  quotaTotal: number;         // Quota total contratada no plano
  credits: number;            // Saldo de créditos avulsos
  totalAvailable: number;     // Total de créditos disponíveis
}

export interface DeductCreditsResult {
  success: boolean;
  deductedFromSubscription: number;
  deductedFromCredits: number;
  remainingTotal: number;
  error?: string;
}

function isNewMonth(resetAt: Date | null): boolean {
  if (!resetAt) return true;
  const now = new Date();
  return now.getFullYear() !== resetAt.getFullYear() || now.getMonth() !== resetAt.getMonth();
}

/**
 * Consulta o saldo atual de créditos do personal/workspace, combinando franquia do plano e créditos avulsos.
 */
export async function checkImportQuota(workspaceId: string, userId: string): Promise<QuotaCheckResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { importCredits: true },
  });

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      type: true,
      importCredits: true,
      subscription: {
        include: { plan: { select: { importQuota: true } } },
      },
    },
  });

  const userCredits = user?.importCredits ?? 0;
  const wsCredits = workspace?.importCredits ?? 0;
  const credits = workspace?.type === "GYM" ? wsCredits : (wsCredits > 0 ? wsCredits : userCredits);

  let subscription: any = null;
  if (workspace?.type !== "GYM") {
    subscription = await prisma.subscription.findUnique({
      where: { userId },
      include: { plan: { select: { importQuota: true } } },
    });
  }

  if (!subscription) {
    const totalAvailable = credits;
    return {
      allowed: totalAvailable > 0,
      source: totalAvailable > 0 ? "CREDITS" : "NONE",
      remaining: totalAvailable,
      quotaRemaining: 0,
      quotaUsed: 0,
      quotaTotal: 0,
      credits,
      totalAvailable,
    };
  }

  let quotaUsed = subscription.importQuotaUsed;
  const quotaTotal = subscription.plan?.importQuota ?? 0;

  if (isNewMonth(subscription.importQuotaResetAt)) {
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { importQuotaUsed: 0, importQuotaResetAt: new Date() },
    });
    quotaUsed = 0;
  }

  const quotaRemaining = Math.max(0, quotaTotal - quotaUsed);
  const totalAvailable = quotaRemaining + credits;

  let source: QuotaSource = "NONE";
  if (quotaRemaining > 0 && credits > 0) source = "COMBINED";
  else if (quotaRemaining > 0) source = "SUBSCRIPTION";
  else if (credits > 0) source = "CREDITS";

  return {
    allowed: totalAvailable > 0,
    source,
    remaining: totalAvailable,
    quotaRemaining,
    quotaUsed,
    quotaTotal,
    credits,
    totalAvailable,
  };
}

/**
 * Debita atomicamente uma quantidade exata de créditos da conta do personal/workspace.
 * Consome prioritariamente a franquia mensal do plano; o excedente é debitado dos créditos avulsos.
 * Se o saldo total for insuficiente, nenhum débito é efetuado e a operação falha de forma segura.
 */
export async function deductImportCredits(
  workspaceId: string,
  userId: string,
  creditsToDeduct: number
): Promise<DeductCreditsResult> {
  if (creditsToDeduct <= 0) {
    const current = await checkImportQuota(workspaceId, userId);
    return {
      success: true,
      deductedFromSubscription: 0,
      deductedFromCredits: 0,
      remainingTotal: current.totalAvailable,
    };
  }

  return await prisma.$transaction(
    async (tx) => {
      // 1. Lock no usuário e no workspace para concorrência segura
      await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${userId} FOR UPDATE`;
      await tx.$queryRaw`SELECT "id" FROM "Workspace" WHERE "id" = ${workspaceId} FOR UPDATE`;

      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { importCredits: true },
      });
      const workspace = await tx.workspace.findUnique({
        where: { id: workspaceId },
        select: {
          type: true,
          importCredits: true,
          subscription: {
            include: { plan: { select: { importQuota: true } } },
          },
        },
      });

      const userCredits = user?.importCredits ?? 0;
      const wsCredits = workspace?.importCredits ?? 0;
      const credits = workspace?.type === "GYM" ? wsCredits : (wsCredits > 0 ? wsCredits : userCredits);

      // 2. Lock na assinatura do plano se existir (apenas para personal, model Subscription)
      let subscription: any = null;
      if (workspace?.type !== "GYM") {
        subscription = await tx.subscription.findUnique({
          where: { userId },
          include: { plan: { select: { importQuota: true } } },
        });
      }

      let quotaRemaining = 0;
      let subscriptionId: string | null = null;

      if (subscription) {
        subscriptionId = subscription.id;
        let quotaUsed = subscription.importQuotaUsed;
        if (isNewMonth(subscription.importQuotaResetAt)) {
          quotaUsed = 0;
          await tx.subscription.update({
            where: { id: subscription.id },
            data: { importQuotaUsed: 0, importQuotaResetAt: new Date() },
          });
        }
        quotaRemaining = Math.max(0, (subscription.plan?.importQuota ?? 0) - quotaUsed);
      }

      const totalAvailable = quotaRemaining + credits;

      if (totalAvailable < creditsToDeduct) {
        return {
          success: false,
          deductedFromSubscription: 0,
          deductedFromCredits: 0,
          remainingTotal: totalAvailable,
          error: "INSUFFICIENT_CREDITS",
        };
      }

      // Consome primeiro da franquia
      const fromSubscription = Math.min(quotaRemaining, creditsToDeduct);
      const fromCredits = creditsToDeduct - fromSubscription;

      if (fromSubscription > 0 && subscriptionId) {
        await tx.subscription.update({
          where: { id: subscriptionId },
          data: { importQuotaUsed: { increment: fromSubscription } },
        });
      }

      if (fromCredits > 0) {
        if (wsCredits >= fromCredits) {
          await tx.workspace.update({
            where: { id: workspaceId },
            data: { importCredits: { decrement: fromCredits } },
          });
        } else {
          await tx.user.update({
            where: { id: userId },
            data: { importCredits: { decrement: fromCredits } },
          });
          if (wsCredits > 0) {
            await tx.workspace.update({
              where: { id: workspaceId },
              data: { importCredits: 0 },
            });
          }
        }
      }

      const remainingTotal = totalAvailable - creditsToDeduct;

      return {
        success: true,
        deductedFromSubscription: fromSubscription,
        deductedFromCredits: fromCredits,
        remainingTotal,
      };
    },
    { maxWait: 10000, timeout: 20000 }
  );
}


/**
 * Função de retrocompatibilidade para códigos legados que consumiam quota avulsa (1 crédito).
 */
export async function consumeImportQuota(
  workspaceId: string,
  userId: string,
  source?: QuotaSource
): Promise<void> {
  await deductImportCredits(workspaceId, userId, 1);
}

export async function getWorkspaceImportBalance(
  workspaceId: string,
  userId: string
): Promise<QuotaCheckResult> {
  return checkImportQuota(workspaceId, userId);
}
