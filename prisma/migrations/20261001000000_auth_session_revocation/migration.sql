-- Additive: existing sessions remain at version zero until explicitly revoked.
ALTER TABLE "User" ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0;
