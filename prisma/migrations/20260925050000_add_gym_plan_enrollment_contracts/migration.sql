-- CreateEnum
CREATE TYPE "GymBillingCycle" AS ENUM ('MONTHLY', 'BIMONTHLY', 'QUARTERLY', 'SEMIANNUAL', 'ANNUAL', 'CUSTOM');

-- CreateEnum
CREATE TYPE "GymEnrollmentStatus" AS ENUM ('DRAFT', 'PENDING_ACCEPTANCE', 'PENDING_ACTIVATION', 'ACTIVE', 'PAUSED', 'CANCELLED', 'EXPIRED');

-- CreateTable
CREATE TABLE "GymPlan" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GymPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GymPlanVersion" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "priceInCents" BIGINT NOT NULL,
    "enrollmentFeeInCents" BIGINT NOT NULL DEFAULT 0,
    "billingCycle" "GymBillingCycle" NOT NULL DEFAULT 'MONTHLY',
    "durationDays" INTEGER NOT NULL DEFAULT 30,
    "classCreditsPerCycle" INTEGER,
    "allowedTimeStart" TEXT,
    "allowedTimeEnd" TEXT,
    "allowedDaysOfWeek" TEXT,
    "allowsAllUnits" BOOLEAN NOT NULL DEFAULT true,
    "termsText" TEXT NOT NULL,
    "termsVersion" TEXT NOT NULL DEFAULT '1.0',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GymPlanVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GymEnrollment" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "studentMemberId" TEXT NOT NULL,
    "planVersionId" TEXT NOT NULL,
    "unitId" TEXT,
    "status" "GymEnrollmentStatus" NOT NULL DEFAULT 'PENDING_ACCEPTANCE',
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "autoRenew" BOOLEAN NOT NULL DEFAULT true,
    "priceInCents" BIGINT NOT NULL,
    "enrollmentFeeInCents" BIGINT NOT NULL DEFAULT 0,
    "billingPayerUserId" TEXT,
    "billingPayerGuardianId" TEXT,
    "billingPayerName" TEXT,
    "billingPayerCpf" TEXT,
    "billingPayerEmail" TEXT,
    "billingPayerPhone" TEXT,
    "accessGranted" BOOLEAN NOT NULL DEFAULT false,
    "activatedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GymEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GymContractAcceptance" (
    "id" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "signerUserId" TEXT NOT NULL,
    "representedUserId" TEXT,
    "representationRole" TEXT,
    "termsSnapshot" TEXT NOT NULL,
    "termsVersion" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "signedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GymContractAcceptance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GymEnrollmentEvent" (
    "id" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "fromStatus" "GymEnrollmentStatus",
    "toStatus" "GymEnrollmentStatus" NOT NULL,
    "reason" TEXT,
    "actorId" TEXT,
    "effectiveDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GymEnrollmentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GymEnrollmentPause" (
    "id" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "requestedByUserId" TEXT,
    "resumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GymEnrollmentPause_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GymPlan_workspaceId_isActive_idx" ON "GymPlan"("workspaceId", "isActive");

-- CreateIndex
CREATE INDEX "GymPlanVersion_planId_isActive_idx" ON "GymPlanVersion"("planId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "GymPlanVersion_planId_version_key" ON "GymPlanVersion"("planId", "version");

-- CreateIndex
CREATE INDEX "GymEnrollment_workspaceId_status_idx" ON "GymEnrollment"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "GymEnrollment_workspaceId_studentMemberId_idx" ON "GymEnrollment"("workspaceId", "studentMemberId");

-- CreateIndex
CREATE INDEX "GymEnrollment_planVersionId_idx" ON "GymEnrollment"("planVersionId");

-- CreateIndex
CREATE INDEX "GymEnrollment_unitId_idx" ON "GymEnrollment"("unitId");

-- CreateIndex
CREATE UNIQUE INDEX "GymContractAcceptance_enrollmentId_key" ON "GymContractAcceptance"("enrollmentId");

-- CreateIndex
CREATE INDEX "GymContractAcceptance_workspaceId_signedAt_idx" ON "GymContractAcceptance"("workspaceId", "signedAt");

-- CreateIndex
CREATE INDEX "GymContractAcceptance_signerUserId_idx" ON "GymContractAcceptance"("signerUserId");

-- CreateIndex
CREATE INDEX "GymEnrollmentEvent_enrollmentId_idx" ON "GymEnrollmentEvent"("enrollmentId");

-- CreateIndex
CREATE INDEX "GymEnrollmentEvent_workspaceId_createdAt_idx" ON "GymEnrollmentEvent"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "GymEnrollmentPause_enrollmentId_idx" ON "GymEnrollmentPause"("enrollmentId");

-- AddForeignKey
ALTER TABLE "GymPlan" ADD CONSTRAINT "GymPlan_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymPlanVersion" ADD CONSTRAINT "GymPlanVersion_planId_fkey" FOREIGN KEY ("planId") REFERENCES "GymPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymEnrollment" ADD CONSTRAINT "GymEnrollment_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymEnrollment" ADD CONSTRAINT "GymEnrollment_studentMemberId_fkey" FOREIGN KEY ("studentMemberId") REFERENCES "WorkspaceMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymEnrollment" ADD CONSTRAINT "GymEnrollment_planVersionId_fkey" FOREIGN KEY ("planVersionId") REFERENCES "GymPlanVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymEnrollment" ADD CONSTRAINT "GymEnrollment_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "GymUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymEnrollment" ADD CONSTRAINT "GymEnrollment_billingPayerUserId_fkey" FOREIGN KEY ("billingPayerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymEnrollment" ADD CONSTRAINT "GymEnrollment_billingPayerGuardianId_fkey" FOREIGN KEY ("billingPayerGuardianId") REFERENCES "GymGuardian"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymContractAcceptance" ADD CONSTRAINT "GymContractAcceptance_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "GymEnrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymContractAcceptance" ADD CONSTRAINT "GymContractAcceptance_signerUserId_fkey" FOREIGN KEY ("signerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymContractAcceptance" ADD CONSTRAINT "GymContractAcceptance_representedUserId_fkey" FOREIGN KEY ("representedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymEnrollmentEvent" ADD CONSTRAINT "GymEnrollmentEvent_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "GymEnrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymEnrollmentPause" ADD CONSTRAINT "GymEnrollmentPause_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "GymEnrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
