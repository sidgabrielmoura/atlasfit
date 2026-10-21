-- CreateEnum
CREATE TYPE "GymFinancialAccountType" AS ENUM ('CASH', 'BANK_ACCOUNT', 'GATEWAY_ONLINE', 'SAFE_RESERVE', 'OTHER');

-- CreateEnum
CREATE TYPE "GymExpenseStatus" AS ENUM ('PENDING', 'SCHEDULED', 'PAID', 'CANCELLED', 'OVERDUE');

-- CreateEnum
CREATE TYPE "GymCashDrawerStatus" AS ENUM ('OPEN', 'CLOSED', 'RECONCILED');

-- CreateEnum
CREATE TYPE "GymCashMovementType" AS ENUM ('OPENING', 'CASH_INFLOW_PAYMENT', 'SUPPLY', 'BLEED', 'EXPENSE_PAYMENT', 'CLOSING');

-- AlterTable
ALTER TABLE "GymPayment"
ADD COLUMN "cashDrawerSessionId" TEXT;

-- CreateTable
CREATE TABLE "GymFinancialAccount" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "unitId" TEXT,
    "name" TEXT NOT NULL,
    "accountType" "GymFinancialAccountType" NOT NULL DEFAULT 'CASH',
    "balanceInCents" BIGINT NOT NULL DEFAULT 0,
    "initialBalanceInCents" BIGINT NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "bankName" TEXT,
    "agencyNumber" TEXT,
    "accountNumber" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GymFinancialAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GymAccountTransfer" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "fromAccountId" TEXT NOT NULL,
    "toAccountId" TEXT NOT NULL,
    "amountInCents" BIGINT NOT NULL,
    "transferredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT,
    "referenceId" TEXT,
    "performedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GymAccountTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GymExpenseCategory" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "color" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GymExpenseCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GymSupplier" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "tradeName" TEXT NOT NULL,
    "corporateName" TEXT,
    "cnpjCpf" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "contactName" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GymSupplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GymExpense" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "unitId" TEXT,
    "supplierId" TEXT,
    "supplierName" TEXT,
    "categoryId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "documentNumber" TEXT,
    "amountInCents" BIGINT NOT NULL,
    "penaltyInCents" BIGINT NOT NULL DEFAULT 0,
    "discountInCents" BIGINT NOT NULL DEFAULT 0,
    "paidAmountInCents" BIGINT NOT NULL DEFAULT 0,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "competenceMonth" TEXT NOT NULL,
    "paidAt" TIMESTAMP(3),
    "status" "GymExpenseStatus" NOT NULL DEFAULT 'PENDING',
    "financialAccountId" TEXT,
    "paymentMethod" TEXT,
    "paymentProofUrl" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "paidByUserId" TEXT,
    "cancellationReason" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancelledByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GymExpense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GymCashDrawerSession" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "unitId" TEXT,
    "financialAccountId" TEXT NOT NULL,
    "sessionNumber" TEXT NOT NULL,
    "status" "GymCashDrawerStatus" NOT NULL DEFAULT 'OPEN',
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "openedByUserId" TEXT NOT NULL,
    "openingAmountInCents" BIGINT NOT NULL,
    "closedAt" TIMESTAMP(3),
    "closedByUserId" TEXT,
    "expectedCashInCents" BIGINT NOT NULL DEFAULT 0,
    "actualCashInCents" BIGINT,
    "differenceInCents" BIGINT,
    "differenceReason" TEXT,
    "notes" TEXT,
    "reconciledAt" TIMESTAMP(3),
    "reconciledByUserId" TEXT,
    "reconciliationNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GymCashDrawerSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GymCashDrawerMovement" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "movementType" "GymCashMovementType" NOT NULL,
    "amountInCents" BIGINT NOT NULL,
    "description" TEXT,
    "performedByUserId" TEXT NOT NULL,
    "paymentId" TEXT,
    "expenseId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GymCashDrawerMovement_pkey" PRIMARY KEY ("id")
);

-- CreateIndexes
CREATE INDEX "GymPayment_cashDrawerSessionId_idx" ON "GymPayment"("cashDrawerSessionId");

CREATE INDEX "GymFinancialAccount_workspaceId_isActive_idx" ON "GymFinancialAccount"("workspaceId", "isActive");
CREATE INDEX "GymFinancialAccount_workspaceId_accountType_idx" ON "GymFinancialAccount"("workspaceId", "accountType");

CREATE INDEX "GymAccountTransfer_workspaceId_transferredAt_idx" ON "GymAccountTransfer"("workspaceId", "transferredAt");
CREATE INDEX "GymAccountTransfer_fromAccountId_idx" ON "GymAccountTransfer"("fromAccountId");
CREATE INDEX "GymAccountTransfer_toAccountId_idx" ON "GymAccountTransfer"("toAccountId");

CREATE UNIQUE INDEX "GymExpenseCategory_workspaceId_name_key" ON "GymExpenseCategory"("workspaceId", "name");
CREATE INDEX "GymExpenseCategory_workspaceId_isActive_idx" ON "GymExpenseCategory"("workspaceId", "isActive");

