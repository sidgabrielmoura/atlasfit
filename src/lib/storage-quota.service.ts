import prisma from "@/lib/prisma";
import { gymStorageUsage } from "@/modules/workspaces/application/gym-storage";
import { WorkspaceAccessError } from "@/modules/workspaces/domain/types";

export interface PersonalStorageMetric {
  userId: string;
  name: string;
  email: string;
  planName: string;
  storageLimitMb: number;
  isUnlimited: boolean;
  totalUsedBytes: number;
  totalUsedMb: number;
  totalUsedGb: number;
  percentageUsed: number;
  totalFiles: number;
  workspacesCount: number;
  status: "NORMAL" | "WARNING" | "EXCEEDED";
  isTestAccount: boolean;
  isFreeTrial: boolean;
}

export interface StorageCheckResult {
  allowed: boolean;
  reason?: "STORAGE_EXCEEDED" | "OK";
  message?: string;
  currentUsedMb: number;
  limitMb: number;
  percentageUsed: number;
}

import {
  calculateSingleWorkspaceStorageUsage,
  getAccountStorageQuotaMetrics,
} from "@/lib/comprehensive-storage.service";

/**
 * Calculates current total storage used by a workspace (in bytes)
 */
export async function getWorkspaceStorageBytes(workspaceId: string): Promise<{ totalBytes: number; fileCount: number }> {
  const usage = await calculateSingleWorkspaceStorageUsage(workspaceId);
  return {
    totalBytes: usage.totalUsedBytes,
    fileCount: usage.breakdown.cloud.totalFilesCount,
  };
}

/**
 * Calculates storage metrics for a specific Personal Trainer across all workspaces
 */
export async function getPersonalTrainerStorageMetrics(userId: string): Promise<PersonalStorageMetric> {
  const metric = await getAccountStorageQuotaMetrics(userId);
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true, isTestAccount: true, freeTrial: { select: { isActive: true } } },
  });

  return {
    userId: metric.userId,
    name: user?.name || "Personal Trainer",
    email: user?.email || "Sem e-mail",
    planName: metric.planName,
    storageLimitMb: metric.storageLimitMb,
    isUnlimited: metric.isUnlimited,
    totalUsedBytes: metric.totalUsedBytes,
    totalUsedMb: metric.totalUsedMb,
    totalUsedGb: metric.totalUsedGb,
    percentageUsed: metric.percentageUsed,
    totalFiles: metric.breakdown.cloud.totalFilesCount,
    workspacesCount: metric.workspacesCount,
    status: metric.status,
    isTestAccount: !!user?.isTestAccount,
    isFreeTrial: !!user?.freeTrial?.isActive,
  };
}

/**
 * Checks storage quota before performing uploads or imports.
 * Automatically generates notifications when reaching 80% and 100%.
 */
