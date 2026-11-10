import prisma from "@/lib/prisma";
import { serializableTransaction } from "@/modules/workspaces/application/transaction";
import { lockImportReview } from "./commit-review-lock";

export interface ReviewRecordsQueryOptions {
  jobId: string;
  entityType?: string;
  tabFilter?: "ALL" | "STUDENTS" | "WORKOUTS" | "ASSESSMENTS" | "MEASUREMENTS" | "ATTENTION";
  page?: number;
  pageSize?: number;
  search?: string;
}

export async function getReviewRecords(options: ReviewRecordsQueryOptions) {
  const page = Number.isFinite(options.page) ? Math.max(1, Math.min(10000, Math.trunc(options.page!))) : 1;
  const pageSize = Number.isFinite(options.pageSize) ? Math.max(1, Math.min(500, Math.trunc(options.pageSize!))) : 50;
  const skip = (page - 1) * pageSize;

  const whereClause: any = {
    importJobId: options.jobId,
  };

  if (options.tabFilter === "ATTENTION") {
    whereClause.status = { notIn: ["COMMITTED", "SKIPPED"] };
    whereClause.OR = [
      { reviewStatus: "PENDING" },
      { deduplicationMatch: { in: ["EXACT_MATCH", "PROBABLE_MATCH"] } },
      { confidence: { lt: 0.8 } },
      { status: { in: ["INVALID", "FAILED"] } },
    ];
  } else if (options.tabFilter && options.tabFilter !== "ALL") {
    const mapFilterToType: Record<string, string> = {
      STUDENTS: "STUDENT",
      WORKOUTS: "WORKOUT",
      ASSESSMENTS: "ASSESSMENT",
      MEASUREMENTS: "MEASUREMENT",
    };
    if (mapFilterToType[options.tabFilter]) {
      whereClause.entityType = mapFilterToType[options.tabFilter];
    }
  } else if (options.entityType) {
    whereClause.entityType = options.entityType;
  }

  const [records, total] = await Promise.all([
    prisma.importRecord.findMany({
      where: whereClause,
      omit: { sourceData: true },
      orderBy: [
        { reviewStatus: "desc" },
        { createdAt: "asc" },
      ],
      skip,
      take: pageSize,
    }),
    prisma.importRecord.count({ where: whereClause }),
  ]);

  return {
    records,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

export async function saveUserRecordEdit(
  recordId: string,
  updatedNormalizedData: any
) {
  return serializableTransaction(async tx => {
  const existing = await tx.importRecord.findUnique({
    where: { id: recordId },
  });

  if (!existing) throw new Error("Registro de importação não encontrado.");
  await lockImportReview(tx, existing.importJobId);

  if (existing.status === "COMMITTED") {
    throw new Error("Registros já adicionados ao workspace não podem ser editados na importação.");
  }

  // User edits are authoritative: set source = USER_EDITED & reviewStatus = APPROVED
  const updatedRecord = await tx.importRecord.update({
    where: { id: recordId },
    data: {
      normalizedData: updatedNormalizedData,
      source: "USER_EDITED",
      reviewStatus: "APPROVED",
      status: "READY",
      errorCode: null,
      safeErrorMessage: null,
      updatedAt: new Date(),
    },
  });

  // Invalidate any previously generated commit preview on job & increment commitVersion
  await tx.importJob.update({
    where: { id: existing.importJobId },
    data: {
      previewValidated: false,
      commitVersion: { increment: 1 },
    },
  });

  return updatedRecord;
  });
}

export async function deleteImportRecord(recordId: string) {
  return serializableTransaction(async tx => {
    const record = await tx.importRecord.findUniqueOrThrow({ where: { id: recordId } });
    await lockImportReview(tx, record.importJobId);
    if (record.status === "COMMITTED") throw new Error("Registros já cadastrados não podem ser excluídos da importação.");
    await tx.importRecord.delete({ where: { id: recordId } });
    await tx.importJob.update({ where: { id: record.importJobId }, data: { previewValidated: false, commitVersion: { increment: 1 } } });
  });
}
