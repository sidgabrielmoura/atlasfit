-- AlterTable
ALTER TABLE "LegalAcceptance" ADD COLUMN "representedUserId" TEXT,
ADD COLUMN "representationRole" TEXT;

-- AlterTable
ALTER TABLE "WorkspaceMember" ADD COLUMN "isMinor" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "GymGuardian" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "studentMemberId" TEXT NOT NULL,
    "guardianUserId" TEXT,
    "name" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "isLegalRepresentative" BOOLEAN NOT NULL DEFAULT true,
    "isFinancialResponsible" BOOLEAN NOT NULL DEFAULT true,
    "isEmergencyContact" BOOLEAN NOT NULL DEFAULT true,
    "hasHealthAccess" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "verificationNotes" TEXT,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GymGuardian_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LegalAcceptance_representedUserId_idx" ON "LegalAcceptance"("representedUserId");

-- CreateIndex
CREATE INDEX "GymGuardian_workspaceId_studentMemberId_idx" ON "GymGuardian"("workspaceId", "studentMemberId");

-- CreateIndex
CREATE INDEX "GymGuardian_cpf_idx" ON "GymGuardian"("cpf");

-- CreateIndex
CREATE INDEX "GymGuardian_guardianUserId_idx" ON "GymGuardian"("guardianUserId");

-- AddForeignKey
ALTER TABLE "LegalAcceptance" ADD CONSTRAINT "LegalAcceptance_representedUserId_fkey" FOREIGN KEY ("representedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymGuardian" ADD CONSTRAINT "GymGuardian_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymGuardian" ADD CONSTRAINT "GymGuardian_studentMemberId_fkey" FOREIGN KEY ("studentMemberId") REFERENCES "WorkspaceMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymGuardian" ADD CONSTRAINT "GymGuardian_guardianUserId_fkey" FOREIGN KEY ("guardianUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
