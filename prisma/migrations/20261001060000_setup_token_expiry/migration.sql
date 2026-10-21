-- Additive: old links without a deadline require explicit reissue.
-- No token, identity or historical acceptance is deleted.
ALTER TABLE "User" ADD COLUMN "setupTokenExpiresAt" TIMESTAMP(3);
