BEGIN;
SET LOCAL lock_timeout='10s';
CREATE OR REPLACE FUNCTION atlasfit_gym_workspace_delete_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF OLD.type='GYM' THEN
  RAISE EXCEPTION 'GYM workspace requires coordinated closure; automatic purge is disabled' USING ERRCODE='23514';
 END IF;
 RETURN OLD;
END $$;
DROP TRIGGER IF EXISTS gym_workspace_delete_guard ON "Workspace";
CREATE TRIGGER gym_workspace_delete_guard BEFORE DELETE ON "Workspace" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_workspace_delete_guard();
COMMIT;
