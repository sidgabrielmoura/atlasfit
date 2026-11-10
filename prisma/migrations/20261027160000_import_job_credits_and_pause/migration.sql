-- AlterTable
ALTER TABLE "ImportJob" ADD COLUMN "creditsConsumed" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "pauseReason" TEXT,
ADD COLUMN "pausedAt" TIMESTAMP(3);
