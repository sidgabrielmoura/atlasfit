-- Keep revoked grants as history. Reconcile active duplicates before applying this index.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "WorkspaceRoleGrant"
    WHERE "unitId" IS NULL AND "revokedAt" IS NULL
    GROUP BY "memberId", "role" HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Active global role grants are duplicated. Reconcile explicitly before applying this migration; no history was deleted.';
  END IF;
END $$;

CREATE UNIQUE INDEX "WorkspaceRoleGrant_active_global_unique"
ON "WorkspaceRoleGrant" ("memberId", "role")
WHERE "unitId" IS NULL AND "revokedAt" IS NULL;
