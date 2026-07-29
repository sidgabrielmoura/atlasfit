import prisma from "@/lib/prisma";

export interface ReviewRecordsQueryOptions {
  jobId: string;
  entityType?: string;
  tabFilter?: "ALL" | "STUDENTS" | "WORKOUTS" | "ASSESSMENTS" | "MEASUREMENTS" | "ATTENTION";
  page?: number;
  pageSize?: number;
  search?: string;
}

export async function getReviewRecords(options: ReviewRecordsQueryOptions) {
  const page = options.page ?? 1;
  const pageSize = options.pageSize ?? 50;
  const skip = (page - 1) * pageSize;

  const whereClause: any = {
    importJobId: options.jobId,
  };

  if (options.tabFilter === "ATTENTION") {
    whereClause.OR = [
      { reviewStatus: "PENDING" },
      { deduplicationMatch: { in: ["EXACT_MATCH", "PROBABLE_MATCH"] } },
      { confidence: { lt: 0.8 } },
      { status: "INVALID" },
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
  const existing = await prisma.importRecord.findUnique({
    where: { id: recordId },
    include: { importJob: true },
  });

  if (!existing) throw new Error("Registro de importação não encontrado.");

  // User edits are authoritative: set source = USER_EDITED & reviewStatus = APPROVED
  const updatedRecord = await prisma.importRecord.update({
    where: { id: recordId },
    data: {
      normalizedData: updatedNormalizedData,
      source: "USER_EDITED",
      reviewStatus: "APPROVED",
      status: "READY",
      updatedAt: new Date(),
    },
  });

  // Invalidate any previously generated commit preview on job & increment commitVersion
  await prisma.importJob.update({
    where: { id: existing.importJobId },
    data: {
      previewValidated: false,
      commitVersion: { increment: 1 },
    },
  });

  return updatedRecord;
}
