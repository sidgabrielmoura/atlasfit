-- Migration: 20260925020000_add_member_unit_and_staff_assignment
-- Additive migration for GYM-030: links WorkspaceMember to primary GymUnit and assigned staff coach.

ALTER TABLE "WorkspaceMember" ADD COLUMN IF NOT EXISTS "unitId" TEXT;
ALTER TABLE "WorkspaceMember" ADD COLUMN IF NOT EXISTS "assignedStaffId" TEXT;

CREATE INDEX IF NOT EXISTS "WorkspaceMember_unitId_idx" ON "WorkspaceMember"("unitId");
CREATE INDEX IF NOT EXISTS "WorkspaceMember_assignedStaffId_idx" ON "WorkspaceMember"("assignedStaffId");

DO $$ BEGIN
    ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "GymUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_assignedStaffId_fkey" FOREIGN KEY ("assignedStaffId") REFERENCES "WorkspaceMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
