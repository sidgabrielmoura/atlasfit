-- Nullable fields preserve existing orders; no historical balances are rewritten.
ALTER TABLE "Transaction" ADD COLUMN "platformPlanId" TEXT,
  ADD COLUMN "expectedAmountInCents" INTEGER,
  ADD COLUMN "providerCheckoutId" TEXT,
  ADD COLUMN "checkoutUrl" TEXT,
  ADD COLUMN "requestKey" TEXT;
CREATE UNIQUE INDEX "Transaction_providerCheckoutId_key" ON "Transaction"("providerCheckoutId");
CREATE UNIQUE INDEX "Transaction_requestKey_key" ON "Transaction"("requestKey");
ALTER TABLE "CreditPurchase" ADD COLUMN "checkoutRequestKey" TEXT;
CREATE UNIQUE INDEX "CreditPurchase_checkoutRequestKey_key" ON "CreditPurchase"("checkoutRequestKey");
