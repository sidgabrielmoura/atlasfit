-- CreateEnum
CREATE TYPE "GymInvoiceStatus" AS ENUM ('DRAFT', 'OPEN', 'PARTIALLY_PAID', 'PAID', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "GymInvoiceItemType" AS ENUM ('PLAN_SUBSCRIPTION', 'ENROLLMENT_FEE', 'DAILY_PASS', 'PRODUCT', 'SERVICE', 'PENALTY', 'OTHER');

-- CreateEnum
CREATE TYPE "GymInPersonPaymentMethod" AS ENUM ('CASH', 'EXTERNAL_POS_DEBIT', 'EXTERNAL_POS_CREDIT', 'BANK_TRANSFER_MANUAL', 'GATEWAY_ONLINE');

-- CreateEnum
CREATE TYPE "GymPaymentStatus" AS ENUM ('CONFIRMED', 'REVERSED');

-- CreateEnum
CREATE TYPE "GymAllocationStatus" AS ENUM ('ACTIVE', 'REVERSED');

-- AlterTable
ALTER TABLE "GymSettings" ADD COLUMN IF NOT EXISTS "maxReceptionistDiscountPercentage" DOUBLE PRECISION NOT NULL DEFAULT 10.0;
ALTER TABLE "GymSettings" ADD COLUMN IF NOT EXISTS "maxReceptionistDiscountInCents" BIGINT NOT NULL DEFAULT 2000;

-- CreateTable
CREATE TABLE "GymInvoice" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "studentMemberId" TEXT NOT NULL,
    "studentUserId" TEXT NOT NULL,
    "enrollmentId" TEXT,
    "billingId" TEXT,
    "invoiceNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "GymInvoiceStatus" NOT NULL DEFAULT 'OPEN',
    "dueDate" TIMESTAMP(3) NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "competenceMonth" TEXT,
    "subtotalInCents" BIGINT NOT NULL,
    "discountInCents" BIGINT NOT NULL DEFAULT 0,
    "totalInCents" BIGINT NOT NULL,
    "paidAmountInCents" BIGINT NOT NULL DEFAULT 0,
    "balanceRemainingInCents" BIGINT NOT NULL,
    "discountPercentage" DOUBLE PRECISION,
    "discountReason" TEXT,
    "discountAuthorizedByUserId" TEXT,
    "payerType" TEXT NOT NULL DEFAULT 'STUDENT',
    "payerName" TEXT NOT NULL,
    "payerCpfCnpj" TEXT,
    "payerEmail" TEXT,
    "payerPhone" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "paidAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GymInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GymInvoiceItem" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "itemType" "GymInvoiceItemType" NOT NULL DEFAULT 'PLAN_SUBSCRIPTION',
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPriceInCents" BIGINT NOT NULL,
    "totalInCents" BIGINT NOT NULL,
    "planVersionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GymInvoiceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GymPayment" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "paymentNumber" TEXT NOT NULL,
    "receiptNumber" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "amountInCents" BIGINT NOT NULL,
    "paymentMethod" "GymInPersonPaymentMethod" NOT NULL,
    "status" "GymPaymentStatus" NOT NULL DEFAULT 'CONFIRMED',
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "receivedByUserId" TEXT NOT NULL,
    "posCardBrand" TEXT,
    "posAuthorizationCode" TEXT,
    "posNsu" TEXT,
    "posTerminalId" TEXT,
    "bankTransferProofUrl" TEXT,
    "bankTransferTransactionId" TEXT,
    "payerName" TEXT NOT NULL,
    "payerCpfCnpj" TEXT,
    "reversedAt" TIMESTAMP(3),
    "reversedByUserId" TEXT,
    "reversalReason" TEXT,
    "taxDisclaimer" TEXT NOT NULL DEFAULT 'Este documento é um recibo comprobatório de pagamento e não substitui o documento fiscal (NFS-e/NFC-e).',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GymPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GymPaymentAllocation" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "allocatedAmountInCents" BIGINT NOT NULL,
    "status" "GymAllocationStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GymPaymentAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GymInvoice_invoiceNumber_key" ON "GymInvoice"("invoiceNumber");

-- CreateIndex
CREATE INDEX "GymInvoice_workspaceId_status_idx" ON "GymInvoice"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "GymInvoice_workspaceId_studentMemberId_idx" ON "GymInvoice"("workspaceId", "studentMemberId");

-- CreateIndex
CREATE INDEX "GymInvoice_workspaceId_dueDate_idx" ON "GymInvoice"("workspaceId", "dueDate");

-- CreateIndex
CREATE INDEX "GymInvoice_enrollmentId_idx" ON "GymInvoice"("enrollmentId");

-- CreateIndex
CREATE INDEX "GymInvoiceItem_invoiceId_idx" ON "GymInvoiceItem"("invoiceId");

-- CreateIndex
CREATE INDEX "GymInvoiceItem_planVersionId_idx" ON "GymInvoiceItem"("planVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "GymPayment_paymentNumber_key" ON "GymPayment"("paymentNumber");

-- CreateIndex
CREATE UNIQUE INDEX "GymPayment_receiptNumber_key" ON "GymPayment"("receiptNumber");

-- CreateIndex
CREATE UNIQUE INDEX "GymPayment_idempotencyKey_key" ON "GymPayment"("idempotencyKey");

-- CreateIndex
CREATE INDEX "GymPayment_workspaceId_status_idx" ON "GymPayment"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "GymPayment_workspaceId_paidAt_idx" ON "GymPayment"("workspaceId", "paidAt");

-- CreateIndex
CREATE INDEX "GymPayment_receivedByUserId_idx" ON "GymPayment"("receivedByUserId");

-- CreateIndex
CREATE INDEX "GymPaymentAllocation_paymentId_idx" ON "GymPaymentAllocation"("paymentId");

-- CreateIndex
CREATE INDEX "GymPaymentAllocation_invoiceId_idx" ON "GymPaymentAllocation"("invoiceId");

-- CreateIndex
CREATE INDEX "GymPaymentAllocation_status_idx" ON "GymPaymentAllocation"("status");

-- AddForeignKey
ALTER TABLE "GymInvoice" ADD CONSTRAINT "GymInvoice_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymInvoice" ADD CONSTRAINT "GymInvoice_studentMemberId_fkey" FOREIGN KEY ("studentMemberId") REFERENCES "WorkspaceMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymInvoice" ADD CONSTRAINT "GymInvoice_studentUserId_fkey" FOREIGN KEY ("studentUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymInvoice" ADD CONSTRAINT "GymInvoice_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "GymEnrollment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymInvoice" ADD CONSTRAINT "GymInvoice_billingId_fkey" FOREIGN KEY ("billingId") REFERENCES "StudentBilling"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymInvoiceItem" ADD CONSTRAINT "GymInvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "GymInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymInvoiceItem" ADD CONSTRAINT "GymInvoiceItem_planVersionId_fkey" FOREIGN KEY ("planVersionId") REFERENCES "GymPlanVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymPayment" ADD CONSTRAINT "GymPayment_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymPayment" ADD CONSTRAINT "GymPayment_receivedByUserId_fkey" FOREIGN KEY ("receivedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymPayment" ADD CONSTRAINT "GymPayment_reversedByUserId_fkey" FOREIGN KEY ("reversedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymPaymentAllocation" ADD CONSTRAINT "GymPaymentAllocation_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "GymPayment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymPaymentAllocation" ADD CONSTRAINT "GymPaymentAllocation_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "GymInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
