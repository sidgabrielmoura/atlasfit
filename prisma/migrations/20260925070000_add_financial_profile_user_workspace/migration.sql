-- CreateEnum
CREATE TYPE "FinancialProfileType" AS ENUM ('USER', 'WORKSPACE');

-- AlterTable PaymentProviderAccount
ALTER TABLE "PaymentProviderAccount" ADD COLUMN "profileType" "FinancialProfileType" NOT NULL DEFAULT 'USER';
ALTER TABLE "PaymentProviderAccount" ADD COLUMN "workspaceId" TEXT;
ALTER TABLE "PaymentProviderAccount" ALTER COLUMN "personalUserId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "PaymentProviderAccount_workspaceId_key" ON "PaymentProviderAccount"("workspaceId");
CREATE INDEX "PaymentProviderAccount_profileType_status_idx" ON "PaymentProviderAccount"("profileType", "status");

-- AddForeignKey
ALTER TABLE "PaymentProviderAccount" ADD CONSTRAINT "PaymentProviderAccount_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable GatewayCustomer
ALTER TABLE "GatewayCustomer" ADD COLUMN "workspaceId" TEXT;
ALTER TABLE "GatewayCustomer" ADD COLUMN "payerUserId" TEXT;
ALTER TABLE "GatewayCustomer" ADD COLUMN "payerGuardianId" TEXT;
ALTER TABLE "GatewayCustomer" ADD COLUMN "payerCpfCnpj" TEXT;
ALTER TABLE "GatewayCustomer" ADD COLUMN "payerNameSnapshot" TEXT;
ALTER TABLE "GatewayCustomer" ALTER COLUMN "personalUserId" DROP NOT NULL;
ALTER TABLE "GatewayCustomer" ALTER COLUMN "studentUserId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "GatewayCustomer_workspaceId_payerCpfCnpj_idx" ON "GatewayCustomer"("workspaceId", "payerCpfCnpj");
CREATE INDEX "GatewayCustomer_workspaceId_studentUserId_idx" ON "GatewayCustomer"("workspaceId", "studentUserId");

-- AddForeignKey
ALTER TABLE "GatewayCustomer" ADD CONSTRAINT "GatewayCustomer_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable StudentBilling
ALTER TABLE "StudentBilling" ADD COLUMN "workspaceId" TEXT;
ALTER TABLE "StudentBilling" ADD COLUMN "enrollmentId" TEXT;
ALTER TABLE "StudentBilling" ADD COLUMN "payerUserId" TEXT;
ALTER TABLE "StudentBilling" ADD COLUMN "payerGuardianId" TEXT;
ALTER TABLE "StudentBilling" ADD COLUMN "payerName" TEXT;
ALTER TABLE "StudentBilling" ADD COLUMN "payerCpfCnpj" TEXT;

-- CreateIndex
CREATE INDEX "StudentBilling_workspaceId_status_idx" ON "StudentBilling"("workspaceId", "status");
CREATE INDEX "StudentBilling_enrollmentId_idx" ON "StudentBilling"("enrollmentId");

-- AddForeignKey
ALTER TABLE "StudentBilling" ADD CONSTRAINT "StudentBilling_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StudentBilling" ADD CONSTRAINT "StudentBilling_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "GymEnrollment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
