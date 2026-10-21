-- GYM local references must resolve in the same tenant. PERSONAL-only semantics remain unchanged.
-- Preflight below refuses inconsistent history; it never guesses or rewrites a relationship.
BEGIN;
SET LOCAL lock_timeout = '10s';
LOCK TABLE "Conversation", "CreditPurchase", "CustomFieldDefinition", "DailyFeedback", "DataSubjectRequest", "EngageExperience", "GatewayCustomer", "GymAccountTransfer", "GymAdministrativeReview", "GymCashDrawerSession", "GymCommunicationDispatch", "GymContractAcceptance", "GymEnrollment", "GymEnrollmentEvent", "GymExpense", "GymExpenseCategory", "GymExpensePayment", "GymFinancialAccount", "GymGuardian", "GymInvoice", "GymPayment", "GymPaymentAllocation", "GymPlan", "GymPlanVersion", "GymReconciliationDivergence", "GymSettings", "GymStorageObject", "GymStudentProfile", "GymSupplier", "GymUnit", "ImportJob", "Lead", "LegalAcceptance", "Notification", "PaymentProviderAccount", "PendingStudent", "PhysicalEvaluation", "StudentBilling", "StudentFile", "StudentProgress", "StudentProgressPhoto", "Tag", "TrainerTask", "TrainerVideo", "Workout", "WorkoutLog", "Workspace", "WorkspaceInvitation", "WorkspaceMember", "WorkspacePayment", "WorkspacePlan", "WorkspaceRoleGrant", "WorkspaceSubscription" IN ACCESS EXCLUSIVE MODE;
CREATE OR REPLACE FUNCTION atlasfit_gym_relation_scope() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE own_workspace text; related_workspace text; related_id text; own_id text;
BEGIN
 IF TG_ARGV[3] = '' THEN own_workspace := to_jsonb(NEW)->>'workspaceId';
 ELSE
  own_id := to_jsonb(NEW)->>TG_ARGV[3];
  EXECUTE format('SELECT "workspaceId" FROM %I WHERE id = $1', TG_ARGV[4]) INTO own_workspace USING own_id;
 END IF;
 related_id := to_jsonb(NEW)->>TG_ARGV[0];
 IF related_id IS NULL THEN RETURN NEW; END IF;
 IF TG_ARGV[2] = '' THEN
  EXECUTE format('SELECT "workspaceId" FROM %I WHERE id = $1', TG_ARGV[1]) INTO related_workspace USING related_id;
 ELSE
  EXECUTE format('SELECT p."workspaceId" FROM %I r JOIN "GymPlan" p ON p.id=r."planId" WHERE r.id=$1', TG_ARGV[1]) INTO related_workspace USING related_id;
 END IF;
 IF related_workspace IS DISTINCT FROM own_workspace AND EXISTS (SELECT 1 FROM "Workspace" WHERE id IN (own_workspace, related_workspace) AND type='GYM') THEN
  RAISE EXCEPTION 'GYM tenant relation mismatch: %.%', TG_TABLE_NAME, TG_ARGV[0] USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION atlasfit_gym_workspace_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW."workspaceId" IS DISTINCT FROM OLD."workspaceId" AND EXISTS (SELECT 1 FROM "Workspace" WHERE id IN (NEW."workspaceId", OLD."workspaceId") AND type='GYM') THEN
  RAISE EXCEPTION 'GYM records require an explicit transfer preserving historical obligations' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION atlasfit_gym_parent_scope_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE old_workspace text; new_workspace text;
BEGIN
 IF to_jsonb(NEW)->>TG_ARGV[0] IS NOT DISTINCT FROM to_jsonb(OLD)->>TG_ARGV[0] THEN RETURN NEW; END IF;
 EXECUTE format('SELECT "workspaceId" FROM %I WHERE id=$1', TG_ARGV[1]) INTO old_workspace USING to_jsonb(OLD)->>TG_ARGV[0];
 EXECUTE format('SELECT "workspaceId" FROM %I WHERE id=$1', TG_ARGV[1]) INTO new_workspace USING to_jsonb(NEW)->>TG_ARGV[0];
 IF old_workspace IS DISTINCT FROM new_workspace AND EXISTS (SELECT 1 FROM "Workspace" WHERE id IN (old_workspace, new_workspace) AND type='GYM') THEN
  RAISE EXCEPTION 'GYM records require an explicit transfer preserving historical obligations' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;

DO $$ BEGIN IF EXISTS (SELECT 1 FROM "WorkspaceMember" c  LEFT JOIN "GymUnit" p ON p.id=c."unitId" WHERE c."unitId" IS NOT NULL AND p."workspaceId" IS DISTINCT FROM c."workspaceId" AND EXISTS (SELECT 1 FROM "Workspace" w WHERE w.id IN (c."workspaceId", p."workspaceId") AND w.type='GYM')) THEN RAISE EXCEPTION 'Reconcile GYM relation WorkspaceMember.unitId before deployment'; END IF; END $$;
DROP TRIGGER IF EXISTS "gym_scope_unitId" ON "WorkspaceMember";
CREATE TRIGGER "gym_scope_unitId" BEFORE INSERT OR UPDATE ON "WorkspaceMember" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_relation_scope('unitId', 'GymUnit', '', '', '');

DO $$ BEGIN IF EXISTS (SELECT 1 FROM "WorkspaceMember" c  LEFT JOIN "WorkspaceMember" p ON p.id=c."assignedStaffId" WHERE c."assignedStaffId" IS NOT NULL AND p."workspaceId" IS DISTINCT FROM c."workspaceId" AND EXISTS (SELECT 1 FROM "Workspace" w WHERE w.id IN (c."workspaceId", p."workspaceId") AND w.type='GYM')) THEN RAISE EXCEPTION 'Reconcile GYM relation WorkspaceMember.assignedStaffId before deployment'; END IF; END $$;
DROP TRIGGER IF EXISTS "gym_scope_assignedStaffId" ON "WorkspaceMember";
CREATE TRIGGER "gym_scope_assignedStaffId" BEFORE INSERT OR UPDATE ON "WorkspaceMember" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_relation_scope('assignedStaffId', 'WorkspaceMember', '', '', '');

