-- CreateEnum
CREATE TYPE "GymAccessGrantStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "GymAccessDecision" AS ENUM ('GRANTED', 'DENIED');

-- CreateTable
CREATE TABLE "GymAccessGrant" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "studentMemberId" TEXT NOT NULL,
    "enrollmentId" TEXT,
    "status" "GymAccessGrantStatus" NOT NULL DEFAULT 'ACTIVE',
    "allowsAllUnits" BOOLEAN NOT NULL DEFAULT true,
    "allowedUnitIds" JSONB,
    "allowedTimeStart" TEXT,
    "allowedTimeEnd" TEXT,
    "allowedDaysOfWeek" TEXT,
    "credentialType" TEXT NOT NULL DEFAULT 'QR_CODE',
    "credentialCode" TEXT,
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3),
    "ruleVersion" TEXT NOT NULL DEFAULT '1.0',
    "lastProjectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GymAccessGrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GymAccessOverride" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "studentMemberId" TEXT NOT NULL,
    "unitId" TEXT,
    "grantedByUserId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "revokedAt" TIMESTAMP(3),
    "revokedByUserId" TEXT,
    "revocationReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GymAccessOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GymAccessDecisionLog" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "studentMemberId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "decision" "GymAccessDecision" NOT NULL,
    "reasonCode" TEXT NOT NULL,
    "ruleVersion" TEXT NOT NULL DEFAULT '1.0',
    "factors" JSONB NOT NULL,
    "evaluatorType" TEXT NOT NULL DEFAULT 'TURNSTILE_ENGINE',
    "evaluatedByUserId" TEXT,
    "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GymAccessDecisionLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GymAccessGrant_workspaceId_status_idx" ON "GymAccessGrant"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "GymAccessGrant_studentMemberId_status_idx" ON "GymAccessGrant"("studentMemberId", "status");

-- CreateIndex
CREATE INDEX "GymAccessGrant_credentialType_credentialCode_idx" ON "GymAccessGrant"("credentialType", "credentialCode");

-- CreateIndex
CREATE INDEX "GymAccessOverride_workspaceId_studentMemberId_isActive_idx" ON "GymAccessOverride"("workspaceId", "studentMemberId", "isActive");

-- CreateIndex
CREATE INDEX "GymAccessOverride_validUntil_idx" ON "GymAccessOverride"("validUntil");

-- CreateIndex
CREATE INDEX "GymAccessDecisionLog_workspaceId_evaluatedAt_idx" ON "GymAccessDecisionLog"("workspaceId", "evaluatedAt");

-- CreateIndex
CREATE INDEX "GymAccessDecisionLog_studentMemberId_evaluatedAt_idx" ON "GymAccessDecisionLog"("studentMemberId", "evaluatedAt");

-- CreateIndex
CREATE INDEX "GymAccessDecisionLog_workspaceId_decision_idx" ON "GymAccessDecisionLog"("workspaceId", "decision");

-- AddForeignKey
ALTER TABLE "GymAccessGrant" ADD CONSTRAINT "GymAccessGrant_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymAccessGrant" ADD CONSTRAINT "GymAccessGrant_studentMemberId_fkey" FOREIGN KEY ("studentMemberId") REFERENCES "WorkspaceMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymAccessGrant" ADD CONSTRAINT "GymAccessGrant_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "GymEnrollment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymAccessOverride" ADD CONSTRAINT "GymAccessOverride_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymAccessOverride" ADD CONSTRAINT "GymAccessOverride_studentMemberId_fkey" FOREIGN KEY ("studentMemberId") REFERENCES "WorkspaceMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymAccessOverride" ADD CONSTRAINT "GymAccessOverride_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "GymUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymAccessDecisionLog" ADD CONSTRAINT "GymAccessDecisionLog_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymAccessDecisionLog" ADD CONSTRAINT "GymAccessDecisionLog_studentMemberId_fkey" FOREIGN KEY ("studentMemberId") REFERENCES "WorkspaceMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymAccessDecisionLog" ADD CONSTRAINT "GymAccessDecisionLog_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "GymUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
