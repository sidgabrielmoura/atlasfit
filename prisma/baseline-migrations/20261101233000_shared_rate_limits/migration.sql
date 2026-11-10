CREATE TABLE "RateLimitBucket" (
  "key" TEXT PRIMARY KEY,
  "count" INTEGER NOT NULL,
  "resetAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "RateLimitBucket_resetAt_idx" ON "RateLimitBucket"("resetAt");
