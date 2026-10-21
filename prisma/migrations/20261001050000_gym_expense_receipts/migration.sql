-- Additive: preserve existing expense aggregates and financial history.
ALTER TABLE "GymExpense" ADD COLUMN "idempotencyKey" TEXT, ADD COLUMN "requestFingerprint" TEXT;
CREATE UNIQUE INDEX "GymExpense_idempotencyKey_key" ON "GymExpense"("idempotencyKey");
CREATE TABLE "GymExpensePayment" (
  "id" TEXT NOT NULL,
  "expenseId" TEXT NOT NULL,
  "financialAccountId" TEXT NOT NULL,
  "amountInCents" BIGINT NOT NULL,
  "paidAt" TIMESTAMP(3) NOT NULL,
  "paymentMethod" TEXT,
  "paymentProofUrl" TEXT,
  "recordedByUserId" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "requestFingerprint" TEXT NOT NULL,
  "reversedAt" TIMESTAMP(3),
  "reversedByUserId" TEXT,
  "reversalReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GymExpensePayment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "GymExpensePayment_positive_amount" CHECK ("amountInCents" > 0),
  CONSTRAINT "GymExpensePayment_reversal_complete" CHECK (("reversedAt" IS NULL AND "reversedByUserId" IS NULL AND "reversalReason" IS NULL) OR ("reversedAt" IS NOT NULL AND "reversedByUserId" IS NOT NULL AND "reversalReason" IS NOT NULL AND length(trim("reversalReason")) >= 5)),
  CONSTRAINT "GymExpensePayment_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "GymExpense"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "GymExpensePayment_financialAccountId_fkey" FOREIGN KEY ("financialAccountId") REFERENCES "GymFinancialAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "GymExpensePayment_recordedByUserId_fkey" FOREIGN KEY ("recordedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "GymExpensePayment_reversedByUserId_fkey" FOREIGN KEY ("reversedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "GymExpensePayment_idempotencyKey_key" ON "GymExpensePayment"("idempotencyKey");
CREATE INDEX "GymExpensePayment_expenseId_paidAt_idx" ON "GymExpensePayment"("expenseId", "paidAt");
-- Do not remove or silently close conflicting historic sessions.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "GymCashDrawerSession" WHERE "status" = 'OPEN' GROUP BY "workspaceId", "openedByUserId" HAVING count(*) > 1)
    OR EXISTS (SELECT 1 FROM "GymCashDrawerSession" WHERE "status" = 'OPEN' GROUP BY "financialAccountId" HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'Reconcile duplicate open cash sessions before applying this migration';
  END IF;
END $$;
CREATE UNIQUE INDEX "GymCashDrawerSession_active_operator_unique" ON "GymCashDrawerSession"("workspaceId", "openedByUserId") WHERE "status" = 'OPEN';
CREATE UNIQUE INDEX "GymCashDrawerSession_active_account_unique" ON "GymCashDrawerSession"("financialAccountId") WHERE "status" = 'OPEN';
