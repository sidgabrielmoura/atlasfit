-- Deploy before the application. Additive replay protection; no historical data rewrite.
CREATE TABLE "AbacateWebhookReceipt" (
  "key" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "payloadHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AbacateWebhookReceipt_pkey" PRIMARY KEY ("key")
);

-- Bounded operational state replaces one AuditLog insert per idle cron invocation.
CREATE TABLE "ScheduledJobState" ("id" TEXT NOT NULL PRIMARY KEY, "lastRunAt" TIMESTAMP(3) NOT NULL, "lastSuccessAt" TIMESTAMP(3), "success" BOOLEAN NOT NULL, "durationMs" INTEGER NOT NULL, "consecutiveFailures" INTEGER NOT NULL DEFAULT 0);
ALTER TABLE "WorkspaceMember" ADD COLUMN "billingRetryAt" TIMESTAMP(3), ADD COLUMN "billingFailureCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "GymEnrollment" ADD COLUMN "billingRetryAt" TIMESTAMP(3), ADD COLUMN "billingFailureCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "GymEnrollmentPause" ADD COLUMN "processingRetryAt" TIMESTAMP(3), ADD COLUMN "processingFailures" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "DataSubjectRequest" ADD COLUMN "processingRetryAt" TIMESTAMP(3), ADD COLUMN "processingFailures" INTEGER NOT NULL DEFAULT 0;
CREATE INDEX "WorkoutExercise_workoutId_order_id_idx" ON "WorkoutExercise" ("workoutId", "order", "id");
CREATE INDEX "WorkoutExercise_exerciseId_idx" ON "WorkoutExercise" ("exerciseId");
CREATE INDEX "WorkspaceMember_workspaceId_role_isActive_idx" ON "WorkspaceMember" ("workspaceId", "role", "isActive");
CREATE INDEX "WorkoutLog_workspaceId_studentId_completedAt_id_idx" ON "WorkoutLog" ("workspaceId", "studentId", "completedAt", "id");
CREATE INDEX "WorkoutLog_workspaceId_createdAt_id_idx" ON "WorkoutLog" ("workspaceId", "createdAt", "id");
CREATE INDEX "WorkspacePayment_workspaceId_createdAt_id_idx" ON "WorkspacePayment" ("workspaceId", "createdAt", "id");
CREATE INDEX "Message_conversationId_createdAt_id_idx" ON "Message" ("conversationId", "createdAt", "id");
CREATE INDEX "EngagePushLog_userId_sentAt_idx" ON "EngagePushLog" ("userId", "sentAt");
