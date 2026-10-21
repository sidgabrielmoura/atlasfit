import { createHash } from "node:crypto";
import prisma from "@/lib/prisma";
import { storageService } from "@/lib/storage.service";
import { serializableTransaction, type GymTransactionClient } from "./transaction";
import { assertSuperadmin } from "./gym-provisioning";
import { gymAttachmentKeys } from "./gym-storage";
import { WorkspaceAccessError } from "../domain/types";

async function references(tx: GymTransactionClient, workspaceId: string) {
  const workspace = await tx.workspace.findUnique({ where: { id: workspaceId }, select: { type: true, logoKey: true, logoUrl: true, watermarkKey: true, watermarkUrl: true, workoutCoverKey: true, workoutCoverUrl: true } });
  if (workspace?.type !== "GYM") throw new WorkspaceAccessError(404, "WORKSPACE_NOT_FOUND", "Academia não encontrada.");
  const keys = new Map<string, string>();
  for (const [key, url, target] of [[workspace.logoKey, workspace.logoUrl, "logo"], [workspace.watermarkKey, workspace.watermarkUrl, "watermark"], [workspace.workoutCoverKey, workspace.workoutCoverUrl, "workout_cover"]]) for (const objectKey of key ? [key] : gymAttachmentKeys(url)) keys.set(objectKey!, target!);
  const files = await tx.studentFile.findMany({ where: { workspaceId, type: "file" }, select: { objectKey: true, url: true } });
  const photos = await tx.studentProgressPhoto.findMany({ where: { workspaceId }, select: { objectKey: true, photoUrl: true } });
  let unmapped = 0;
  for (const [rows, target] of [[files, "student_file"], [photos.map(photo => ({ objectKey: photo.objectKey, url: photo.photoUrl })), "progress_photo"]] as const) for (const row of rows) {
    const key = row.objectKey || gymAttachmentKeys(row.url)[0];
    if (key) keys.set(key, target); else unmapped++;
  }
  const messages = await tx.message.findMany({ where: { conversation: { workspaceId } }, select: { attachment: true } });
  for (const message of messages) for (const key of gymAttachmentKeys(message.attachment)) keys.set(key, "chat_attachment");
  for (const [key, target] of keys) {
    const suffix = key.slice(`workspace/${workspaceId}/`.length);
    const compatible = target === "student_file" ? /^files\/[^/]+$/.test(suffix) : target === "progress_photo" ? /^students\/[^/]+\/progress\/[^/]+$/.test(suffix) : target === "chat_attachment" ? /^chat\/[^/]+\/[^/]+$/.test(suffix) : new RegExp(`^${target === "logo" ? "logos" : target === "watermark" ? "watermarks" : "covers"}/[^/]+$`).test(suffix);
    if (!compatible || !key.startsWith(`workspace/${workspaceId}/`) || key.split("/").some(part => !part || part === "." || part === "..") || /[\\\x00-\x1f%?#]/.test(key)) throw new WorkspaceAccessError(409, "TENANT_MISMATCH", "Objeto histórico vinculado fora do escopo e finalidade da academia.");
  }
  const entries = [...keys.entries()].sort(([a], [b]) => a.localeCompare(b));
  return { keys, unmapped, fingerprint: createHash("sha256").update(JSON.stringify(entries)).digest("hex") };
}

/** Inventory may exceed a downgraded license; it measures existing data without deleting it. */
export async function reconcileGymStorage(workspaceId: string, adminUserId: string, afterKey?: string) {
  await assertSuperadmin(prisma, adminUserId);
  const snapshot = await references(prisma, workspaceId);
  const keys = [...snapshot.keys.keys()].sort().filter(key => !afterKey || key > afterKey).slice(0, 51);
  const batch = keys.slice(0, 50);
  const verified = await Promise.all(batch.map(async key => {
    const object = await storageService.getObjectMetadata(key);
    if (!object.size || !Number.isSafeInteger(object.size) || !object.contentType) throw new WorkspaceAccessError(409, "STORAGE_RECONCILIATION_REQUIRED", "Objeto histórico sem metadados verificáveis.");
    return { key, size: object.size, mimeType: object.contentType.split(";")[0].trim().toLowerCase() };
  }));
  return serializableTransaction(async tx => {
    await assertSuperadmin(tx, adminUserId);
    const current = await references(tx, workspaceId);
    if (current.fingerprint !== snapshot.fingerprint) throw new WorkspaceAccessError(409, "CONFIGURATION_CONFLICT", "Os vínculos de arquivos mudaram. Recarregue a conferência.");
    for (const item of verified) {
      const existing = await tx.gymStorageObject.findUnique({ where: { objectKey: item.key }, select: { workspaceId: true } });
      if (existing && existing.workspaceId !== workspaceId) throw new WorkspaceAccessError(409, "TENANT_MISMATCH", "Inventário histórico associado a outra academia.");
      await tx.gymStorageObject.upsert({ where: { objectKey: item.key }, create: { objectKey: item.key, workspaceId, actorUserId: adminUserId, target: current.keys.get(item.key)!, size: BigInt(item.size), status: "FINALIZED" }, update: { size: BigInt(item.size), status: "FINALIZED", expiresAt: null } });
      await tx.studentFile.updateMany({ where: { workspaceId, OR: [{ objectKey: item.key }, { url: { in: [`/api/storage/file?key=${encodeURIComponent(item.key)}`, `/api/storage/file?key=${item.key}`] } }] }, data: { objectKey: item.key, size: item.size, mimeType: item.mimeType } });
      await tx.studentProgressPhoto.updateMany({ where: { workspaceId, OR: [{ objectKey: item.key }, { photoUrl: { in: [`/api/storage/file?key=${encodeURIComponent(item.key)}`, `/api/storage/file?key=${item.key}`] } }] }, data: { objectKey: item.key, size: item.size, mimeType: item.mimeType } });
    }
    await tx.auditLog.create({ data: { userId: adminUserId, action: "GYM_STORAGE_RECONCILED", entity: "WORKSPACE", entityId: workspaceId, metadata: { verifiedObjects: verified.length, unmappedObjects: current.unmapped, hasMore: keys.length > 50 } } });
    return { verifiedObjects: verified.length, unmappedObjects: current.unmapped, hasMore: keys.length > 50, nextAfterKey: keys.length > 50 ? batch.at(-1) ?? null : null };
  });
}
export async function assertGymObjectUnreferenced(tx: GymTransactionClient, workspaceId: string, objectKey: string) {
  if ((await references(tx, workspaceId)).keys.has(objectKey)) throw new WorkspaceAccessError(409, "INVALID_STATUS", "Remova o vínculo do recurso antes de excluir o objeto armazenado.");
}

/** Freezes expired/orphan uploads before deletion so a concurrent finalization cannot resurrect them. */
export async function deleteGymStorageOrphan(workspaceId: string, objectKey: string, adminUserId: string) {
  await serializableTransaction(async tx => {
    await assertSuperadmin(tx, adminUserId);
    const row = await tx.gymStorageObject.findUnique({ where: { objectKey } });
    if (!row || row.workspaceId !== workspaceId) throw new WorkspaceAccessError(404, "FILE_NOT_FOUND", "Objeto não encontrado no inventário desta academia.");
    if (row.status === "RESERVED" && row.expiresAt && row.expiresAt > new Date()) throw new WorkspaceAccessError(409, "INVALID_STATUS", "O upload ainda está em andamento.");
    await assertGymObjectUnreferenced(tx, workspaceId, objectKey);
    await tx.gymStorageObject.update({ where: { objectKey }, data: { status: "FINALIZED", expiresAt: null } });
    await tx.auditLog.create({ data: { userId: adminUserId, action: "GYM_STORAGE_ORPHAN_DELETION_CLAIMED", entity: "STORAGE_OBJECT", entityId: objectKey, metadata: { phase: "EXTERNAL_REQUESTED", retainedBytes: row.size.toString() } } });
  });
  await storageService.deleteObject(objectKey);
  return serializableTransaction(async tx => {
    await assertSuperadmin(tx, adminUserId);
    await assertGymObjectUnreferenced(tx, workspaceId, objectKey);
    const removed = await tx.gymStorageObject.deleteMany({ where: { workspaceId, objectKey } });
    if (removed.count) await tx.auditLog.create({ data: { userId: adminUserId, action: "GYM_STORAGE_ORPHAN_DELETED", entity: "STORAGE_OBJECT", entityId: objectKey, metadata: { phase: "EXTERNAL_CONFIRMED" } } });
    return { deleted: true };
  });
}
