ALTER TABLE "AuditLog" ADD COLUMN "metadata" JSONB;

CREATE TABLE "GymStorageObject" (
  "objectKey" TEXT NOT NULL PRIMARY KEY,
  "workspaceId" TEXT NOT NULL,
  "actorUserId" TEXT NOT NULL,
  "target" TEXT NOT NULL,
  "size" BIGINT NOT NULL CHECK ("size" > 0),
  "status" TEXT NOT NULL DEFAULT 'RESERVED' CHECK ("status" IN ('RESERVED', 'FINALIZED')),
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GymStorageObject_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "GymStorageObject_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "GymStorageObject_workspaceId_status_expiresAt_idx" ON "GymStorageObject"("workspaceId", "status", "expiresAt");