DO $$ BEGIN IF EXISTS (SELECT 1 FROM "WorkoutLog" c  LEFT JOIN "Workout" p ON p.id=c."workoutId" WHERE c."workoutId" IS NOT NULL AND p."workspaceId" IS DISTINCT FROM c."workspaceId" AND EXISTS (SELECT 1 FROM "Workspace" w WHERE w.id IN (c."workspaceId", p."workspaceId") AND w.type='GYM')) THEN RAISE EXCEPTION 'Reconcile GYM relation WorkoutLog.workoutId before deployment'; END IF; END $$;
DROP TRIGGER IF EXISTS "gym_scope_workoutId" ON "WorkoutLog";
CREATE TRIGGER "gym_scope_workoutId" BEFORE INSERT OR UPDATE ON "WorkoutLog" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_relation_scope('workoutId', 'Workout', '', '', '');

DO $$ BEGIN IF EXISTS (SELECT 1 FROM "Notification" c  LEFT JOIN "GymCommunicationDispatch" p ON p.id=c."dispatchId" WHERE c."dispatchId" IS NOT NULL AND p."workspaceId" IS DISTINCT FROM c."workspaceId" AND EXISTS (SELECT 1 FROM "Workspace" w WHERE w.id IN (c."workspaceId", p."workspaceId") AND w.type='GYM')) THEN RAISE EXCEPTION 'Reconcile GYM relation Notification.dispatchId before deployment'; END IF; END $$;
DROP TRIGGER IF EXISTS "gym_scope_dispatchId" ON "Notification";
CREATE TRIGGER "gym_scope_dispatchId" BEFORE INSERT OR UPDATE ON "Notification" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_relation_scope('dispatchId', 'GymCommunicationDispatch', '', '', '');

DO $$ BEGIN IF EXISTS (SELECT 1 FROM "StudentBilling" c  LEFT JOIN "WorkspacePayment" p ON p.id=c."workspacePaymentId" WHERE c."workspacePaymentId" IS NOT NULL AND p."workspaceId" IS DISTINCT FROM c."workspaceId" AND EXISTS (SELECT 1 FROM "Workspace" w WHERE w.id IN (c."workspaceId", p."workspaceId") AND w.type='GYM')) THEN RAISE EXCEPTION 'Reconcile GYM relation StudentBilling.workspacePaymentId before deployment'; END IF; END $$;
DROP TRIGGER IF EXISTS "gym_scope_workspacePaymentId" ON "StudentBilling";
CREATE TRIGGER "gym_scope_workspacePaymentId" BEFORE INSERT OR UPDATE ON "StudentBilling" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_relation_scope('workspacePaymentId', 'WorkspacePayment', '', '', '');

DO $$ BEGIN IF EXISTS (SELECT 1 FROM "StudentBilling" c  LEFT JOIN "PaymentProviderAccount" p ON p.id=c."providerAccountId" WHERE c."providerAccountId" IS NOT NULL AND p."workspaceId" IS DISTINCT FROM c."workspaceId" AND EXISTS (SELECT 1 FROM "Workspace" w WHERE w.id IN (c."workspaceId", p."workspaceId") AND w.type='GYM')) THEN RAISE EXCEPTION 'Reconcile GYM relation StudentBilling.providerAccountId before deployment'; END IF; END $$;
DROP TRIGGER IF EXISTS "gym_scope_providerAccountId" ON "StudentBilling";
CREATE TRIGGER "gym_scope_providerAccountId" BEFORE INSERT OR UPDATE ON "StudentBilling" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_relation_scope('providerAccountId', 'PaymentProviderAccount', '', '', '');

DO $$ BEGIN IF EXISTS (SELECT 1 FROM "StudentBilling" c  LEFT JOIN "GymEnrollment" p ON p.id=c."enrollmentId" WHERE c."enrollmentId" IS NOT NULL AND p."workspaceId" IS DISTINCT FROM c."workspaceId" AND EXISTS (SELECT 1 FROM "Workspace" w WHERE w.id IN (c."workspaceId", p."workspaceId") AND w.type='GYM')) THEN RAISE EXCEPTION 'Reconcile GYM relation StudentBilling.enrollmentId before deployment'; END IF; END $$;
DROP TRIGGER IF EXISTS "gym_scope_enrollmentId" ON "StudentBilling";
CREATE TRIGGER "gym_scope_enrollmentId" BEFORE INSERT OR UPDATE ON "StudentBilling" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_relation_scope('enrollmentId', 'GymEnrollment', '', '', '');

DO $$ BEGIN IF EXISTS (SELECT 1 FROM "WorkspaceInvitation" c  LEFT JOIN "GymUnit" p ON p.id=c."unitId" WHERE c."unitId" IS NOT NULL AND p."workspaceId" IS DISTINCT FROM c."workspaceId" AND EXISTS (SELECT 1 FROM "Workspace" w WHERE w.id IN (c."workspaceId", p."workspaceId") AND w.type='GYM')) THEN RAISE EXCEPTION 'Reconcile GYM relation WorkspaceInvitation.unitId before deployment'; END IF; END $$;
DROP TRIGGER IF EXISTS "gym_scope_unitId" ON "WorkspaceInvitation";
CREATE TRIGGER "gym_scope_unitId" BEFORE INSERT OR UPDATE ON "WorkspaceInvitation" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_relation_scope('unitId', 'GymUnit', '', '', '');

DO $$ BEGIN IF EXISTS (SELECT 1 FROM "GymStudentProfile" c  LEFT JOIN "WorkspaceMember" p ON p.id=c."memberId" WHERE c."memberId" IS NOT NULL AND p."workspaceId" IS DISTINCT FROM c."workspaceId" AND EXISTS (SELECT 1 FROM "Workspace" w WHERE w.id IN (c."workspaceId", p."workspaceId") AND w.type='GYM')) THEN RAISE EXCEPTION 'Reconcile GYM relation GymStudentProfile.memberId before deployment'; END IF; END $$;
DROP TRIGGER IF EXISTS "gym_scope_memberId" ON "GymStudentProfile";
CREATE TRIGGER "gym_scope_memberId" BEFORE INSERT OR UPDATE ON "GymStudentProfile" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_relation_scope('memberId', 'WorkspaceMember', '', '', '');

