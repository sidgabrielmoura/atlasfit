import prisma from "@/lib/prisma";

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

/**
 * Calculates current total storage used by a workspace (in bytes)
 */
export async function getWorkspaceStorageBytes(workspaceId: string): Promise<{ totalBytes: number; fileCount: number }> {
  // 1. Files uploaded in StudentFile
  const studentFiles = await prisma.studentFile.findMany({
    where: { workspaceId },
    select: { size: true },
  });

  // 2. Progress Photos uploaded in StudentProgressPhoto
  const progressPhotos = await prisma.studentProgressPhoto.findMany({
    where: { workspaceId },
    select: { size: true },
  });

  let totalBytes = 0;
  let fileCount = 0;

  for (const f of studentFiles) {
    fileCount++;
    totalBytes += f.size || 0;
  }

  for (const p of progressPhotos) {
    fileCount++;
    totalBytes += p.size || 0;
  }

  return { totalBytes, fileCount };
}

/**
 * Calculates storage metrics for a specific Personal Trainer
 */
export async function getPersonalTrainerStorageMetrics(userId: string): Promise<PersonalStorageMetric> {
  let user: any = null;
  try {
    user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        isTestAccount: true,
        freeTrial: {
          select: { isActive: true },
        },
        workspaces: {
          select: { workspaceId: true },
        },
        subscription: {
          include: { plan: true },
        },
      },
    });
  } catch (err: any) {
    // Fallback if production DB hasn't run migration for new Plan columns like storageLimitMb
    console.warn(`[Storage Quota] Fallback query for user ${userId} due to DB schema version:`, err?.message);
    user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        isTestAccount: true,
        freeTrial: {
          select: { isActive: true },
        },
        workspaces: {
          select: { workspaceId: true },
        },
        subscription: {
          select: {
            id: true,
            status: true,
            plan: {
              select: {
                id: true,
                name: true,
                price: true,
                interval: true,
                features: true,
                maxWorkspaces: true,
                maxStudents: true,
                importQuota: true,
              },
            },
          },
        },
      },
    });
  }

  if (!user) {
    throw new Error("Usuário não encontrado.");
  }

  const workspaceIds = user.workspaces ? user.workspaces.map((w: any) => w.workspaceId) : [];
  let totalUsedBytes = 0;
  let totalFiles = 0;

  for (const wsId of workspaceIds) {
    try {
      const usage = await getWorkspaceStorageBytes(wsId);
      totalUsedBytes += usage.totalBytes;
      totalFiles += usage.fileCount;
    } catch (wsErr) {
      console.warn(`[Storage Quota] Erro ao buscar espaço do workspace ${wsId}:`, wsErr);
    }
  }

  const plan = user.subscription?.plan;
  let planName = plan?.name;
  if (!planName) {
    if (user.freeTrial?.isActive) {
      planName = "Período de Teste (Trial)";
    } else if (user.isTestAccount) {
      planName = "Conta Teste";
    } else {
      planName = "Sem Plano";
    }
  }

  const storageLimitMb = plan?.storageLimitMb ?? 1024; // Default: 1 GB
  const isUnlimited = storageLimitMb === 0;

  const totalUsedMb = parseFloat((totalUsedBytes / (1024 * 1024)).toFixed(2));
  const totalUsedGb = parseFloat((totalUsedMb / 1024).toFixed(3));

  let percentageUsed = 0;
  if (!isUnlimited && storageLimitMb > 0) {
    percentageUsed = parseFloat(((totalUsedMb / storageLimitMb) * 100).toFixed(1));
  }

  let status: "NORMAL" | "WARNING" | "EXCEEDED" = "NORMAL";
  if (!isUnlimited) {
    if (percentageUsed >= 100) {
      status = "EXCEEDED";
    } else if (percentageUsed >= 80) {
      status = "WARNING";
    }
  }

  return {
    userId: user.id,
    name: user.name || "Personal Trainer",
    email: user.email || "Sem e-mail",
    planName,
    storageLimitMb,
    isUnlimited,
    totalUsedBytes,
    totalUsedMb,
    totalUsedGb,
    percentageUsed,
    totalFiles,
    workspacesCount: workspaceIds.length,
    status,
    isTestAccount: !!user.isTestAccount,
    isFreeTrial: !!user.freeTrial?.isActive,
  };
}

/**
 * Calculates storage metrics for all Personal Trainers (for Superadmin Storage Dashboard)
 */
export async function getAllPersonalsStorageMetrics(): Promise<PersonalStorageMetric[]> {
  try {
    const trainers = await prisma.user.findMany({
      where: {
        OR: [
          { role: "TRAINER" },
          { role: "USER" },
          { isTestAccount: true },
          { workspaces: { some: {} } },
        ],
        NOT: {
          role: "STUDENT",
        },
      },
      select: { id: true },
    });

    console.log(`[Storage Quota] Personais encontrados na busca: ${trainers.length}`);

    const results: PersonalStorageMetric[] = [];
    for (const t of trainers) {
      try {
        const metric = await getPersonalTrainerStorageMetrics(t.id);
        results.push(metric);
      } catch (e) {
        console.error(`[Storage Quota Error] Falha ao gerar métricas para usuário ${t.id}:`, e);
      }
    }

    console.log(`[Storage Quota] Métricas processadas com sucesso: ${results.length}`);
    return results;
  } catch (err) {
    console.error("[Storage Quota Fatal Error] Falha na consulta de personais:", err);
    return [];
  }
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
