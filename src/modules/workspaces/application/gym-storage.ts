import prisma from "@/lib/prisma";
import { storageService } from "@/lib/storage.service";
import { serializableTransaction, type GymTransactionClient } from "./transaction";
import { assertGymOperationalWorkspace } from "./gym-license";
import { WorkspaceAccessError } from "../domain/types";
import { assertActorAuthority } from "./actor-authority";
import { authorizeGymStudent } from "./student-authority";
import { resolveNavigationRoles } from "../domain/access-roles";
import { assertChatWorkspace } from "./chat-authority";

type StorageInput = { workspaceId: string; actorUserId: string; objectKey: string; target: string; size: number; studentUserId?: string };
async function assertUploader(tx: GymTransactionClient, input: StorageInput) {
  await assertGymOperationalWorkspace(input.workspaceId, tx);
  const folders: Record<string, string> = { logo: "logos", watermark: "watermarks", workout_cover: "covers", chat_attachment: `chat/${input.actorUserId}`, student_file: "files", progress_photo: `students/${input.studentUserId}/progress` };
  const folder = folders[input.target];
  if (!folder || !input.objectKey.startsWith(`workspace/${input.workspaceId}/${folder}/`) || input.objectKey.split("/").some(part => !part || part === "." || part === "..") || /[\\\x00-\x1f%?#]/.test(input.objectKey)) throw new WorkspaceAccessError(403, "FORBIDDEN_RESOURCE", "Objeto incompatível com o operador e finalidade.");
  if (["logo", "watermark", "workout_cover"].includes(input.target)) return assertActorAuthority(tx, input.workspaceId, input.actorUserId, "workspace.manage");
  if (input.target === "chat_attachment") {
    await assertChatWorkspace(input.workspaceId, input.actorUserId, tx);
    const member = await tx.workspaceMember.findUnique({ where: { userId_workspaceId: { workspaceId: input.workspaceId, userId: input.actorUserId } }, include: { roleGrants: true } });
    const units = await tx.gymUnit.findMany({ where: { workspaceId: input.workspaceId, isActive: true }, select: { id: true } });
    if (!member?.isActive || !resolveNavigationRoles(member.role, member.roleGrants, units.map(unit => unit.id)).length) throw new WorkspaceAccessError(403, "NOT_A_MEMBER", "Vínculo operacional ativo necessário para anexos de chat.");
    return;
  }
  if (!input.studentUserId) throw new WorkspaceAccessError(400, "INVALID_REQUEST", "Identifique o aluno do upload.");
  const member = await tx.workspaceMember.findUnique({ where: { userId_workspaceId: { userId: input.studentUserId, workspaceId: input.workspaceId } }, select: { id: true } });
  if (!member) throw new WorkspaceAccessError(404, "STUDENT_NOT_FOUND", "Aluno não encontrado.");
  await authorizeGymStudent(input.workspaceId, member.id, input.actorUserId, "health.manage.assigned", { allowSelf: input.target === "progress_photo" }, tx);
}

export function gymAttachmentKeys(attachment: unknown): string[] {
  const keys: string[] = [];
  const visit = (value: unknown) => {
    if (typeof value === "string" && value.startsWith("/api/storage/file?")) {
      const key = new URL(value, "https://atlasfit.invalid").searchParams.get("key");
      if (key) keys.push(key);
    } else if (Array.isArray(value)) value.forEach(visit);
    else if (value && typeof value === "object") Object.values(value).forEach(visit);
  };
  visit(attachment);
  return [...new Set(keys)];
}

/** Verified ledger covers every asset kind. Unmeasured history cannot imply free space. */
export async function gymStorageUsage(tx: GymTransactionClient, workspaceId: string, excludingKey?: string) {
  // An expired URL can leave an uploaded orphan. Only confirmed deletion releases usage.
  const ledger = await tx.gymStorageObject.findMany({ where: { workspaceId }, select: { objectKey: true, size: true } });
  const keys = new Set(ledger.map(row => row.objectKey));
  const files = await tx.studentFile.findMany({ where: { workspaceId, type: "file" }, select: { objectKey: true, size: true } });
  const photos = await tx.studentProgressPhoto.findMany({ where: { workspaceId }, select: { objectKey: true, size: true } });
  let bytes = ledger.reduce((sum, row) => sum + (row.objectKey === excludingKey ? BigInt(0) : row.size), BigInt(0));
  for (const row of [...files, ...photos]) {
    if (row.objectKey === excludingKey || (row.objectKey && keys.has(row.objectKey))) continue;
    if (row.size === null) throw new WorkspaceAccessError(409, "STORAGE_RECONCILIATION_REQUIRED", "Há arquivos históricos sem tamanho conferido. Reconcilie o armazenamento antes de novos uploads.");
    bytes += BigInt(row.size);
  }
  const brand = await tx.workspace.findUniqueOrThrow({ where: { id: workspaceId }, select: { logoKey: true, watermarkKey: true, workoutCoverKey: true, logoUrl: true, watermarkUrl: true, workoutCoverUrl: true } });
  const messages = await tx.message.findMany({ where: { conversation: { workspaceId } }, select: { attachment: true } });
  const referencedKeys = [...Object.values(brand).flatMap(value => typeof value === "string" ? value.startsWith("workspace/") ? [value] : gymAttachmentKeys(value) : []), ...messages.flatMap(row => gymAttachmentKeys(row.attachment))];
  if (referencedKeys.some(key => key !== excludingKey && !keys.has(key))) throw new WorkspaceAccessError(409, "STORAGE_RECONCILIATION_REQUIRED", "Imagens de marca ou anexos históricos de chat precisam de conferência de armazenamento.");
  return bytes;
}

export async function assertGymStorageCapacity(tx: GymTransactionClient, workspaceId: string, size: number, excludingKey?: string) {
  if (!Number.isSafeInteger(size) || size <= 0) throw new WorkspaceAccessError(400, "INVALID_REQUEST", "Tamanho de objeto inválido.");
  const workspace = await assertGymOperationalWorkspace(workspaceId, tx);
  const usage = await gymStorageUsage(tx, workspaceId, excludingKey);
  if (usage + BigInt(size) > BigInt(workspace.subscription!.storageLimitMb) * BigInt(1024 * 1024)) throw new WorkspaceAccessError(409, "STORAGE_EXCEEDED", "O objeto excede o armazenamento contratado, incluindo uploads em andamento.");
}

export async function reserveGymStorage(input: StorageInput) {
  return serializableTransaction(async tx => {
    await assertUploader(tx, input);
    if (!input.objectKey.startsWith(`workspace/${input.workspaceId}/`)) throw new WorkspaceAccessError(403, "FORBIDDEN_RESOURCE", "Objeto de outra academia.");
    await assertGymStorageCapacity(tx, input.workspaceId, input.size);
    const { studentUserId: _studentUserId, ...record } = input;
    const now = new Date();
    const reservation = await tx.gymStorageObject.create({ data: { ...record, size: BigInt(input.size), createdAt: now, expiresAt: new Date(now.getTime() + 12 * 60_000) } });
    await tx.auditLog.create({ data: { userId: input.actorUserId, action: "GYM_STORAGE_RESERVED", entity: "WORKSPACE", entityId: input.workspaceId } });
    return reservation;
  });
}
export function releaseGymStorageReservation(objectKey: string, actorUserId: string) {
  return serializableTransaction(async tx => {
    const deleted = await tx.gymStorageObject.deleteMany({ where: { objectKey, actorUserId, status: "RESERVED" } });
    if (deleted.count) await tx.auditLog.create({ data: { userId: actorUserId, action: "GYM_STORAGE_RESERVATION_RELEASED", entity: "STORAGE_OBJECT", entityId: objectKey } });
  });
}

/** Metadata is obtained outside the transaction; all license, identity and quota checks are repeated inside. */
export async function gymStoredObjectMetadata(objectKey: string, workspaceId: string, folder: string, maxBytes: number, permittedTypes: readonly string[]) {
  if (!objectKey.startsWith(`workspace/${workspaceId}/${folder}/`) || /[\\\x00-\x1f%?#]/.test(objectKey) || objectKey.split("/").some(part => !part || part === "." || part === "..")) throw new WorkspaceAccessError(403, "FORBIDDEN_RESOURCE", "Objeto incompatível com a academia e finalidade.");
  const metadata = await storageService.getObjectMetadata(objectKey);
  const mimeType = metadata.contentType?.split(";")[0].trim().toLowerCase();
  if (!metadata.size || !Number.isSafeInteger(metadata.size) || metadata.size > maxBytes) throw new WorkspaceAccessError(413, "FILE_SIZE_EXCEEDS_LIMIT", "Objeto vazio, sem tamanho conferido ou acima do limite.");
  if (!mimeType || !permittedTypes.includes(mimeType)) throw new WorkspaceAccessError(400, "INVALID_REQUEST", "Tipo do objeto não permitido.");
  return { size: metadata.size, mimeType };
}
export async function finalizeGymStorage(tx: GymTransactionClient, input: StorageInput) {
  await assertUploader(tx, input);
  const previous = await tx.gymStorageObject.findUnique({ where: { objectKey: input.objectKey } });
  if (previous && (previous.workspaceId !== input.workspaceId || previous.actorUserId !== input.actorUserId || previous.target !== input.target)) throw new WorkspaceAccessError(403, "FORBIDDEN_RESOURCE", "O upload pertence a outro operador ou finalidade.");
  if (previous?.status === "FINALIZED") throw new WorkspaceAccessError(409, "INVALID_REQUEST", "Objeto já finalizado; utilize o recurso existente.");
  if (previous && previous.size !== BigInt(input.size)) throw new WorkspaceAccessError(409, "INVALID_REQUEST", "O tamanho conferido não corresponde ao upload reservado.");
  await assertGymStorageCapacity(tx, input.workspaceId, input.size, input.objectKey);
  const { studentUserId: _studentUserId, ...record } = input;
  await tx.gymStorageObject.upsert({ where: { objectKey: input.objectKey }, create: { ...record, size: BigInt(input.size), status: "FINALIZED" }, update: { size: BigInt(input.size), status: "FINALIZED", expiresAt: null } });
}

/** Only releases durable usage after storage confirms physical deletion. Safe to retry. */
export async function deleteGymStoredObject(objectKey: string, workspaceId: string, actorUserId: string, studentUserId?: string) {
  if (!objectKey.startsWith(`workspace/${workspaceId}/`)) throw new WorkspaceAccessError(403, "FORBIDDEN_RESOURCE", "Objeto de outra academia.");
  const record = await prisma.gymStorageObject.findUnique({ where: { objectKey } });
  if (!record || record.workspaceId !== workspaceId) throw new WorkspaceAccessError(409, "STORAGE_RECONCILIATION_REQUIRED", "Objeto sem inventário conferido.");
  if (record.actorUserId === actorUserId) await assertUploader(prisma, { workspaceId, actorUserId, objectKey, target: record.target, size: Number(record.size), studentUserId });
  else await assertActorAuthority(prisma, workspaceId, actorUserId, "workspace.manage");
  await storageService.deleteObject(objectKey);
  return serializableTransaction(async tx => {
    await tx.gymStorageObject.deleteMany({ where: { objectKey, workspaceId } });
    await tx.auditLog.create({ data: { userId: actorUserId, action: "GYM_STORAGE_OBJECT_DELETED", entity: "STORAGE_OBJECT", entityId: objectKey } });
  });
}

export async function isGymWorkspace(workspaceId: string) {
  return (await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { type: true } }))?.type === "GYM";
}
