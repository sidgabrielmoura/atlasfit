-- Additive retention: no financial rows are removed or converted.
ALTER TYPE "WebhookProcessingStatus" ADD VALUE IF NOT EXISTS 'REVIEW_REQUIRED';
ALTER TABLE "PaymentWebhookEvent" ADD COLUMN "gymWorkspaceId" TEXT;
ALTER TABLE "PaymentWebhookEvent" ADD CONSTRAINT "PaymentWebhookEvent_gymWorkspaceId_fkey" FOREIGN KEY ("gymWorkspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "PaymentWebhookEvent_gymWorkspaceId_processingStatus_receivedAt_idx" ON "PaymentWebhookEvent"("gymWorkspaceId", "processingStatus", "receivedAt");
