-- CreateEnum
CREATE TYPE "GymDeviceType" AS ENUM ('TURNSTILE', 'FACIAL_TERMINAL', 'RFID_READER', 'BIOMETRIC_READER', 'DOOR_CONTROLLER');

-- CreateEnum
CREATE TYPE "GymDeviceStatus" AS ENUM ('ONLINE', 'OFFLINE', 'DEGRADED', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "GymDeviceCommandType" AS ENUM ('RELEASE_TURNSTILE', 'SYNC_USER', 'DELETE_USER', 'SYNC_CREDENTIAL', 'DELETE_CREDENTIAL', 'SET_CLOCK', 'REBOOT');

-- CreateEnum
CREATE TYPE "GymDeviceCommandStatus" AS ENUM ('PENDING', 'SENT', 'ACKNOWLEDGED', 'FAILED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "GymAccessDirection" AS ENUM ('ENTRY', 'EXIT', 'UNKNOWN');

-- CreateTable
CREATE TABLE "GymAccessDevice" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "deviceType" "GymDeviceType" NOT NULL DEFAULT 'TURNSTILE',
    "manufacturer" TEXT NOT NULL DEFAULT 'CONTROL_ID',
    "model" TEXT,
    "serialNumber" TEXT,
    "ipAddress" TEXT,
    "port" INTEGER DEFAULT 80,
    "externalDeviceId" TEXT,
    "deviceTokenHash" TEXT,
    "deviceTokenPrefix" TEXT,
    "status" "GymDeviceStatus" NOT NULL DEFAULT 'OFFLINE',
    "firmwareVersion" TEXT,
    "lastHeartbeatAt" TIMESTAMP(3),
    "lastSyncAt" TIMESTAMP(3),
    "config" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GymAccessDevice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GymDeviceCommand" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "commandType" "GymDeviceCommandType" NOT NULL,
    "payload" JSONB,
    "idempotencyKey" TEXT,
    "status" "GymDeviceCommandStatus" NOT NULL DEFAULT 'PENDING',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "acknowledgedAt" TIMESTAMP(3),
    "resultPayload" JSONB,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GymDeviceCommand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GymAccessLog" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "deviceId" TEXT,
    "studentMemberId" TEXT,
    "externalPersonId" TEXT,
    "credentialType" TEXT,
    "credentialCode" TEXT,
    "granted" BOOLEAN NOT NULL DEFAULT true,
    "direction" "GymAccessDirection" NOT NULL DEFAULT 'ENTRY',
    "reasonCode" TEXT,
    "rawEvent" JSONB,
    "accessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GymAccessLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GymAccessDevice_deviceTokenHash_key" ON "GymAccessDevice"("deviceTokenHash");

-- CreateIndex
CREATE INDEX "GymAccessDevice_workspaceId_unitId_status_idx" ON "GymAccessDevice"("workspaceId", "unitId", "status");

-- CreateIndex
CREATE INDEX "GymAccessDevice_deviceTokenHash_idx" ON "GymAccessDevice"("deviceTokenHash");

-- CreateIndex
CREATE INDEX "GymAccessDevice_serialNumber_idx" ON "GymAccessDevice"("serialNumber");

-- CreateIndex
CREATE INDEX "GymDeviceCommand_deviceId_status_priority_idx" ON "GymDeviceCommand"("deviceId", "status", "priority");

-- CreateIndex
CREATE INDEX "GymDeviceCommand_workspaceId_commandType_idx" ON "GymDeviceCommand"("workspaceId", "commandType");

-- CreateIndex
CREATE INDEX "GymDeviceCommand_idempotencyKey_idx" ON "GymDeviceCommand"("idempotencyKey");

-- CreateIndex
CREATE INDEX "GymAccessLog_workspaceId_unitId_accessedAt_idx" ON "GymAccessLog"("workspaceId", "unitId", "accessedAt");

-- CreateIndex
CREATE INDEX "GymAccessLog_studentMemberId_accessedAt_idx" ON "GymAccessLog"("studentMemberId", "accessedAt");

-- CreateIndex
CREATE INDEX "GymAccessLog_deviceId_accessedAt_idx" ON "GymAccessLog"("deviceId", "accessedAt");

-- CreateIndex
CREATE INDEX "GymAccessLog_externalPersonId_idx" ON "GymAccessLog"("externalPersonId");

-- AddForeignKey
ALTER TABLE "GymAccessDevice" ADD CONSTRAINT "GymAccessDevice_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymAccessDevice" ADD CONSTRAINT "GymAccessDevice_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "GymUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymDeviceCommand" ADD CONSTRAINT "GymDeviceCommand_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymDeviceCommand" ADD CONSTRAINT "GymDeviceCommand_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "GymAccessDevice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymAccessLog" ADD CONSTRAINT "GymAccessLog_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymAccessLog" ADD CONSTRAINT "GymAccessLog_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "GymUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymAccessLog" ADD CONSTRAINT "GymAccessLog_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "GymAccessDevice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymAccessLog" ADD CONSTRAINT "GymAccessLog_studentMemberId_fkey" FOREIGN KEY ("studentMemberId") REFERENCES "WorkspaceMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;
