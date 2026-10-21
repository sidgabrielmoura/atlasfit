-- CreateEnum
CREATE TYPE "GymRecurrenceMode" AS ENUM ('LOCAL', 'PROVIDER');

-- CreateEnum
CREATE TYPE "GymSubscriptionStatus" AS ENUM ('INACTIVE', 'ACTIVE', 'OVERDUE', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "GymBillingType" AS ENUM ('UNDEFINED', 'CREDIT_CARD', 'PIX', 'BOLETO');

-- AlterTable
ALTER TABLE "GymEnrollment"
ADD COLUMN "recurrenceMode" "GymRecurrenceMode" NOT NULL DEFAULT 'LOCAL',
ADD COLUMN "providerSubscriptionId" TEXT,
ADD COLUMN "subscriptionStatus" "GymSubscriptionStatus" NOT NULL DEFAULT 'INACTIVE',
ADD COLUMN "billingType" "GymBillingType" NOT NULL DEFAULT 'UNDEFINED',
ADD COLUMN "checkoutUrl" TEXT,
ADD COLUMN "creditCardToken" TEXT,
ADD COLUMN "creditCardBrand" TEXT,
ADD COLUMN "creditCardLast4" TEXT,
ADD COLUMN "nextDueDate" TIMESTAMP(3),
ADD COLUMN "nextCycleBillingDate" TIMESTAMP(3),
ADD COLUMN "cycleCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "lastPaymentStatus" TEXT;

-- AlterTable
ALTER TABLE "GymInvoice"
ADD COLUMN "providerSubscriptionId" TEXT,
ADD COLUMN "cycleNumber" INTEGER,
ADD COLUMN "hostedCheckoutUrl" TEXT,
ADD COLUMN "pixQrCodePayload" TEXT,
ADD COLUMN "pixQrCodeUrl" TEXT,
ADD COLUMN "bankSlipUrl" TEXT;

-- CreateIndex
CREATE INDEX "GymEnrollment_providerSubscriptionId_idx" ON "GymEnrollment"("providerSubscriptionId");

-- CreateIndex
CREATE INDEX "GymInvoice_providerSubscriptionId_idx" ON "GymInvoice"("providerSubscriptionId");

-- CreateIndex
CREATE INDEX "GymInvoice_enrollmentId_competenceMonth_idx" ON "GymInvoice"("enrollmentId", "competenceMonth");