DO $$ BEGIN IF EXISTS (SELECT 1 FROM "GymGuardian" c  LEFT JOIN "WorkspaceMember" p ON p.id=c."studentMemberId" WHERE c."studentMemberId" IS NOT NULL AND p."workspaceId" IS DISTINCT FROM c."workspaceId" AND EXISTS (SELECT 1 FROM "Workspace" w WHERE w.id IN (c."workspaceId", p."workspaceId") AND w.type='GYM')) THEN RAISE EXCEPTION 'Reconcile GYM relation GymGuardian.studentMemberId before deployment'; END IF; END $$;
DROP TRIGGER IF EXISTS "gym_scope_studentMemberId" ON "GymGuardian";
CREATE TRIGGER "gym_scope_studentMemberId" BEFORE INSERT OR UPDATE ON "GymGuardian" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_relation_scope('studentMemberId', 'WorkspaceMember', '', '', '');

DO $$ BEGIN IF EXISTS (SELECT 1 FROM "GymEnrollment" c  LEFT JOIN "WorkspaceMember" p ON p.id=c."studentMemberId" WHERE c."studentMemberId" IS NOT NULL AND p."workspaceId" IS DISTINCT FROM c."workspaceId" AND EXISTS (SELECT 1 FROM "Workspace" w WHERE w.id IN (c."workspaceId", p."workspaceId") AND w.type='GYM')) THEN RAISE EXCEPTION 'Reconcile GYM relation GymEnrollment.studentMemberId before deployment'; END IF; END $$;
DROP TRIGGER IF EXISTS "gym_scope_studentMemberId" ON "GymEnrollment";
CREATE TRIGGER "gym_scope_studentMemberId" BEFORE INSERT OR UPDATE ON "GymEnrollment" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_relation_scope('studentMemberId', 'WorkspaceMember', '', '', '');

DO $$ BEGIN IF EXISTS (SELECT 1 FROM "GymEnrollment" c  LEFT JOIN "GymPlanVersion" r ON r.id=c."planVersionId" LEFT JOIN "GymPlan" p ON p.id=r."planId" WHERE c."planVersionId" IS NOT NULL AND p."workspaceId" IS DISTINCT FROM c."workspaceId" AND EXISTS (SELECT 1 FROM "Workspace" w WHERE w.id IN (c."workspaceId", p."workspaceId") AND w.type='GYM')) THEN RAISE EXCEPTION 'Reconcile GYM relation GymEnrollment.planVersionId before deployment'; END IF; END $$;
DROP TRIGGER IF EXISTS "gym_scope_planVersionId" ON "GymEnrollment";
CREATE TRIGGER "gym_scope_planVersionId" BEFORE INSERT OR UPDATE ON "GymEnrollment" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_relation_scope('planVersionId', 'GymPlanVersion', 'planId', '', '');

DO $$ BEGIN IF EXISTS (SELECT 1 FROM "GymEnrollment" c  LEFT JOIN "GymPlanVersion" r ON r.id=c."scheduledPlanVersionId" LEFT JOIN "GymPlan" p ON p.id=r."planId" WHERE c."scheduledPlanVersionId" IS NOT NULL AND p."workspaceId" IS DISTINCT FROM c."workspaceId" AND EXISTS (SELECT 1 FROM "Workspace" w WHERE w.id IN (c."workspaceId", p."workspaceId") AND w.type='GYM')) THEN RAISE EXCEPTION 'Reconcile GYM relation GymEnrollment.scheduledPlanVersionId before deployment'; END IF; END $$;
DROP TRIGGER IF EXISTS "gym_scope_scheduledPlanVersionId" ON "GymEnrollment";
CREATE TRIGGER "gym_scope_scheduledPlanVersionId" BEFORE INSERT OR UPDATE ON "GymEnrollment" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_relation_scope('scheduledPlanVersionId', 'GymPlanVersion', 'planId', '', '');

DO $$ BEGIN IF EXISTS (SELECT 1 FROM "GymEnrollment" c  LEFT JOIN "GymEnrollment" p ON p.id=c."supersedesEnrollmentId" WHERE c."supersedesEnrollmentId" IS NOT NULL AND p."workspaceId" IS DISTINCT FROM c."workspaceId" AND EXISTS (SELECT 1 FROM "Workspace" w WHERE w.id IN (c."workspaceId", p."workspaceId") AND w.type='GYM')) THEN RAISE EXCEPTION 'Reconcile GYM relation GymEnrollment.supersedesEnrollmentId before deployment'; END IF; END $$;
DROP TRIGGER IF EXISTS "gym_scope_supersedesEnrollmentId" ON "GymEnrollment";
CREATE TRIGGER "gym_scope_supersedesEnrollmentId" BEFORE INSERT OR UPDATE ON "GymEnrollment" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_relation_scope('supersedesEnrollmentId', 'GymEnrollment', '', '', '');

DO $$ BEGIN IF EXISTS (SELECT 1 FROM "GymEnrollment" c  LEFT JOIN "GymUnit" p ON p.id=c."unitId" WHERE c."unitId" IS NOT NULL AND p."workspaceId" IS DISTINCT FROM c."workspaceId" AND EXISTS (SELECT 1 FROM "Workspace" w WHERE w.id IN (c."workspaceId", p."workspaceId") AND w.type='GYM')) THEN RAISE EXCEPTION 'Reconcile GYM relation GymEnrollment.unitId before deployment'; END IF; END $$;
DROP TRIGGER IF EXISTS "gym_scope_unitId" ON "GymEnrollment";
CREATE TRIGGER "gym_scope_unitId" BEFORE INSERT OR UPDATE ON "GymEnrollment" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_relation_scope('unitId', 'GymUnit', '', '', '');

DO $$ BEGIN IF EXISTS (SELECT 1 FROM "GymEnrollment" c  LEFT JOIN "GymGuardian" p ON p.id=c."billingPayerGuardianId" WHERE c."billingPayerGuardianId" IS NOT NULL AND p."workspaceId" IS DISTINCT FROM c."workspaceId" AND EXISTS (SELECT 1 FROM "Workspace" w WHERE w.id IN (c."workspaceId", p."workspaceId") AND w.type='GYM')) THEN RAISE EXCEPTION 'Reconcile GYM relation GymEnrollment.billingPayerGuardianId before deployment'; END IF; END $$;
DROP TRIGGER IF EXISTS "gym_scope_billingPayerGuardianId" ON "GymEnrollment";
CREATE TRIGGER "gym_scope_billingPayerGuardianId" BEFORE INSERT OR UPDATE ON "GymEnrollment" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_relation_scope('billingPayerGuardianId', 'GymGuardian', '', '', '');

