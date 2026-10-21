import { randomUUID } from "node:crypto";
import prisma from "@/lib/prisma";
import { storageService } from "@/lib/storage.service";
import type { Prisma } from "@prisma/client";
import { WorkspaceAccessError } from "@/modules/workspaces/domain/types";
import { validateUploadedFile } from "./upload.service";
import { IMPORT_LIMITS } from "./config/limits";

export async function persistImportSource(data: Prisma.ImportSourceUncheckedCreateInput, workspaceId: string) {
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "ImportJob" WHERE id=${data.importJobId} AND "workspaceId"=${workspaceId} FOR UPDATE`;
    const job = await tx.importJob.findUnique({ where: { id: data.importJobId, workspaceId }, select: { status: true } });
    if (!job || !["UPLOADED", "FAILED"].includes(job.status)) throw new WorkspaceAccessError(409, "INVALID_STATUS", "Importação já iniciada ou encerrada.");
    const existing = await tx.importSource.aggregate({ where: { importJobId: data.importJobId }, _count: { _all: true }, _sum: { sizeBytes: true } });
    if (existing._count._all >= IMPORT_LIMITS.maxImagesPerJob + 1 || (existing._sum.sizeBytes || 0) + (data.sizeBytes || 0) > IMPORT_LIMITS.maxBatchSize) throw new WorkspaceAccessError(413, "INVALID_REQUEST", "Fontes acima do limite permitido para esta importação.");
    return tx.importSource.create({ data });
  });
}

export async function uploadImportSource(file: File, jobId: string, workspaceId: string, sortOrder: number) {
  if (file.size > IMPORT_LIMITS.maxPdfSize) throw new WorkspaceAccessError(413, "INVALID_REQUEST", "Arquivo acima do limite permitido.");
  const buffer = Buffer.from(await file.arrayBuffer());
  const validation = validateUploadedFile(file.name, file.type, file.size, buffer);
  if (!validation.isValid) throw new WorkspaceAccessError(400, "INVALID_REQUEST", validation.error || "Arquivo inválido.");
  const type = validation.extension === ".pdf" ? "PDF" : [".csv", ".xlsx"].includes(validation.extension) ? "SPREADSHEET" : "IMAGE";
  const storageKey = `workspace/${workspaceId}/imports/${jobId}/${randomUUID()}`;
  await storageService.uploadBuffer(storageKey, buffer, validation.mimeType || "application/octet-stream");
  try {
    return await persistImportSource({ importJobId: jobId, type, status: "PENDING", originalName: file.name, mimeType: validation.mimeType, extension: validation.extension, sizeBytes: file.size, sha256: validation.sha256, sortOrder, storageKey }, workspaceId);
  } catch (error) {
    await storageService.deleteObject(storageKey).catch(() => console.error("[IMPORT_STORAGE]", { code: "UPLOAD_CLEANUP_REQUIRED" }));
    throw error;
  }
}
