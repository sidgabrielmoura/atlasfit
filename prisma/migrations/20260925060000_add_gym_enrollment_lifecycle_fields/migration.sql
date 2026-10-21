-- AlterTable
ALTER TABLE "GymEnrollment" ADD COLUMN "scheduledPlanVersionId" TEXT,
ADD COLUMN "creditBalanceInCents" BIGINT NOT NULL DEFAULT 0,
ADD COLUMN "cancellationEffectiveDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "GymEnrollmentPause" ADD COLUMN "extendEndDate" BOOLEAN NOT NULL DEFAULT true;

-- AddForeignKey
ALTER TABLE "GymEnrollment" ADD CONSTRAINT "GymEnrollment_scheduledPlanVersionId_fkey" FOREIGN KEY ("scheduledPlanVersionId") REFERENCES "GymPlanVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
