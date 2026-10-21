ALTER TABLE "GymEnrollment"
  ADD COLUMN "supersedesEnrollmentId" TEXT,
  ADD COLUMN "changeKind" TEXT,
  ADD COLUMN "changeRequestKey" TEXT,
  ADD COLUMN "changeRequestFingerprint" TEXT,
  ADD COLUMN "initialChargeInCents" BIGINT,
  ADD COLUMN "changeApprovedByUserId" TEXT,
  ADD COLUMN "changeReason" TEXT;

ALTER TABLE "GymEnrollment" ADD CONSTRAINT "GymEnrollment_supersedesEnrollmentId_fkey"
  FOREIGN KEY ("supersedesEnrollmentId") REFERENCES "GymEnrollment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GymEnrollment" ADD CONSTRAINT "GymEnrollment_initialCharge_nonnegative"
  CHECK ("initialChargeInCents" IS NULL OR "initialChargeInCents" >= 0);
CREATE UNIQUE INDEX "GymEnrollment_changeRequestKey_key" ON "GymEnrollment"("changeRequestKey");
CREATE INDEX "GymEnrollment_supersedesEnrollmentId_idx" ON "GymEnrollment"("supersedesEnrollmentId");
-- Uma proposta vigente por contrato; revisões canceladas permanecem no histórico.
CREATE UNIQUE INDEX "GymEnrollment_open_revision_key" ON "GymEnrollment"("supersedesEnrollmentId")
  WHERE "supersedesEnrollmentId" IS NOT NULL AND "status" NOT IN ('CANCELLED', 'EXPIRED');
