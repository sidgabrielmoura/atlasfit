import type { GymTransactionClient } from "@/modules/workspaces/application/transaction";
import { WorkspaceAccessError } from "@/modules/workspaces/domain/types";

export const IMPORT_COMMIT_LEASE_MS = 360_000;
/** Review changes and student commits lock the same parent row. */
export async function lockImportReview(tx: GymTransactionClient, jobId: string) {
  const [job] = await tx.$queryRaw<{ status: string; updatedAt: Date }[]>`SELECT "status", "updatedAt" FROM "ImportJob" WHERE "id" = ${jobId} FOR UPDATE`;
  if (!job) throw new WorkspaceAccessError(404, "RESOURCE_NOT_FOUND", "Importação não encontrada.");
  if (job.status === "IMPORTING") {
    if (job.updatedAt.getTime() > Date.now() - IMPORT_COMMIT_LEASE_MS) throw new WorkspaceAccessError(409, "INVALID_IMPORT_STATE", "A criação dos alunos está em andamento. Aguarde para alterar a revisão.");
    await tx.importJob.update({ where: { id: jobId }, data: { status: "PARTIAL", processingStep: "IDLE", previewValidated: false, errorCode: "COMMIT_INTERRUPTED", safeErrorMessage: "A confirmação anterior foi interrompida. Os alunos concluídos foram preservados." } });
  }
}
