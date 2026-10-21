ALTER TABLE "PaymentWebhookEvent" ADD COLUMN "processingStartedAt" TIMESTAMP(3), ADD COLUMN "nextRetryAt" TIMESTAMP(3);
-- Historical PROCESSING events remain recoverable without assuming a live worker.
UPDATE "PaymentWebhookEvent" SET "processingStartedAt" = COALESCE("queuedAt", "receivedAt") WHERE "processingStatus" = 'PROCESSING';
CREATE INDEX "PaymentWebhookEvent_retry_idx" ON "PaymentWebhookEvent"("processingStatus", "nextRetryAt", "processingStartedAt");
CREATE TABLE "DeliveryOutbox" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "requestKey" TEXT NOT NULL,
  "fingerprint" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "payloadEncrypted" TEXT,
  "webhookId" TEXT REFERENCES "PaymentWebhookEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "status" TEXT NOT NULL DEFAULT 'QUEUED',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "leaseToken" TEXT,
  "leaseExpiresAt" TIMESTAMP(3),
  "firstAttemptAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "providerReceiptId" TEXT,
  "lastErrorCode" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DeliveryOutbox_channel_check" CHECK ("channel" IN ('ABLY','EMAIL','ACTIVATION_FEE','PUSH')),
  CONSTRAINT "DeliveryOutbox_status_check" CHECK ("status" IN ('QUEUED','PROCESSING','RETRY','SENT','SKIPPED','REVIEW_REQUIRED')),
  CONSTRAINT "DeliveryOutbox_attempts_check" CHECK ("attempts" >= 0),
  CONSTRAINT "DeliveryOutbox_lease_check" CHECK (("leaseToken" IS NULL) = ("leaseExpiresAt" IS NULL))
);
CREATE UNIQUE INDEX "DeliveryOutbox_requestKey_key" ON "DeliveryOutbox"("requestKey");
CREATE INDEX "DeliveryOutbox_status_nextAttemptAt_leaseExpiresAt_idx" ON "DeliveryOutbox"("status", "nextAttemptAt", "leaseExpiresAt");
CREATE INDEX "DeliveryOutbox_webhookId_idx" ON "DeliveryOutbox"("webhookId");
ALTER TABLE "StudentBilling" ADD COLUMN "workspacePaymentId" TEXT;
CREATE UNIQUE INDEX "StudentBilling_workspacePaymentId_key" ON "StudentBilling"("workspacePaymentId");
ALTER TABLE "StudentBilling" ADD CONSTRAINT "StudentBilling_workspacePaymentId_fkey" FOREIGN KEY ("workspacePaymentId") REFERENCES "WorkspacePayment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
