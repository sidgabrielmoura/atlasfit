CREATE TABLE "GymCommunicationDispatch" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "workspaceId" TEXT NOT NULL,
  "senderUserId" TEXT NOT NULL,
  "requestKey" TEXT NOT NULL,
  "fingerprint" TEXT NOT NULL,
  "recipientsCount" INTEGER NOT NULL CHECK ("recipientsCount" >= 0),
  "targetAudience" TEXT NOT NULL,
  "deepLinkUsed" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GymCommunicationDispatch_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "GymCommunicationDispatch_senderUserId_fkey" FOREIGN KEY ("senderUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "GymCommunicationDispatch_workspaceId_requestKey_key" ON "GymCommunicationDispatch"("workspaceId", "requestKey");
CREATE INDEX "GymCommunicationDispatch_workspaceId_createdAt_idx" ON "GymCommunicationDispatch"("workspaceId", "createdAt");
ALTER TABLE "Notification" ADD COLUMN "dispatchId" TEXT;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_dispatchId_fkey" FOREIGN KEY ("dispatchId") REFERENCES "GymCommunicationDispatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
