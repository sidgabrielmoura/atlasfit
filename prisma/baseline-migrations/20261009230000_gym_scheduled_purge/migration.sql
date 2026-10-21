-- Additive policy revision: no existing tenant is purged by this migration.
BEGIN;
SET LOCAL lock_timeout='10s';
ALTER TABLE "Workspace" ADD COLUMN "closedAt" TIMESTAMP(3), ADD COLUMN "purgeAfter" TIMESTAMP(3);
ALTER TABLE "DeliveryOutbox" ADD COLUMN "workspaceId" TEXT;
ALTER TABLE "VerificationToken" ADD COLUMN "workspaceId" TEXT;
ALTER TABLE "DeliveryOutbox" ADD CONSTRAINT "DeliveryOutbox_workspaceId_fkey" FOREIGN KEY("workspaceId") REFERENCES "Workspace"(id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VerificationToken" ADD CONSTRAINT "VerificationToken_workspaceId_fkey" FOREIGN KEY("workspaceId") REFERENCES "Workspace"(id) ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "DeliveryOutbox_workspaceId_idx" ON "DeliveryOutbox"("workspaceId");
CREATE TABLE "GymPurgeJob"("workspaceId" TEXT PRIMARY KEY,"requestKey" TEXT NOT NULL UNIQUE,fingerprint TEXT NOT NULL,mode TEXT NOT NULL DEFAULT 'SCHEDULED',status TEXT NOT NULL DEFAULT 'QUEUED',"nextAttemptAt" TIMESTAMP(3) NOT NULL,attempts INTEGER NOT NULL DEFAULT 0,"leaseToken" TEXT,"leaseExpiresAt" TIMESTAMP(3),"storageCompletedAt" TIMESTAMP(3),"legacyScanCursor" TEXT,"legacyScanComplete" BOOLEAN NOT NULL DEFAULT FALSE,"lastErrorCode" TEXT,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,CONSTRAINT "GymPurgeJob_workspaceId_fkey" FOREIGN KEY("workspaceId") REFERENCES "Workspace"(id) ON DELETE CASCADE ON UPDATE CASCADE);
CREATE INDEX "GymPurgeJob_status_nextAttemptAt_leaseExpiresAt_idx" ON "GymPurgeJob"(status,"nextAttemptAt","leaseExpiresAt");
CREATE TABLE "GymPurgeReceipt"("requestKey" TEXT PRIMARY KEY,fingerprint TEXT NOT NULL,"deletedRows" INTEGER NOT NULL,"deletedExclusiveUsers" INTEGER NOT NULL,"completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
-- Previously closed gyms inherit their original closure date, never a fresh month.
UPDATE "Workspace" w SET "closedAt"=a.closed_at,"purgeAfter"=a.closed_at+INTERVAL '1 month',"isActive"=FALSE FROM (SELECT "entityId",MIN("createdAt") closed_at FROM "AuditLog" WHERE action='GYM_WORKSPACE_CLOSED' AND entity='WORKSPACE' GROUP BY "entityId") a WHERE w.id=a."entityId" AND w.type='GYM';
INSERT INTO "GymPurgeJob"("workspaceId","requestKey",fingerprint,"nextAttemptAt","updatedAt") SELECT id,'legacy-closure-'||id,md5(id),"purgeAfter"-INTERVAL '1 day',CURRENT_TIMESTAMP FROM "Workspace" WHERE type='GYM' AND "closedAt" IS NOT NULL;
-- GINV identifiers contain base64url JSON; expose scope without discarding tokens.
DO $$ DECLARE r RECORD; encoded TEXT; decoded JSONB; BEGIN
 FOR r IN SELECT token,identifier FROM "VerificationToken" WHERE identifier LIKE 'GYM_STUDENT_INVITE_V1:%' LOOP
  encoded:=split_part(r.identifier,':',3); encoded:=translate(encoded,'-_','+/'); encoded:=encoded||repeat('=',(4-length(encoded)%4)%4);
  decoded:=convert_from(decode(encoded,'base64'),'UTF8')::jsonb;
  UPDATE "VerificationToken" SET "workspaceId"=decoded->>'workspaceId' WHERE token=r.token;
 END LOOP;
END $$;
CREATE OR REPLACE FUNCTION atlasfit_gym_closed_write_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE closed_at TIMESTAMP; scope_id TEXT;
BEGIN
 CASE TG_TABLE_NAME
 WHEN 'WorkspaceMember' THEN SELECT w."closedAt",w.id INTO closed_at,scope_id FROM "Workspace" w WHERE w.id = (to_jsonb(NEW)->>'workspaceId');
 WHEN 'GymStorageObject' THEN SELECT w."closedAt",w.id INTO closed_at,scope_id FROM "Workspace" w WHERE w.id = (to_jsonb(NEW)->>'workspaceId');
 WHEN 'VerificationToken' THEN SELECT w."closedAt",w.id INTO closed_at,scope_id FROM "Workspace" w WHERE w.id = (to_jsonb(NEW)->>'workspaceId');
 WHEN 'TrainerVideo' THEN SELECT w."closedAt",w.id INTO closed_at,scope_id FROM "Workspace" w WHERE w.id = (to_jsonb(NEW)->>'workspaceId');
 WHEN 'TrainerVideoExercise' THEN SELECT w."closedAt",w.id INTO closed_at,scope_id FROM "Workspace" w JOIN "TrainerVideo" p0 ON p0."workspaceId"=w.id WHERE p0."id"=(to_jsonb(NEW)->>'videoId');
 WHEN 'Workout' THEN SELECT w."closedAt",w.id INTO closed_at,scope_id FROM "Workspace" w WHERE w.id = (to_jsonb(NEW)->>'workspaceId');
 WHEN 'WorkoutExercise' THEN SELECT w."closedAt",w.id INTO closed_at,scope_id FROM "Workspace" w JOIN "Workout" p0 ON p0."workspaceId"=w.id WHERE p0."id"=(to_jsonb(NEW)->>'workoutId');
 WHEN 'WorkspacePlan' THEN SELECT w."closedAt",w.id INTO closed_at,scope_id FROM "Workspace" w WHERE w.id = (to_jsonb(NEW)->>'workspaceId');
 WHEN 'WorkspacePayment' THEN SELECT w."closedAt",w.id INTO closed_at,scope_id FROM "Workspace" w WHERE w.id = (to_jsonb(NEW)->>'workspaceId');
 WHEN 'PendingStudent' THEN SELECT w."closedAt",w.id INTO closed_at,scope_id FROM "Workspace" w WHERE w.id = (to_jsonb(NEW)->>'workspaceId');
 WHEN 'TrainerTask' THEN SELECT w."closedAt",w.id INTO closed_at,scope_id FROM "Workspace" w WHERE w.id = (to_jsonb(NEW)->>'workspaceId');
 WHEN 'StudentProgress' THEN SELECT w."closedAt",w.id INTO closed_at,scope_id FROM "Workspace" w WHERE w.id = (to_jsonb(NEW)->>'workspaceId');
 WHEN 'StudentProgressPhoto' THEN SELECT w."closedAt",w.id INTO closed_at,scope_id FROM "Workspace" w WHERE w.id = (to_jsonb(NEW)->>'workspaceId');
 WHEN 'PhysicalEvaluation' THEN SELECT w."closedAt",w.id INTO closed_at,scope_id FROM "Workspace" w WHERE w.id = (to_jsonb(NEW)->>'workspaceId');
 WHEN 'StudentFile' THEN SELECT w."closedAt",w.id INTO closed_at,scope_id FROM "Workspace" w WHERE w.id = (to_jsonb(NEW)->>'workspaceId');
 WHEN 'WorkoutLog' THEN SELECT w."closedAt",w.id INTO closed_at,scope_id FROM "Workspace" w WHERE w.id = (to_jsonb(NEW)->>'workspaceId');
 WHEN 'DailyFeedback' THEN SELECT w."closedAt",w.id INTO closed_at,scope_id FROM "Workspace" w WHERE w.id = (to_jsonb(NEW)->>'workspaceId');
 WHEN 'WorkoutExerciseGroup' THEN SELECT w."closedAt",w.id INTO closed_at,scope_id FROM "Workspace" w JOIN "Workout" p0 ON p0."workspaceId"=w.id WHERE p0."id"=(to_jsonb(NEW)->>'workoutId');
 WHEN 'EngageExperience' THEN SELECT w."closedAt",w.id INTO closed_at,scope_id FROM "Workspace" w WHERE w.id = (to_jsonb(NEW)->>'workspaceId');
 WHEN 'EngageUserStatus' THEN SELECT w."closedAt",w.id INTO closed_at,scope_id FROM "Workspace" w JOIN "EngageExperience" p0 ON p0."workspaceId"=w.id WHERE p0."id"=(to_jsonb(NEW)->>'experienceId');
 WHEN 'EngageEventLog' THEN SELECT w."closedAt",w.id INTO closed_at,scope_id FROM "Workspace" w JOIN "EngageExperience" p0 ON p0."workspaceId"=w.id WHERE p0."id"=(to_jsonb(NEW)->>'experienceId');
 WHEN 'Lead' THEN SELECT w."closedAt",w.id INTO closed_at,scope_id FROM "Workspace" w WHERE w.id = (to_jsonb(NEW)->>'workspaceId');
 WHEN 'LeadActivity' THEN SELECT w."closedAt",w.id INTO closed_at,scope_id FROM "Workspace" w JOIN "Lead" p0 ON p0."workspaceId"=w.id WHERE p0."id"=(to_jsonb(NEW)->>'leadId');
 WHEN 'LeadTask' THEN SELECT w."closedAt",w.id INTO closed_at,scope_id FROM "Workspace" w JOIN "Lead" p0 ON p0."workspaceId"=w.id WHERE p0."id"=(to_jsonb(NEW)->>'leadId');
 WHEN 'Tag' THEN SELECT w."closedAt",w.id INTO closed_at,scope_id FROM "Workspace" w WHERE w.id = (to_jsonb(NEW)->>'workspaceId');
 WHEN 'CustomFieldDefinition' THEN SELECT w."closedAt",w.id INTO closed_at,scope_id FROM "Workspace" w WHERE w.id = (to_jsonb(NEW)->>'workspaceId');
 WHEN 'CustomFieldValue' THEN SELECT w."closedAt",w.id INTO closed_at,scope_id FROM "Workspace" w JOIN "Lead" p0 ON p0."workspaceId"=w.id WHERE p0."id"=(to_jsonb(NEW)->>'leadId');
 WHEN 'LeadFile' THEN SELECT w."closedAt",w.id INTO closed_at,scope_id FROM "Workspace" w JOIN "Lead" p0 ON p0."workspaceId"=w.id WHERE p0."id"=(to_jsonb(NEW)->>'leadId');
 WHEN 'Notification' THEN SELECT w."closedAt",w.id INTO closed_at,scope_id FROM "Workspace" w WHERE w.id = (to_jsonb(NEW)->>'workspaceId');
 WHEN 'Conversation' THEN SELECT w."closedAt",w.id INTO closed_at,scope_id FROM "Workspace" w WHERE w.id = (to_jsonb(NEW)->>'workspaceId');
 WHEN 'ConversationParticipant' THEN SELECT w."closedAt",w.id INTO closed_at,scope_id FROM "Workspace" w JOIN "Conversation" p0 ON p0."workspaceId"=w.id WHERE p0."id"=(to_jsonb(NEW)->>'conversationId');
 WHEN 'Message' THEN SELECT w."closedAt",w.id INTO closed_at,scope_id FROM "Workspace" w JOIN "Conversation" p0 ON p0."workspaceId"=w.id WHERE p0."id"=(to_jsonb(NEW)->>'conversationId');
 WHEN 'ImportJob' THEN SELECT w."closedAt",w.id INTO closed_at,scope_id FROM "Workspace" w WHERE w.id = (to_jsonb(NEW)->>'workspaceId');
 WHEN 'ImportSource' THEN SELECT w."closedAt",w.id INTO closed_at,scope_id FROM "Workspace" w JOIN "ImportJob" p0 ON p0."workspaceId"=w.id WHERE p0."id"=(to_jsonb(NEW)->>'importJobId');
 WHEN 'ImportRecord' THEN SELECT w."closedAt",w.id INTO closed_at,scope_id FROM "Workspace" w JOIN "ImportJob" p0 ON p0."workspaceId"=w.id WHERE p0."id"=(to_jsonb(NEW)->>'importJobId');
 WHEN 'ImportEntityResult' THEN SELECT w."closedAt",w.id INTO closed_at,scope_id FROM "Workspace" w JOIN "ImportJob" p0 ON p0."workspaceId"=w.id WHERE p0."id"=(to_jsonb(NEW)->>'importJobId');
 WHEN 'GeminiUsageLog' THEN SELECT w."closedAt",w.id INTO closed_at,scope_id FROM "Workspace" w JOIN "ImportJob" p0 ON p0."workspaceId"=w.id WHERE p0."id"=(to_jsonb(NEW)->>'importJobId');
 WHEN 'CreditPurchase' THEN SELECT w."closedAt",w.id INTO closed_at,scope_id FROM "Workspace" w WHERE w.id = (to_jsonb(NEW)->>'workspaceId');
 WHEN 'PaymentProviderAccount' THEN SELECT w."closedAt",w.id INTO closed_at,scope_id FROM "Workspace" w WHERE w.id = (to_jsonb(NEW)->>'workspaceId');
 WHEN 'WalletBalanceSnapshot' THEN SELECT w."closedAt",w.id INTO closed_at,scope_id FROM "Workspace" w JOIN "PaymentProviderAccount" p0 ON p0."workspaceId"=w.id WHERE p0."id"=(to_jsonb(NEW)->>'providerAccountId');
 WHEN 'GatewayCustomer' THEN SELECT w."closedAt",w.id INTO closed_at,scope_id FROM "Workspace" w WHERE w.id = (to_jsonb(NEW)->>'workspaceId');
 WHEN 'StudentSubscription' THEN SELECT w."closedAt",w.id INTO closed_at,scope_id FROM "Workspace" w JOIN "PaymentProviderAccount" p0 ON p0."workspaceId"=w.id WHERE p0."id"=(to_jsonb(NEW)->>'providerAccountId');
 WHEN 'StudentBilling' THEN SELECT w."closedAt",w.id INTO closed_at,scope_id FROM "Workspace" w WHERE w.id = (to_jsonb(NEW)->>'workspaceId');
 WHEN 'ActivationFeeRecoveryOperation' THEN SELECT w."closedAt",w.id INTO closed_at,scope_id FROM "Workspace" w JOIN "PaymentProviderAccount" p0 ON p0."workspaceId"=w.id WHERE p0."id"=(to_jsonb(NEW)->>'providerAccountId');
 WHEN 'PaymentAttempt' THEN SELECT w."closedAt",w.id INTO closed_at,scope_id FROM "Workspace" w JOIN "StudentBilling" p0 ON p0."workspaceId"=w.id WHERE p0."id"=(to_jsonb(NEW)->>'billingId');
 WHEN 'PaymentSplit' THEN SELECT w."closedAt",w.id INTO closed_at,scope_id FROM "Workspace" w JOIN "StudentBilling" p0 ON p0."workspaceId"=w.id WHERE p0."id"=(to_jsonb(NEW)->>'billingId');
 WHEN 'WalletLedgerEntry' THEN SELECT w."closedAt",w.id INTO closed_at,scope_id FROM "Workspace" w JOIN "PaymentProviderAccount" p0 ON p0."workspaceId"=w.id WHERE p0."id"=(to_jsonb(NEW)->>'providerAccountId');
 WHEN 'WalletPayoutRequest' THEN SELECT w."closedAt",w.id INTO closed_at,scope_id FROM "Workspace" w JOIN "PaymentProviderAccount" p0 ON p0."workspaceId"=w.id WHERE p0."id"=(to_jsonb(NEW)->>'providerAccountId');
 WHEN 'PaymentWebhookEvent' THEN SELECT w."closedAt",w.id INTO closed_at,scope_id FROM "Workspace" w WHERE w.id = (to_jsonb(NEW)->>'gymWorkspaceId');
 WHEN 'DeliveryOutbox' THEN SELECT w."closedAt",w.id INTO closed_at,scope_id FROM "Workspace" w WHERE w.id = (to_jsonb(NEW)->>'workspaceId');
 WHEN 'GymCommunicationDispatch' THEN SELECT w."closedAt",w.id INTO closed_at,scope_id FROM "Workspace" w WHERE w.id = (to_jsonb(NEW)->>'workspaceId');
 WHEN 'LegalAcceptance' THEN SELECT w."closedAt",w.id INTO closed_at,scope_id FROM "Workspace" w WHERE w.id = (to_jsonb(NEW)->>'workspaceId');
 WHEN 'DataSubjectRequest' THEN SELECT w."closedAt",w.id INTO closed_at,scope_id FROM "Workspace" w WHERE w.id = (to_jsonb(NEW)->>'workspaceId');
 WHEN 'GymSettings' THEN SELECT w."closedAt",w.id INTO closed_at,scope_id FROM "Workspace" w WHERE w.id = (to_jsonb(NEW)->>'workspaceId');
 WHEN 'GymUnit' THEN SELECT w."closedAt",w.id INTO closed_at,scope_id FROM "Workspace" w WHERE w.id = (to_jsonb(NEW)->>'workspaceId');
 WHEN 'WorkspaceRoleGrant' THEN SELECT w."closedAt",w.id INTO closed_at,scope_id FROM "Workspace" w JOIN "WorkspaceMember" p0 ON p0."workspaceId"=w.id WHERE p0."id"=(to_jsonb(NEW)->>'memberId');
 WHEN 'WorkspaceInvitation' THEN SELECT w."closedAt",w.id INTO closed_at,scope_id FROM "Workspace" w WHERE w.id = (to_jsonb(NEW)->>'workspaceId');
 WHEN 'GymStaffProfile' THEN SELECT w."closedAt",w.id INTO closed_at,scope_id FROM "Workspace" w JOIN "WorkspaceMember" p0 ON p0."workspaceId"=w.id WHERE p0."id"=(to_jsonb(NEW)->>'memberId');
 WHEN 'GymStudentProfile' THEN SELECT w."closedAt",w.id INTO closed_at,scope_id FROM "Workspace" w WHERE w.id = (to_jsonb(NEW)->>'workspaceId');
 WHEN 'GymGuardian' THEN SELECT w."closedAt",w.id INTO closed_at,scope_id FROM "Workspace" w WHERE w.id = (to_jsonb(NEW)->>'workspaceId');
 WHEN 'WorkspaceSubscription' THEN SELECT w."closedAt",w.id INTO closed_at,scope_id FROM "Workspace" w WHERE w.id = (to_jsonb(NEW)->>'workspaceId');
 WHEN 'GymPlan' THEN SELECT w."closedAt",w.id INTO closed_at,scope_id FROM "Workspace" w WHERE w.id = (to_jsonb(NEW)->>'workspaceId');
 WHEN 'GymPlanVersion' THEN SELECT w."closedAt",w.id INTO closed_at,scope_id FROM "Workspace" w JOIN "GymPlan" p0 ON p0."workspaceId"=w.id WHERE p0."id"=(to_jsonb(NEW)->>'planId');
 WHEN 'GymEnrollment' THEN SELECT w."closedAt",w.id INTO closed_at,scope_id FROM "Workspace" w WHERE w.id = (to_jsonb(NEW)->>'workspaceId');
 WHEN 'GymContractAcceptance' THEN SELECT w."closedAt",w.id INTO closed_at,scope_id FROM "Workspace" w WHERE w.id = (to_jsonb(NEW)->>'workspaceId');
 WHEN 'GymEnrollmentEvent' THEN SELECT w."closedAt",w.id INTO closed_at,scope_id FROM "Workspace" w WHERE w.id = (to_jsonb(NEW)->>'workspaceId');
 WHEN 'GymEnrollmentPause' THEN SELECT w."closedAt",w.id INTO closed_at,scope_id FROM "Workspace" w JOIN "GymEnrollment" p0 ON p0."workspaceId"=w.id WHERE p0."id"=(to_jsonb(NEW)->>'enrollmentId');
 WHEN 'GymInvoice' THEN SELECT w."closedAt",w.id INTO closed_at,scope_id FROM "Workspace" w WHERE w.id = (to_jsonb(NEW)->>'workspaceId');
 WHEN 'GymInvoiceItem' THEN SELECT w."closedAt",w.id INTO closed_at,scope_id FROM "Workspace" w JOIN "GymInvoice" p0 ON p0."workspaceId"=w.id WHERE p0."id"=(to_jsonb(NEW)->>'invoiceId');
 WHEN 'GymPayment' THEN SELECT w."closedAt",w.id INTO closed_at,scope_id FROM "Workspace" w WHERE w.id = (to_jsonb(NEW)->>'workspaceId');
 WHEN 'GymPaymentAllocation' THEN SELECT w."closedAt",w.id INTO closed_at,scope_id FROM "Workspace" w JOIN "GymPayment" p0 ON p0."workspaceId"=w.id WHERE p0."id"=(to_jsonb(NEW)->>'paymentId');
 WHEN 'GymFinancialAccount' THEN SELECT w."closedAt",w.id INTO closed_at,scope_id FROM "Workspace" w WHERE w.id = (to_jsonb(NEW)->>'workspaceId');
 WHEN 'GymAccountTransfer' THEN SELECT w."closedAt",w.id INTO closed_at,scope_id FROM "Workspace" w WHERE w.id = (to_jsonb(NEW)->>'workspaceId');
 WHEN 'GymExpenseCategory' THEN SELECT w."closedAt",w.id INTO closed_at,scope_id FROM "Workspace" w WHERE w.id = (to_jsonb(NEW)->>'workspaceId');
 WHEN 'GymSupplier' THEN SELECT w."closedAt",w.id INTO closed_at,scope_id FROM "Workspace" w WHERE w.id = (to_jsonb(NEW)->>'workspaceId');
 WHEN 'GymExpense' THEN SELECT w."closedAt",w.id INTO closed_at,scope_id FROM "Workspace" w WHERE w.id = (to_jsonb(NEW)->>'workspaceId');
 WHEN 'GymExpensePayment' THEN SELECT w."closedAt",w.id INTO closed_at,scope_id FROM "Workspace" w JOIN "GymExpense" p0 ON p0."workspaceId"=w.id WHERE p0."id"=(to_jsonb(NEW)->>'expenseId');
 WHEN 'GymCashDrawerSession' THEN SELECT w."closedAt",w.id INTO closed_at,scope_id FROM "Workspace" w WHERE w.id = (to_jsonb(NEW)->>'workspaceId');
 WHEN 'GymCashDrawerMovement' THEN SELECT w."closedAt",w.id INTO closed_at,scope_id FROM "Workspace" w JOIN "GymCashDrawerSession" p0 ON p0."workspaceId"=w.id WHERE p0."id"=(to_jsonb(NEW)->>'sessionId');
 WHEN 'GymReconciliationDivergence' THEN SELECT w."closedAt",w.id INTO closed_at,scope_id FROM "Workspace" w WHERE w.id = (to_jsonb(NEW)->>'workspaceId');
 WHEN 'GymAdministrativeReview' THEN SELECT w."closedAt",w.id INTO closed_at,scope_id FROM "Workspace" w WHERE w.id = (to_jsonb(NEW)->>'workspaceId');
 WHEN 'GymModality' THEN SELECT w."closedAt",w.id INTO closed_at,scope_id FROM "Workspace" w WHERE w.id = (to_jsonb(NEW)->>'workspaceId');
 WHEN 'GymRoom' THEN SELECT w."closedAt",w.id INTO closed_at,scope_id FROM "Workspace" w WHERE w.id = (to_jsonb(NEW)->>'workspaceId');
 WHEN 'GymClassSchedule' THEN SELECT w."closedAt",w.id INTO closed_at,scope_id FROM "Workspace" w WHERE w.id = (to_jsonb(NEW)->>'workspaceId');
 WHEN 'GymClassSession' THEN SELECT w."closedAt",w.id INTO closed_at,scope_id FROM "Workspace" w WHERE w.id = (to_jsonb(NEW)->>'workspaceId');
 WHEN 'GymClassBooking' THEN SELECT w."closedAt",w.id INTO closed_at,scope_id FROM "Workspace" w WHERE w.id = (to_jsonb(NEW)->>'workspaceId');
 WHEN 'GymClassWaitlist' THEN SELECT w."closedAt",w.id INTO closed_at,scope_id FROM "Workspace" w WHERE w.id = (to_jsonb(NEW)->>'workspaceId');
 WHEN 'GymAccessGrant' THEN SELECT w."closedAt",w.id INTO closed_at,scope_id FROM "Workspace" w WHERE w.id = (to_jsonb(NEW)->>'workspaceId');
 WHEN 'GymAccessOverride' THEN SELECT w."closedAt",w.id INTO closed_at,scope_id FROM "Workspace" w WHERE w.id = (to_jsonb(NEW)->>'workspaceId');
 WHEN 'GymAccessDecisionLog' THEN SELECT w."closedAt",w.id INTO closed_at,scope_id FROM "Workspace" w WHERE w.id = (to_jsonb(NEW)->>'workspaceId');
 WHEN 'GymAccessDevice' THEN SELECT w."closedAt",w.id INTO closed_at,scope_id FROM "Workspace" w WHERE w.id = (to_jsonb(NEW)->>'workspaceId');
 WHEN 'GymDeviceCommand' THEN SELECT w."closedAt",w.id INTO closed_at,scope_id FROM "Workspace" w WHERE w.id = (to_jsonb(NEW)->>'workspaceId');
 WHEN 'GymAccessLog' THEN SELECT w."closedAt",w.id INTO closed_at,scope_id FROM "Workspace" w WHERE w.id = (to_jsonb(NEW)->>'workspaceId');
 WHEN 'GymAccessReconciliationDivergence' THEN SELECT w."closedAt",w.id INTO closed_at,scope_id FROM "Workspace" w WHERE w.id = (to_jsonb(NEW)->>'workspaceId');
 ELSE RETURN NEW;
 END CASE;
 IF closed_at IS NOT NULL AND COALESCE(current_setting('atlasfit.gym_purge_scope',TRUE),'')<>scope_id THEN RAISE EXCEPTION 'Closed GYM workspace is read-only pending purge' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER gym_closed_write_guard BEFORE INSERT OR UPDATE ON "WorkspaceMember" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_closed_write_guard();
CREATE TRIGGER gym_closed_write_guard BEFORE INSERT OR UPDATE ON "GymStorageObject" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_closed_write_guard();
CREATE TRIGGER gym_closed_write_guard BEFORE INSERT OR UPDATE ON "VerificationToken" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_closed_write_guard();
CREATE TRIGGER gym_closed_write_guard BEFORE INSERT OR UPDATE ON "TrainerVideo" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_closed_write_guard();
CREATE TRIGGER gym_closed_write_guard BEFORE INSERT OR UPDATE ON "TrainerVideoExercise" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_closed_write_guard();
CREATE TRIGGER gym_closed_write_guard BEFORE INSERT OR UPDATE ON "Workout" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_closed_write_guard();
CREATE TRIGGER gym_closed_write_guard BEFORE INSERT OR UPDATE ON "WorkoutExercise" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_closed_write_guard();
CREATE TRIGGER gym_closed_write_guard BEFORE INSERT OR UPDATE ON "WorkspacePlan" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_closed_write_guard();
CREATE TRIGGER gym_closed_write_guard BEFORE INSERT OR UPDATE ON "WorkspacePayment" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_closed_write_guard();
CREATE TRIGGER gym_closed_write_guard BEFORE INSERT OR UPDATE ON "PendingStudent" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_closed_write_guard();
CREATE TRIGGER gym_closed_write_guard BEFORE INSERT OR UPDATE ON "TrainerTask" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_closed_write_guard();
CREATE TRIGGER gym_closed_write_guard BEFORE INSERT OR UPDATE ON "StudentProgress" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_closed_write_guard();
CREATE TRIGGER gym_closed_write_guard BEFORE INSERT OR UPDATE ON "StudentProgressPhoto" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_closed_write_guard();
CREATE TRIGGER gym_closed_write_guard BEFORE INSERT OR UPDATE ON "PhysicalEvaluation" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_closed_write_guard();
CREATE TRIGGER gym_closed_write_guard BEFORE INSERT OR UPDATE ON "StudentFile" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_closed_write_guard();
CREATE TRIGGER gym_closed_write_guard BEFORE INSERT OR UPDATE ON "WorkoutLog" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_closed_write_guard();
CREATE TRIGGER gym_closed_write_guard BEFORE INSERT OR UPDATE ON "DailyFeedback" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_closed_write_guard();
CREATE TRIGGER gym_closed_write_guard BEFORE INSERT OR UPDATE ON "WorkoutExerciseGroup" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_closed_write_guard();
CREATE TRIGGER gym_closed_write_guard BEFORE INSERT OR UPDATE ON "EngageExperience" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_closed_write_guard();
CREATE TRIGGER gym_closed_write_guard BEFORE INSERT OR UPDATE ON "EngageUserStatus" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_closed_write_guard();
CREATE TRIGGER gym_closed_write_guard BEFORE INSERT OR UPDATE ON "EngageEventLog" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_closed_write_guard();
CREATE TRIGGER gym_closed_write_guard BEFORE INSERT OR UPDATE ON "Lead" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_closed_write_guard();
CREATE TRIGGER gym_closed_write_guard BEFORE INSERT OR UPDATE ON "LeadActivity" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_closed_write_guard();
CREATE TRIGGER gym_closed_write_guard BEFORE INSERT OR UPDATE ON "LeadTask" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_closed_write_guard();
CREATE TRIGGER gym_closed_write_guard BEFORE INSERT OR UPDATE ON "Tag" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_closed_write_guard();
CREATE TRIGGER gym_closed_write_guard BEFORE INSERT OR UPDATE ON "CustomFieldDefinition" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_closed_write_guard();
CREATE TRIGGER gym_closed_write_guard BEFORE INSERT OR UPDATE ON "CustomFieldValue" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_closed_write_guard();
CREATE TRIGGER gym_closed_write_guard BEFORE INSERT OR UPDATE ON "LeadFile" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_closed_write_guard();
CREATE TRIGGER gym_closed_write_guard BEFORE INSERT OR UPDATE ON "Notification" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_closed_write_guard();
CREATE TRIGGER gym_closed_write_guard BEFORE INSERT OR UPDATE ON "Conversation" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_closed_write_guard();
CREATE TRIGGER gym_closed_write_guard BEFORE INSERT OR UPDATE ON "ConversationParticipant" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_closed_write_guard();
CREATE TRIGGER gym_closed_write_guard BEFORE INSERT OR UPDATE ON "Message" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_closed_write_guard();
CREATE TRIGGER gym_closed_write_guard BEFORE INSERT OR UPDATE ON "ImportJob" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_closed_write_guard();
CREATE TRIGGER gym_closed_write_guard BEFORE INSERT OR UPDATE ON "ImportSource" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_closed_write_guard();
CREATE TRIGGER gym_closed_write_guard BEFORE INSERT OR UPDATE ON "ImportRecord" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_closed_write_guard();
CREATE TRIGGER gym_closed_write_guard BEFORE INSERT OR UPDATE ON "ImportEntityResult" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_closed_write_guard();
CREATE TRIGGER gym_closed_write_guard BEFORE INSERT OR UPDATE ON "GeminiUsageLog" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_closed_write_guard();
CREATE TRIGGER gym_closed_write_guard BEFORE INSERT OR UPDATE ON "CreditPurchase" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_closed_write_guard();
CREATE TRIGGER gym_closed_write_guard BEFORE INSERT OR UPDATE ON "PaymentProviderAccount" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_closed_write_guard();
CREATE TRIGGER gym_closed_write_guard BEFORE INSERT OR UPDATE ON "WalletBalanceSnapshot" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_closed_write_guard();
CREATE TRIGGER gym_closed_write_guard BEFORE INSERT OR UPDATE ON "GatewayCustomer" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_closed_write_guard();
CREATE TRIGGER gym_closed_write_guard BEFORE INSERT OR UPDATE ON "StudentSubscription" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_closed_write_guard();
CREATE TRIGGER gym_closed_write_guard BEFORE INSERT OR UPDATE ON "StudentBilling" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_closed_write_guard();
CREATE TRIGGER gym_closed_write_guard BEFORE INSERT OR UPDATE ON "ActivationFeeRecoveryOperation" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_closed_write_guard();
CREATE TRIGGER gym_closed_write_guard BEFORE INSERT OR UPDATE ON "PaymentAttempt" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_closed_write_guard();
CREATE TRIGGER gym_closed_write_guard BEFORE INSERT OR UPDATE ON "PaymentSplit" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_closed_write_guard();
CREATE TRIGGER gym_closed_write_guard BEFORE INSERT OR UPDATE ON "WalletLedgerEntry" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_closed_write_guard();
CREATE TRIGGER gym_closed_write_guard BEFORE INSERT OR UPDATE ON "WalletPayoutRequest" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_closed_write_guard();
CREATE TRIGGER gym_closed_write_guard BEFORE INSERT OR UPDATE ON "PaymentWebhookEvent" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_closed_write_guard();
CREATE TRIGGER gym_closed_write_guard BEFORE INSERT OR UPDATE ON "DeliveryOutbox" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_closed_write_guard();
CREATE TRIGGER gym_closed_write_guard BEFORE INSERT OR UPDATE ON "GymCommunicationDispatch" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_closed_write_guard();
CREATE TRIGGER gym_closed_write_guard BEFORE INSERT OR UPDATE ON "LegalAcceptance" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_closed_write_guard();
CREATE TRIGGER gym_closed_write_guard BEFORE INSERT OR UPDATE ON "DataSubjectRequest" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_closed_write_guard();
CREATE TRIGGER gym_closed_write_guard BEFORE INSERT OR UPDATE ON "GymSettings" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_closed_write_guard();
CREATE TRIGGER gym_closed_write_guard BEFORE INSERT OR UPDATE ON "GymUnit" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_closed_write_guard();
CREATE TRIGGER gym_closed_write_guard BEFORE INSERT OR UPDATE ON "WorkspaceRoleGrant" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_closed_write_guard();
CREATE TRIGGER gym_closed_write_guard BEFORE INSERT OR UPDATE ON "WorkspaceInvitation" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_closed_write_guard();
CREATE TRIGGER gym_closed_write_guard BEFORE INSERT OR UPDATE ON "GymStaffProfile" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_closed_write_guard();
CREATE TRIGGER gym_closed_write_guard BEFORE INSERT OR UPDATE ON "GymStudentProfile" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_closed_write_guard();
CREATE TRIGGER gym_closed_write_guard BEFORE INSERT OR UPDATE ON "GymGuardian" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_closed_write_guard();
CREATE TRIGGER gym_closed_write_guard BEFORE INSERT OR UPDATE ON "WorkspaceSubscription" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_closed_write_guard();
CREATE TRIGGER gym_closed_write_guard BEFORE INSERT OR UPDATE ON "GymPlan" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_closed_write_guard();
CREATE TRIGGER gym_closed_write_guard BEFORE INSERT OR UPDATE ON "GymPlanVersion" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_closed_write_guard();
CREATE TRIGGER gym_closed_write_guard BEFORE INSERT OR UPDATE ON "GymEnrollment" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_closed_write_guard();
CREATE TRIGGER gym_closed_write_guard BEFORE INSERT OR UPDATE ON "GymContractAcceptance" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_closed_write_guard();
CREATE TRIGGER gym_closed_write_guard BEFORE INSERT OR UPDATE ON "GymEnrollmentEvent" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_closed_write_guard();
CREATE TRIGGER gym_closed_write_guard BEFORE INSERT OR UPDATE ON "GymEnrollmentPause" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_closed_write_guard();
CREATE TRIGGER gym_closed_write_guard BEFORE INSERT OR UPDATE ON "GymInvoice" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_closed_write_guard();
CREATE TRIGGER gym_closed_write_guard BEFORE INSERT OR UPDATE ON "GymInvoiceItem" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_closed_write_guard();
CREATE TRIGGER gym_closed_write_guard BEFORE INSERT OR UPDATE ON "GymPayment" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_closed_write_guard();
CREATE TRIGGER gym_closed_write_guard BEFORE INSERT OR UPDATE ON "GymPaymentAllocation" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_closed_write_guard();
CREATE TRIGGER gym_closed_write_guard BEFORE INSERT OR UPDATE ON "GymFinancialAccount" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_closed_write_guard();
CREATE TRIGGER gym_closed_write_guard BEFORE INSERT OR UPDATE ON "GymAccountTransfer" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_closed_write_guard();
CREATE TRIGGER gym_closed_write_guard BEFORE INSERT OR UPDATE ON "GymExpenseCategory" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_closed_write_guard();
CREATE TRIGGER gym_closed_write_guard BEFORE INSERT OR UPDATE ON "GymSupplier" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_closed_write_guard();
CREATE TRIGGER gym_closed_write_guard BEFORE INSERT OR UPDATE ON "GymExpense" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_closed_write_guard();
CREATE TRIGGER gym_closed_write_guard BEFORE INSERT OR UPDATE ON "GymExpensePayment" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_closed_write_guard();
CREATE TRIGGER gym_closed_write_guard BEFORE INSERT OR UPDATE ON "GymCashDrawerSession" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_closed_write_guard();
CREATE TRIGGER gym_closed_write_guard BEFORE INSERT OR UPDATE ON "GymCashDrawerMovement" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_closed_write_guard();
CREATE TRIGGER gym_closed_write_guard BEFORE INSERT OR UPDATE ON "GymReconciliationDivergence" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_closed_write_guard();
CREATE TRIGGER gym_closed_write_guard BEFORE INSERT OR UPDATE ON "GymAdministrativeReview" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_closed_write_guard();
CREATE TRIGGER gym_closed_write_guard BEFORE INSERT OR UPDATE ON "GymModality" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_closed_write_guard();
CREATE TRIGGER gym_closed_write_guard BEFORE INSERT OR UPDATE ON "GymRoom" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_closed_write_guard();
CREATE TRIGGER gym_closed_write_guard BEFORE INSERT OR UPDATE ON "GymClassSchedule" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_closed_write_guard();
CREATE TRIGGER gym_closed_write_guard BEFORE INSERT OR UPDATE ON "GymClassSession" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_closed_write_guard();
CREATE TRIGGER gym_closed_write_guard BEFORE INSERT OR UPDATE ON "GymClassBooking" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_closed_write_guard();
CREATE TRIGGER gym_closed_write_guard BEFORE INSERT OR UPDATE ON "GymClassWaitlist" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_closed_write_guard();
CREATE TRIGGER gym_closed_write_guard BEFORE INSERT OR UPDATE ON "GymAccessGrant" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_closed_write_guard();
CREATE TRIGGER gym_closed_write_guard BEFORE INSERT OR UPDATE ON "GymAccessOverride" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_closed_write_guard();
CREATE TRIGGER gym_closed_write_guard BEFORE INSERT OR UPDATE ON "GymAccessDecisionLog" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_closed_write_guard();
CREATE TRIGGER gym_closed_write_guard BEFORE INSERT OR UPDATE ON "GymAccessDevice" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_closed_write_guard();
CREATE TRIGGER gym_closed_write_guard BEFORE INSERT OR UPDATE ON "GymDeviceCommand" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_closed_write_guard();
CREATE TRIGGER gym_closed_write_guard BEFORE INSERT OR UPDATE ON "GymAccessLog" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_closed_write_guard();
CREATE TRIGGER gym_closed_write_guard BEFORE INSERT OR UPDATE ON "GymAccessReconciliationDivergence" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_closed_write_guard();
CREATE OR REPLACE FUNCTION atlasfit_gym_workspace_delete_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF OLD.type='GYM' AND (OLD."closedAt" IS NULL OR COALESCE(current_setting('atlasfit.gym_purge_scope',TRUE),'')<>OLD.id) THEN RAISE EXCEPTION 'GYM workspace requires coordinated authenticated purge' USING ERRCODE='23514'; END IF;
 RETURN OLD;
END $$;
CREATE FUNCTION atlasfit_gym_closure_immutable() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF OLD."closedAt" IS NOT NULL AND (NEW."closedAt" IS DISTINCT FROM OLD."closedAt" OR NEW."purgeAfter" IS DISTINCT FROM OLD."purgeAfter" OR NEW."isActive") THEN RAISE EXCEPTION 'GYM closure and purge deadline are immutable' USING ERRCODE='23514'; END IF;
 IF NEW."closedAt" IS NOT NULL AND (NEW.type<>'GYM' OR NEW."isActive" OR NEW."purgeAfter" IS NULL OR NEW."purgeAfter">NEW."closedAt"+INTERVAL '1 month' OR NEW."purgeAfter"<=NEW."closedAt") THEN RAISE EXCEPTION 'Invalid GYM retention deadline' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER gym_closure_immutable BEFORE INSERT OR UPDATE ON "Workspace" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_closure_immutable();
CREATE FUNCTION atlasfit_purge_gym_records(wid TEXT,claim TEXT) RETURNS TABLE(deleted_rows INTEGER,deleted_exclusive_users INTEGER) LANGUAGE plpgsql AS $$
DECLARE before_count INTEGER; after_count INTEGER; candidate TEXT; candidate_ids TEXT[]; removed_users INTEGER:=0;
BEGIN
 PERFORM id FROM "Workspace" WHERE id=wid AND type='GYM' AND NOT "isActive" AND "closedAt" IS NOT NULL FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'GYM closure required' USING ERRCODE='23514'; END IF;
 PERFORM "workspaceId" FROM "GymPurgeJob" WHERE "workspaceId"=wid AND status='PROCESSING' AND "leaseToken"=claim AND "leaseExpiresAt">(CURRENT_TIMESTAMP AT TIME ZONE 'UTC') AND "storageCompletedAt" IS NOT NULL AND "legacyScanComplete" FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Purge claim and verified storage removal required' USING ERRCODE='23514'; END IF;
 PERFORM set_config('atlasfit.gym_purge_scope',wid,TRUE);
 CREATE TEMP TABLE atlasfit_purge_targets(table_name TEXT,row_key TEXT,PRIMARY KEY(table_name,row_key)) ON COMMIT DROP;
 INSERT INTO atlasfit_purge_targets VALUES ('Workspace',wid);
 INSERT INTO atlasfit_purge_targets SELECT 'WorkspaceMember',"id" FROM "WorkspaceMember" WHERE "workspaceId"=wid ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymStorageObject',"objectKey" FROM "GymStorageObject" WHERE "workspaceId"=wid ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'VerificationToken',"token" FROM "VerificationToken" WHERE "workspaceId"=wid ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'TrainerVideo',"id" FROM "TrainerVideo" WHERE "workspaceId"=wid ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'Workout',"id" FROM "Workout" WHERE "workspaceId"=wid ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'WorkspacePlan',"id" FROM "WorkspacePlan" WHERE "workspaceId"=wid ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'WorkspacePayment',"id" FROM "WorkspacePayment" WHERE "workspaceId"=wid ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'PendingStudent',"id" FROM "PendingStudent" WHERE "workspaceId"=wid ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'TrainerTask',"id" FROM "TrainerTask" WHERE "workspaceId"=wid ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'StudentProgress',"id" FROM "StudentProgress" WHERE "workspaceId"=wid ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'StudentProgressPhoto',"id" FROM "StudentProgressPhoto" WHERE "workspaceId"=wid ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'PhysicalEvaluation',"id" FROM "PhysicalEvaluation" WHERE "workspaceId"=wid ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'StudentFile',"id" FROM "StudentFile" WHERE "workspaceId"=wid ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'WorkoutLog',"id" FROM "WorkoutLog" WHERE "workspaceId"=wid ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'DailyFeedback',"id" FROM "DailyFeedback" WHERE "workspaceId"=wid ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'EngageExperience',"id" FROM "EngageExperience" WHERE "workspaceId"=wid ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'Lead',"id" FROM "Lead" WHERE "workspaceId"=wid ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'Tag',"id" FROM "Tag" WHERE "workspaceId"=wid ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'CustomFieldDefinition',"id" FROM "CustomFieldDefinition" WHERE "workspaceId"=wid ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'Notification',"id" FROM "Notification" WHERE "workspaceId"=wid ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'Conversation',"id" FROM "Conversation" WHERE "workspaceId"=wid ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'ImportJob',"id" FROM "ImportJob" WHERE "workspaceId"=wid ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'CreditPurchase',"id" FROM "CreditPurchase" WHERE "workspaceId"=wid ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'PaymentProviderAccount',"id" FROM "PaymentProviderAccount" WHERE "workspaceId"=wid ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GatewayCustomer',"id" FROM "GatewayCustomer" WHERE "workspaceId"=wid ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'StudentBilling',"id" FROM "StudentBilling" WHERE "workspaceId"=wid ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'PaymentWebhookEvent',"id" FROM "PaymentWebhookEvent" WHERE "gymWorkspaceId"=wid ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'DeliveryOutbox',"id" FROM "DeliveryOutbox" WHERE "workspaceId"=wid ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymPurgeJob',"workspaceId" FROM "GymPurgeJob" WHERE "workspaceId"=wid ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymCommunicationDispatch',"id" FROM "GymCommunicationDispatch" WHERE "workspaceId"=wid ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'LegalAcceptance',"id" FROM "LegalAcceptance" WHERE "workspaceId"=wid ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'DataSubjectRequest',"id" FROM "DataSubjectRequest" WHERE "workspaceId"=wid ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymSettings',"id" FROM "GymSettings" WHERE "workspaceId"=wid ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymUnit',"id" FROM "GymUnit" WHERE "workspaceId"=wid ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'WorkspaceInvitation',"id" FROM "WorkspaceInvitation" WHERE "workspaceId"=wid ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymStudentProfile',"id" FROM "GymStudentProfile" WHERE "workspaceId"=wid ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymGuardian',"id" FROM "GymGuardian" WHERE "workspaceId"=wid ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'WorkspaceSubscription',"id" FROM "WorkspaceSubscription" WHERE "workspaceId"=wid ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymPlan',"id" FROM "GymPlan" WHERE "workspaceId"=wid ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymEnrollment',"id" FROM "GymEnrollment" WHERE "workspaceId"=wid ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymContractAcceptance',"id" FROM "GymContractAcceptance" WHERE "workspaceId"=wid ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymEnrollmentEvent',"id" FROM "GymEnrollmentEvent" WHERE "workspaceId"=wid ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymInvoice',"id" FROM "GymInvoice" WHERE "workspaceId"=wid ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymPayment',"id" FROM "GymPayment" WHERE "workspaceId"=wid ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymFinancialAccount',"id" FROM "GymFinancialAccount" WHERE "workspaceId"=wid ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymAccountTransfer',"id" FROM "GymAccountTransfer" WHERE "workspaceId"=wid ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymExpenseCategory',"id" FROM "GymExpenseCategory" WHERE "workspaceId"=wid ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymSupplier',"id" FROM "GymSupplier" WHERE "workspaceId"=wid ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymExpense',"id" FROM "GymExpense" WHERE "workspaceId"=wid ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymCashDrawerSession',"id" FROM "GymCashDrawerSession" WHERE "workspaceId"=wid ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymReconciliationDivergence',"id" FROM "GymReconciliationDivergence" WHERE "workspaceId"=wid ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymAdministrativeReview',"id" FROM "GymAdministrativeReview" WHERE "workspaceId"=wid ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymModality',"id" FROM "GymModality" WHERE "workspaceId"=wid ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymRoom',"id" FROM "GymRoom" WHERE "workspaceId"=wid ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymClassSchedule',"id" FROM "GymClassSchedule" WHERE "workspaceId"=wid ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymClassSession',"id" FROM "GymClassSession" WHERE "workspaceId"=wid ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymClassBooking',"id" FROM "GymClassBooking" WHERE "workspaceId"=wid ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymClassWaitlist',"id" FROM "GymClassWaitlist" WHERE "workspaceId"=wid ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymAccessGrant',"id" FROM "GymAccessGrant" WHERE "workspaceId"=wid ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymAccessOverride',"id" FROM "GymAccessOverride" WHERE "workspaceId"=wid ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymAccessDecisionLog',"id" FROM "GymAccessDecisionLog" WHERE "workspaceId"=wid ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymAccessDevice',"id" FROM "GymAccessDevice" WHERE "workspaceId"=wid ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymDeviceCommand',"id" FROM "GymDeviceCommand" WHERE "workspaceId"=wid ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymAccessLog',"id" FROM "GymAccessLog" WHERE "workspaceId"=wid ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymAccessReconciliationDivergence',"id" FROM "GymAccessReconciliationDivergence" WHERE "workspaceId"=wid ON CONFLICT DO NOTHING;
 -- Minimized legacy payloads still have notification/audit links; do not leave their receipts behind.
 INSERT INTO atlasfit_purge_targets SELECT 'DeliveryOutbox',d.id FROM "DeliveryOutbox" d WHERE EXISTS(SELECT 1 FROM "Notification" n WHERE n."workspaceId"=wid AND (n.id=d.id OR starts_with(d."requestKey",'notification-delivery:'||n.id||':'))) OR EXISTS(SELECT 1 FROM "AuditLog" a WHERE a.entity='WORKSPACE' AND a."entityId"=wid AND a.metadata->>'deliveryId'=d.id) ON CONFLICT DO NOTHING;
 -- Also capture webhooks whose legacy resource was linked before explicit scope existed.
 INSERT INTO atlasfit_purge_targets SELECT 'PaymentWebhookEvent',e.id FROM "PaymentWebhookEvent" e WHERE e."resourceId" IN (SELECT "providerBillingId" FROM "StudentBilling" WHERE "workspaceId"=wid UNION SELECT "providerSubscriptionId" FROM "GymEnrollment" WHERE "workspaceId"=wid) ON CONFLICT DO NOTHING;
 LOOP
  SELECT COUNT(*) INTO before_count FROM atlasfit_purge_targets;
 INSERT INTO atlasfit_purge_targets SELECT 'WorkspaceMember',r."id" FROM "WorkspaceMember" r JOIN atlasfit_purge_targets t ON t.table_name='Workspace' AND t.row_key=r."workspaceId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'WorkspaceMember',r."id" FROM "WorkspaceMember" r JOIN atlasfit_purge_targets t ON t.table_name='GymUnit' AND t.row_key=r."unitId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymStorageObject',r."objectKey" FROM "GymStorageObject" r JOIN atlasfit_purge_targets t ON t.table_name='Workspace' AND t.row_key=r."workspaceId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'VerificationToken',r."token" FROM "VerificationToken" r JOIN atlasfit_purge_targets t ON t.table_name='Workspace' AND t.row_key=r."workspaceId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'TrainerVideo',r."id" FROM "TrainerVideo" r JOIN atlasfit_purge_targets t ON t.table_name='Workspace' AND t.row_key=r."workspaceId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'TrainerVideoExercise',r."id" FROM "TrainerVideoExercise" r JOIN atlasfit_purge_targets t ON t.table_name='TrainerVideo' AND t.row_key=r."videoId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'Workout',r."id" FROM "Workout" r JOIN atlasfit_purge_targets t ON t.table_name='Workspace' AND t.row_key=r."workspaceId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'WorkoutExercise',r."id" FROM "WorkoutExercise" r JOIN atlasfit_purge_targets t ON t.table_name='WorkoutExerciseGroup' AND t.row_key=r."groupId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'WorkoutExercise',r."id" FROM "WorkoutExercise" r JOIN atlasfit_purge_targets t ON t.table_name='Workout' AND t.row_key=r."workoutId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'WorkspacePlan',r."id" FROM "WorkspacePlan" r JOIN atlasfit_purge_targets t ON t.table_name='Workspace' AND t.row_key=r."workspaceId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'WorkspacePayment',r."id" FROM "WorkspacePayment" r JOIN atlasfit_purge_targets t ON t.table_name='Workspace' AND t.row_key=r."workspaceId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'PendingStudent',r."id" FROM "PendingStudent" r JOIN atlasfit_purge_targets t ON t.table_name='Workspace' AND t.row_key=r."workspaceId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'TrainerTask',r."id" FROM "TrainerTask" r JOIN atlasfit_purge_targets t ON t.table_name='Workspace' AND t.row_key=r."workspaceId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'StudentProgress',r."id" FROM "StudentProgress" r JOIN atlasfit_purge_targets t ON t.table_name='Workspace' AND t.row_key=r."workspaceId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'StudentProgressPhoto',r."id" FROM "StudentProgressPhoto" r JOIN atlasfit_purge_targets t ON t.table_name='Workspace' AND t.row_key=r."workspaceId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'WorkoutLog',r."id" FROM "WorkoutLog" r JOIN atlasfit_purge_targets t ON t.table_name='Workout' AND t.row_key=r."workoutId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'DailyFeedback',r."id" FROM "DailyFeedback" r JOIN atlasfit_purge_targets t ON t.table_name='Workspace' AND t.row_key=r."workspaceId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'WorkoutExerciseGroup',r."id" FROM "WorkoutExerciseGroup" r JOIN atlasfit_purge_targets t ON t.table_name='Workout' AND t.row_key=r."workoutId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'EngageExperience',r."id" FROM "EngageExperience" r JOIN atlasfit_purge_targets t ON t.table_name='Workspace' AND t.row_key=r."workspaceId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'EngageUserStatus',r."id" FROM "EngageUserStatus" r JOIN atlasfit_purge_targets t ON t.table_name='EngageExperience' AND t.row_key=r."experienceId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'EngageEventLog',r."id" FROM "EngageEventLog" r JOIN atlasfit_purge_targets t ON t.table_name='EngageExperience' AND t.row_key=r."experienceId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'Lead',r."id" FROM "Lead" r JOIN atlasfit_purge_targets t ON t.table_name='Workspace' AND t.row_key=r."workspaceId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'LeadActivity',r."id" FROM "LeadActivity" r JOIN atlasfit_purge_targets t ON t.table_name='Lead' AND t.row_key=r."leadId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'LeadTask',r."id" FROM "LeadTask" r JOIN atlasfit_purge_targets t ON t.table_name='Lead' AND t.row_key=r."leadId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'Tag',r."id" FROM "Tag" r JOIN atlasfit_purge_targets t ON t.table_name='Workspace' AND t.row_key=r."workspaceId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'CustomFieldDefinition',r."id" FROM "CustomFieldDefinition" r JOIN atlasfit_purge_targets t ON t.table_name='Workspace' AND t.row_key=r."workspaceId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'CustomFieldValue',r."id" FROM "CustomFieldValue" r JOIN atlasfit_purge_targets t ON t.table_name='Lead' AND t.row_key=r."leadId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'CustomFieldValue',r."id" FROM "CustomFieldValue" r JOIN atlasfit_purge_targets t ON t.table_name='CustomFieldDefinition' AND t.row_key=r."fieldDefinitionId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'LeadFile',r."id" FROM "LeadFile" r JOIN atlasfit_purge_targets t ON t.table_name='Lead' AND t.row_key=r."leadId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'Notification',r."id" FROM "Notification" r JOIN atlasfit_purge_targets t ON t.table_name='GymCommunicationDispatch' AND t.row_key=r."dispatchId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'Notification',r."id" FROM "Notification" r JOIN atlasfit_purge_targets t ON t.table_name='Workspace' AND t.row_key=r."workspaceId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'Conversation',r."id" FROM "Conversation" r JOIN atlasfit_purge_targets t ON t.table_name='Workspace' AND t.row_key=r."workspaceId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'ConversationParticipant',r."id" FROM "ConversationParticipant" r JOIN atlasfit_purge_targets t ON t.table_name='Conversation' AND t.row_key=r."conversationId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'Message',r."id" FROM "Message" r JOIN atlasfit_purge_targets t ON t.table_name='Conversation' AND t.row_key=r."conversationId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'ImportJob',r."id" FROM "ImportJob" r JOIN atlasfit_purge_targets t ON t.table_name='Workspace' AND t.row_key=r."workspaceId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'ImportSource',r."id" FROM "ImportSource" r JOIN atlasfit_purge_targets t ON t.table_name='ImportJob' AND t.row_key=r."importJobId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'ImportRecord',r."id" FROM "ImportRecord" r JOIN atlasfit_purge_targets t ON t.table_name='ImportJob' AND t.row_key=r."importJobId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'ImportEntityResult',r."id" FROM "ImportEntityResult" r JOIN atlasfit_purge_targets t ON t.table_name='ImportJob' AND t.row_key=r."importJobId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GeminiUsageLog',r."id" FROM "GeminiUsageLog" r JOIN atlasfit_purge_targets t ON t.table_name='ImportJob' AND t.row_key=r."importJobId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'CreditPurchase',r."id" FROM "CreditPurchase" r JOIN atlasfit_purge_targets t ON t.table_name='Workspace' AND t.row_key=r."workspaceId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'PaymentProviderAccount',r."id" FROM "PaymentProviderAccount" r JOIN atlasfit_purge_targets t ON t.table_name='Workspace' AND t.row_key=r."workspaceId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'WalletBalanceSnapshot',r."id" FROM "WalletBalanceSnapshot" r JOIN atlasfit_purge_targets t ON t.table_name='PaymentProviderAccount' AND t.row_key=r."providerAccountId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GatewayCustomer',r."id" FROM "GatewayCustomer" r JOIN atlasfit_purge_targets t ON t.table_name='Workspace' AND t.row_key=r."workspaceId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'StudentSubscription',r."id" FROM "StudentSubscription" r JOIN atlasfit_purge_targets t ON t.table_name='PaymentProviderAccount' AND t.row_key=r."providerAccountId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'StudentBilling',r."id" FROM "StudentBilling" r JOIN atlasfit_purge_targets t ON t.table_name='WorkspacePayment' AND t.row_key=r."workspacePaymentId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'StudentBilling',r."id" FROM "StudentBilling" r JOIN atlasfit_purge_targets t ON t.table_name='PaymentProviderAccount' AND t.row_key=r."providerAccountId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'StudentBilling',r."id" FROM "StudentBilling" r JOIN atlasfit_purge_targets t ON t.table_name='Workspace' AND t.row_key=r."workspaceId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'StudentBilling',r."id" FROM "StudentBilling" r JOIN atlasfit_purge_targets t ON t.table_name='GymEnrollment' AND t.row_key=r."enrollmentId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'StudentBilling',r."id" FROM "StudentBilling" r JOIN atlasfit_purge_targets t ON t.table_name='StudentSubscription' AND t.row_key=r."subscriptionId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'ActivationFeeRecoveryOperation',r."id" FROM "ActivationFeeRecoveryOperation" r JOIN atlasfit_purge_targets t ON t.table_name='PaymentProviderAccount' AND t.row_key=r."providerAccountId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'ActivationFeeRecoveryOperation',r."id" FROM "ActivationFeeRecoveryOperation" r JOIN atlasfit_purge_targets t ON t.table_name='StudentBilling' AND t.row_key=r."billingId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'PaymentAttempt',r."id" FROM "PaymentAttempt" r JOIN atlasfit_purge_targets t ON t.table_name='StudentBilling' AND t.row_key=r."billingId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'PaymentSplit',r."id" FROM "PaymentSplit" r JOIN atlasfit_purge_targets t ON t.table_name='StudentBilling' AND t.row_key=r."billingId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'WalletLedgerEntry',r."id" FROM "WalletLedgerEntry" r JOIN atlasfit_purge_targets t ON t.table_name='PaymentProviderAccount' AND t.row_key=r."providerAccountId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'WalletLedgerEntry',r."id" FROM "WalletLedgerEntry" r JOIN atlasfit_purge_targets t ON t.table_name='StudentBilling' AND t.row_key=r."billingId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'WalletPayoutRequest',r."id" FROM "WalletPayoutRequest" r JOIN atlasfit_purge_targets t ON t.table_name='PaymentProviderAccount' AND t.row_key=r."providerAccountId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'PaymentWebhookEvent',r."id" FROM "PaymentWebhookEvent" r JOIN atlasfit_purge_targets t ON t.table_name='Workspace' AND t.row_key=r."gymWorkspaceId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'DeliveryOutbox',r."id" FROM "DeliveryOutbox" r JOIN atlasfit_purge_targets t ON t.table_name='Workspace' AND t.row_key=r."workspaceId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'DeliveryOutbox',r."id" FROM "DeliveryOutbox" r JOIN atlasfit_purge_targets t ON t.table_name='PaymentWebhookEvent' AND t.row_key=r."webhookId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymPurgeJob',r."workspaceId" FROM "GymPurgeJob" r JOIN atlasfit_purge_targets t ON t.table_name='Workspace' AND t.row_key=r."workspaceId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymCommunicationDispatch',r."id" FROM "GymCommunicationDispatch" r JOIN atlasfit_purge_targets t ON t.table_name='Workspace' AND t.row_key=r."workspaceId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymSettings',r."id" FROM "GymSettings" r JOIN atlasfit_purge_targets t ON t.table_name='Workspace' AND t.row_key=r."workspaceId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymUnit',r."id" FROM "GymUnit" r JOIN atlasfit_purge_targets t ON t.table_name='Workspace' AND t.row_key=r."workspaceId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'WorkspaceRoleGrant',r."id" FROM "WorkspaceRoleGrant" r JOIN atlasfit_purge_targets t ON t.table_name='WorkspaceMember' AND t.row_key=r."memberId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'WorkspaceRoleGrant',r."id" FROM "WorkspaceRoleGrant" r JOIN atlasfit_purge_targets t ON t.table_name='GymUnit' AND t.row_key=r."unitId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'WorkspaceInvitation',r."id" FROM "WorkspaceInvitation" r JOIN atlasfit_purge_targets t ON t.table_name='Workspace' AND t.row_key=r."workspaceId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'WorkspaceInvitation',r."id" FROM "WorkspaceInvitation" r JOIN atlasfit_purge_targets t ON t.table_name='GymUnit' AND t.row_key=r."unitId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymStaffProfile',r."id" FROM "GymStaffProfile" r JOIN atlasfit_purge_targets t ON t.table_name='WorkspaceMember' AND t.row_key=r."memberId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymStudentProfile',r."id" FROM "GymStudentProfile" r JOIN atlasfit_purge_targets t ON t.table_name='WorkspaceMember' AND t.row_key=r."memberId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymGuardian',r."id" FROM "GymGuardian" r JOIN atlasfit_purge_targets t ON t.table_name='Workspace' AND t.row_key=r."workspaceId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymGuardian',r."id" FROM "GymGuardian" r JOIN atlasfit_purge_targets t ON t.table_name='WorkspaceMember' AND t.row_key=r."studentMemberId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'WorkspaceSubscription',r."id" FROM "WorkspaceSubscription" r JOIN atlasfit_purge_targets t ON t.table_name='Workspace' AND t.row_key=r."workspaceId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymPlan',r."id" FROM "GymPlan" r JOIN atlasfit_purge_targets t ON t.table_name='Workspace' AND t.row_key=r."workspaceId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymPlanVersion',r."id" FROM "GymPlanVersion" r JOIN atlasfit_purge_targets t ON t.table_name='GymPlan' AND t.row_key=r."planId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymEnrollment',r."id" FROM "GymEnrollment" r JOIN atlasfit_purge_targets t ON t.table_name='Workspace' AND t.row_key=r."workspaceId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymEnrollment',r."id" FROM "GymEnrollment" r JOIN atlasfit_purge_targets t ON t.table_name='WorkspaceMember' AND t.row_key=r."studentMemberId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymEnrollment',r."id" FROM "GymEnrollment" r JOIN atlasfit_purge_targets t ON t.table_name='GymPlanVersion' AND t.row_key=r."planVersionId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymEnrollment',r."id" FROM "GymEnrollment" r JOIN atlasfit_purge_targets t ON t.table_name='GymPlanVersion' AND t.row_key=r."scheduledPlanVersionId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymEnrollment',r."id" FROM "GymEnrollment" r JOIN atlasfit_purge_targets t ON t.table_name='GymUnit' AND t.row_key=r."unitId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymEnrollment',r."id" FROM "GymEnrollment" r JOIN atlasfit_purge_targets t ON t.table_name='GymGuardian' AND t.row_key=r."billingPayerGuardianId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymContractAcceptance',r."id" FROM "GymContractAcceptance" r JOIN atlasfit_purge_targets t ON t.table_name='GymEnrollment' AND t.row_key=r."enrollmentId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymEnrollmentEvent',r."id" FROM "GymEnrollmentEvent" r JOIN atlasfit_purge_targets t ON t.table_name='GymEnrollment' AND t.row_key=r."enrollmentId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymEnrollmentPause',r."id" FROM "GymEnrollmentPause" r JOIN atlasfit_purge_targets t ON t.table_name='GymEnrollment' AND t.row_key=r."enrollmentId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymInvoice',r."id" FROM "GymInvoice" r JOIN atlasfit_purge_targets t ON t.table_name='Workspace' AND t.row_key=r."workspaceId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymInvoice',r."id" FROM "GymInvoice" r JOIN atlasfit_purge_targets t ON t.table_name='WorkspaceMember' AND t.row_key=r."studentMemberId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymInvoice',r."id" FROM "GymInvoice" r JOIN atlasfit_purge_targets t ON t.table_name='GymEnrollment' AND t.row_key=r."enrollmentId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymInvoice',r."id" FROM "GymInvoice" r JOIN atlasfit_purge_targets t ON t.table_name='StudentBilling' AND t.row_key=r."billingId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymInvoiceItem',r."id" FROM "GymInvoiceItem" r JOIN atlasfit_purge_targets t ON t.table_name='GymInvoice' AND t.row_key=r."invoiceId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymInvoiceItem',r."id" FROM "GymInvoiceItem" r JOIN atlasfit_purge_targets t ON t.table_name='GymPlanVersion' AND t.row_key=r."planVersionId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymPayment',r."id" FROM "GymPayment" r JOIN atlasfit_purge_targets t ON t.table_name='Workspace' AND t.row_key=r."workspaceId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymPayment',r."id" FROM "GymPayment" r JOIN atlasfit_purge_targets t ON t.table_name='GymCashDrawerSession' AND t.row_key=r."cashDrawerSessionId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymPayment',r."id" FROM "GymPayment" r JOIN atlasfit_purge_targets t ON t.table_name='GymFinancialAccount' AND t.row_key=r."financialAccountId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymPaymentAllocation',r."id" FROM "GymPaymentAllocation" r JOIN atlasfit_purge_targets t ON t.table_name='GymPayment' AND t.row_key=r."paymentId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymPaymentAllocation',r."id" FROM "GymPaymentAllocation" r JOIN atlasfit_purge_targets t ON t.table_name='GymInvoice' AND t.row_key=r."invoiceId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymFinancialAccount',r."id" FROM "GymFinancialAccount" r JOIN atlasfit_purge_targets t ON t.table_name='Workspace' AND t.row_key=r."workspaceId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymFinancialAccount',r."id" FROM "GymFinancialAccount" r JOIN atlasfit_purge_targets t ON t.table_name='GymUnit' AND t.row_key=r."unitId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymAccountTransfer',r."id" FROM "GymAccountTransfer" r JOIN atlasfit_purge_targets t ON t.table_name='Workspace' AND t.row_key=r."workspaceId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymAccountTransfer',r."id" FROM "GymAccountTransfer" r JOIN atlasfit_purge_targets t ON t.table_name='GymFinancialAccount' AND t.row_key=r."fromAccountId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymAccountTransfer',r."id" FROM "GymAccountTransfer" r JOIN atlasfit_purge_targets t ON t.table_name='GymFinancialAccount' AND t.row_key=r."toAccountId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymExpenseCategory',r."id" FROM "GymExpenseCategory" r JOIN atlasfit_purge_targets t ON t.table_name='Workspace' AND t.row_key=r."workspaceId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymSupplier',r."id" FROM "GymSupplier" r JOIN atlasfit_purge_targets t ON t.table_name='Workspace' AND t.row_key=r."workspaceId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymExpense',r."id" FROM "GymExpense" r JOIN atlasfit_purge_targets t ON t.table_name='Workspace' AND t.row_key=r."workspaceId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymExpense',r."id" FROM "GymExpense" r JOIN atlasfit_purge_targets t ON t.table_name='GymUnit' AND t.row_key=r."unitId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymExpense',r."id" FROM "GymExpense" r JOIN atlasfit_purge_targets t ON t.table_name='GymSupplier' AND t.row_key=r."supplierId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymExpense',r."id" FROM "GymExpense" r JOIN atlasfit_purge_targets t ON t.table_name='GymExpenseCategory' AND t.row_key=r."categoryId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymExpense',r."id" FROM "GymExpense" r JOIN atlasfit_purge_targets t ON t.table_name='GymFinancialAccount' AND t.row_key=r."financialAccountId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymExpensePayment',r."id" FROM "GymExpensePayment" r JOIN atlasfit_purge_targets t ON t.table_name='GymExpense' AND t.row_key=r."expenseId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymExpensePayment',r."id" FROM "GymExpensePayment" r JOIN atlasfit_purge_targets t ON t.table_name='GymFinancialAccount' AND t.row_key=r."financialAccountId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymCashDrawerSession',r."id" FROM "GymCashDrawerSession" r JOIN atlasfit_purge_targets t ON t.table_name='Workspace' AND t.row_key=r."workspaceId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymCashDrawerSession',r."id" FROM "GymCashDrawerSession" r JOIN atlasfit_purge_targets t ON t.table_name='GymUnit' AND t.row_key=r."unitId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymCashDrawerSession',r."id" FROM "GymCashDrawerSession" r JOIN atlasfit_purge_targets t ON t.table_name='GymFinancialAccount' AND t.row_key=r."financialAccountId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymCashDrawerMovement',r."id" FROM "GymCashDrawerMovement" r JOIN atlasfit_purge_targets t ON t.table_name='GymCashDrawerSession' AND t.row_key=r."sessionId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymCashDrawerMovement',r."id" FROM "GymCashDrawerMovement" r JOIN atlasfit_purge_targets t ON t.table_name='GymAccountTransfer' AND t.row_key=r."accountTransferId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymReconciliationDivergence',r."id" FROM "GymReconciliationDivergence" r JOIN atlasfit_purge_targets t ON t.table_name='Workspace' AND t.row_key=r."workspaceId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymAdministrativeReview',r."id" FROM "GymAdministrativeReview" r JOIN atlasfit_purge_targets t ON t.table_name='Workspace' AND t.row_key=r."workspaceId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymModality',r."id" FROM "GymModality" r JOIN atlasfit_purge_targets t ON t.table_name='Workspace' AND t.row_key=r."workspaceId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymRoom',r."id" FROM "GymRoom" r JOIN atlasfit_purge_targets t ON t.table_name='Workspace' AND t.row_key=r."workspaceId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymRoom',r."id" FROM "GymRoom" r JOIN atlasfit_purge_targets t ON t.table_name='GymUnit' AND t.row_key=r."unitId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymClassSchedule',r."id" FROM "GymClassSchedule" r JOIN atlasfit_purge_targets t ON t.table_name='Workspace' AND t.row_key=r."workspaceId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymClassSchedule',r."id" FROM "GymClassSchedule" r JOIN atlasfit_purge_targets t ON t.table_name='GymUnit' AND t.row_key=r."unitId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymClassSchedule',r."id" FROM "GymClassSchedule" r JOIN atlasfit_purge_targets t ON t.table_name='GymModality' AND t.row_key=r."modalityId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymClassSchedule',r."id" FROM "GymClassSchedule" r JOIN atlasfit_purge_targets t ON t.table_name='GymRoom' AND t.row_key=r."roomId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymClassSchedule',r."id" FROM "GymClassSchedule" r JOIN atlasfit_purge_targets t ON t.table_name='WorkspaceMember' AND t.row_key=r."instructorStaffId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymClassSession',r."id" FROM "GymClassSession" r JOIN atlasfit_purge_targets t ON t.table_name='Workspace' AND t.row_key=r."workspaceId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymClassSession',r."id" FROM "GymClassSession" r JOIN atlasfit_purge_targets t ON t.table_name='GymUnit' AND t.row_key=r."unitId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymClassSession',r."id" FROM "GymClassSession" r JOIN atlasfit_purge_targets t ON t.table_name='GymClassSchedule' AND t.row_key=r."scheduleId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymClassSession',r."id" FROM "GymClassSession" r JOIN atlasfit_purge_targets t ON t.table_name='GymModality' AND t.row_key=r."modalityId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymClassSession',r."id" FROM "GymClassSession" r JOIN atlasfit_purge_targets t ON t.table_name='GymRoom' AND t.row_key=r."roomId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymClassSession',r."id" FROM "GymClassSession" r JOIN atlasfit_purge_targets t ON t.table_name='WorkspaceMember' AND t.row_key=r."instructorStaffId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymClassSession',r."id" FROM "GymClassSession" r JOIN atlasfit_purge_targets t ON t.table_name='WorkspaceMember' AND t.row_key=r."substituteInstructorStaffId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymClassBooking',r."id" FROM "GymClassBooking" r JOIN atlasfit_purge_targets t ON t.table_name='Workspace' AND t.row_key=r."workspaceId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymClassBooking',r."id" FROM "GymClassBooking" r JOIN atlasfit_purge_targets t ON t.table_name='GymClassSession' AND t.row_key=r."sessionId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymClassBooking',r."id" FROM "GymClassBooking" r JOIN atlasfit_purge_targets t ON t.table_name='WorkspaceMember' AND t.row_key=r."studentMemberId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymClassBooking',r."id" FROM "GymClassBooking" r JOIN atlasfit_purge_targets t ON t.table_name='GymEnrollment' AND t.row_key=r."enrollmentId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymClassWaitlist',r."id" FROM "GymClassWaitlist" r JOIN atlasfit_purge_targets t ON t.table_name='Workspace' AND t.row_key=r."workspaceId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymClassWaitlist',r."id" FROM "GymClassWaitlist" r JOIN atlasfit_purge_targets t ON t.table_name='GymClassSession' AND t.row_key=r."sessionId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymClassWaitlist',r."id" FROM "GymClassWaitlist" r JOIN atlasfit_purge_targets t ON t.table_name='WorkspaceMember' AND t.row_key=r."studentMemberId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymClassWaitlist',r."id" FROM "GymClassWaitlist" r JOIN atlasfit_purge_targets t ON t.table_name='GymEnrollment' AND t.row_key=r."enrollmentId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymAccessGrant',r."id" FROM "GymAccessGrant" r JOIN atlasfit_purge_targets t ON t.table_name='Workspace' AND t.row_key=r."workspaceId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymAccessGrant',r."id" FROM "GymAccessGrant" r JOIN atlasfit_purge_targets t ON t.table_name='WorkspaceMember' AND t.row_key=r."studentMemberId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymAccessGrant',r."id" FROM "GymAccessGrant" r JOIN atlasfit_purge_targets t ON t.table_name='GymEnrollment' AND t.row_key=r."enrollmentId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymAccessOverride',r."id" FROM "GymAccessOverride" r JOIN atlasfit_purge_targets t ON t.table_name='Workspace' AND t.row_key=r."workspaceId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymAccessOverride',r."id" FROM "GymAccessOverride" r JOIN atlasfit_purge_targets t ON t.table_name='WorkspaceMember' AND t.row_key=r."studentMemberId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymAccessOverride',r."id" FROM "GymAccessOverride" r JOIN atlasfit_purge_targets t ON t.table_name='GymUnit' AND t.row_key=r."unitId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymAccessDecisionLog',r."id" FROM "GymAccessDecisionLog" r JOIN atlasfit_purge_targets t ON t.table_name='Workspace' AND t.row_key=r."workspaceId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymAccessDecisionLog',r."id" FROM "GymAccessDecisionLog" r JOIN atlasfit_purge_targets t ON t.table_name='WorkspaceMember' AND t.row_key=r."studentMemberId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymAccessDecisionLog',r."id" FROM "GymAccessDecisionLog" r JOIN atlasfit_purge_targets t ON t.table_name='GymUnit' AND t.row_key=r."unitId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymAccessDevice',r."id" FROM "GymAccessDevice" r JOIN atlasfit_purge_targets t ON t.table_name='Workspace' AND t.row_key=r."workspaceId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymAccessDevice',r."id" FROM "GymAccessDevice" r JOIN atlasfit_purge_targets t ON t.table_name='GymUnit' AND t.row_key=r."unitId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymDeviceCommand',r."id" FROM "GymDeviceCommand" r JOIN atlasfit_purge_targets t ON t.table_name='Workspace' AND t.row_key=r."workspaceId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymDeviceCommand',r."id" FROM "GymDeviceCommand" r JOIN atlasfit_purge_targets t ON t.table_name='GymAccessDevice' AND t.row_key=r."deviceId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymAccessLog',r."id" FROM "GymAccessLog" r JOIN atlasfit_purge_targets t ON t.table_name='Workspace' AND t.row_key=r."workspaceId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymAccessLog',r."id" FROM "GymAccessLog" r JOIN atlasfit_purge_targets t ON t.table_name='GymUnit' AND t.row_key=r."unitId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymAccessLog',r."id" FROM "GymAccessLog" r JOIN atlasfit_purge_targets t ON t.table_name='GymAccessDevice' AND t.row_key=r."deviceId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymAccessLog',r."id" FROM "GymAccessLog" r JOIN atlasfit_purge_targets t ON t.table_name='WorkspaceMember' AND t.row_key=r."studentMemberId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymAccessReconciliationDivergence',r."id" FROM "GymAccessReconciliationDivergence" r JOIN atlasfit_purge_targets t ON t.table_name='Workspace' AND t.row_key=r."workspaceId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymAccessReconciliationDivergence',r."id" FROM "GymAccessReconciliationDivergence" r JOIN atlasfit_purge_targets t ON t.table_name='GymUnit' AND t.row_key=r."unitId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymAccessReconciliationDivergence',r."id" FROM "GymAccessReconciliationDivergence" r JOIN atlasfit_purge_targets t ON t.table_name='GymAccessLog' AND t.row_key=r."accessLogId" ON CONFLICT DO NOTHING;
 INSERT INTO atlasfit_purge_targets SELECT 'GymAccessReconciliationDivergence',r."id" FROM "GymAccessReconciliationDivergence" r JOIN atlasfit_purge_targets t ON t.table_name='WorkspaceMember' AND t.row_key=r."studentMemberId" ON CONFLICT DO NOTHING;
  SELECT COUNT(*) INTO after_count FROM atlasfit_purge_targets;
  EXIT WHEN before_count=after_count;
 END LOOP;
 IF EXISTS(SELECT 1 FROM "WorkspaceMember" r JOIN atlasfit_purge_targets t ON t.table_name='WorkspaceMember' AND t.row_key=r."id" WHERE r."workspaceId" IS NOT NULL AND r."workspaceId"<>wid) THEN RAISE EXCEPTION 'Cross-tenant purge reference: WorkspaceMember' USING ERRCODE='23514'; END IF;
 IF EXISTS(SELECT 1 FROM "GymStorageObject" r JOIN atlasfit_purge_targets t ON t.table_name='GymStorageObject' AND t.row_key=r."objectKey" WHERE r."workspaceId" IS NOT NULL AND r."workspaceId"<>wid) THEN RAISE EXCEPTION 'Cross-tenant purge reference: GymStorageObject' USING ERRCODE='23514'; END IF;
 IF EXISTS(SELECT 1 FROM "VerificationToken" r JOIN atlasfit_purge_targets t ON t.table_name='VerificationToken' AND t.row_key=r."token" WHERE r."workspaceId" IS NOT NULL AND r."workspaceId"<>wid) THEN RAISE EXCEPTION 'Cross-tenant purge reference: VerificationToken' USING ERRCODE='23514'; END IF;
 IF EXISTS(SELECT 1 FROM "TrainerVideo" r JOIN atlasfit_purge_targets t ON t.table_name='TrainerVideo' AND t.row_key=r."id" WHERE r."workspaceId" IS NOT NULL AND r."workspaceId"<>wid) THEN RAISE EXCEPTION 'Cross-tenant purge reference: TrainerVideo' USING ERRCODE='23514'; END IF;
 IF EXISTS(SELECT 1 FROM "Workout" r JOIN atlasfit_purge_targets t ON t.table_name='Workout' AND t.row_key=r."id" WHERE r."workspaceId" IS NOT NULL AND r."workspaceId"<>wid) THEN RAISE EXCEPTION 'Cross-tenant purge reference: Workout' USING ERRCODE='23514'; END IF;
 IF EXISTS(SELECT 1 FROM "WorkspacePlan" r JOIN atlasfit_purge_targets t ON t.table_name='WorkspacePlan' AND t.row_key=r."id" WHERE r."workspaceId" IS NOT NULL AND r."workspaceId"<>wid) THEN RAISE EXCEPTION 'Cross-tenant purge reference: WorkspacePlan' USING ERRCODE='23514'; END IF;
 IF EXISTS(SELECT 1 FROM "WorkspacePayment" r JOIN atlasfit_purge_targets t ON t.table_name='WorkspacePayment' AND t.row_key=r."id" WHERE r."workspaceId" IS NOT NULL AND r."workspaceId"<>wid) THEN RAISE EXCEPTION 'Cross-tenant purge reference: WorkspacePayment' USING ERRCODE='23514'; END IF;
 IF EXISTS(SELECT 1 FROM "PendingStudent" r JOIN atlasfit_purge_targets t ON t.table_name='PendingStudent' AND t.row_key=r."id" WHERE r."workspaceId" IS NOT NULL AND r."workspaceId"<>wid) THEN RAISE EXCEPTION 'Cross-tenant purge reference: PendingStudent' USING ERRCODE='23514'; END IF;
 IF EXISTS(SELECT 1 FROM "TrainerTask" r JOIN atlasfit_purge_targets t ON t.table_name='TrainerTask' AND t.row_key=r."id" WHERE r."workspaceId" IS NOT NULL AND r."workspaceId"<>wid) THEN RAISE EXCEPTION 'Cross-tenant purge reference: TrainerTask' USING ERRCODE='23514'; END IF;
 IF EXISTS(SELECT 1 FROM "StudentProgress" r JOIN atlasfit_purge_targets t ON t.table_name='StudentProgress' AND t.row_key=r."id" WHERE r."workspaceId" IS NOT NULL AND r."workspaceId"<>wid) THEN RAISE EXCEPTION 'Cross-tenant purge reference: StudentProgress' USING ERRCODE='23514'; END IF;
 IF EXISTS(SELECT 1 FROM "StudentProgressPhoto" r JOIN atlasfit_purge_targets t ON t.table_name='StudentProgressPhoto' AND t.row_key=r."id" WHERE r."workspaceId" IS NOT NULL AND r."workspaceId"<>wid) THEN RAISE EXCEPTION 'Cross-tenant purge reference: StudentProgressPhoto' USING ERRCODE='23514'; END IF;
 IF EXISTS(SELECT 1 FROM "PhysicalEvaluation" r JOIN atlasfit_purge_targets t ON t.table_name='PhysicalEvaluation' AND t.row_key=r."id" WHERE r."workspaceId" IS NOT NULL AND r."workspaceId"<>wid) THEN RAISE EXCEPTION 'Cross-tenant purge reference: PhysicalEvaluation' USING ERRCODE='23514'; END IF;
 IF EXISTS(SELECT 1 FROM "StudentFile" r JOIN atlasfit_purge_targets t ON t.table_name='StudentFile' AND t.row_key=r."id" WHERE r."workspaceId" IS NOT NULL AND r."workspaceId"<>wid) THEN RAISE EXCEPTION 'Cross-tenant purge reference: StudentFile' USING ERRCODE='23514'; END IF;
 IF EXISTS(SELECT 1 FROM "WorkoutLog" r JOIN atlasfit_purge_targets t ON t.table_name='WorkoutLog' AND t.row_key=r."id" WHERE r."workspaceId" IS NOT NULL AND r."workspaceId"<>wid) THEN RAISE EXCEPTION 'Cross-tenant purge reference: WorkoutLog' USING ERRCODE='23514'; END IF;
 IF EXISTS(SELECT 1 FROM "DailyFeedback" r JOIN atlasfit_purge_targets t ON t.table_name='DailyFeedback' AND t.row_key=r."id" WHERE r."workspaceId" IS NOT NULL AND r."workspaceId"<>wid) THEN RAISE EXCEPTION 'Cross-tenant purge reference: DailyFeedback' USING ERRCODE='23514'; END IF;
 IF EXISTS(SELECT 1 FROM "EngageExperience" r JOIN atlasfit_purge_targets t ON t.table_name='EngageExperience' AND t.row_key=r."id" WHERE r."workspaceId" IS NOT NULL AND r."workspaceId"<>wid) THEN RAISE EXCEPTION 'Cross-tenant purge reference: EngageExperience' USING ERRCODE='23514'; END IF;
 IF EXISTS(SELECT 1 FROM "Lead" r JOIN atlasfit_purge_targets t ON t.table_name='Lead' AND t.row_key=r."id" WHERE r."workspaceId" IS NOT NULL AND r."workspaceId"<>wid) THEN RAISE EXCEPTION 'Cross-tenant purge reference: Lead' USING ERRCODE='23514'; END IF;
 IF EXISTS(SELECT 1 FROM "Tag" r JOIN atlasfit_purge_targets t ON t.table_name='Tag' AND t.row_key=r."id" WHERE r."workspaceId" IS NOT NULL AND r."workspaceId"<>wid) THEN RAISE EXCEPTION 'Cross-tenant purge reference: Tag' USING ERRCODE='23514'; END IF;
 IF EXISTS(SELECT 1 FROM "CustomFieldDefinition" r JOIN atlasfit_purge_targets t ON t.table_name='CustomFieldDefinition' AND t.row_key=r."id" WHERE r."workspaceId" IS NOT NULL AND r."workspaceId"<>wid) THEN RAISE EXCEPTION 'Cross-tenant purge reference: CustomFieldDefinition' USING ERRCODE='23514'; END IF;
 IF EXISTS(SELECT 1 FROM "Notification" r JOIN atlasfit_purge_targets t ON t.table_name='Notification' AND t.row_key=r."id" WHERE r."workspaceId" IS NOT NULL AND r."workspaceId"<>wid) THEN RAISE EXCEPTION 'Cross-tenant purge reference: Notification' USING ERRCODE='23514'; END IF;
 IF EXISTS(SELECT 1 FROM "Conversation" r JOIN atlasfit_purge_targets t ON t.table_name='Conversation' AND t.row_key=r."id" WHERE r."workspaceId" IS NOT NULL AND r."workspaceId"<>wid) THEN RAISE EXCEPTION 'Cross-tenant purge reference: Conversation' USING ERRCODE='23514'; END IF;
 IF EXISTS(SELECT 1 FROM "ImportJob" r JOIN atlasfit_purge_targets t ON t.table_name='ImportJob' AND t.row_key=r."id" WHERE r."workspaceId" IS NOT NULL AND r."workspaceId"<>wid) THEN RAISE EXCEPTION 'Cross-tenant purge reference: ImportJob' USING ERRCODE='23514'; END IF;
 IF EXISTS(SELECT 1 FROM "CreditPurchase" r JOIN atlasfit_purge_targets t ON t.table_name='CreditPurchase' AND t.row_key=r."id" WHERE r."workspaceId" IS NOT NULL AND r."workspaceId"<>wid) THEN RAISE EXCEPTION 'Cross-tenant purge reference: CreditPurchase' USING ERRCODE='23514'; END IF;
 IF EXISTS(SELECT 1 FROM "PaymentProviderAccount" r JOIN atlasfit_purge_targets t ON t.table_name='PaymentProviderAccount' AND t.row_key=r."id" WHERE r."workspaceId" IS NOT NULL AND r."workspaceId"<>wid) THEN RAISE EXCEPTION 'Cross-tenant purge reference: PaymentProviderAccount' USING ERRCODE='23514'; END IF;
 IF EXISTS(SELECT 1 FROM "GatewayCustomer" r JOIN atlasfit_purge_targets t ON t.table_name='GatewayCustomer' AND t.row_key=r."id" WHERE r."workspaceId" IS NOT NULL AND r."workspaceId"<>wid) THEN RAISE EXCEPTION 'Cross-tenant purge reference: GatewayCustomer' USING ERRCODE='23514'; END IF;
 IF EXISTS(SELECT 1 FROM "StudentBilling" r JOIN atlasfit_purge_targets t ON t.table_name='StudentBilling' AND t.row_key=r."id" WHERE r."workspaceId" IS NOT NULL AND r."workspaceId"<>wid) THEN RAISE EXCEPTION 'Cross-tenant purge reference: StudentBilling' USING ERRCODE='23514'; END IF;
 IF EXISTS(SELECT 1 FROM "PaymentWebhookEvent" r JOIN atlasfit_purge_targets t ON t.table_name='PaymentWebhookEvent' AND t.row_key=r."id" WHERE r."gymWorkspaceId" IS NOT NULL AND r."gymWorkspaceId"<>wid) THEN RAISE EXCEPTION 'Cross-tenant purge reference: PaymentWebhookEvent' USING ERRCODE='23514'; END IF;
 IF EXISTS(SELECT 1 FROM "DeliveryOutbox" r JOIN atlasfit_purge_targets t ON t.table_name='DeliveryOutbox' AND t.row_key=r."id" WHERE r."workspaceId" IS NOT NULL AND r."workspaceId"<>wid) THEN RAISE EXCEPTION 'Cross-tenant purge reference: DeliveryOutbox' USING ERRCODE='23514'; END IF;
 IF EXISTS(SELECT 1 FROM "GymPurgeJob" r JOIN atlasfit_purge_targets t ON t.table_name='GymPurgeJob' AND t.row_key=r."workspaceId" WHERE r."workspaceId" IS NOT NULL AND r."workspaceId"<>wid) THEN RAISE EXCEPTION 'Cross-tenant purge reference: GymPurgeJob' USING ERRCODE='23514'; END IF;
 IF EXISTS(SELECT 1 FROM "GymCommunicationDispatch" r JOIN atlasfit_purge_targets t ON t.table_name='GymCommunicationDispatch' AND t.row_key=r."id" WHERE r."workspaceId" IS NOT NULL AND r."workspaceId"<>wid) THEN RAISE EXCEPTION 'Cross-tenant purge reference: GymCommunicationDispatch' USING ERRCODE='23514'; END IF;
 IF EXISTS(SELECT 1 FROM "LegalAcceptance" r JOIN atlasfit_purge_targets t ON t.table_name='LegalAcceptance' AND t.row_key=r."id" WHERE r."workspaceId" IS NOT NULL AND r."workspaceId"<>wid) THEN RAISE EXCEPTION 'Cross-tenant purge reference: LegalAcceptance' USING ERRCODE='23514'; END IF;
 IF EXISTS(SELECT 1 FROM "DataSubjectRequest" r JOIN atlasfit_purge_targets t ON t.table_name='DataSubjectRequest' AND t.row_key=r."id" WHERE r."workspaceId" IS NOT NULL AND r."workspaceId"<>wid) THEN RAISE EXCEPTION 'Cross-tenant purge reference: DataSubjectRequest' USING ERRCODE='23514'; END IF;
 IF EXISTS(SELECT 1 FROM "GymSettings" r JOIN atlasfit_purge_targets t ON t.table_name='GymSettings' AND t.row_key=r."id" WHERE r."workspaceId" IS NOT NULL AND r."workspaceId"<>wid) THEN RAISE EXCEPTION 'Cross-tenant purge reference: GymSettings' USING ERRCODE='23514'; END IF;
 IF EXISTS(SELECT 1 FROM "GymUnit" r JOIN atlasfit_purge_targets t ON t.table_name='GymUnit' AND t.row_key=r."id" WHERE r."workspaceId" IS NOT NULL AND r."workspaceId"<>wid) THEN RAISE EXCEPTION 'Cross-tenant purge reference: GymUnit' USING ERRCODE='23514'; END IF;
 IF EXISTS(SELECT 1 FROM "WorkspaceInvitation" r JOIN atlasfit_purge_targets t ON t.table_name='WorkspaceInvitation' AND t.row_key=r."id" WHERE r."workspaceId" IS NOT NULL AND r."workspaceId"<>wid) THEN RAISE EXCEPTION 'Cross-tenant purge reference: WorkspaceInvitation' USING ERRCODE='23514'; END IF;
 IF EXISTS(SELECT 1 FROM "GymStudentProfile" r JOIN atlasfit_purge_targets t ON t.table_name='GymStudentProfile' AND t.row_key=r."id" WHERE r."workspaceId" IS NOT NULL AND r."workspaceId"<>wid) THEN RAISE EXCEPTION 'Cross-tenant purge reference: GymStudentProfile' USING ERRCODE='23514'; END IF;
 IF EXISTS(SELECT 1 FROM "GymGuardian" r JOIN atlasfit_purge_targets t ON t.table_name='GymGuardian' AND t.row_key=r."id" WHERE r."workspaceId" IS NOT NULL AND r."workspaceId"<>wid) THEN RAISE EXCEPTION 'Cross-tenant purge reference: GymGuardian' USING ERRCODE='23514'; END IF;
 IF EXISTS(SELECT 1 FROM "WorkspaceSubscription" r JOIN atlasfit_purge_targets t ON t.table_name='WorkspaceSubscription' AND t.row_key=r."id" WHERE r."workspaceId" IS NOT NULL AND r."workspaceId"<>wid) THEN RAISE EXCEPTION 'Cross-tenant purge reference: WorkspaceSubscription' USING ERRCODE='23514'; END IF;
 IF EXISTS(SELECT 1 FROM "GymPlan" r JOIN atlasfit_purge_targets t ON t.table_name='GymPlan' AND t.row_key=r."id" WHERE r."workspaceId" IS NOT NULL AND r."workspaceId"<>wid) THEN RAISE EXCEPTION 'Cross-tenant purge reference: GymPlan' USING ERRCODE='23514'; END IF;
 IF EXISTS(SELECT 1 FROM "GymEnrollment" r JOIN atlasfit_purge_targets t ON t.table_name='GymEnrollment' AND t.row_key=r."id" WHERE r."workspaceId" IS NOT NULL AND r."workspaceId"<>wid) THEN RAISE EXCEPTION 'Cross-tenant purge reference: GymEnrollment' USING ERRCODE='23514'; END IF;
 IF EXISTS(SELECT 1 FROM "GymContractAcceptance" r JOIN atlasfit_purge_targets t ON t.table_name='GymContractAcceptance' AND t.row_key=r."id" WHERE r."workspaceId" IS NOT NULL AND r."workspaceId"<>wid) THEN RAISE EXCEPTION 'Cross-tenant purge reference: GymContractAcceptance' USING ERRCODE='23514'; END IF;
 IF EXISTS(SELECT 1 FROM "GymEnrollmentEvent" r JOIN atlasfit_purge_targets t ON t.table_name='GymEnrollmentEvent' AND t.row_key=r."id" WHERE r."workspaceId" IS NOT NULL AND r."workspaceId"<>wid) THEN RAISE EXCEPTION 'Cross-tenant purge reference: GymEnrollmentEvent' USING ERRCODE='23514'; END IF;
 IF EXISTS(SELECT 1 FROM "GymInvoice" r JOIN atlasfit_purge_targets t ON t.table_name='GymInvoice' AND t.row_key=r."id" WHERE r."workspaceId" IS NOT NULL AND r."workspaceId"<>wid) THEN RAISE EXCEPTION 'Cross-tenant purge reference: GymInvoice' USING ERRCODE='23514'; END IF;
 IF EXISTS(SELECT 1 FROM "GymPayment" r JOIN atlasfit_purge_targets t ON t.table_name='GymPayment' AND t.row_key=r."id" WHERE r."workspaceId" IS NOT NULL AND r."workspaceId"<>wid) THEN RAISE EXCEPTION 'Cross-tenant purge reference: GymPayment' USING ERRCODE='23514'; END IF;
 IF EXISTS(SELECT 1 FROM "GymFinancialAccount" r JOIN atlasfit_purge_targets t ON t.table_name='GymFinancialAccount' AND t.row_key=r."id" WHERE r."workspaceId" IS NOT NULL AND r."workspaceId"<>wid) THEN RAISE EXCEPTION 'Cross-tenant purge reference: GymFinancialAccount' USING ERRCODE='23514'; END IF;
 IF EXISTS(SELECT 1 FROM "GymAccountTransfer" r JOIN atlasfit_purge_targets t ON t.table_name='GymAccountTransfer' AND t.row_key=r."id" WHERE r."workspaceId" IS NOT NULL AND r."workspaceId"<>wid) THEN RAISE EXCEPTION 'Cross-tenant purge reference: GymAccountTransfer' USING ERRCODE='23514'; END IF;
 IF EXISTS(SELECT 1 FROM "GymExpenseCategory" r JOIN atlasfit_purge_targets t ON t.table_name='GymExpenseCategory' AND t.row_key=r."id" WHERE r."workspaceId" IS NOT NULL AND r."workspaceId"<>wid) THEN RAISE EXCEPTION 'Cross-tenant purge reference: GymExpenseCategory' USING ERRCODE='23514'; END IF;
 IF EXISTS(SELECT 1 FROM "GymSupplier" r JOIN atlasfit_purge_targets t ON t.table_name='GymSupplier' AND t.row_key=r."id" WHERE r."workspaceId" IS NOT NULL AND r."workspaceId"<>wid) THEN RAISE EXCEPTION 'Cross-tenant purge reference: GymSupplier' USING ERRCODE='23514'; END IF;
 IF EXISTS(SELECT 1 FROM "GymExpense" r JOIN atlasfit_purge_targets t ON t.table_name='GymExpense' AND t.row_key=r."id" WHERE r."workspaceId" IS NOT NULL AND r."workspaceId"<>wid) THEN RAISE EXCEPTION 'Cross-tenant purge reference: GymExpense' USING ERRCODE='23514'; END IF;
 IF EXISTS(SELECT 1 FROM "GymCashDrawerSession" r JOIN atlasfit_purge_targets t ON t.table_name='GymCashDrawerSession' AND t.row_key=r."id" WHERE r."workspaceId" IS NOT NULL AND r."workspaceId"<>wid) THEN RAISE EXCEPTION 'Cross-tenant purge reference: GymCashDrawerSession' USING ERRCODE='23514'; END IF;
 IF EXISTS(SELECT 1 FROM "GymReconciliationDivergence" r JOIN atlasfit_purge_targets t ON t.table_name='GymReconciliationDivergence' AND t.row_key=r."id" WHERE r."workspaceId" IS NOT NULL AND r."workspaceId"<>wid) THEN RAISE EXCEPTION 'Cross-tenant purge reference: GymReconciliationDivergence' USING ERRCODE='23514'; END IF;
 IF EXISTS(SELECT 1 FROM "GymAdministrativeReview" r JOIN atlasfit_purge_targets t ON t.table_name='GymAdministrativeReview' AND t.row_key=r."id" WHERE r."workspaceId" IS NOT NULL AND r."workspaceId"<>wid) THEN RAISE EXCEPTION 'Cross-tenant purge reference: GymAdministrativeReview' USING ERRCODE='23514'; END IF;
 IF EXISTS(SELECT 1 FROM "GymModality" r JOIN atlasfit_purge_targets t ON t.table_name='GymModality' AND t.row_key=r."id" WHERE r."workspaceId" IS NOT NULL AND r."workspaceId"<>wid) THEN RAISE EXCEPTION 'Cross-tenant purge reference: GymModality' USING ERRCODE='23514'; END IF;
 IF EXISTS(SELECT 1 FROM "GymRoom" r JOIN atlasfit_purge_targets t ON t.table_name='GymRoom' AND t.row_key=r."id" WHERE r."workspaceId" IS NOT NULL AND r."workspaceId"<>wid) THEN RAISE EXCEPTION 'Cross-tenant purge reference: GymRoom' USING ERRCODE='23514'; END IF;
 IF EXISTS(SELECT 1 FROM "GymClassSchedule" r JOIN atlasfit_purge_targets t ON t.table_name='GymClassSchedule' AND t.row_key=r."id" WHERE r."workspaceId" IS NOT NULL AND r."workspaceId"<>wid) THEN RAISE EXCEPTION 'Cross-tenant purge reference: GymClassSchedule' USING ERRCODE='23514'; END IF;
 IF EXISTS(SELECT 1 FROM "GymClassSession" r JOIN atlasfit_purge_targets t ON t.table_name='GymClassSession' AND t.row_key=r."id" WHERE r."workspaceId" IS NOT NULL AND r."workspaceId"<>wid) THEN RAISE EXCEPTION 'Cross-tenant purge reference: GymClassSession' USING ERRCODE='23514'; END IF;
 IF EXISTS(SELECT 1 FROM "GymClassBooking" r JOIN atlasfit_purge_targets t ON t.table_name='GymClassBooking' AND t.row_key=r."id" WHERE r."workspaceId" IS NOT NULL AND r."workspaceId"<>wid) THEN RAISE EXCEPTION 'Cross-tenant purge reference: GymClassBooking' USING ERRCODE='23514'; END IF;
 IF EXISTS(SELECT 1 FROM "GymClassWaitlist" r JOIN atlasfit_purge_targets t ON t.table_name='GymClassWaitlist' AND t.row_key=r."id" WHERE r."workspaceId" IS NOT NULL AND r."workspaceId"<>wid) THEN RAISE EXCEPTION 'Cross-tenant purge reference: GymClassWaitlist' USING ERRCODE='23514'; END IF;
 IF EXISTS(SELECT 1 FROM "GymAccessGrant" r JOIN atlasfit_purge_targets t ON t.table_name='GymAccessGrant' AND t.row_key=r."id" WHERE r."workspaceId" IS NOT NULL AND r."workspaceId"<>wid) THEN RAISE EXCEPTION 'Cross-tenant purge reference: GymAccessGrant' USING ERRCODE='23514'; END IF;
 IF EXISTS(SELECT 1 FROM "GymAccessOverride" r JOIN atlasfit_purge_targets t ON t.table_name='GymAccessOverride' AND t.row_key=r."id" WHERE r."workspaceId" IS NOT NULL AND r."workspaceId"<>wid) THEN RAISE EXCEPTION 'Cross-tenant purge reference: GymAccessOverride' USING ERRCODE='23514'; END IF;
 IF EXISTS(SELECT 1 FROM "GymAccessDecisionLog" r JOIN atlasfit_purge_targets t ON t.table_name='GymAccessDecisionLog' AND t.row_key=r."id" WHERE r."workspaceId" IS NOT NULL AND r."workspaceId"<>wid) THEN RAISE EXCEPTION 'Cross-tenant purge reference: GymAccessDecisionLog' USING ERRCODE='23514'; END IF;
 IF EXISTS(SELECT 1 FROM "GymAccessDevice" r JOIN atlasfit_purge_targets t ON t.table_name='GymAccessDevice' AND t.row_key=r."id" WHERE r."workspaceId" IS NOT NULL AND r."workspaceId"<>wid) THEN RAISE EXCEPTION 'Cross-tenant purge reference: GymAccessDevice' USING ERRCODE='23514'; END IF;
 IF EXISTS(SELECT 1 FROM "GymDeviceCommand" r JOIN atlasfit_purge_targets t ON t.table_name='GymDeviceCommand' AND t.row_key=r."id" WHERE r."workspaceId" IS NOT NULL AND r."workspaceId"<>wid) THEN RAISE EXCEPTION 'Cross-tenant purge reference: GymDeviceCommand' USING ERRCODE='23514'; END IF;
 IF EXISTS(SELECT 1 FROM "GymAccessLog" r JOIN atlasfit_purge_targets t ON t.table_name='GymAccessLog' AND t.row_key=r."id" WHERE r."workspaceId" IS NOT NULL AND r."workspaceId"<>wid) THEN RAISE EXCEPTION 'Cross-tenant purge reference: GymAccessLog' USING ERRCODE='23514'; END IF;
 IF EXISTS(SELECT 1 FROM "GymAccessReconciliationDivergence" r JOIN atlasfit_purge_targets t ON t.table_name='GymAccessReconciliationDivergence' AND t.row_key=r."id" WHERE r."workspaceId" IS NOT NULL AND r."workspaceId"<>wid) THEN RAISE EXCEPTION 'Cross-tenant purge reference: GymAccessReconciliationDivergence' USING ERRCODE='23514'; END IF;
 SELECT array_agg(DISTINCT user_id) INTO candidate_ids FROM (SELECT "ownerId" user_id FROM "Workspace" WHERE id=wid UNION SELECT "userId" FROM "WorkspaceMember" WHERE "workspaceId"=wid UNION SELECT "guardianUserId" FROM "GymGuardian" WHERE "workspaceId"=wid) u WHERE user_id IS NOT NULL;
 DELETE FROM "FinancialAuditLog" a WHERE EXISTS(SELECT 1 FROM atlasfit_purge_targets t WHERE a."resourceId"=t.row_key OR strpos(COALESCE(a."metadataSanitized"::TEXT,''),t.row_key)>0);
 DELETE FROM "AuditLog" a WHERE EXISTS(SELECT 1 FROM atlasfit_purge_targets t WHERE a."entityId"=t.row_key OR strpos(a.action,t.row_key)>0 OR strpos(COALESCE(a.metadata::TEXT,''),t.row_key)>0);
 DELETE FROM "WorkspaceRoleGrant" WHERE "id" IN (SELECT row_key FROM atlasfit_purge_targets WHERE table_name='WorkspaceRoleGrant');
 DELETE FROM "GymStaffProfile" WHERE "id" IN (SELECT row_key FROM atlasfit_purge_targets WHERE table_name='GymStaffProfile');
 DELETE FROM "GymStudentProfile" WHERE "id" IN (SELECT row_key FROM atlasfit_purge_targets WHERE table_name='GymStudentProfile');
 DELETE FROM "ActivationFeeRecoveryOperation" WHERE "id" IN (SELECT row_key FROM atlasfit_purge_targets WHERE table_name='ActivationFeeRecoveryOperation');
 DELETE FROM "PaymentAttempt" WHERE "id" IN (SELECT row_key FROM atlasfit_purge_targets WHERE table_name='PaymentAttempt');
 DELETE FROM "PaymentSplit" WHERE "id" IN (SELECT row_key FROM atlasfit_purge_targets WHERE table_name='PaymentSplit');
 DELETE FROM "WalletLedgerEntry" WHERE "id" IN (SELECT row_key FROM atlasfit_purge_targets WHERE table_name='WalletLedgerEntry');
 DELETE FROM "GymInvoiceItem" WHERE "id" IN (SELECT row_key FROM atlasfit_purge_targets WHERE table_name='GymInvoiceItem');
 DELETE FROM "GymPaymentAllocation" WHERE "id" IN (SELECT row_key FROM atlasfit_purge_targets WHERE table_name='GymPaymentAllocation');
 DELETE FROM "GymInvoice" WHERE "id" IN (SELECT row_key FROM atlasfit_purge_targets WHERE table_name='GymInvoice');
 DELETE FROM "StudentBilling" WHERE "id" IN (SELECT row_key FROM atlasfit_purge_targets WHERE table_name='StudentBilling');
 DELETE FROM "GymContractAcceptance" WHERE "id" IN (SELECT row_key FROM atlasfit_purge_targets WHERE table_name='GymContractAcceptance');
 DELETE FROM "GymEnrollmentEvent" WHERE "id" IN (SELECT row_key FROM atlasfit_purge_targets WHERE table_name='GymEnrollmentEvent');
 DELETE FROM "GymEnrollmentPause" WHERE "id" IN (SELECT row_key FROM atlasfit_purge_targets WHERE table_name='GymEnrollmentPause');
 DELETE FROM "GymClassBooking" WHERE "id" IN (SELECT row_key FROM atlasfit_purge_targets WHERE table_name='GymClassBooking');
 DELETE FROM "GymClassWaitlist" WHERE "id" IN (SELECT row_key FROM atlasfit_purge_targets WHERE table_name='GymClassWaitlist');
 DELETE FROM "GymAccessGrant" WHERE "id" IN (SELECT row_key FROM atlasfit_purge_targets WHERE table_name='GymAccessGrant');
 DELETE FROM "GymEnrollment" WHERE "id" IN (SELECT row_key FROM atlasfit_purge_targets WHERE table_name='GymEnrollment');
 DELETE FROM "GymGuardian" WHERE "id" IN (SELECT row_key FROM atlasfit_purge_targets WHERE table_name='GymGuardian');
 DELETE FROM "GymClassSession" WHERE "id" IN (SELECT row_key FROM atlasfit_purge_targets WHERE table_name='GymClassSession');
 DELETE FROM "GymClassSchedule" WHERE "id" IN (SELECT row_key FROM atlasfit_purge_targets WHERE table_name='GymClassSchedule');
 DELETE FROM "GymAccessOverride" WHERE "id" IN (SELECT row_key FROM atlasfit_purge_targets WHERE table_name='GymAccessOverride');
 DELETE FROM "GymAccessDecisionLog" WHERE "id" IN (SELECT row_key FROM atlasfit_purge_targets WHERE table_name='GymAccessDecisionLog');
 DELETE FROM "GymAccessReconciliationDivergence" WHERE "id" IN (SELECT row_key FROM atlasfit_purge_targets WHERE table_name='GymAccessReconciliationDivergence');
 DELETE FROM "GymAccessLog" WHERE "id" IN (SELECT row_key FROM atlasfit_purge_targets WHERE table_name='GymAccessLog');
 DELETE FROM "WorkspaceMember" WHERE "id" IN (SELECT row_key FROM atlasfit_purge_targets WHERE table_name='WorkspaceMember');
 DELETE FROM "GymStorageObject" WHERE "objectKey" IN (SELECT row_key FROM atlasfit_purge_targets WHERE table_name='GymStorageObject');
 DELETE FROM "VerificationToken" WHERE "token" IN (SELECT row_key FROM atlasfit_purge_targets WHERE table_name='VerificationToken');
 DELETE FROM "TrainerVideoExercise" WHERE "id" IN (SELECT row_key FROM atlasfit_purge_targets WHERE table_name='TrainerVideoExercise');
 DELETE FROM "TrainerVideo" WHERE "id" IN (SELECT row_key FROM atlasfit_purge_targets WHERE table_name='TrainerVideo');
 DELETE FROM "WorkoutExercise" WHERE "id" IN (SELECT row_key FROM atlasfit_purge_targets WHERE table_name='WorkoutExercise');
 DELETE FROM "WorkoutLog" WHERE "id" IN (SELECT row_key FROM atlasfit_purge_targets WHERE table_name='WorkoutLog');
 DELETE FROM "WorkoutExerciseGroup" WHERE "id" IN (SELECT row_key FROM atlasfit_purge_targets WHERE table_name='WorkoutExerciseGroup');
 DELETE FROM "Workout" WHERE "id" IN (SELECT row_key FROM atlasfit_purge_targets WHERE table_name='Workout');
 DELETE FROM "WorkspacePlan" WHERE "id" IN (SELECT row_key FROM atlasfit_purge_targets WHERE table_name='WorkspacePlan');
 DELETE FROM "WorkspacePayment" WHERE "id" IN (SELECT row_key FROM atlasfit_purge_targets WHERE table_name='WorkspacePayment');
 DELETE FROM "PendingStudent" WHERE "id" IN (SELECT row_key FROM atlasfit_purge_targets WHERE table_name='PendingStudent');
 DELETE FROM "TrainerTask" WHERE "id" IN (SELECT row_key FROM atlasfit_purge_targets WHERE table_name='TrainerTask');
 DELETE FROM "StudentProgress" WHERE "id" IN (SELECT row_key FROM atlasfit_purge_targets WHERE table_name='StudentProgress');
 DELETE FROM "StudentProgressPhoto" WHERE "id" IN (SELECT row_key FROM atlasfit_purge_targets WHERE table_name='StudentProgressPhoto');
 DELETE FROM "DailyFeedback" WHERE "id" IN (SELECT row_key FROM atlasfit_purge_targets WHERE table_name='DailyFeedback');
 DELETE FROM "EngageUserStatus" WHERE "id" IN (SELECT row_key FROM atlasfit_purge_targets WHERE table_name='EngageUserStatus');
 DELETE FROM "EngageEventLog" WHERE "id" IN (SELECT row_key FROM atlasfit_purge_targets WHERE table_name='EngageEventLog');
 DELETE FROM "EngageExperience" WHERE "id" IN (SELECT row_key FROM atlasfit_purge_targets WHERE table_name='EngageExperience');
 DELETE FROM "LeadActivity" WHERE "id" IN (SELECT row_key FROM atlasfit_purge_targets WHERE table_name='LeadActivity');
 DELETE FROM "LeadTask" WHERE "id" IN (SELECT row_key FROM atlasfit_purge_targets WHERE table_name='LeadTask');
 DELETE FROM "CustomFieldValue" WHERE "id" IN (SELECT row_key FROM atlasfit_purge_targets WHERE table_name='CustomFieldValue');
 DELETE FROM "LeadFile" WHERE "id" IN (SELECT row_key FROM atlasfit_purge_targets WHERE table_name='LeadFile');
 DELETE FROM "Lead" WHERE "id" IN (SELECT row_key FROM atlasfit_purge_targets WHERE table_name='Lead');
 DELETE FROM "Tag" WHERE "id" IN (SELECT row_key FROM atlasfit_purge_targets WHERE table_name='Tag');
 DELETE FROM "CustomFieldDefinition" WHERE "id" IN (SELECT row_key FROM atlasfit_purge_targets WHERE table_name='CustomFieldDefinition');
 DELETE FROM "Notification" WHERE "id" IN (SELECT row_key FROM atlasfit_purge_targets WHERE table_name='Notification');
 DELETE FROM "ConversationParticipant" WHERE "id" IN (SELECT row_key FROM atlasfit_purge_targets WHERE table_name='ConversationParticipant');
 DELETE FROM "Message" WHERE "id" IN (SELECT row_key FROM atlasfit_purge_targets WHERE table_name='Message');
 DELETE FROM "Conversation" WHERE "id" IN (SELECT row_key FROM atlasfit_purge_targets WHERE table_name='Conversation');
 DELETE FROM "ImportSource" WHERE "id" IN (SELECT row_key FROM atlasfit_purge_targets WHERE table_name='ImportSource');
 DELETE FROM "ImportRecord" WHERE "id" IN (SELECT row_key FROM atlasfit_purge_targets WHERE table_name='ImportRecord');
 DELETE FROM "ImportEntityResult" WHERE "id" IN (SELECT row_key FROM atlasfit_purge_targets WHERE table_name='ImportEntityResult');
 DELETE FROM "GeminiUsageLog" WHERE "id" IN (SELECT row_key FROM atlasfit_purge_targets WHERE table_name='GeminiUsageLog');
 DELETE FROM "ImportJob" WHERE "id" IN (SELECT row_key FROM atlasfit_purge_targets WHERE table_name='ImportJob');
 DELETE FROM "CreditPurchase" WHERE "id" IN (SELECT row_key FROM atlasfit_purge_targets WHERE table_name='CreditPurchase');
 DELETE FROM "WalletBalanceSnapshot" WHERE "id" IN (SELECT row_key FROM atlasfit_purge_targets WHERE table_name='WalletBalanceSnapshot');
 DELETE FROM "StudentSubscription" WHERE "id" IN (SELECT row_key FROM atlasfit_purge_targets WHERE table_name='StudentSubscription');
 DELETE FROM "WalletPayoutRequest" WHERE "id" IN (SELECT row_key FROM atlasfit_purge_targets WHERE table_name='WalletPayoutRequest');
 DELETE FROM "PaymentProviderAccount" WHERE "id" IN (SELECT row_key FROM atlasfit_purge_targets WHERE table_name='PaymentProviderAccount');
 DELETE FROM "GatewayCustomer" WHERE "id" IN (SELECT row_key FROM atlasfit_purge_targets WHERE table_name='GatewayCustomer');
 DELETE FROM "DeliveryOutbox" WHERE "id" IN (SELECT row_key FROM atlasfit_purge_targets WHERE table_name='DeliveryOutbox');
 DELETE FROM "PaymentWebhookEvent" WHERE "id" IN (SELECT row_key FROM atlasfit_purge_targets WHERE table_name='PaymentWebhookEvent');
 DELETE FROM "GymPurgeJob" WHERE "workspaceId" IN (SELECT row_key FROM atlasfit_purge_targets WHERE table_name='GymPurgeJob');
 DELETE FROM "GymCommunicationDispatch" WHERE "id" IN (SELECT row_key FROM atlasfit_purge_targets WHERE table_name='GymCommunicationDispatch');
 DELETE FROM "GymSettings" WHERE "id" IN (SELECT row_key FROM atlasfit_purge_targets WHERE table_name='GymSettings');
 DELETE FROM "WorkspaceInvitation" WHERE "id" IN (SELECT row_key FROM atlasfit_purge_targets WHERE table_name='WorkspaceInvitation');
 DELETE FROM "GymPayment" WHERE "id" IN (SELECT row_key FROM atlasfit_purge_targets WHERE table_name='GymPayment');
 DELETE FROM "GymCashDrawerMovement" WHERE "id" IN (SELECT row_key FROM atlasfit_purge_targets WHERE table_name='GymCashDrawerMovement');
 DELETE FROM "GymAccountTransfer" WHERE "id" IN (SELECT row_key FROM atlasfit_purge_targets WHERE table_name='GymAccountTransfer');
 DELETE FROM "GymExpensePayment" WHERE "id" IN (SELECT row_key FROM atlasfit_purge_targets WHERE table_name='GymExpensePayment');
 DELETE FROM "GymExpense" WHERE "id" IN (SELECT row_key FROM atlasfit_purge_targets WHERE table_name='GymExpense');
 DELETE FROM "GymCashDrawerSession" WHERE "id" IN (SELECT row_key FROM atlasfit_purge_targets WHERE table_name='GymCashDrawerSession');
 DELETE FROM "GymFinancialAccount" WHERE "id" IN (SELECT row_key FROM atlasfit_purge_targets WHERE table_name='GymFinancialAccount');
 DELETE FROM "GymRoom" WHERE "id" IN (SELECT row_key FROM atlasfit_purge_targets WHERE table_name='GymRoom');
 DELETE FROM "GymDeviceCommand" WHERE "id" IN (SELECT row_key FROM atlasfit_purge_targets WHERE table_name='GymDeviceCommand');
 DELETE FROM "GymAccessDevice" WHERE "id" IN (SELECT row_key FROM atlasfit_purge_targets WHERE table_name='GymAccessDevice');
 DELETE FROM "GymUnit" WHERE "id" IN (SELECT row_key FROM atlasfit_purge_targets WHERE table_name='GymUnit');
 DELETE FROM "WorkspaceSubscription" WHERE "id" IN (SELECT row_key FROM atlasfit_purge_targets WHERE table_name='WorkspaceSubscription');
 DELETE FROM "GymPlanVersion" WHERE "id" IN (SELECT row_key FROM atlasfit_purge_targets WHERE table_name='GymPlanVersion');
 DELETE FROM "GymPlan" WHERE "id" IN (SELECT row_key FROM atlasfit_purge_targets WHERE table_name='GymPlan');
 DELETE FROM "GymExpenseCategory" WHERE "id" IN (SELECT row_key FROM atlasfit_purge_targets WHERE table_name='GymExpenseCategory');
 DELETE FROM "GymSupplier" WHERE "id" IN (SELECT row_key FROM atlasfit_purge_targets WHERE table_name='GymSupplier');
 DELETE FROM "GymReconciliationDivergence" WHERE "id" IN (SELECT row_key FROM atlasfit_purge_targets WHERE table_name='GymReconciliationDivergence');
 DELETE FROM "GymAdministrativeReview" WHERE "id" IN (SELECT row_key FROM atlasfit_purge_targets WHERE table_name='GymAdministrativeReview');
 DELETE FROM "GymModality" WHERE "id" IN (SELECT row_key FROM atlasfit_purge_targets WHERE table_name='GymModality');
 DELETE FROM "Workspace" WHERE "id" IN (SELECT row_key FROM atlasfit_purge_targets WHERE table_name='Workspace');
 DELETE FROM "PhysicalEvaluation" WHERE "id" IN (SELECT row_key FROM atlasfit_purge_targets WHERE table_name='PhysicalEvaluation');
 DELETE FROM "StudentFile" WHERE "id" IN (SELECT row_key FROM atlasfit_purge_targets WHERE table_name='StudentFile');
 DELETE FROM "LegalAcceptance" WHERE "id" IN (SELECT row_key FROM atlasfit_purge_targets WHERE table_name='LegalAcceptance');
 DELETE FROM "DataSubjectRequest" WHERE "id" IN (SELECT row_key FROM atlasfit_purge_targets WHERE table_name='DataSubjectRequest');
 -- Shared users and their data in other products are not tenant data to erase.
 FOREACH candidate IN ARRAY COALESCE(candidate_ids,ARRAY[]::TEXT[]) LOOP
  IF EXISTS(SELECT 1 FROM "User" WHERE id=candidate AND role<>'SUPERADMIN' AND "imageKey" IS NULL AND "image" IS NULL)
   AND NOT EXISTS(SELECT 1 FROM "Workspace" WHERE "ownerId"=candidate)
   AND NOT EXISTS(SELECT 1 FROM "WorkspaceMember" WHERE "userId"=candidate)
   AND NOT EXISTS(SELECT 1 FROM "GymGuardian" WHERE "guardianUserId"=candidate)
   AND NOT EXISTS(SELECT 1 FROM "PaymentProviderAccount" WHERE "personalUserId"=candidate)
   AND NOT EXISTS(SELECT 1 FROM "StudentBilling" WHERE "studentUserId"=candidate OR "payerUserId"=candidate)
   AND NOT EXISTS(SELECT 1 FROM "GatewayCustomer" WHERE "personalUserId"=candidate OR "studentUserId"=candidate OR "payerUserId"=candidate)
   AND NOT EXISTS(SELECT 1 FROM "Subscription" WHERE "userId"=candidate)
   AND NOT EXISTS(SELECT 1 FROM "Workout" WHERE "creatorId"=candidate OR "studentId"=candidate)
   AND NOT EXISTS(SELECT 1 FROM "TrainerVideo" WHERE "trainerId"=candidate)
   AND NOT EXISTS(SELECT 1 FROM "GymContractAcceptance" WHERE "signerUserId"=candidate OR "representedUserId"=candidate)
   AND NOT EXISTS(SELECT 1 FROM "ConversationParticipant" WHERE "userId"=candidate)
   AND NOT EXISTS(SELECT 1 FROM "User" WHERE "referredById"=candidate)
   AND NOT EXISTS(SELECT 1 FROM "User" WHERE "referredById"=candidate)
   AND NOT EXISTS(SELECT 1 FROM "WorkspaceMember" WHERE "userId"=candidate)
   AND NOT EXISTS(SELECT 1 FROM "Subscription" WHERE "userId"=candidate)
   AND NOT EXISTS(SELECT 1 FROM "Transaction" WHERE "userId"=candidate)
   AND NOT EXISTS(SELECT 1 FROM "GymStorageObject" WHERE "actorUserId"=candidate)
   AND NOT EXISTS(SELECT 1 FROM "Exercise" WHERE "creatorId"=candidate)
   AND NOT EXISTS(SELECT 1 FROM "TrainerVideo" WHERE "trainerId"=candidate)
   AND NOT EXISTS(SELECT 1 FROM "Workout" WHERE "creatorId"=candidate)
   AND NOT EXISTS(SELECT 1 FROM "Workout" WHERE "studentId"=candidate)
   AND NOT EXISTS(SELECT 1 FROM "SubscriptionActivity" WHERE "userId"=candidate)
   AND NOT EXISTS(SELECT 1 FROM "ExerciseAdjustmentRequest" WHERE "requesterId"=candidate)
   AND NOT EXISTS(SELECT 1 FROM "AdjustmentMessage" WHERE "senderId"=candidate)
   AND NOT EXISTS(SELECT 1 FROM "TrainerTask" WHERE "studentId"=candidate)
   AND NOT EXISTS(SELECT 1 FROM "StudentProgress" WHERE "studentId"=candidate)
   AND NOT EXISTS(SELECT 1 FROM "StudentProgressPhoto" WHERE "studentId"=candidate)
   AND NOT EXISTS(SELECT 1 FROM "PhysicalEvaluation" WHERE "studentId"=candidate)
   AND NOT EXISTS(SELECT 1 FROM "StudentFile" WHERE "studentId"=candidate)
   AND NOT EXISTS(SELECT 1 FROM "WorkoutLog" WHERE "studentId"=candidate)
   AND NOT EXISTS(SELECT 1 FROM "DailyFeedback" WHERE "studentId"=candidate)
   AND NOT EXISTS(SELECT 1 FROM "EngageExperience" WHERE "creatorId"=candidate)
   AND NOT EXISTS(SELECT 1 FROM "EngageUserStatus" WHERE "userId"=candidate)
   AND NOT EXISTS(SELECT 1 FROM "EngageEventLog" WHERE "userId"=candidate)
   AND NOT EXISTS(SELECT 1 FROM "EngagePushNotification" WHERE "creatorId"=candidate)
   AND NOT EXISTS(SELECT 1 FROM "EngagePushLog" WHERE "userId"=candidate)
   AND NOT EXISTS(SELECT 1 FROM "Lead" WHERE "ownerId"=candidate)
   AND NOT EXISTS(SELECT 1 FROM "ReferralCommission" WHERE "referrerId"=candidate)
   AND NOT EXISTS(SELECT 1 FROM "ReferralCommission" WHERE "referredId"=candidate)
   AND NOT EXISTS(SELECT 1 FROM "PayoutRequest" WHERE "userId"=candidate)
   AND NOT EXISTS(SELECT 1 FROM "ConversationParticipant" WHERE "userId"=candidate)
   AND NOT EXISTS(SELECT 1 FROM "Message" WHERE "senderId"=candidate)
   AND NOT EXISTS(SELECT 1 FROM "ImportJob" WHERE "createdByUserId"=candidate)
   AND NOT EXISTS(SELECT 1 FROM "GeminiUsageLog" WHERE "userId"=candidate)
   AND NOT EXISTS(SELECT 1 FROM "CreditPurchase" WHERE "userId"=candidate)
   AND NOT EXISTS(SELECT 1 FROM "PaymentProviderAccount" WHERE "personalUserId"=candidate)
   AND NOT EXISTS(SELECT 1 FROM "GymCommunicationDispatch" WHERE "senderUserId"=candidate)
   AND NOT EXISTS(SELECT 1 FROM "RoadmapFeature" WHERE "authorId"=candidate)
   AND NOT EXISTS(SELECT 1 FROM "RoadmapFeature" WHERE "officialResponseById"=candidate)
   AND NOT EXISTS(SELECT 1 FROM "RoadmapFeature" WHERE "editedById"=candidate)
   AND NOT EXISTS(SELECT 1 FROM "RoadmapVote" WHERE "userId"=candidate)
   AND NOT EXISTS(SELECT 1 FROM "RoadmapComment" WHERE "authorId"=candidate)
   AND NOT EXISTS(SELECT 1 FROM "RoadmapComment" WHERE "editedById"=candidate)
   AND NOT EXISTS(SELECT 1 FROM "RoadmapPoll" WHERE "createdById"=candidate)
   AND NOT EXISTS(SELECT 1 FROM "RoadmapPollVote" WHERE "userId"=candidate)
   AND NOT EXISTS(SELECT 1 FROM "RoadmapAuditLog" WHERE "actorId"=candidate)
   AND NOT EXISTS(SELECT 1 FROM "GymGuardian" WHERE "guardianUserId"=candidate)
   AND NOT EXISTS(SELECT 1 FROM "GymEnrollment" WHERE "billingPayerUserId"=candidate)
   AND NOT EXISTS(SELECT 1 FROM "GymContractAcceptance" WHERE "signerUserId"=candidate)
   AND NOT EXISTS(SELECT 1 FROM "GymContractAcceptance" WHERE "representedUserId"=candidate)
   AND NOT EXISTS(SELECT 1 FROM "GymInvoice" WHERE "studentUserId"=candidate)
   AND NOT EXISTS(SELECT 1 FROM "GymPayment" WHERE "receivedByUserId"=candidate)
   AND NOT EXISTS(SELECT 1 FROM "GymPayment" WHERE "reversedByUserId"=candidate)
   AND NOT EXISTS(SELECT 1 FROM "GymAccountTransfer" WHERE "performedByUserId"=candidate)
   AND NOT EXISTS(SELECT 1 FROM "GymExpense" WHERE "createdByUserId"=candidate)
   AND NOT EXISTS(SELECT 1 FROM "GymExpense" WHERE "paidByUserId"=candidate)
   AND NOT EXISTS(SELECT 1 FROM "GymExpense" WHERE "cancelledByUserId"=candidate)
   AND NOT EXISTS(SELECT 1 FROM "GymExpensePayment" WHERE "recordedByUserId"=candidate)
   AND NOT EXISTS(SELECT 1 FROM "GymExpensePayment" WHERE "reversedByUserId"=candidate)
   AND NOT EXISTS(SELECT 1 FROM "GymCashDrawerSession" WHERE "openedByUserId"=candidate)
   AND NOT EXISTS(SELECT 1 FROM "GymCashDrawerSession" WHERE "closedByUserId"=candidate)
   AND NOT EXISTS(SELECT 1 FROM "GymCashDrawerSession" WHERE "reconciledByUserId"=candidate)
   AND NOT EXISTS(SELECT 1 FROM "GymCashDrawerMovement" WHERE "performedByUserId"=candidate)
   AND NOT EXISTS(SELECT 1 FROM "GymAdministrativeReview" WHERE "actorUserId"=candidate)
   AND NOT EXISTS(SELECT 1 FROM "Notification" WHERE "userId"=candidate AND "workspaceId" IS NOT NULL)
   AND NOT EXISTS(SELECT 1 FROM "LegalAcceptance" WHERE "userId"=candidate AND "workspaceId" IS NOT NULL)
   AND NOT EXISTS(SELECT 1 FROM "LegalAcceptance" WHERE "representedUserId"=candidate AND "workspaceId" IS NOT NULL)
   AND NOT EXISTS(SELECT 1 FROM "DataSubjectRequest" WHERE "requesterUserId"=candidate AND "workspaceId" IS NOT NULL)
   AND NOT EXISTS(SELECT 1 FROM "AuditLog" WHERE "userId"=candidate OR "entityId"=candidate)
  THEN
   DELETE FROM "PasswordResetToken" WHERE email=(SELECT email FROM "User" WHERE id=candidate);
   DELETE FROM "AuditLog" WHERE "userId"=candidate OR "entityId"=candidate;
   DELETE FROM "User" WHERE id=candidate;
   removed_users:=removed_users+1;
  END IF;
 END LOOP;
 RETURN QUERY SELECT after_count,removed_users;
END $$;
COMMIT;
