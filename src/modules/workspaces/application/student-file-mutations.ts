import { z } from "zod";
import type { UploadStudentFileInput } from "./gym-assessment-service";
import { serializableTransaction } from "./transaction";
import { authorizeGymStudent } from "./student-authority";
import { WorkspaceAccessError } from "../domain/types";
import { storageService } from "@/lib/storage.service";
import { validateStorageKey } from "@/lib/storage-access";
import { STORAGE_FILE_TYPES } from "@/lib/storage-upload-policy";
import { finalizeGymStorage } from "./gym-storage";

const identifier = z.string().trim().min(1).max(100);
const inputSchema = z.object({ workspaceId: identifier, studentMemberId: identifier, uploadedByUserId: identifier, name: z.string().trim().min(1).max(200), category: z.enum(["exames", "dieta_treino", "outros"]), type: z.enum(["file", "link"]), url: z.string().trim().min(1).max(2048), fileName: z.string().max(200).nullable().optional(), fileSizeFormatted: z.string().max(100).nullable().optional(), sizeInBytes: z.number().int().positive().safe().nullable().optional(), mimeType: z.string().max(150).nullable().optional(), objectKey: z.string().max(1024).nullable().optional(), notes: z.string().trim().max(4000).nullable().optional() }).strict();

export async function attachGymStudentFile(rawInput: UploadStudentFileInput) {
  const parsed = inputSchema.safeParse(rawInput);
  if (!parsed.success) throw new WorkspaceAccessError(400, "INVALID_REQUEST", "Dados de arquivo inválidos.");
  const input = parsed.data;
  const capability = "health.manage.assigned";
  await authorizeGymStudent(input.workspaceId, input.studentMemberId, input.uploadedByUserId, capability);
  let size: number | null = null;
  let mimeType: string | null = null;
  let url = input.url;
  if (input.type === "link") {
    const link = URL.canParse(url) ? new URL(url) : null;
    if (!link || link.protocol !== "https:" || link.username || link.password || input.objectKey || input.sizeInBytes || input.mimeType) throw new WorkspaceAccessError(400, "INVALID_URL", "Use um link HTTPS ou o fluxo de upload, sem metadados incompatíveis.");
    url = link.href;
  } else {
    const key = input.objectKey;
    if (!key) throw new WorkspaceAccessError(400, "INVALID_OBJECT_KEY", "Informe o objeto do upload.");
    validateStorageKey(key);
    if (!key.startsWith(`workspace/${input.workspaceId}/files/`) || key.split("/").length !== 4) throw new WorkspaceAccessError(403, "FORBIDDEN_RESOURCE", "Objeto incompatível com o workspace e tipo de arquivo.");
    if (!url.startsWith("/api/storage/file?") || new URL(url, "https://atlasfit.invalid").searchParams.get("key") !== key) throw new WorkspaceAccessError(400, "INVALID_URL", "URL incompatível com o objeto enviado.");
    const metadata = await storageService.getObjectMetadata(key).catch((error: unknown) => {
      if (error instanceof Error && (error.name === "NoSuchKey" || error.name === "NotFound")) throw new WorkspaceAccessError(404, "FILE_NOT_FOUND", "Objeto do upload não encontrado.");
      throw error;
    });
    if (metadata.size === undefined || !Number.isSafeInteger(metadata.size) || metadata.size <= 0 || metadata.size > 20 * 1024 * 1024) throw new WorkspaceAccessError(413, "FILE_SIZE_EXCEEDS_LIMIT", "Objeto vazio, sem tamanho verificável ou acima de 20 MB.");
    mimeType = metadata.contentType?.split(";")[0].trim().toLowerCase() || null;
    if (!mimeType || !STORAGE_FILE_TYPES.includes(mimeType)) throw new WorkspaceAccessError(400, "INVALID_REQUEST", "Tipo do objeto não permitido.");
    size = metadata.size;
    url = `/api/storage/file?key=${encodeURIComponent(key)}`;
  }
  return serializableTransaction(async tx => {
    const student = await authorizeGymStudent(input.workspaceId, input.studentMemberId, input.uploadedByUserId, capability, {}, tx);
    if (input.objectKey) {
      const existing = await tx.studentFile.findFirst({ where: { objectKey: input.objectKey }, select: { id: true } });
      if (existing) throw new WorkspaceAccessError(409, "INVALID_REQUEST", "Objeto já vinculado a um arquivo; utilize o registro existente.");
      await finalizeGymStorage(tx, { workspaceId: input.workspaceId, actorUserId: input.uploadedByUserId, objectKey: input.objectKey, target: "student_file", size: size!, studentUserId: student.userId });
    }
    const file = await tx.studentFile.create({ data: { workspaceId: input.workspaceId, studentId: student.userId, uploadedBy: input.uploadedByUserId, name: input.name, category: input.category, type: input.type, url, objectKey: input.objectKey || null, fileName: input.type === "file" ? input.fileName || null : null, fileSize: size === null ? "Link" : `${(size / 1024 / 1024).toFixed(2)} MB`, size, mimeType, notes: input.notes || null } });
    await tx.auditLog.create({ data: { userId: input.uploadedByUserId, action: `GYM_STUDENT_FILE_ATTACHED:${file.id}:${input.category}`, entity: "STUDENT_FILE", entityId: file.id } });
    return file;
  });
}
