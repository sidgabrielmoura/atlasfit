-- Do not select a winner or cancel historical contracts automatically.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "GymEnrollment"
    WHERE "status" IN ('ACTIVE', 'PAUSED')
    GROUP BY "workspaceId", "studentMemberId"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Reconcile duplicate live GYM enrollments before applying the single-enrollment constraint';
  END IF;
END $$;

-- MIGRATION_INDEX
CREATE UNIQUE INDEX "GymEnrollment_one_live_per_student"
ON "GymEnrollment" ("workspaceId", "studentMemberId")
WHERE "status" IN ('ACTIVE', 'PAUSED');
