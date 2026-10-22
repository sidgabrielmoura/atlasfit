import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

/**
 * Constantes de peso em bytes para armazenamento de dados estruturados no banco de dados.
 * Baseado no footprint médio de tabelas relacionais PostgreSQL + índices B-Tree + TOAST.
 */
export const DB_FOOTPRINT_BYTES = {
  // Aluno: perfil do aluno, membro de workspace, dados de onboarding e anamnese
  STUDENT: 100 * 1024, // 100 KB
  // Treino: cabeçalho + WorkoutExercise (séries, repetições, tempos de descanso e cargas)
  WORKOUT: 40 * 1024, // 40 KB
  // Exercício próprio do catálogo (instruções, links, grupo muscular)
  CATALOG_EXERCISE: 15 * 1024, // 15 KB
  // Execução de treino (WorkoutLog: histórico de cargas reais anotadas, feedback e repetições)
  WORKOUT_LOG: 10 * 1024, // 10 KB
  // Avaliação física completa (Pollock, dobras cutâneas, bioimpedância, gráficos)
  PHYSICAL_EVALUATION: 30 * 1024, // 30 KB
  // Registro de evolução corporal (StudentProgress: pesagens, medidas e histórico)
  STUDENT_PROGRESS: 5 * 1024, // 5 KB
  // Mensagem de chat entre aluno e profissional (Message de texto)
  CHAT_MESSAGE: 2 * 1024, // 2 KB
  // Feedback diário ou solicitação de ajuste (DailyFeedback, ExerciseAdjustmentRequest)
  FEEDBACK_AND_ADJUSTMENT: 8 * 1024, // 8 KB
  // Imagem de branding do workspace (logo, marca d'água, capa de treino, avatar)
  WORKSPACE_BRAND_ASSET: 350 * 1024, // 350 KB
  // Estimativa para anexo de chat
  CHAT_ATTACHMENT_ESTIMATE: 500 * 1024, // 500 KB
} as const;

export interface StorageBreakdown {
  cloud: {
    totalBytes: number;
    totalMb: number;
    totalGb: number;
    filesBytes: number;
    filesCount: number;
    photosBytes: number;
    photosCount: number;
    videosBytes: number;
    videosCount: number;
    importsBytes: number;
    importsCount: number;
    gymObjectsBytes: number;
    gymObjectsCount: number;
    brandAssetsBytes: number;
    brandAssetsCount: number;
    chatAttachmentsBytes: number;
    chatAttachmentsCount: number;
    totalFilesCount: number;
  };
  database: {
    totalBytes: number;
    totalMb: number;
    totalGb: number;
    studentsBytes: number;
    studentsCount: number;
    workoutsBytes: number;
    workoutsCount: number;
    exercisesBytes: number;
    exercisesCount: number;
    workoutLogsBytes: number;
    workoutLogsCount: number;
    evaluationsBytes: number;
    evaluationsCount: number;
    progressBytes: number;
    progressCount: number;
    messagesBytes: number;
    messagesCount: number;
    feedbacksBytes: number;
    feedbacksCount: number;
    totalRecordsCount: number;
  };
}

export interface ComprehensiveStorageMetric {
  userId: string;
  planName: string;
  storageLimitMb: number;
  storageLimitGb: number;
  isUnlimited: boolean;

  // Totais consolidados
  totalUsedBytes: number;
  totalUsedMb: number;
  totalUsedGb: number;
  percentageUsed: number;
  status: "NORMAL" | "WARNING" | "EXCEEDED";

  // Detalhamento
  breakdown: StorageBreakdown;

  // Workspaces abrangidos
  workspacesCount: number;
  workspaceIds: string[];
}

/**
 * Retorna os IDs de todos os workspaces pertencentes ou gerenciados como OWNER pelo usuário.
 */
export async function getOwnedWorkspaceIds(userId: string): Promise<string[]> {
  const workspaces = await prisma.workspace.findMany({
    where: {
      OR: [
        { ownerId: userId },
        { members: { some: { userId, role: "OWNER", isActive: true } } },
      ],
    },
    select: { id: true },
  });

  return Array.from(new Set(workspaces.map((w) => w.id)));
}

/**
 * Calcula o consumo de armazenamento consolidado para uma lista de workspaces e o respectivo usuário.
 */
