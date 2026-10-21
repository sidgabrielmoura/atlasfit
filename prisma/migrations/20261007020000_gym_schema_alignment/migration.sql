-- Preserve referential restrictions; align update behavior and the Prisma index name.
ALTER TABLE "GymAdministrativeReview" DROP CONSTRAINT "GymAdministrativeReview_actorUserId_fkey";
ALTER TABLE "GymAdministrativeReview" DROP CONSTRAINT "GymAdministrativeReview_workspaceId_fkey";
ALTER TABLE "GymCashDrawerMovement" DROP CONSTRAINT "GymCashDrawerMovement_accountTransferId_fkey";
ALTER TABLE "GymCashDrawerMovement" ADD CONSTRAINT "GymCashDrawerMovement_accountTransferId_fkey" FOREIGN KEY ("accountTransferId") REFERENCES "GymAccountTransfer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GymAdministrativeReview" ADD CONSTRAINT "GymAdministrativeReview_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GymAdministrativeReview" ADD CONSTRAINT "GymAdministrativeReview_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER INDEX "PaymentWebhookEvent_gymWorkspaceId_processingStatus_receivedAt_" RENAME TO "PaymentWebhookEvent_gymWorkspaceId_processingStatus_receive_idx";