DO $$ BEGIN IF EXISTS (SELECT 1 FROM "GymContractAcceptance" c  LEFT JOIN "GymEnrollment" p ON p.id=c."enrollmentId" WHERE c."enrollmentId" IS NOT NULL AND p."workspaceId" IS DISTINCT FROM c."workspaceId" AND EXISTS (SELECT 1 FROM "Workspace" w WHERE w.id IN (c."workspaceId", p."workspaceId") AND w.type='GYM')) THEN RAISE EXCEPTION 'Reconcile GYM relation GymContractAcceptance.enrollmentId before deployment'; END IF; END $$;
DROP TRIGGER IF EXISTS "gym_scope_enrollmentId" ON "GymContractAcceptance";
CREATE TRIGGER "gym_scope_enrollmentId" BEFORE INSERT OR UPDATE ON "GymContractAcceptance" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_relation_scope('enrollmentId', 'GymEnrollment', '', '', '');

DO $$ BEGIN IF EXISTS (SELECT 1 FROM "GymEnrollmentEvent" c  LEFT JOIN "GymEnrollment" p ON p.id=c."enrollmentId" WHERE c."enrollmentId" IS NOT NULL AND p."workspaceId" IS DISTINCT FROM c."workspaceId" AND EXISTS (SELECT 1 FROM "Workspace" w WHERE w.id IN (c."workspaceId", p."workspaceId") AND w.type='GYM')) THEN RAISE EXCEPTION 'Reconcile GYM relation GymEnrollmentEvent.enrollmentId before deployment'; END IF; END $$;
DROP TRIGGER IF EXISTS "gym_scope_enrollmentId" ON "GymEnrollmentEvent";
CREATE TRIGGER "gym_scope_enrollmentId" BEFORE INSERT OR UPDATE ON "GymEnrollmentEvent" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_relation_scope('enrollmentId', 'GymEnrollment', '', '', '');

DO $$ BEGIN IF EXISTS (SELECT 1 FROM "GymInvoice" c  LEFT JOIN "WorkspaceMember" p ON p.id=c."studentMemberId" WHERE c."studentMemberId" IS NOT NULL AND p."workspaceId" IS DISTINCT FROM c."workspaceId" AND EXISTS (SELECT 1 FROM "Workspace" w WHERE w.id IN (c."workspaceId", p."workspaceId") AND w.type='GYM')) THEN RAISE EXCEPTION 'Reconcile GYM relation GymInvoice.studentMemberId before deployment'; END IF; END $$;
DROP TRIGGER IF EXISTS "gym_scope_studentMemberId" ON "GymInvoice";
CREATE TRIGGER "gym_scope_studentMemberId" BEFORE INSERT OR UPDATE ON "GymInvoice" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_relation_scope('studentMemberId', 'WorkspaceMember', '', '', '');

DO $$ BEGIN IF EXISTS (SELECT 1 FROM "GymInvoice" c  LEFT JOIN "GymEnrollment" p ON p.id=c."enrollmentId" WHERE c."enrollmentId" IS NOT NULL AND p."workspaceId" IS DISTINCT FROM c."workspaceId" AND EXISTS (SELECT 1 FROM "Workspace" w WHERE w.id IN (c."workspaceId", p."workspaceId") AND w.type='GYM')) THEN RAISE EXCEPTION 'Reconcile GYM relation GymInvoice.enrollmentId before deployment'; END IF; END $$;
DROP TRIGGER IF EXISTS "gym_scope_enrollmentId" ON "GymInvoice";
CREATE TRIGGER "gym_scope_enrollmentId" BEFORE INSERT OR UPDATE ON "GymInvoice" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_relation_scope('enrollmentId', 'GymEnrollment', '', '', '');

DO $$ BEGIN IF EXISTS (SELECT 1 FROM "GymInvoice" c  LEFT JOIN "StudentBilling" p ON p.id=c."billingId" WHERE c."billingId" IS NOT NULL AND p."workspaceId" IS DISTINCT FROM c."workspaceId" AND EXISTS (SELECT 1 FROM "Workspace" w WHERE w.id IN (c."workspaceId", p."workspaceId") AND w.type='GYM')) THEN RAISE EXCEPTION 'Reconcile GYM relation GymInvoice.billingId before deployment'; END IF; END $$;
DROP TRIGGER IF EXISTS "gym_scope_billingId" ON "GymInvoice";
CREATE TRIGGER "gym_scope_billingId" BEFORE INSERT OR UPDATE ON "GymInvoice" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_relation_scope('billingId', 'StudentBilling', '', '', '');

DO $$ BEGIN IF EXISTS (SELECT 1 FROM "GymPayment" c  LEFT JOIN "GymCashDrawerSession" p ON p.id=c."cashDrawerSessionId" WHERE c."cashDrawerSessionId" IS NOT NULL AND p."workspaceId" IS DISTINCT FROM c."workspaceId" AND EXISTS (SELECT 1 FROM "Workspace" w WHERE w.id IN (c."workspaceId", p."workspaceId") AND w.type='GYM')) THEN RAISE EXCEPTION 'Reconcile GYM relation GymPayment.cashDrawerSessionId before deployment'; END IF; END $$;
DROP TRIGGER IF EXISTS "gym_scope_cashDrawerSessionId" ON "GymPayment";
CREATE TRIGGER "gym_scope_cashDrawerSessionId" BEFORE INSERT OR UPDATE ON "GymPayment" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_relation_scope('cashDrawerSessionId', 'GymCashDrawerSession', '', '', '');

DO $$ BEGIN IF EXISTS (SELECT 1 FROM "GymPayment" c  LEFT JOIN "GymFinancialAccount" p ON p.id=c."financialAccountId" WHERE c."financialAccountId" IS NOT NULL AND p."workspaceId" IS DISTINCT FROM c."workspaceId" AND EXISTS (SELECT 1 FROM "Workspace" w WHERE w.id IN (c."workspaceId", p."workspaceId") AND w.type='GYM')) THEN RAISE EXCEPTION 'Reconcile GYM relation GymPayment.financialAccountId before deployment'; END IF; END $$;
DROP TRIGGER IF EXISTS "gym_scope_financialAccountId" ON "GymPayment";
CREATE TRIGGER "gym_scope_financialAccountId" BEFORE INSERT OR UPDATE ON "GymPayment" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_relation_scope('financialAccountId', 'GymFinancialAccount', '', '', '');

