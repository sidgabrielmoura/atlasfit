-- CreateEnum
CREATE TYPE "GymClassBookingStatus" AS ENUM ('CONFIRMED', 'CANCELLED', 'LATE_CANCELLED', 'NO_SHOW', 'ATTENDED');

-- CreateEnum
CREATE TYPE "GymClassWaitlistStatus" AS ENUM ('WAITING', 'OFFERED', 'PROMOTED', 'EXPIRED', 'CANCELLED');

-- AlterTable
ALTER TABLE "GymClassSession" ADD COLUMN "bookedCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "GymClassSession" ADD COLUMN "waitlistCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "GymClassBooking" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "studentMemberId" TEXT NOT NULL,
    "enrollmentId" TEXT,
    "bookedByUserId" TEXT NOT NULL,
    "status" "GymClassBookingStatus" NOT NULL DEFAULT 'CONFIRMED',
    "bookedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "cancelledByUserId" TEXT,
    "checkInAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GymClassBooking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GymClassWaitlist" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "studentMemberId" TEXT NOT NULL,
    "enrollmentId" TEXT,
    "requestedByUserId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "status" "GymClassWaitlistStatus" NOT NULL DEFAULT 'WAITING',
    "offeredAt" TIMESTAMP(3),
    "offerExpiresAt" TIMESTAMP(3),
    "promotedBookingId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GymClassWaitlist_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GymClassBooking_sessionId_status_idx" ON "GymClassBooking"("sessionId", "status");
CREATE INDEX "GymClassBooking_studentMemberId_status_idx" ON "GymClassBooking"("studentMemberId", "status");
CREATE INDEX "GymClassBooking_workspaceId_bookedAt_idx" ON "GymClassBooking"("workspaceId", "bookedAt");

-- CreateIndex
CREATE INDEX "GymClassWaitlist_sessionId_status_position_idx" ON "GymClassWaitlist"("sessionId", "status", "position");
CREATE INDEX "GymClassWaitlist_studentMemberId_status_idx" ON "GymClassWaitlist"("studentMemberId", "status");
CREATE INDEX "GymClassWaitlist_workspaceId_status_idx" ON "GymClassWaitlist"("workspaceId", "status");

-- AddForeignKey
ALTER TABLE "GymClassBooking" ADD CONSTRAINT "GymClassBooking_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GymClassBooking" ADD CONSTRAINT "GymClassBooking_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "GymClassSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GymClassBooking" ADD CONSTRAINT "GymClassBooking_studentMemberId_fkey" FOREIGN KEY ("studentMemberId") REFERENCES "WorkspaceMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GymClassBooking" ADD CONSTRAINT "GymClassBooking_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "GymEnrollment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymClassWaitlist" ADD CONSTRAINT "GymClassWaitlist_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GymClassWaitlist" ADD CONSTRAINT "GymClassWaitlist_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "GymClassSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GymClassWaitlist" ADD CONSTRAINT "GymClassWaitlist_studentMemberId_fkey" FOREIGN KEY ("studentMemberId") REFERENCES "WorkspaceMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GymClassWaitlist" ADD CONSTRAINT "GymClassWaitlist_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "GymEnrollment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
