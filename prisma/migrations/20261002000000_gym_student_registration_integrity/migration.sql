-- Additive transition: keep student IDs, numbers and history. Stop on collisions;
-- an operator must reconcile ambiguous legacy numbers before deployment.
BEGIN;
ALTER TABLE "GymStudentProfile" ADD COLUMN "workspaceId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "GymStudentProfile" ADD COLUMN "registrationRequestKey" TEXT;
ALTER TABLE "GymStudentProfile" ADD COLUMN "registrationRequestFingerprint" TEXT;
UPDATE "GymStudentProfile" AS profile SET "workspaceId" = member."workspaceId"
FROM "WorkspaceMember" AS member WHERE member.id = profile."memberId";
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "GymStudentProfile" WHERE "workspaceId" = '') THEN
    RAISE EXCEPTION 'Student profiles require membership reconciliation before migration';
  END IF;
  IF EXISTS (SELECT 1 FROM "GymStudentProfile" WHERE "registrationNumber" IS NOT NULL
    GROUP BY "workspaceId", "registrationNumber" HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'Duplicate student registration numbers require reconciliation before migration';
  END IF;
END $$;
CREATE UNIQUE INDEX "GymStudentProfile_workspaceId_registrationNumber_key" ON "GymStudentProfile" ("workspaceId", "registrationNumber");
CREATE UNIQUE INDEX "GymStudentProfile_registrationRequestKey_key" ON "GymStudentProfile" ("registrationRequestKey");
ALTER TABLE "GymStudentProfile" ADD CONSTRAINT "GymStudentProfile_registration_request_pair" CHECK (("registrationRequestKey" IS NULL) = ("registrationRequestFingerprint" IS NULL));
CREATE FUNCTION atlasfit_gym_student_profile_scope() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target_workspace TEXT;
BEGIN
  SELECT "workspaceId" INTO target_workspace FROM "WorkspaceMember" WHERE id = NEW."memberId";
  IF target_workspace IS NULL THEN RAISE EXCEPTION 'Student membership does not exist'; END IF;
  IF NEW."workspaceId" <> '' AND NEW."workspaceId" <> target_workspace THEN
    RAISE EXCEPTION 'Student profile workspace does not match membership';
  END IF;
  NEW."workspaceId" := target_workspace;
  RETURN NEW;
END $$;
CREATE TRIGGER atlasfit_gym_student_profile_scope BEFORE INSERT OR UPDATE OF "memberId", "workspaceId" ON "GymStudentProfile"
FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_student_profile_scope();
CREATE FUNCTION atlasfit_gym_student_membership_scope() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."workspaceId" <> OLD."workspaceId" AND EXISTS (SELECT 1 FROM "GymStudentProfile" WHERE "memberId" = OLD.id) THEN
    RAISE EXCEPTION 'Student membership workspace requires an explicit transfer';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER atlasfit_gym_student_membership_scope BEFORE UPDATE OF "workspaceId" ON "WorkspaceMember"
FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_student_membership_scope();
COMMIT;
