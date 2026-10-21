ALTER TABLE "GymCashDrawerMovement" ADD COLUMN "accountTransferId" TEXT, ADD COLUMN "standaloneReviewedAt" TIMESTAMP(3);
ALTER TABLE "GymCashDrawerMovement" ADD CONSTRAINT "GymCashDrawerMovement_accountTransferId_fkey" FOREIGN KEY ("accountTransferId") REFERENCES "GymAccountTransfer"("id") ON DELETE RESTRICT;
CREATE UNIQUE INDEX "GymCashDrawerMovement_accountTransferId_movementType_key" ON "GymCashDrawerMovement"("accountTransferId", "movementType");
-- Only exact, unambiguous references are backfilled. Free-text transfer descriptions are not evidence.
UPDATE "GymCashDrawerMovement" m SET "accountTransferId" = t."id"
FROM "GymAccountTransfer" t, "GymCashDrawerSession" s
WHERE t."referenceId" = m."id" AND m."sessionId" = s."id"
AND m."movementType" = 'BLEED' AND t."fromAccountId" = s."financialAccountId"
AND t."workspaceId" = s."workspaceId" AND t."amountInCents" = m."amountInCents"
AND NOT EXISTS (SELECT 1 FROM "GymAccountTransfer" other WHERE other."referenceId" = m."id" AND other."id" <> t."id");