DO $$ BEGIN IF EXISTS (SELECT 1 FROM "GymFinancialAccount" c  LEFT JOIN "GymUnit" p ON p.id=c."unitId" WHERE c."unitId" IS NOT NULL AND p."workspaceId" IS DISTINCT FROM c."workspaceId" AND EXISTS (SELECT 1 FROM "Workspace" w WHERE w.id IN (c."workspaceId", p."workspaceId") AND w.type='GYM')) THEN RAISE EXCEPTION 'Reconcile GYM relation GymFinancialAccount.unitId before deployment'; END IF; END $$;
DROP TRIGGER IF EXISTS "gym_scope_unitId" ON "GymFinancialAccount";
CREATE TRIGGER "gym_scope_unitId" BEFORE INSERT OR UPDATE ON "GymFinancialAccount" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_relation_scope('unitId', 'GymUnit', '', '', '');

DO $$ BEGIN IF EXISTS (SELECT 1 FROM "GymAccountTransfer" c  LEFT JOIN "GymFinancialAccount" p ON p.id=c."fromAccountId" WHERE c."fromAccountId" IS NOT NULL AND p."workspaceId" IS DISTINCT FROM c."workspaceId" AND EXISTS (SELECT 1 FROM "Workspace" w WHERE w.id IN (c."workspaceId", p."workspaceId") AND w.type='GYM')) THEN RAISE EXCEPTION 'Reconcile GYM relation GymAccountTransfer.fromAccountId before deployment'; END IF; END $$;
DROP TRIGGER IF EXISTS "gym_scope_fromAccountId" ON "GymAccountTransfer";
CREATE TRIGGER "gym_scope_fromAccountId" BEFORE INSERT OR UPDATE ON "GymAccountTransfer" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_relation_scope('fromAccountId', 'GymFinancialAccount', '', '', '');

DO $$ BEGIN IF EXISTS (SELECT 1 FROM "GymAccountTransfer" c  LEFT JOIN "GymFinancialAccount" p ON p.id=c."toAccountId" WHERE c."toAccountId" IS NOT NULL AND p."workspaceId" IS DISTINCT FROM c."workspaceId" AND EXISTS (SELECT 1 FROM "Workspace" w WHERE w.id IN (c."workspaceId", p."workspaceId") AND w.type='GYM')) THEN RAISE EXCEPTION 'Reconcile GYM relation GymAccountTransfer.toAccountId before deployment'; END IF; END $$;
DROP TRIGGER IF EXISTS "gym_scope_toAccountId" ON "GymAccountTransfer";
CREATE TRIGGER "gym_scope_toAccountId" BEFORE INSERT OR UPDATE ON "GymAccountTransfer" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_relation_scope('toAccountId', 'GymFinancialAccount', '', '', '');

DO $$ BEGIN IF EXISTS (SELECT 1 FROM "GymExpense" c  LEFT JOIN "GymUnit" p ON p.id=c."unitId" WHERE c."unitId" IS NOT NULL AND p."workspaceId" IS DISTINCT FROM c."workspaceId" AND EXISTS (SELECT 1 FROM "Workspace" w WHERE w.id IN (c."workspaceId", p."workspaceId") AND w.type='GYM')) THEN RAISE EXCEPTION 'Reconcile GYM relation GymExpense.unitId before deployment'; END IF; END $$;
DROP TRIGGER IF EXISTS "gym_scope_unitId" ON "GymExpense";
CREATE TRIGGER "gym_scope_unitId" BEFORE INSERT OR UPDATE ON "GymExpense" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_relation_scope('unitId', 'GymUnit', '', '', '');

DO $$ BEGIN IF EXISTS (SELECT 1 FROM "GymExpense" c  LEFT JOIN "GymSupplier" p ON p.id=c."supplierId" WHERE c."supplierId" IS NOT NULL AND p."workspaceId" IS DISTINCT FROM c."workspaceId" AND EXISTS (SELECT 1 FROM "Workspace" w WHERE w.id IN (c."workspaceId", p."workspaceId") AND w.type='GYM')) THEN RAISE EXCEPTION 'Reconcile GYM relation GymExpense.supplierId before deployment'; END IF; END $$;
DROP TRIGGER IF EXISTS "gym_scope_supplierId" ON "GymExpense";
CREATE TRIGGER "gym_scope_supplierId" BEFORE INSERT OR UPDATE ON "GymExpense" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_relation_scope('supplierId', 'GymSupplier', '', '', '');

DO $$ BEGIN IF EXISTS (SELECT 1 FROM "GymExpense" c  LEFT JOIN "GymExpenseCategory" p ON p.id=c."categoryId" WHERE c."categoryId" IS NOT NULL AND p."workspaceId" IS DISTINCT FROM c."workspaceId" AND EXISTS (SELECT 1 FROM "Workspace" w WHERE w.id IN (c."workspaceId", p."workspaceId") AND w.type='GYM')) THEN RAISE EXCEPTION 'Reconcile GYM relation GymExpense.categoryId before deployment'; END IF; END $$;
DROP TRIGGER IF EXISTS "gym_scope_categoryId" ON "GymExpense";
CREATE TRIGGER "gym_scope_categoryId" BEFORE INSERT OR UPDATE ON "GymExpense" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_relation_scope('categoryId', 'GymExpenseCategory', '', '', '');

DO $$ BEGIN IF EXISTS (SELECT 1 FROM "GymExpense" c  LEFT JOIN "GymFinancialAccount" p ON p.id=c."financialAccountId" WHERE c."financialAccountId" IS NOT NULL AND p."workspaceId" IS DISTINCT FROM c."workspaceId" AND EXISTS (SELECT 1 FROM "Workspace" w WHERE w.id IN (c."workspaceId", p."workspaceId") AND w.type='GYM')) THEN RAISE EXCEPTION 'Reconcile GYM relation GymExpense.financialAccountId before deployment'; END IF; END $$;
DROP TRIGGER IF EXISTS "gym_scope_financialAccountId" ON "GymExpense";
CREATE TRIGGER "gym_scope_financialAccountId" BEFORE INSERT OR UPDATE ON "GymExpense" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_relation_scope('financialAccountId', 'GymFinancialAccount', '', '', '');

