-- Reconstruct fields that existed in the application schema without a migration.
-- IF NOT EXISTS also supports installations that previously received these fields manually.
ALTER TABLE "Subscription"
  ADD COLUMN IF NOT EXISTS "autoSuspendEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "billingControlType" TEXT NOT NULL DEFAULT 'AUTOMATIC',
  ADD COLUMN IF NOT EXISTS "nextDueDate" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "paymentMethod" TEXT,
  ADD COLUMN IF NOT EXISTS "periodicity" TEXT DEFAULT 'MENSAL',
  ADD COLUMN IF NOT EXISTS "priceInCents" INTEGER,
  ADD COLUMN IF NOT EXISTS "toleranceDays" INTEGER NOT NULL DEFAULT 5;
ALTER TABLE "WorkspaceSubscription"
  ADD COLUMN IF NOT EXISTS "autoSuspendEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "billingControlType" TEXT NOT NULL DEFAULT 'AUTOMATIC',
  ADD COLUMN IF NOT EXISTS "nextDueDate" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "paymentMethod" TEXT,
  ADD COLUMN IF NOT EXISTS "periodicity" TEXT DEFAULT 'MENSAL',
  ADD COLUMN IF NOT EXISTS "priceInCents" INTEGER,
  ADD COLUMN IF NOT EXISTS "toleranceDays" INTEGER NOT NULL DEFAULT 5;
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='Transaction_workspaceId_fkey' AND conrelid='"Transaction"'::regclass) THEN
    ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