CREATE INDEX "GymSupplier_workspaceId_tradeName_idx" ON "GymSupplier"("workspaceId", "tradeName");
CREATE INDEX "GymSupplier_workspaceId_cnpjCpf_idx" ON "GymSupplier"("workspaceId", "cnpjCpf");

CREATE INDEX "GymExpense_workspaceId_status_idx" ON "GymExpense"("workspaceId", "status");
CREATE INDEX "GymExpense_workspaceId_dueDate_idx" ON "GymExpense"("workspaceId", "dueDate");
CREATE INDEX "GymExpense_workspaceId_competenceMonth_idx" ON "GymExpense"("workspaceId", "competenceMonth");
CREATE INDEX "GymExpense_categoryId_idx" ON "GymExpense"("categoryId");
CREATE INDEX "GymExpense_supplierId_idx" ON "GymExpense"("supplierId");
CREATE INDEX "GymExpense_financialAccountId_idx" ON "GymExpense"("financialAccountId");

CREATE UNIQUE INDEX "GymCashDrawerSession_sessionNumber_key" ON "GymCashDrawerSession"("sessionNumber");
CREATE INDEX "GymCashDrawerSession_workspaceId_status_idx" ON "GymCashDrawerSession"("workspaceId", "status");
CREATE INDEX "GymCashDrawerSession_financialAccountId_idx" ON "GymCashDrawerSession"("financialAccountId");
CREATE INDEX "GymCashDrawerSession_openedByUserId_idx" ON "GymCashDrawerSession"("openedByUserId");
CREATE INDEX "GymCashDrawerSession_openedAt_idx" ON "GymCashDrawerSession"("openedAt");

CREATE INDEX "GymCashDrawerMovement_sessionId_idx" ON "GymCashDrawerMovement"("sessionId");
CREATE INDEX "GymCashDrawerMovement_movementType_idx" ON "GymCashDrawerMovement"("movementType");

-- AddForeignKey
ALTER TABLE "GymPayment" ADD CONSTRAINT "GymPayment_cashDrawerSessionId_fkey" FOREIGN KEY ("cashDrawerSessionId") REFERENCES "GymCashDrawerSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "GymFinancialAccount" ADD CONSTRAINT "GymFinancialAccount_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GymFinancialAccount" ADD CONSTRAINT "GymFinancialAccount_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "GymUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "GymAccountTransfer" ADD CONSTRAINT "GymAccountTransfer_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GymAccountTransfer" ADD CONSTRAINT "GymAccountTransfer_fromAccountId_fkey" FOREIGN KEY ("fromAccountId") REFERENCES "GymFinancialAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GymAccountTransfer" ADD CONSTRAINT "GymAccountTransfer_toAccountId_fkey" FOREIGN KEY ("toAccountId") REFERENCES "GymFinancialAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GymAccountTransfer" ADD CONSTRAINT "GymAccountTransfer_performedByUserId_fkey" FOREIGN KEY ("performedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "GymExpenseCategory" ADD CONSTRAINT "GymExpenseCategory_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GymSupplier" ADD CONSTRAINT "GymSupplier_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GymExpense" ADD CONSTRAINT "GymExpense_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GymExpense" ADD CONSTRAINT "GymExpense_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "GymUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GymExpense" ADD CONSTRAINT "GymExpense_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "GymSupplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GymExpense" ADD CONSTRAINT "GymExpense_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "GymExpenseCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GymExpense" ADD CONSTRAINT "GymExpense_financialAccountId_fkey" FOREIGN KEY ("financialAccountId") REFERENCES "GymFinancialAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GymExpense" ADD CONSTRAINT "GymExpense_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GymExpense" ADD CONSTRAINT "GymExpense_paidByUserId_fkey" FOREIGN KEY ("paidByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GymExpense" ADD CONSTRAINT "GymExpense_cancelledByUserId_fkey" FOREIGN KEY ("cancelledByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "GymCashDrawerSession" ADD CONSTRAINT "GymCashDrawerSession_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GymCashDrawerSession" ADD CONSTRAINT "GymCashDrawerSession_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "GymUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GymCashDrawerSession" ADD CONSTRAINT "GymCashDrawerSession_financialAccountId_fkey" FOREIGN KEY ("financialAccountId") REFERENCES "GymFinancialAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GymCashDrawerSession" ADD CONSTRAINT "GymCashDrawerSession_openedByUserId_fkey" FOREIGN KEY ("openedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GymCashDrawerSession" ADD CONSTRAINT "GymCashDrawerSession_closedByUserId_fkey" FOREIGN KEY ("closedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GymCashDrawerSession" ADD CONSTRAINT "GymCashDrawerSession_reconciledByUserId_fkey" FOREIGN KEY ("reconciledByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "GymCashDrawerMovement" ADD CONSTRAINT "GymCashDrawerMovement_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "GymCashDrawerSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GymCashDrawerMovement" ADD CONSTRAINT "GymCashDrawerMovement_performedByUserId_fkey" FOREIGN KEY ("performedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
