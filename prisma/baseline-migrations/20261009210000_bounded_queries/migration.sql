BEGIN;
SET LOCAL lock_timeout='10s';
CREATE INDEX IF NOT EXISTS "GymEnrollmentEvent_state_history_idx" ON "GymEnrollmentEvent"("enrollmentId", "effectiveDate", "createdAt", id);
CREATE INDEX IF NOT EXISTS "GymPlan_catalog_idx" ON "GymPlan"("workspaceId", "isActive", "createdAt", id);
CREATE INDEX IF NOT EXISTS "GymEnrollment_contract_history_idx" ON "GymEnrollment"("workspaceId", "unitId", "activatedAt");
CREATE INDEX IF NOT EXISTS "PaymentWebhookEvent_retention_idx" ON "PaymentWebhookEvent"("processingStatus", "processedAt");
COMMIT;
