BEGIN;
ALTER TABLE "TrainerTask" ADD COLUMN "authorId" TEXT;
ALTER TABLE "TrainerTask" ADD CONSTRAINT "TrainerTask_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "TrainerTask_workspaceId_authorId_scheduledDate_idx" ON "TrainerTask"("workspaceId", "authorId", "scheduledDate");
-- Membership ownership is enforced even for direct database writers.
ALTER TABLE "TrainerTask" ADD CONSTRAINT "TrainerTask_authorId_workspaceId_fkey" FOREIGN KEY ("authorId", "workspaceId") REFERENCES "WorkspaceMember"("userId", "workspaceId") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE OR REPLACE FUNCTION gym_task_author_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD."authorId" IS DISTINCT FROM NEW."authorId" AND EXISTS (SELECT 1 FROM "Workspace" WHERE id=OLD."workspaceId" AND type='GYM') THEN
    RAISE EXCEPTION 'GYM task author is immutable' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER gym_task_author_immutable BEFORE UPDATE ON "TrainerTask" FOR EACH ROW EXECUTE FUNCTION gym_task_author_immutable();
COMMIT;
