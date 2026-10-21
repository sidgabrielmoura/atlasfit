-- Preserve all history. Abort instead of silently merging duplicate operations.
BEGIN;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "GymDeviceCommand" WHERE "idempotencyKey" IS NOT NULL GROUP BY "deviceId", "idempotencyKey" HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'GYM command idempotency duplicates require explicit reconciliation before migration';
  END IF;
  IF EXISTS (SELECT 1 FROM "GymDeviceCommand" c JOIN "GymAccessDevice" d ON d.id = c."deviceId" JOIN "GymUnit" u ON u.id = d."unitId" WHERE c."workspaceId" <> d."workspaceId" OR u."workspaceId" <> d."workspaceId") THEN
    RAISE EXCEPTION 'GYM command tenant inconsistencies require explicit reconciliation before migration';
  END IF;
END $$;
CREATE UNIQUE INDEX "GymDeviceCommand_deviceId_idempotencyKey_key" ON "GymDeviceCommand"("deviceId", "idempotencyKey");
CREATE FUNCTION "gym_command_tenant_guard"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "GymAccessDevice" d JOIN "GymUnit" u ON u.id = d."unitId" JOIN "Workspace" w ON w.id = d."workspaceId" WHERE d.id = NEW."deviceId" AND d."workspaceId" = NEW."workspaceId" AND u."workspaceId" = NEW."workspaceId" AND w.type = 'GYM') THEN
    RAISE EXCEPTION 'GYM command device/unit/workspace mismatch' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "GymDeviceCommand_tenant_guard" BEFORE INSERT OR UPDATE OF "workspaceId", "deviceId" ON "GymDeviceCommand" FOR EACH ROW EXECUTE FUNCTION "gym_command_tenant_guard"();
COMMIT;
