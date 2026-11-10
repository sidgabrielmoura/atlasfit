-- CreateTable
CREATE TABLE "CreditGrantChallenge" (
    "id" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "codeHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreditGrantChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CreditGrantChallenge_targetUserId_status_idx" ON "CreditGrantChallenge"("targetUserId", "status");

-- CreateIndex
CREATE INDEX "CreditGrantChallenge_actorUserId_status_idx" ON "CreditGrantChallenge"("actorUserId", "status");

-- CreateIndex
CREATE INDEX "CreditGrantChallenge_expiresAt_idx" ON "CreditGrantChallenge"("expiresAt");

-- AddForeignKey
ALTER TABLE "CreditGrantChallenge" ADD CONSTRAINT "CreditGrantChallenge_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditGrantChallenge" ADD CONSTRAINT "CreditGrantChallenge_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
