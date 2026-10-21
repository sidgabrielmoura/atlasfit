ALTER TABLE "GymAccountTransfer" ADD COLUMN "idempotencyKey" TEXT, ADD COLUMN "requestFingerprint" TEXT;
ALTER TABLE "GymCashDrawerMovement" ADD COLUMN "idempotencyKey" TEXT, ADD COLUMN "requestFingerprint" TEXT;
CREATE UNIQUE INDEX "GymAccountTransfer_idempotencyKey_key" ON "GymAccountTransfer"("idempotencyKey");
CREATE UNIQUE INDEX "GymCashDrawerMovement_idempotencyKey_key" ON "GymCashDrawerMovement"("idempotencyKey");
-- Histórico permanece sem chave; não se inventa correspondência entre transferências antigas.
