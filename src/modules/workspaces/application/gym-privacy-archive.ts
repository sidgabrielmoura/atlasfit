import { createHash } from "node:crypto";
import { storageService } from "@/lib/storage.service";
import { validateStorageKey } from "@/lib/storage-access";
import { WorkspaceAccessError } from "../domain/types";

export const PRIVACY_ARCHIVE_MAX_BYTES = 100 * 1024 * 1024;
/** Embedded bytes remain usable after links expire. Never fetch arbitrary external URLs. */
export async function collectGymArchiveAttachments(workspaceId: string, sources: { key: string; resourceId: string; name: string }[], maximumBytes = PRIVACY_ARCHIVE_MAX_BYTES) {
  if (!Number.isSafeInteger(maximumBytes) || maximumBytes < 0 || maximumBytes > PRIVACY_ARCHIVE_MAX_BYTES) throw new WorkspaceAccessError(413, "EXPORT_LIMIT_EXCEEDED", "Limite do pacote inválido.");
  const unique = [...new Map(sources.map(source => [source.key, source])).values()];
  if (unique.length > 1000) throw new WorkspaceAccessError(413, "EXPORT_LIMIT_EXCEEDED", "Pacote acima de 1.000 anexos. Solicite exportação assistida em lotes.");
  let total = 0; const attachments: { resourceId: string; name: string; mimeType: string; size: number; sha256: string; encoding: "base64"; content: string }[] = [];
  for (const source of unique) {
    validateStorageKey(source.key);
    if (!source.key.startsWith(`workspace/${workspaceId}/`)) throw new WorkspaceAccessError(409, "TENANT_MISMATCH", "Anexo legado fora do escopo desta academia.");
    if (!/^workspace\/[^/]+\/(files\/|students\/[^/]+\/progress\/|chat\/)/.test(source.key)) throw new WorkspaceAccessError(409, "STORAGE_RECONCILIATION_REQUIRED", "Anexo fora dos caminhos privados reconhecidos. Reconcilie antes de exportar.");
    const object = await storageService.getObjectStream(source.key);
    if (!object.body || !object.contentLength || !Number.isSafeInteger(object.contentLength) || total + object.contentLength > maximumBytes) throw new WorkspaceAccessError(413, "EXPORT_LIMIT_EXCEEDED", "Pacote acima de 100 MB ou anexo sem tamanho verificável. Solicite exportação assistida em lotes.");
    const chunks: Buffer[] = []; let size = 0;
    for await (const chunk of object.body as AsyncIterable<Uint8Array>) {
      const bytes = Buffer.from(chunk); size += bytes.length;
      if (total + size > maximumBytes || size > object.contentLength) throw new WorkspaceAccessError(413, "EXPORT_LIMIT_EXCEEDED", "Tamanho do anexo mudou durante a exportação.");
      chunks.push(bytes);
    }
    if (size !== object.contentLength) throw new WorkspaceAccessError(409, "STORAGE_RECONCILIATION_REQUIRED", "Anexo incompleto. Tente novamente após reconciliar o armazenamento.");
    total += size; const buffer = Buffer.concat(chunks);
    attachments.push({ resourceId: source.resourceId, name: source.name, mimeType: object.contentType || "application/octet-stream", size, sha256: createHash("sha256").update(buffer).digest("hex"), encoding: "base64", content: buffer.toString("base64") });
  }
  return { attachments, attachmentManifest: { encoding: "base64", totalFiles: attachments.length, totalBytes: total, complete: true } };
}
