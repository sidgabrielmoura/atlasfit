-- CreateEnum
CREATE TYPE "GymDivergenceType" AS ENUM ('UNLINKED_GATEWAY_PAYMENT', 'PAID_GATEWAY_UNPAID_INVOICE', 'AMOUNT_MISMATCH', 'STATUS_MISMATCH', 'CHARGEBACK_DISPUTE', 'ORPHAN_INVOICE');

-- CreateEnum
CREATE TYPE "GymDivergenceStatus" AS ENUM ('PENDING', 'RESOLVED', 'IGNORED');

-- AlterTable
ALTER TABLE "StudentBilling" ADD COLUMN IF NOT EXISTS "refundReason" TEXT;

-- CreateTable
CREATE TABLE "GymReconciliationDivergence" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "divergenceType" "GymDivergenceType" NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "referenceNumber" TEXT,
    "studentName" TEXT,
    "expectedAmountInCents" BIGINT NOT NULL DEFAULT 0,
    "actualAmountInCents" BIGINT NOT NULL DEFAULT 0,
    "differenceInCents" BIGINT NOT NULL DEFAULT 0,
    "description" TEXT NOT NULL,
    "status" "GymDivergenceStatus" NOT NULL DEFAULT 'PENDING',
    "resolvedAt" TIMESTAMP(3),
    "resolvedByUserId" TEXT,
    "resolutionNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GymReconciliationDivergence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GymReconciliationDivergence_workspaceId_status_idx" ON "GymReconciliationDivergence"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "GymReconciliationDivergence_resourceType_resourceId_idx" ON "GymReconciliationDivergence"("resourceType", "resourceId");

-- AddForeignKey
ALTER TABLE "GymReconciliationDivergence" ADD CONSTRAINT "GymReconciliationDivergence_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
