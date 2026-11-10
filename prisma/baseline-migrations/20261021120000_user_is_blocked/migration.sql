-- Add isBlocked column to User for administrative security controls
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isBlocked" BOOLEAN NOT NULL DEFAULT false;
