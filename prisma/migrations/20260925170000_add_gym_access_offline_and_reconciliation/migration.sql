-- CreateEnum
CREATE TYPE "GymAccessDivergenceSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "GymAccessDivergenceStatus" AS ENUM ('OPEN', 'RESOLVED', 'DISMISSED');

-- AlterTable
ALTER TABLE "GymAccessDevice" 
ADD COLUMN "contingencyMode" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "contingencyReason" TEXT,
ADD COLUMN "contingencyStartedAt" TIMESTAMP(3),
ADD COLUMN "contingencyExpiresAt" TIMESTAMP(3),
ADD COLUMN "contingencyStartedByUserId" TEXT,
ADD COLUMN "lastOfflineSyncAt" TIMESTAMP(3),
ADD COLUMN "cacheVersion" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "GymAccessLog"
ADD COLUMN "offlineSequenceId" INTEGER,
ADD COLUMN "deduplicationKey" TEXT,
ADD COLUMN "wasOffline" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "clockDriftMs" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "syncedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "GymAccessReconciliationDivergence" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "deviceId" TEXT,
    "accessLogId" TEXT,
    "studentMemberId" TEXT,
    "divergenceType" TEXT NOT NULL,
    "severity" "GymAccessDivergenceSeverity" NOT NULL DEFAULT 'MEDIUM',
    "status" "GymAccessDivergenceStatus" NOT NULL DEFAULT 'OPEN',
    "description" TEXT NOT NULL,
    "snapshotData" JSONB,
    "resolvedAt" TIMESTAMP(3),
    "resolvedByUserId" TEXT,
    "resolutionNotes" TEXT,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GymAccessReconciliationDivergence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GymAccessLog_deduplicationKey_key" ON "GymAccessLog"("deduplicationKey");

-- CreateIndex
CREATE INDEX "GymAccessLog_deduplicationKey_idx" ON "GymAccessLog"("deduplicationKey");

-- CreateIndex
CREATE INDEX "GymAccessLog_wasOffline_idx" ON "GymAccessLog"("wasOffline");

-- CreateIndex
CREATE UNIQUE INDEX "GymAccessReconciliationDivergence_accessLogId_key" ON "GymAccessReconciliationDivergence"("accessLogId");

-- CreateIndex
CREATE INDEX "GymAccessReconciliationDivergence_workspaceId_unitId_status_idx" ON "GymAccessReconciliationDivergence"("workspaceId", "unitId", "status");

-- CreateIndex
CREATE INDEX "GymAccessReconciliationDivergence_studentMemberId_status_idx" ON "GymAccessReconciliationDivergence"("studentMemberId", "status");

-- CreateIndex
CREATE INDEX "GymAccessReconciliationDivergence_detectedAt_idx" ON "GymAccessReconciliationDivergence"("detectedAt");

-- AddForeignKey
ALTER TABLE "GymAccessReconciliationDivergence" ADD CONSTRAINT "GymAccessReconciliationDivergence_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymAccessReconciliationDivergence" ADD CONSTRAINT "GymAccessReconciliationDivergence_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "GymUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymAccessReconciliationDivergence" ADD CONSTRAINT "GymAccessReconciliationDivergence_accessLogId_fkey" FOREIGN KEY ("accessLogId") REFERENCES "GymAccessLog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymAccessReconciliationDivergence" ADD CONSTRAINT "GymAccessReconciliationDivergence_studentMemberId_fkey" FOREIGN KEY ("studentMemberId") REFERENCES "WorkspaceMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;
