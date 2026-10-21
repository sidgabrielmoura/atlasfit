-- CreateTable
CREATE TABLE "GymStudentProfile" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "registrationNumber" TEXT,
    "emergencyContactName" TEXT,
    "emergencyContactPhone" TEXT,
    "medicalClearance" BOOLEAN NOT NULL DEFAULT false,
    "medicalClearanceExpiresAt" TIMESTAMP(3),
    "notes" TEXT,
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GymStudentProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GymStudentProfile_memberId_key" ON "GymStudentProfile"("memberId");

-- CreateIndex
CREATE INDEX "GymStudentProfile_registrationNumber_idx" ON "GymStudentProfile"("registrationNumber");

-- CreateIndex
CREATE INDEX "GymStudentProfile_status_idx" ON "GymStudentProfile"("status");

-- CreateIndex
CREATE INDEX "User_cpfCnpj_idx" ON "User"("cpfCnpj");

-- AddForeignKey
ALTER TABLE "GymStudentProfile" ADD CONSTRAINT "GymStudentProfile_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "WorkspaceMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
