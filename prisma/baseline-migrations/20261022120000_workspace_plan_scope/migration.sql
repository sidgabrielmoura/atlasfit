ALTER TABLE "Plan" ADD COLUMN "customWorkspaceId" TEXT;
ALTER TABLE "Plan" ADD COLUMN "publishedGlobalPlanId" TEXT;
CREATE UNIQUE INDEX "Plan_publishedGlobalPlanId_key" ON "Plan"("publishedGlobalPlanId");
CREATE INDEX "Plan_customWorkspaceId_idx" ON "Plan"("customWorkspaceId");
ALTER TABLE "Plan" ADD CONSTRAINT "Plan_publishedGlobalPlanId_fkey"
  FOREIGN KEY ("publishedGlobalPlanId") REFERENCES "Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Recover the ownership of plans created by the previous custom-plan endpoint.
-- Other existing plans remain global offers.
UPDATE "Plan" p SET "customWorkspaceId" = a."entityId"
FROM "AuditLog" a
WHERE a."action" = 'CREATE_CUSTOM_WORKSPACE_PLAN'
  AND a."entityId" IS NOT NULL
  AND a."metadata"->>'planId' = p."id";
