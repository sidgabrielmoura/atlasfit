import { createHash } from "node:crypto";
import { storageService } from "@/lib/storage.service";
import { IMPORT_LIMITS } from "./config/limits";

type Source = { storageKey: string | null; textContent: string | null; sha256: string | null; extension: string | null; mimeType: string | null };

/** Read one source at a time; legacy inline sources remain readable. */
export async function sourceTextContent(source: Source, workspaceId: string, jobId: string) {
  if (!source.storageKey) return source.textContent;
  const prefix = `workspace/${workspaceId}/imports/${jobId}/`;
  if (!source.storageKey.startsWith(prefix) || source.storageKey.includes("..")) throw new Error("IMPORT_SOURCE_SCOPE_MISMATCH");
  const object = await storageService.getObjectStream(source.storageKey);
  if (!object.body || (object.contentLength ?? 0) > IMPORT_LIMITS.maxPdfSize) throw new Error("IMPORT_SOURCE_SIZE_INVALID");
  const chunks: Buffer[] = []; let bytes = 0;
  for await (const chunk of object.body as AsyncIterable<Uint8Array>) {
    bytes += chunk.length;
    if (bytes > IMPORT_LIMITS.maxPdfSize) throw new Error("IMPORT_SOURCE_SIZE_INVALID");
    chunks.push(Buffer.from(chunk));
  }
  const buffer = Buffer.concat(chunks);
  if (!source.sha256 || createHash("sha256").update(buffer).digest("hex") !== source.sha256) throw new Error("IMPORT_SOURCE_HASH_MISMATCH");
  if (source.extension === ".csv") return buffer.toString("utf8");
  if (source.extension === ".xlsx") return `BASE64_XLSX:${buffer.toString("base64")}`;
  return `BASE64_FILE:${source.mimeType || "application/octet-stream"}:${buffer.toString("base64")}`;
}
