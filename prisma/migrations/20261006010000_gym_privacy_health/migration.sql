ALTER TABLE "GymStudentProfile"
  ADD COLUMN "healthData" JSONB,
  ADD COLUMN "onboardedAt" TIMESTAMP(3),
  ADD COLUMN "privacyRestrictedAt" TIMESTAMP(3);
CREATE INDEX "DataSubjectRequest_workspaceId_status_requestedAt_idx"
  ON "DataSubjectRequest"("workspaceId", "status", "requestedAt");
