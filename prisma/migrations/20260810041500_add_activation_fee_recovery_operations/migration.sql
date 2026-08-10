ALTER TABLE "PaymentProviderAccount" ADD COLUMN IF NOT EXISTS "providerApiKeyEncrypted" TEXT;
ALTER TABLE "PaymentProviderAccount" ADD COLUMN IF NOT EXISTS "providerApiKeyKeyVersion" TEXT;
ALTER TABLE "PaymentProviderAccount" ADD COLUMN IF NOT EXISTS "activationFeeReservedInCents" BIGINT NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS "ActivationFeeRecoveryOperation" (
    "id" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "billingId" TEXT NOT NULL,
    "amountInCents" BIGINT NOT NULL,
    "providerTransferId" TEXT,
    "externalReference" TEXT,
    "status" TEXT NOT NULL DEFAULT 'RESERVED',
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActivationFeeRecoveryOperation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ActivationFeeRecoveryOperation_providerTransferId_key" ON "ActivationFeeRecoveryOperation"("providerTransferId");
CREATE UNIQUE INDEX IF NOT EXISTS "ActivationFeeRecoveryOperation_externalReference_key" ON "ActivationFeeRecoveryOperation"("externalReference");
CREATE INDEX IF NOT EXISTS "ActivationFeeRecoveryOperation_providerAccountId_status_idx" ON "ActivationFeeRecoveryOperation"("providerAccountId", "status");

ALTER TABLE "ActivationFeeRecoveryOperation" ADD CONSTRAINT "ActivationFeeRecoveryOperation_providerAccountId_fkey" FOREIGN KEY ("providerAccountId") REFERENCES "PaymentProviderAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ActivationFeeRecoveryOperation" ADD CONSTRAINT "ActivationFeeRecoveryOperation_billingId_fkey" FOREIGN KEY ("billingId") REFERENCES "StudentBilling"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