DO $$ BEGIN IF EXISTS (SELECT 1 FROM "GymCashDrawerSession" c  LEFT JOIN "GymUnit" p ON p.id=c."unitId" WHERE c."unitId" IS NOT NULL AND p."workspaceId" IS DISTINCT FROM c."workspaceId" AND EXISTS (SELECT 1 FROM "Workspace" w WHERE w.id IN (c."workspaceId", p."workspaceId") AND w.type='GYM')) THEN RAISE EXCEPTION 'Reconcile GYM relation GymCashDrawerSession.unitId before deployment'; END IF; END $$;
DROP TRIGGER IF EXISTS "gym_scope_unitId" ON "GymCashDrawerSession";
CREATE TRIGGER "gym_scope_unitId" BEFORE INSERT OR UPDATE ON "GymCashDrawerSession" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_relation_scope('unitId', 'GymUnit', '', '', '');

DO $$ BEGIN IF EXISTS (SELECT 1 FROM "GymCashDrawerSession" c  LEFT JOIN "GymFinancialAccount" p ON p.id=c."financialAccountId" WHERE c."financialAccountId" IS NOT NULL AND p."workspaceId" IS DISTINCT FROM c."workspaceId" AND EXISTS (SELECT 1 FROM "Workspace" w WHERE w.id IN (c."workspaceId", p."workspaceId") AND w.type='GYM')) THEN RAISE EXCEPTION 'Reconcile GYM relation GymCashDrawerSession.financialAccountId before deployment'; END IF; END $$;
DROP TRIGGER IF EXISTS "gym_scope_financialAccountId" ON "GymCashDrawerSession";
CREATE TRIGGER "gym_scope_financialAccountId" BEFORE INSERT OR UPDATE ON "GymCashDrawerSession" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_relation_scope('financialAccountId', 'GymFinancialAccount', '', '', '');

DO $$ BEGIN IF EXISTS (SELECT 1 FROM "WorkspaceRoleGrant" c JOIN "WorkspaceMember" own ON own.id=c."memberId" LEFT JOIN "GymUnit" p ON p.id=c."unitId" WHERE c."unitId" IS NOT NULL AND p."workspaceId" IS DISTINCT FROM own."workspaceId" AND EXISTS (SELECT 1 FROM "Workspace" w WHERE w.id IN (own."workspaceId", p."workspaceId") AND w.type='GYM')) THEN RAISE EXCEPTION 'Reconcile GYM relation WorkspaceRoleGrant.unitId before deployment'; END IF; END $$;
DROP TRIGGER IF EXISTS "gym_scope_unitId" ON "WorkspaceRoleGrant";
CREATE TRIGGER "gym_scope_unitId" BEFORE INSERT OR UPDATE ON "WorkspaceRoleGrant" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_relation_scope('unitId', 'GymUnit', '', 'memberId', 'WorkspaceMember');
DROP TRIGGER IF EXISTS gym_parent_scope_immutable ON "WorkspaceRoleGrant";
CREATE TRIGGER gym_parent_scope_immutable BEFORE UPDATE OF "memberId" ON "WorkspaceRoleGrant" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_parent_scope_immutable('memberId', 'WorkspaceMember');

DO $$ BEGIN IF EXISTS (SELECT 1 FROM "GymPaymentAllocation" c JOIN "GymPayment" own ON own.id=c."paymentId" LEFT JOIN "GymInvoice" p ON p.id=c."invoiceId" WHERE c."invoiceId" IS NOT NULL AND p."workspaceId" IS DISTINCT FROM own."workspaceId" AND EXISTS (SELECT 1 FROM "Workspace" w WHERE w.id IN (own."workspaceId", p."workspaceId") AND w.type='GYM')) THEN RAISE EXCEPTION 'Reconcile GYM relation GymPaymentAllocation.invoiceId before deployment'; END IF; END $$;
DROP TRIGGER IF EXISTS "gym_scope_invoiceId" ON "GymPaymentAllocation";
CREATE TRIGGER "gym_scope_invoiceId" BEFORE INSERT OR UPDATE ON "GymPaymentAllocation" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_relation_scope('invoiceId', 'GymInvoice', '', 'paymentId', 'GymPayment');
DROP TRIGGER IF EXISTS gym_parent_scope_immutable ON "GymPaymentAllocation";
CREATE TRIGGER gym_parent_scope_immutable BEFORE UPDATE OF "paymentId" ON "GymPaymentAllocation" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_parent_scope_immutable('paymentId', 'GymPayment');

DO $$ BEGIN IF EXISTS (SELECT 1 FROM "GymExpensePayment" c JOIN "GymExpense" own ON own.id=c."expenseId" LEFT JOIN "GymFinancialAccount" p ON p.id=c."financialAccountId" WHERE c."financialAccountId" IS NOT NULL AND p."workspaceId" IS DISTINCT FROM own."workspaceId" AND EXISTS (SELECT 1 FROM "Workspace" w WHERE w.id IN (own."workspaceId", p."workspaceId") AND w.type='GYM')) THEN RAISE EXCEPTION 'Reconcile GYM relation GymExpensePayment.financialAccountId before deployment'; END IF; END $$;
DROP TRIGGER IF EXISTS "gym_scope_financialAccountId" ON "GymExpensePayment";
CREATE TRIGGER "gym_scope_financialAccountId" BEFORE INSERT OR UPDATE ON "GymExpensePayment" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_relation_scope('financialAccountId', 'GymFinancialAccount', '', 'expenseId', 'GymExpense');
DROP TRIGGER IF EXISTS gym_parent_scope_immutable ON "GymExpensePayment";
CREATE TRIGGER gym_parent_scope_immutable BEFORE UPDATE OF "expenseId" ON "GymExpensePayment" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_parent_scope_immutable('expenseId', 'GymExpense');

DROP TRIGGER IF EXISTS gym_workspace_immutable ON "WorkspaceMember";
CREATE TRIGGER gym_workspace_immutable BEFORE UPDATE OF "workspaceId" ON "WorkspaceMember" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_workspace_immutable();