export async function calculateWorkspacesStorageUsage(
  workspaceIds: string[],
  userId?: string
): Promise<{
  totalUsedBytes: number;
  totalUsedMb: number;
  totalUsedGb: number;
  breakdown: StorageBreakdown;
}> {
  if (workspaceIds.length === 0) {
    return {
      totalUsedBytes: 0,
      totalUsedMb: 0,
      totalUsedGb: 0,
      breakdown: {
        cloud: {
          totalBytes: 0,
          totalMb: 0,
          totalGb: 0,
          filesBytes: 0,
          filesCount: 0,
          photosBytes: 0,
          photosCount: 0,
          videosBytes: 0,
          videosCount: 0,
          importsBytes: 0,
          importsCount: 0,
          gymObjectsBytes: 0,
          gymObjectsCount: 0,
          brandAssetsBytes: 0,
          brandAssetsCount: 0,
          chatAttachmentsBytes: 0,
          chatAttachmentsCount: 0,
          totalFilesCount: 0,
        },
        database: {
          totalBytes: 0,
          totalMb: 0,
          totalGb: 0,
          studentsBytes: 0,
          studentsCount: 0,
          workoutsBytes: 0,
          workoutsCount: 0,
          exercisesBytes: 0,
          exercisesCount: 0,
          workoutLogsBytes: 0,
          workoutLogsCount: 0,
          evaluationsBytes: 0,
          evaluationsCount: 0,
          progressBytes: 0,
          progressCount: 0,
          messagesBytes: 0,
          messagesCount: 0,
          feedbacksBytes: 0,
          feedbacksCount: 0,
          totalRecordsCount: 0,
        },
      },
    };
  }

  const wsWhere = { workspaceId: { in: workspaceIds } };

  // Consultas paralelas em lote para máxima performance
  const [
    filesAgg,
    photosAgg,
    videosAgg,
    importsAgg,
    gymObjectsAgg,
    workspacesBrand,
    chatAttachmentsCount,
    studentsCount,
    workoutsCount,
    exercisesCount,
    workoutLogsCount,
    evaluationsCount,
    progressCount,
    messagesCount,
    dailyFeedbacksCount,
    adjustmentRequestsCount,
  ] = await Promise.all([
    // 1. Arquivos de alunos (PDFs, exames, docs)
    prisma.studentFile.aggregate({
      where: wsWhere,
      _sum: { size: true },
      _count: { _all: true },
    }),

    // 2. Fotos de evolução física
    prisma.studentProgressPhoto.aggregate({
      where: wsWhere,
      _sum: { size: true },
      _count: { _all: true },
    }),

    // 3. Vídeos de treino do personal/workspace
    prisma.trainerVideo.aggregate({
      where: userId
        ? {
            OR: [
              { workspaceId: { in: workspaceIds } },
              { trainerId: userId },
            ],
          }
        : wsWhere,
      _sum: { fileSize: true },
      _count: { _all: true },
    }),

    // 4. Arquivos/fontes de importação
    prisma.importSource.aggregate({
      where: {
        importJob: { workspaceId: { in: workspaceIds } },
        storageKey: { not: null },
      },
      _sum: { sizeBytes: true },
      _count: { _all: true },
    }),

    // 5. Objetos de storage de academias (ledger R2)
    prisma.gymStorageObject.aggregate({
      where: {
        workspaceId: { in: workspaceIds },
        status: { not: "DELETED" },
      },
      _sum: { size: true },
      _count: { _all: true },
    }),

    // 6. Assets de marca dos workspaces
    prisma.workspace.findMany({
      where: { id: { in: workspaceIds } },
      select: { logoKey: true, watermarkKey: true, workoutCoverKey: true },
    }),

    // 7. Anexos de chat
    prisma.message.count({
      where: {
        conversation: { workspaceId: { in: workspaceIds } },
        attachment: { not: Prisma.JsonNull },
      },
    }),

    // 8. Alunos cadastrados
    prisma.workspaceMember.count({
      where: {
        workspaceId: { in: workspaceIds },
        role: "STUDENT",
      },
    }),

    // 9. Treinos cadastrados
    prisma.workout.count({
      where: wsWhere,
    }),

    // 10. Exercícios próprios criados
    userId
      ? prisma.exercise.count({
          where: { creatorId: userId },
        })
      : Promise.resolve(0),

    // 11. Logs de execução de treinos
    prisma.workoutLog.count({
      where: wsWhere,
    }),

    // 12. Avaliações físicas
    prisma.physicalEvaluation.count({
      where: wsWhere,
    }),

    // 13. Histórico de peso/progresso
    prisma.studentProgress.count({
      where: wsWhere,
    }),

    // 14. Mensagens de chat trocadas
    prisma.message.count({
      where: {
        conversation: { workspaceId: { in: workspaceIds } },
      },
    }),

    // 15. Feedbacks diários de alunos
    prisma.dailyFeedback.count({
      where: wsWhere,
    }),

    // 16. Solicitações de ajustes de exercício
    prisma.exerciseAdjustmentRequest.count({
      where: {
        requester: {
          workspaces: {
            some: { workspaceId: { in: workspaceIds } },
          },
        },
      },
    }),
  ]);

  // Contagem de assets de marca (workspace + avatar do usuário)
  let brandAssetsCount = 0;
  for (const ws of workspacesBrand) {
    if (ws.logoKey) brandAssetsCount++;
    if (ws.watermarkKey) brandAssetsCount++;
    if (ws.workoutCoverKey) brandAssetsCount++;
  }

  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { imageKey: true },
    });
    if (user?.imageKey) brandAssetsCount++;
  }

  // Cálculos de Mídia em Nuvem (Cloudflare R2 / S3)
  const filesBytes = filesAgg._sum?.size || 0;
  const filesCount = filesAgg._count?._all || 0;

  const photosBytes = photosAgg._sum?.size || 0;
  const photosCount = photosAgg._count?._all || 0;

  const videosBytes = videosAgg._sum?.fileSize || 0;
  const videosCount = videosAgg._count?._all || 0;

  const importsBytes = importsAgg._sum?.sizeBytes || 0;
  const importsCount = importsAgg._count?._all || 0;

  const gymObjectsBytes = gymObjectsAgg._sum?.size ? Number(gymObjectsAgg._sum.size) : 0;
  const gymObjectsCount = gymObjectsAgg._count?._all || 0;

  const brandAssetsBytes = brandAssetsCount * DB_FOOTPRINT_BYTES.WORKSPACE_BRAND_ASSET;
  const chatAttachmentsBytes = chatAttachmentsCount * DB_FOOTPRINT_BYTES.CHAT_ATTACHMENT_ESTIMATE;

  const totalCloudBytes =
    filesBytes +
    photosBytes +
    videosBytes +
    importsBytes +
    gymObjectsBytes +
    brandAssetsBytes +
    chatAttachmentsBytes;

  const totalFilesCount =
    filesCount +
    photosCount +
    videosCount +
    importsCount +
    gymObjectsCount +
    brandAssetsCount +
    chatAttachmentsCount;

  // Cálculos de Dados Estruturados (PostgreSQL Database Footprint)
  const studentsBytes = studentsCount * DB_FOOTPRINT_BYTES.STUDENT;
  const workoutsBytes = workoutsCount * DB_FOOTPRINT_BYTES.WORKOUT;
  const exercisesBytes = exercisesCount * DB_FOOTPRINT_BYTES.CATALOG_EXERCISE;
  const workoutLogsBytes = workoutLogsCount * DB_FOOTPRINT_BYTES.WORKOUT_LOG;
  const evaluationsBytes = evaluationsCount * DB_FOOTPRINT_BYTES.PHYSICAL_EVALUATION;
  const progressBytes = progressCount * DB_FOOTPRINT_BYTES.STUDENT_PROGRESS;
  const messagesBytes = messagesCount * DB_FOOTPRINT_BYTES.CHAT_MESSAGE;
  const feedbacksCount = dailyFeedbacksCount + adjustmentRequestsCount;
  const feedbacksBytes = feedbacksCount * DB_FOOTPRINT_BYTES.FEEDBACK_AND_ADJUSTMENT;

  const totalDatabaseBytes =
    studentsBytes +
    workoutsBytes +
    exercisesBytes +
    workoutLogsBytes +
    evaluationsBytes +
    progressBytes +
    messagesBytes +
    feedbacksBytes;

  const totalRecordsCount =
    studentsCount +
    workoutsCount +
    exercisesCount +
    workoutLogsCount +
    evaluationsCount +
    progressCount +
    messagesCount +
    feedbacksCount;

  // Totais Finais
  const totalUsedBytes = totalCloudBytes + totalDatabaseBytes;
  const totalUsedMb = parseFloat((totalUsedBytes / (1024 * 1024)).toFixed(2));
  const totalUsedGb = parseFloat((totalUsedBytes / (1024 * 1024 * 1024)).toFixed(3));

  return {
    totalUsedBytes,
    totalUsedMb,
    totalUsedGb,
    breakdown: {
      cloud: {
        totalBytes: totalCloudBytes,
        totalMb: parseFloat((totalCloudBytes / (1024 * 1024)).toFixed(2)),
        totalGb: parseFloat((totalCloudBytes / (1024 * 1024 * 1024)).toFixed(3)),
        filesBytes,
        filesCount,
        photosBytes,
        photosCount,
        videosBytes,
        videosCount,
        importsBytes,
        importsCount,
        gymObjectsBytes,
        gymObjectsCount,
        brandAssetsBytes,
        brandAssetsCount,
        chatAttachmentsBytes,
        chatAttachmentsCount,
        totalFilesCount,
      },
      database: {
        totalBytes: totalDatabaseBytes,
        totalMb: parseFloat((totalDatabaseBytes / (1024 * 1024)).toFixed(2)),
        totalGb: parseFloat((totalDatabaseBytes / (1024 * 1024 * 1024)).toFixed(3)),
        studentsBytes,
        studentsCount,
        workoutsBytes,
        workoutsCount,
        exercisesBytes,
        exercisesCount,
        workoutLogsBytes,
        workoutLogsCount,
        evaluationsBytes,
        evaluationsCount,
        progressBytes,
        progressCount,
        messagesBytes,
        messagesCount,
        feedbacksBytes,
        feedbacksCount,
        totalRecordsCount,
      },
    },
  };
}

