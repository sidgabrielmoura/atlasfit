import prisma from "@/lib/prisma";
import { requireWorkspaceAccess } from "@/modules/workspaces/application/guard";
import { WorkspaceAccessError } from "@/modules/workspaces/domain/types";

export async function assertImportJobAccess(jobId: string, recordId?: string) {
  const job = await prisma.importJob.findUnique({ where: { id: jobId }, select: { id: true, workspaceId: true, schemaVersion: true } });
  if (!job) throw new WorkspaceAccessError(404, "RESOURCE_NOT_FOUND", "Importação não encontrada.");
  await requireWorkspaceAccess({ workspaceId: job.workspaceId, capability: "students.manage" });
  if (recordId && !await prisma.importRecord.findFirst({ where: { id: recordId, importJobId: job.id }, select: { id: true } })) throw new WorkspaceAccessError(404, "RESOURCE_NOT_FOUND", "Registro não pertence à importação informada.");
  return job;
}

export const assertPersonalImportJobAccess = assertImportJobAccess;