export async function checkStorageQuota(
  workspaceId: string,
  userId?: string,
  fileSizeBytesToAdd: number = 0
): Promise<StorageCheckResult> {
  if (!Number.isSafeInteger(fileSizeBytesToAdd) || fileSizeBytesToAdd < 0) throw new Error("Tamanho de arquivo inválido.");
  const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { type: true, isActive: true, subscription: { select: { storageLimitMb: true, status: true, trialEndsAt: true, endDate: true } } } });
  if (!workspace) throw new Error("Workspace não encontrado.");
  if (workspace.type === "GYM") {
    const subscription = workspace.subscription;
    const now = new Date();
    const entitled = workspace.isActive && Boolean(subscription && (!subscription.endDate || subscription.endDate > now) && (subscription.status === "ACTIVE" || (subscription.status === "TRIAL" && subscription.trialEndsAt && subscription.trialEndsAt > now)));
    const limitMb = subscription?.storageLimitMb ?? 0;
    let usage: bigint;
    try { usage = await gymStorageUsage(prisma, workspaceId); }
    catch (error) {
      if (!(error instanceof WorkspaceAccessError)) throw error;
      return { allowed: false, reason: "STORAGE_EXCEEDED", message: error.message, currentUsedMb: 0, limitMb, percentageUsed: 100 };
    }
    const currentUsedMb = Number(usage) / (1024 * 1024);
    const percentageUsed = limitMb > 0 ? currentUsedMb / limitMb * 100 : 100;
    const allowed = entitled && usage + BigInt(fileSizeBytesToAdd) <= BigInt(limitMb) * BigInt(1024 * 1024);
    return { allowed, reason: allowed ? "OK" : "STORAGE_EXCEEDED", message: allowed ? undefined : "Licença ou armazenamento da academia indisponível.", currentUsedMb, limitMb, percentageUsed };
  }
  // Find owner/trainer of the workspace if userId not provided
  let targetUserId = userId;

  if (!targetUserId) {
    const ownerMember = await prisma.workspaceMember.findFirst({
      where: { workspaceId, role: "OWNER", isActive: true },
      select: { userId: true },
    });
    targetUserId = ownerMember?.userId;
  }

  if (!targetUserId) {
    // If no target user found, default allow
    return { allowed: true, currentUsedMb: 0, limitMb: 1024, percentageUsed: 0 };
  }

  const metric = await getPersonalTrainerStorageMetrics(targetUserId);

  if (metric.isUnlimited) {
    return {
      allowed: true,
      currentUsedMb: metric.totalUsedMb,
      limitMb: metric.storageLimitMb,
      percentageUsed: 0,
    };
  }

  const newTotalBytes = metric.totalUsedBytes + fileSizeBytesToAdd;
  const newTotalMb = newTotalBytes / (1024 * 1024);
  const newPercentage = parseFloat(((newTotalMb / metric.storageLimitMb) * 100).toFixed(1));

  // Check if limit exceeded
  if (newTotalMb > metric.storageLimitMb) {
    // Create warning notification for Personal Trainer if not sent recently
    await notifyStorageLimitReached(targetUserId, workspaceId, metric.storageLimitMb);

    return {
      allowed: false,
      reason: "STORAGE_EXCEEDED",
      message: `Limite de armazenamento do seu plano (${metric.storageLimitMb} MB) foi atingido. Faça upgrade para continuar enviando arquivos.`,
      currentUsedMb: metric.totalUsedMb,
      limitMb: metric.storageLimitMb,
      percentageUsed: newPercentage,
    };
  }

  // If 80% threshold reached, trigger warning notification
  if (newPercentage >= 80) {
    await notifyStorageWarning(targetUserId, workspaceId, newPercentage, metric.storageLimitMb);
  }

  return {
    allowed: true,
    reason: "OK",
    currentUsedMb: metric.totalUsedMb,
    limitMb: metric.storageLimitMb,
    percentageUsed: newPercentage,
  };
}

/**
 * Creates notification for storage warning (80%+)
 */
async function notifyStorageWarning(userId: string, workspaceId: string, percentage: number, limitMb: number) {
  const existingToday = await prisma.notification.findFirst({
    where: {
      userId,
      type: "STORAGE_WARNING",
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
  });

  if (!existingToday) {
    await prisma.notification.create({
      data: {
        userId,
        workspaceId,
        type: "STORAGE_WARNING",
        category: "SISTEMA",
        title: "Aviso de Armazenamento (80%)",
        description: `Seu armazenamento atingiu ${percentage}% da cota de ${limitMb} MB. Considere liberar espaço ou atualizar seu plano.`,
        priority: "HIGH",
        deepLink: "/personal/subscription",
      },
    });
  }
}

/**
 * Creates notification for storage limit reached (100%)
 */
async function notifyStorageLimitReached(userId: string, workspaceId: string, limitMb: number) {
  const existingToday = await prisma.notification.findFirst({
    where: {
      userId,
      type: "STORAGE_EXCEEDED",
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
  });

  if (!existingToday) {
    await prisma.notification.create({
      data: {
        userId,
        workspaceId,
        type: "STORAGE_EXCEEDED",
        category: "SISTEMA",
        title: "Armazenamento Lotado (100%)",
        description: `Sua cota de armazenamento de ${limitMb} MB foi esgotada. Novos envios de fotos, arquivos e importações foram pausados.`,
        priority: "URGENT",
        deepLink: "/personal/subscription",
      },
    });

    // Log in AuditLog for Superadmin
    await prisma.auditLog.create({
      data: {
        userId,
        action: "STORAGE_EXCEEDED",
        entity: "USER_STORAGE",
        entityId: userId,
        severity: "warning",
      },
    });
  }
}