/**
 * Calcula o consumo de um único workspace específico (usado na página de detalhes do Superadmin).
 */
export async function calculateSingleWorkspaceStorageUsage(workspaceId: string) {
  const result = await calculateWorkspacesStorageUsage([workspaceId]);
  return {
    workspaceId,
    ...result,
  };
}

/**
 * Normaliza o limite de armazenamento em MB.
 * Valores <= 50 informados pelo usuário são convertidos automaticamente para GB em MB (ex: 3 -> 3072 MB).
 */
export function normalizeStorageLimitMb(rawLimit: number | null | undefined): number {
  if (typeof rawLimit !== "number" || isNaN(rawLimit) || rawLimit <= 0) {
    return 1024; // Default 1 GB
  }
  if (rawLimit <= 50) {
    return rawLimit * 1024;
  }
  return rawLimit;
}

/**
 * Obtém as métricas completas de cota de armazenamento para um Personal Trainer / Administrador,
 * consolidando TODOS os seus workspaces e relacionando com seu plano atual.
 */
export async function getAccountStorageQuotaMetrics(userId: string): Promise<ComprehensiveStorageMetric> {
  const [user, workspaceIds] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        isTestAccount: true,
        freeTrial: { select: { isActive: true } },
        subscription: { include: { plan: true } },
      },
    }),
    getOwnedWorkspaceIds(userId),
  ]);

  if (!user) {
    throw new Error("Usuário não encontrado.");
  }

  // Buscar assinatura do workspace se não houver assinatura pessoal
  let plan = user.subscription?.plan;
  let rawLimitMb = plan?.storageLimitMb;
  let planName = plan?.name;

  if (!plan) {
    const wsSub = await prisma.workspaceSubscription.findFirst({
      where: { workspaceId: { in: workspaceIds } },
      include: { plan: true },
    });
    if (wsSub) {
      plan = wsSub.plan as any;
      rawLimitMb = wsSub.plan?.storageLimitMb || wsSub.storageLimitMb;
      planName = wsSub.plan?.name || "Plano do Workspace";
    }
  }

  if (!planName) {
    if (user.freeTrial?.isActive) {
      planName = "Período de Teste (Trial)";
      rawLimitMb = 5120; // 5 GB
    } else if (user.isTestAccount) {
      planName = "Conta Teste";
      rawLimitMb = 102400; // 100 GB
    } else {
      planName = "Sem Plano";
      rawLimitMb = 1024; // 1 GB
    }
  }

  const storageLimitMb = normalizeStorageLimitMb(rawLimitMb);
  const isUnlimited = rawLimitMb === 0;
  const storageLimitGb = parseFloat((storageLimitMb / 1024).toFixed(1));

  // Cálculo real sobre todos os workspaces
  const { totalUsedBytes, totalUsedMb, totalUsedGb, breakdown } =
    await calculateWorkspacesStorageUsage(workspaceIds, userId);

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
    planName,
    storageLimitMb,
    storageLimitGb,
    isUnlimited,
    totalUsedBytes,
    totalUsedMb,
    totalUsedGb,
    percentageUsed,
    status,
    breakdown,
    workspacesCount: workspaceIds.length,
    workspaceIds,
  };
}
