ALTER TABLE "GymEnrollment" ADD COLUMN "retiredProviderSubscriptionId" TEXT, ADD COLUMN "billingAnchorDay" INTEGER;
ALTER TABLE "GymEnrollmentPause" ADD COLUMN "billingResumePolicy" TEXT NOT NULL DEFAULT 'SKIP';
ALTER TABLE "GymInvoice" ADD COLUMN "openingPaidAmountInCents" BIGINT NOT NULL DEFAULT 0;
ALTER TABLE "GymEnrollment" ADD CONSTRAINT "GymEnrollment_billingAnchorDay_check" CHECK ("billingAnchorDay" IS NULL OR "billingAnchorDay" BETWEEN 1 AND 31);
ALTER TABLE "GymEnrollmentPause" ADD CONSTRAINT "GymEnrollmentPause_resumePolicy_check" CHECK ("billingResumePolicy" = 'SKIP');
ALTER TABLE "GymInvoice" ADD CONSTRAINT "GymInvoice_openingPaid_check" CHECK ("openingPaidAmountInCents" >= 0);
CREATE INDEX "GymEnrollment_retiredSubscription_idx" ON "GymEnrollment"("retiredProviderSubscriptionId");
CREATE TABLE "GymAdministrativeReview" (
 "id" TEXT PRIMARY KEY, "workspaceId" TEXT NOT NULL, "unitId" TEXT,
 "resourceType" TEXT NOT NULL, "resourceId" TEXT NOT NULL, "requestKey" TEXT NOT NULL,
 "requestFingerprint" TEXT NOT NULL, "actorUserId" TEXT NOT NULL,
 "reason" TEXT NOT NULL, "evidenceReference" TEXT NOT NULL,
 "beforeSnapshot" JSONB NOT NULL, "afterSnapshot" JSONB NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "GymAdministrativeReview_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT,
 CONSTRAINT "GymAdministrativeReview_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT
);
CREATE UNIQUE INDEX "GymAdministrativeReview_workspaceId_requestKey_key" ON "GymAdministrativeReview"("workspaceId", "requestKey");
CREATE INDEX "GymAdministrativeReview_workspaceId_resourceType_createdAt_idx" ON "GymAdministrativeReview"("workspaceId", "resourceType", "createdAt");
CREATE INDEX "GymAdministrativeReview_workspaceId_resourceId_idx" ON "GymAdministrativeReview"("workspaceId", "resourceId");
CREATE FUNCTION gym_review_immutable() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 RAISE EXCEPTION 'Administrative review evidence is immutable' USING ERRCODE = '23514';
END $$;
CREATE TRIGGER gym_review_immutable BEFORE UPDATE OR DELETE ON "GymAdministrativeReview" FOR EACH ROW EXECUTE FUNCTION gym_review_immutable();
