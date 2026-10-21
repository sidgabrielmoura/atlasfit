-- CreateEnum
CREATE TYPE "GymClassSessionStatus" AS ENUM ('SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "GymModality" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT NOT NULL DEFAULT '#3b82f6',
    "icon" TEXT,
    "defaultDurationMinutes" INTEGER NOT NULL DEFAULT 50,
    "defaultCapacity" INTEGER NOT NULL DEFAULT 20,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GymModality_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GymRoom" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "maxCapacity" INTEGER NOT NULL DEFAULT 30,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GymRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GymClassSchedule" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "modalityId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "instructorStaffId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "allowWaitlist" BOOLEAN NOT NULL DEFAULT true,
    "maxWaitlist" INTEGER NOT NULL DEFAULT 5,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GymClassSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GymClassSession" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "scheduleId" TEXT,
    "modalityId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "instructorStaffId" TEXT NOT NULL,
    "substituteInstructorStaffId" TEXT,
    "substituteReason" TEXT,
    "isSubstitute" BOOLEAN NOT NULL DEFAULT false,
    "sessionDate" TIMESTAMP(3) NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "capacity" INTEGER NOT NULL,
    "allowWaitlist" BOOLEAN NOT NULL DEFAULT true,
    "maxWaitlist" INTEGER NOT NULL DEFAULT 5,
    "status" "GymClassSessionStatus" NOT NULL DEFAULT 'SCHEDULED',
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "cancellationActorUserId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GymClassSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GymModality_workspaceId_isActive_idx" ON "GymModality"("workspaceId", "isActive");
CREATE UNIQUE INDEX "GymModality_workspaceId_name_key" ON "GymModality"("workspaceId", "name");

-- CreateIndex
CREATE INDEX "GymRoom_workspaceId_unitId_isActive_idx" ON "GymRoom"("workspaceId", "unitId", "isActive");
CREATE UNIQUE INDEX "GymRoom_workspaceId_unitId_name_key" ON "GymRoom"("workspaceId", "unitId", "name");

-- CreateIndex
CREATE INDEX "GymClassSchedule_workspaceId_dayOfWeek_isActive_idx" ON "GymClassSchedule"("workspaceId", "dayOfWeek", "isActive");
CREATE INDEX "GymClassSchedule_workspaceId_roomId_dayOfWeek_idx" ON "GymClassSchedule"("workspaceId", "roomId", "dayOfWeek");
CREATE INDEX "GymClassSchedule_workspaceId_instructorStaffId_dayOfWeek_idx" ON "GymClassSchedule"("workspaceId", "instructorStaffId", "dayOfWeek");

-- CreateIndex
CREATE UNIQUE INDEX "GymClassSession_scheduleId_sessionDate_key" ON "GymClassSession"("scheduleId", "sessionDate");
CREATE INDEX "GymClassSession_workspaceId_sessionDate_status_idx" ON "GymClassSession"("workspaceId", "sessionDate", "status");
CREATE INDEX "GymClassSession_workspaceId_roomId_startsAt_endsAt_idx" ON "GymClassSession"("workspaceId", "roomId", "startsAt", "endsAt");
CREATE INDEX "GymClassSession_workspaceId_instructorStaffId_startsAt_endsAt_idx" ON "GymClassSession"("workspaceId", "instructorStaffId", "startsAt", "endsAt");

-- AddForeignKey
ALTER TABLE "GymModality" ADD CONSTRAINT "GymModality_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymRoom" ADD CONSTRAINT "GymRoom_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GymRoom" ADD CONSTRAINT "GymRoom_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "GymUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymClassSchedule" ADD CONSTRAINT "GymClassSchedule_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GymClassSchedule" ADD CONSTRAINT "GymClassSchedule_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "GymUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GymClassSchedule" ADD CONSTRAINT "GymClassSchedule_modalityId_fkey" FOREIGN KEY ("modalityId") REFERENCES "GymModality"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GymClassSchedule" ADD CONSTRAINT "GymClassSchedule_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "GymRoom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GymClassSchedule" ADD CONSTRAINT "GymClassSchedule_instructorStaffId_fkey" FOREIGN KEY ("instructorStaffId") REFERENCES "WorkspaceMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymClassSession" ADD CONSTRAINT "GymClassSession_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GymClassSession" ADD CONSTRAINT "GymClassSession_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "GymUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GymClassSession" ADD CONSTRAINT "GymClassSession_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "GymClassSchedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GymClassSession" ADD CONSTRAINT "GymClassSession_modalityId_fkey" FOREIGN KEY ("modalityId") REFERENCES "GymModality"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GymClassSession" ADD CONSTRAINT "GymClassSession_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "GymRoom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GymClassSession" ADD CONSTRAINT "GymClassSession_instructorStaffId_fkey" FOREIGN KEY ("instructorStaffId") REFERENCES "WorkspaceMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GymClassSession" ADD CONSTRAINT "GymClassSession_substituteInstructorStaffId_fkey" FOREIGN KEY ("substituteInstructorStaffId") REFERENCES "WorkspaceMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;
