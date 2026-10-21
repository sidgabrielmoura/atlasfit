-- Migration: 20260925000000_add_gym_workspace_models
-- Additive migration for GYM-020: workspace types, gym settings, units, role grants, invitations and staff profiles.

-- 1. Alter WorkspaceRole Enum
ALTER TYPE "WorkspaceRole" ADD VALUE IF NOT EXISTS 'MANAGER';
ALTER TYPE "WorkspaceRole" ADD VALUE IF NOT EXISTS 'RECEPTIONIST';
ALTER TYPE "WorkspaceRole" ADD VALUE IF NOT EXISTS 'FINANCE';

-- 2. Create WorkspaceType Enum
DO $$ BEGIN
    CREATE TYPE "WorkspaceType" AS ENUM ('PERSONAL', 'GYM');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Add type column to Workspace
ALTER TABLE "Workspace" ADD COLUMN IF NOT EXISTS "type" "WorkspaceType" NOT NULL DEFAULT 'PERSONAL';

-- 4. Create GymSettings Table
CREATE TABLE IF NOT EXISTS "GymSettings" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
    "operatingHours" JSONB,
    "billingGracePeriodDays" INTEGER NOT NULL DEFAULT 5,
    "capacityLimit" INTEGER,
    "allowMinorSelfCheckin" BOOLEAN NOT NULL DEFAULT false,
    "requireGuardianSignature" BOOLEAN NOT NULL DEFAULT true,
    "biometricValidationMode" TEXT NOT NULL DEFAULT 'LOCAL_AGENT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GymSettings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "GymSettings_workspaceId_key" ON "GymSettings"("workspaceId");

-- 5. Create GymUnit Table
CREATE TABLE IF NOT EXISTS "GymUnit" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT,
    "code" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postalCode" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GymUnit_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "GymUnit_workspaceId_isActive_idx" ON "GymUnit"("workspaceId", "isActive");
CREATE UNIQUE INDEX IF NOT EXISTS "GymUnit_workspaceId_slug_key" ON "GymUnit"("workspaceId", "slug");

-- 6. Create WorkspaceRoleGrant Table
CREATE TABLE IF NOT EXISTS "WorkspaceRoleGrant" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "role" "WorkspaceRole" NOT NULL,
    "unitId" TEXT,
    "grantedBy" TEXT,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "revokedBy" TEXT,

    CONSTRAINT "WorkspaceRoleGrant_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "WorkspaceRoleGrant_memberId_idx" ON "WorkspaceRoleGrant"("memberId");
CREATE INDEX IF NOT EXISTS "WorkspaceRoleGrant_unitId_idx" ON "WorkspaceRoleGrant"("unitId");
CREATE UNIQUE INDEX IF NOT EXISTS "WorkspaceRoleGrant_memberId_role_unitId_key" ON "WorkspaceRoleGrant"("memberId", "role", "unitId");

-- 7. Create WorkspaceInvitation Table
CREATE TABLE IF NOT EXISTS "WorkspaceInvitation" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "unitId" TEXT,
    "email" TEXT NOT NULL,
    "role" "WorkspaceRole" NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "invitedBy" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceInvitation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "WorkspaceInvitation_tokenHash_key" ON "WorkspaceInvitation"("tokenHash");
CREATE INDEX IF NOT EXISTS "WorkspaceInvitation_workspaceId_email_idx" ON "WorkspaceInvitation"("workspaceId", "email");
CREATE INDEX IF NOT EXISTS "WorkspaceInvitation_workspaceId_status_idx" ON "WorkspaceInvitation"("workspaceId", "status");

-- 8. Create GymStaffProfile Table
CREATE TABLE IF NOT EXISTS "GymStaffProfile" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "cref" TEXT,
    "jobTitle" TEXT,
    "bio" TEXT,
    "hireDate" TIMESTAMP(3),
    "terminationDate" TIMESTAMP(3),
    "emergencyContactName" TEXT,
    "emergencyContactPhone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GymStaffProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "GymStaffProfile_memberId_key" ON "GymStaffProfile"("memberId");

-- 9. Add Foreign Key Constraints (Safe / Idempotent)
DO $$ BEGIN
    ALTER TABLE "GymSettings" ADD CONSTRAINT "GymSettings_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "GymUnit" ADD CONSTRAINT "GymUnit_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "WorkspaceRoleGrant" ADD CONSTRAINT "WorkspaceRoleGrant_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "WorkspaceMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "WorkspaceRoleGrant" ADD CONSTRAINT "WorkspaceRoleGrant_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "GymUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "WorkspaceInvitation" ADD CONSTRAINT "WorkspaceInvitation_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "WorkspaceInvitation" ADD CONSTRAINT "WorkspaceInvitation_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "GymUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "GymStaffProfile" ADD CONSTRAINT "GymStaffProfile_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "WorkspaceMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
