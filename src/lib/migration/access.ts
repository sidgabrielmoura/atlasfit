import prisma from "@/lib/prisma";
import { requirePersonalWorkspaceAccess } from "@/modules/workspaces/application/guard";
import { WorkspaceAccessError } from "@/modules/workspaces/domain/types";

export async function assertPersonalImportJobAccess(jobId: string, recordId?: string) {
  const job = await prisma.importJob.findUnique({ where: { id: jobId }, select: { id: true, workspaceId: true, schemaVersion: true } });
  if (!job) throw new WorkspaceAccessError(404, "RESOURCE_NOT_FOUND", "Importação não encontrada.");
  await requirePersonalWorkspaceAccess({ workspaceId: job.workspaceId, capability: "students.manage" });
  if (job.schemaVersion === "gym-import-v2") throw new WorkspaceAccessError(403, "FORBIDDEN_RESOURCE", "Prévia de academia não pode ser alterada pelo importador PERSONAL.");
  if (recordId && !await prisma.importRecord.findFirst({ where: { id: recordId, importJobId: job.id }, select: { id: true } })) throw new WorkspaceAccessError(404, "RESOURCE_NOT_FOUND", "Registro não pertence à importação informada.");
  return job;
}
