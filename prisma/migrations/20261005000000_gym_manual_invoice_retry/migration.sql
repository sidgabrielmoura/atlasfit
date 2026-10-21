BEGIN;
ALTER TABLE "GymInvoice" ADD COLUMN "issuanceKey" TEXT, ADD COLUMN "issuanceFingerprint" TEXT;
CREATE UNIQUE INDEX "GymInvoice_issuanceKey_key" ON "GymInvoice"("issuanceKey");
COMMIT;
