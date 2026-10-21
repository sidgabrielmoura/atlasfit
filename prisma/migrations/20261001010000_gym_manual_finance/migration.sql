ALTER TABLE "GymInvoice" ADD COLUMN "recurrenceKey" TEXT;
CREATE UNIQUE INDEX "GymInvoice_recurrenceKey_key" ON "GymInvoice"("recurrenceKey");
ALTER TABLE "GymPayment" ADD COLUMN "requestFingerprint" TEXT;
ALTER TABLE "GymPayment" ADD COLUMN "financialAccountId" TEXT;
ALTER TABLE "GymPayment" ADD CONSTRAINT "GymPayment_financialAccountId_fkey" FOREIGN KEY ("financialAccountId") REFERENCES "GymFinancialAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- Existing duplicate allocation pairs require reconciliation before this index is applied.
-- Preflight: SELECT "paymentId", "invoiceId", COUNT(*) FROM "GymPaymentAllocation" GROUP BY 1, 2 HAVING COUNT(*) > 1;
CREATE UNIQUE INDEX "GymPaymentAllocation_paymentId_invoiceId_key" ON "GymPaymentAllocation"("paymentId", "invoiceId");
