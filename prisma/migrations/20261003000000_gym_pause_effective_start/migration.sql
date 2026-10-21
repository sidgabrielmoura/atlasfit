-- Additive: historical pauses are retained and are not marked as applied by inference.
ALTER TABLE "GymEnrollmentPause" ADD COLUMN "startedAt" TIMESTAMP(3);
