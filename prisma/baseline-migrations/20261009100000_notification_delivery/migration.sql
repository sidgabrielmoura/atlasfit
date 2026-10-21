BEGIN;
SET LOCAL lock_timeout = '10s';
ALTER TABLE "DeliveryOutbox" DROP CONSTRAINT "DeliveryOutbox_channel_check";
ALTER TABLE "DeliveryOutbox" ADD CONSTRAINT "DeliveryOutbox_channel_check"
  CHECK (channel IN ('ABLY', 'EMAIL', 'ACTIVATION_FEE', 'PUSH', 'NOTIFICATION'));
CREATE INDEX "AuditLog_entity_entityId_createdAt_idx" ON "AuditLog" (entity, "entityId", "createdAt");
CREATE INDEX "NotificationDevice_userId_status_id_idx" ON "NotificationDevice" ("userId", status, id);
COMMIT;