DROP TRIGGER IF EXISTS gym_workspace_immutable ON "GymStorageObject";
CREATE TRIGGER gym_workspace_immutable BEFORE UPDATE OF "workspaceId" ON "GymStorageObject" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_workspace_immutable();

DROP TRIGGER IF EXISTS gym_workspace_immutable ON "TrainerVideo";
CREATE TRIGGER gym_workspace_immutable BEFORE UPDATE OF "workspaceId" ON "TrainerVideo" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_workspace_immutable();

DROP TRIGGER IF EXISTS gym_workspace_immutable ON "Workout";
CREATE TRIGGER gym_workspace_immutable BEFORE UPDATE OF "workspaceId" ON "Workout" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_workspace_immutable();

DROP TRIGGER IF EXISTS gym_workspace_immutable ON "WorkspacePlan";
CREATE TRIGGER gym_workspace_immutable BEFORE UPDATE OF "workspaceId" ON "WorkspacePlan" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_workspace_immutable();

DROP TRIGGER IF EXISTS gym_workspace_immutable ON "WorkspacePayment";
CREATE TRIGGER gym_workspace_immutable BEFORE UPDATE OF "workspaceId" ON "WorkspacePayment" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_workspace_immutable();

DROP TRIGGER IF EXISTS gym_workspace_immutable ON "PendingStudent";
CREATE TRIGGER gym_workspace_immutable BEFORE UPDATE OF "workspaceId" ON "PendingStudent" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_workspace_immutable();

DROP TRIGGER IF EXISTS gym_workspace_immutable ON "TrainerTask";
CREATE TRIGGER gym_workspace_immutable BEFORE UPDATE OF "workspaceId" ON "TrainerTask" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_workspace_immutable();

DROP TRIGGER IF EXISTS gym_workspace_immutable ON "StudentProgress";
CREATE TRIGGER gym_workspace_immutable BEFORE UPDATE OF "workspaceId" ON "StudentProgress" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_workspace_immutable();

DROP TRIGGER IF EXISTS gym_workspace_immutable ON "StudentProgressPhoto";
CREATE TRIGGER gym_workspace_immutable BEFORE UPDATE OF "workspaceId" ON "StudentProgressPhoto" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_workspace_immutable();

DROP TRIGGER IF EXISTS gym_workspace_immutable ON "PhysicalEvaluation";
CREATE TRIGGER gym_workspace_immutable BEFORE UPDATE OF "workspaceId" ON "PhysicalEvaluation" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_workspace_immutable();

DROP TRIGGER IF EXISTS gym_workspace_immutable ON "StudentFile";
CREATE TRIGGER gym_workspace_immutable BEFORE UPDATE OF "workspaceId" ON "StudentFile" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_workspace_immutable();

DROP TRIGGER IF EXISTS gym_workspace_immutable ON "WorkoutLog";
CREATE TRIGGER gym_workspace_immutable BEFORE UPDATE OF "workspaceId" ON "WorkoutLog" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_workspace_immutable();

DROP TRIGGER IF EXISTS gym_workspace_immutable ON "DailyFeedback";
CREATE TRIGGER gym_workspace_immutable BEFORE UPDATE OF "workspaceId" ON "DailyFeedback" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_workspace_immutable();

DROP TRIGGER IF EXISTS gym_workspace_immutable ON "EngageExperience";
CREATE TRIGGER gym_workspace_immutable BEFORE UPDATE OF "workspaceId" ON "EngageExperience" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_workspace_immutable();

DROP TRIGGER IF EXISTS gym_workspace_immutable ON "Lead";
CREATE TRIGGER gym_workspace_immutable BEFORE UPDATE OF "workspaceId" ON "Lead" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_workspace_immutable();

DROP TRIGGER IF EXISTS gym_workspace_immutable ON "Tag";
CREATE TRIGGER gym_workspace_immutable BEFORE UPDATE OF "workspaceId" ON "Tag" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_workspace_immutable();

DROP TRIGGER IF EXISTS gym_workspace_immutable ON "CustomFieldDefinition";
CREATE TRIGGER gym_workspace_immutable BEFORE UPDATE OF "workspaceId" ON "CustomFieldDefinition" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_workspace_immutable();

DROP TRIGGER IF EXISTS gym_workspace_immutable ON "Notification";
CREATE TRIGGER gym_workspace_immutable BEFORE UPDATE OF "workspaceId" ON "Notification" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_workspace_immutable();

DROP TRIGGER IF EXISTS gym_workspace_immutable ON "Conversation";
CREATE TRIGGER gym_workspace_immutable BEFORE UPDATE OF "workspaceId" ON "Conversation" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_workspace_immutable();

DROP TRIGGER IF EXISTS gym_workspace_immutable ON "ImportJob";
CREATE TRIGGER gym_workspace_immutable BEFORE UPDATE OF "workspaceId" ON "ImportJob" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_workspace_immutable();

DROP TRIGGER IF EXISTS gym_workspace_immutable ON "CreditPurchase";
CREATE TRIGGER gym_workspace_immutable BEFORE UPDATE OF "workspaceId" ON "CreditPurchase" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_workspace_immutable();

DROP TRIGGER IF EXISTS gym_workspace_immutable ON "PaymentProviderAccount";
CREATE TRIGGER gym_workspace_immutable BEFORE UPDATE OF "workspaceId" ON "PaymentProviderAccount" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_workspace_immutable();

DROP TRIGGER IF EXISTS gym_workspace_immutable ON "GatewayCustomer";
CREATE TRIGGER gym_workspace_immutable BEFORE UPDATE OF "workspaceId" ON "GatewayCustomer" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_workspace_immutable();

DROP TRIGGER IF EXISTS gym_workspace_immutable ON "StudentBilling";
CREATE TRIGGER gym_workspace_immutable BEFORE UPDATE OF "workspaceId" ON "StudentBilling" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_workspace_immutable();

DROP TRIGGER IF EXISTS gym_workspace_immutable ON "GymCommunicationDispatch";
CREATE TRIGGER gym_workspace_immutable BEFORE UPDATE OF "workspaceId" ON "GymCommunicationDispatch" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_workspace_immutable();

DROP TRIGGER IF EXISTS gym_workspace_immutable ON "LegalAcceptance";
CREATE TRIGGER gym_workspace_immutable BEFORE UPDATE OF "workspaceId" ON "LegalAcceptance" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_workspace_immutable();

DROP TRIGGER IF EXISTS gym_workspace_immutable ON "DataSubjectRequest";
CREATE TRIGGER gym_workspace_immutable BEFORE UPDATE OF "workspaceId" ON "DataSubjectRequest" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_workspace_immutable();

DROP TRIGGER IF EXISTS gym_workspace_immutable ON "GymSettings";
CREATE TRIGGER gym_workspace_immutable BEFORE UPDATE OF "workspaceId" ON "GymSettings" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_workspace_immutable();

DROP TRIGGER IF EXISTS gym_workspace_immutable ON "GymUnit";
CREATE TRIGGER gym_workspace_immutable BEFORE UPDATE OF "workspaceId" ON "GymUnit" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_workspace_immutable();

DROP TRIGGER IF EXISTS gym_workspace_immutable ON "WorkspaceInvitation";
CREATE TRIGGER gym_workspace_immutable BEFORE UPDATE OF "workspaceId" ON "WorkspaceInvitation" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_workspace_immutable();

DROP TRIGGER IF EXISTS gym_workspace_immutable ON "GymStudentProfile";
CREATE TRIGGER gym_workspace_immutable BEFORE UPDATE OF "workspaceId" ON "GymStudentProfile" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_workspace_immutable();

DROP TRIGGER IF EXISTS gym_workspace_immutable ON "GymGuardian";
CREATE TRIGGER gym_workspace_immutable BEFORE UPDATE OF "workspaceId" ON "GymGuardian" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_workspace_immutable();

DROP TRIGGER IF EXISTS gym_workspace_immutable ON "WorkspaceSubscription";
CREATE TRIGGER gym_workspace_immutable BEFORE UPDATE OF "workspaceId" ON "WorkspaceSubscription" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_workspace_immutable();

DROP TRIGGER IF EXISTS gym_workspace_immutable ON "GymPlan";
CREATE TRIGGER gym_workspace_immutable BEFORE UPDATE OF "workspaceId" ON "GymPlan" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_workspace_immutable();

DROP TRIGGER IF EXISTS gym_workspace_immutable ON "GymEnrollment";
CREATE TRIGGER gym_workspace_immutable BEFORE UPDATE OF "workspaceId" ON "GymEnrollment" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_workspace_immutable();

DROP TRIGGER IF EXISTS gym_workspace_immutable ON "GymContractAcceptance";
CREATE TRIGGER gym_workspace_immutable BEFORE UPDATE OF "workspaceId" ON "GymContractAcceptance" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_workspace_immutable();

DROP TRIGGER IF EXISTS gym_workspace_immutable ON "GymEnrollmentEvent";
CREATE TRIGGER gym_workspace_immutable BEFORE UPDATE OF "workspaceId" ON "GymEnrollmentEvent" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_workspace_immutable();

DROP TRIGGER IF EXISTS gym_workspace_immutable ON "GymInvoice";
CREATE TRIGGER gym_workspace_immutable BEFORE UPDATE OF "workspaceId" ON "GymInvoice" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_workspace_immutable();

DROP TRIGGER IF EXISTS gym_workspace_immutable ON "GymPayment";
CREATE TRIGGER gym_workspace_immutable BEFORE UPDATE OF "workspaceId" ON "GymPayment" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_workspace_immutable();

DROP TRIGGER IF EXISTS gym_workspace_immutable ON "GymFinancialAccount";
CREATE TRIGGER gym_workspace_immutable BEFORE UPDATE OF "workspaceId" ON "GymFinancialAccount" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_workspace_immutable();

DROP TRIGGER IF EXISTS gym_workspace_immutable ON "GymAccountTransfer";
CREATE TRIGGER gym_workspace_immutable BEFORE UPDATE OF "workspaceId" ON "GymAccountTransfer" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_workspace_immutable();

DROP TRIGGER IF EXISTS gym_workspace_immutable ON "GymExpenseCategory";
CREATE TRIGGER gym_workspace_immutable BEFORE UPDATE OF "workspaceId" ON "GymExpenseCategory" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_workspace_immutable();

DROP TRIGGER IF EXISTS gym_workspace_immutable ON "GymSupplier";
CREATE TRIGGER gym_workspace_immutable BEFORE UPDATE OF "workspaceId" ON "GymSupplier" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_workspace_immutable();

DROP TRIGGER IF EXISTS gym_workspace_immutable ON "GymExpense";
CREATE TRIGGER gym_workspace_immutable BEFORE UPDATE OF "workspaceId" ON "GymExpense" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_workspace_immutable();

DROP TRIGGER IF EXISTS gym_workspace_immutable ON "GymCashDrawerSession";
CREATE TRIGGER gym_workspace_immutable BEFORE UPDATE OF "workspaceId" ON "GymCashDrawerSession" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_workspace_immutable();

DROP TRIGGER IF EXISTS gym_workspace_immutable ON "GymReconciliationDivergence";
CREATE TRIGGER gym_workspace_immutable BEFORE UPDATE OF "workspaceId" ON "GymReconciliationDivergence" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_workspace_immutable();

DROP TRIGGER IF EXISTS gym_workspace_immutable ON "GymAdministrativeReview";
CREATE TRIGGER gym_workspace_immutable BEFORE UPDATE OF "workspaceId" ON "GymAdministrativeReview" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_workspace_immutable();

CREATE OR REPLACE FUNCTION atlasfit_gym_version_plan_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW."planId" IS DISTINCT FROM OLD."planId" THEN RAISE EXCEPTION 'Published GYM versions cannot move between plans' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS gym_version_plan_immutable ON "GymPlanVersion";
CREATE TRIGGER gym_version_plan_immutable BEFORE UPDATE OF "planId" ON "GymPlanVersion" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_version_plan_immutable();

CREATE OR REPLACE FUNCTION atlasfit_gym_product_type_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.type IS DISTINCT FROM OLD.type AND (NEW.type='GYM' OR OLD.type='GYM') THEN RAISE EXCEPTION 'GYM product conversion requires a separate audited migration' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS gym_product_type_immutable ON "Workspace";
CREATE TRIGGER gym_product_type_immutable BEFORE UPDATE OF type ON "Workspace" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_product_type_immutable();
COMMIT;
