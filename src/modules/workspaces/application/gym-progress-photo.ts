import { z } from "zod";
import { serializableTransaction } from "./transaction";
import { authorizeGymStudent } from "./student-authority";
import { finalizeGymStorage, gymStoredObjectMetadata } from "./gym-storage";
import { STORAGE_IMAGE_TYPES } from "@/lib/storage-upload-policy";
import { WorkspaceAccessError } from "../domain/types";

const input = z.object({ workspaceId: z.string().min(1).max(100), studentMemberId: z.string().min(1).max(100), actorUserId: z.string().min(1).max(100), objectKey: z.string().min(1).max(1024), photoUrl: z.string().max(2048) }).strict();
export async function attachGymProgressPhoto(raw: z.input<typeof input>) {
  const parsed = input.safeParse(raw);
  if (!parsed.success) throw new WorkspaceAccessError(400, "INVALID_REQUEST", "Dados da foto inválidos.");
  const data = parsed.data;
  const student = await authorizeGymStudent(data.workspaceId, data.studentMemberId, data.actorUserId, "health.manage.assigned", { allowSelf: true });
  const folder = `students/${student.userId}/progress`;
  if (!data.photoUrl.startsWith("/api/storage/file?") || new URL(data.photoUrl, "https://atlasfit.invalid").searchParams.get("key") !== data.objectKey) throw new WorkspaceAccessError(400, "INVALID_URL", "Foto incompatível com o upload.");
  const metadata = await gymStoredObjectMetadata(data.objectKey, data.workspaceId, folder, 10 * 1024 * 1024, STORAGE_IMAGE_TYPES);
  return serializableTransaction(async tx => {
    const current = await authorizeGymStudent(data.workspaceId, data.studentMemberId, data.actorUserId, "health.manage.assigned", { allowSelf: true }, tx);
    if (await tx.studentProgressPhoto.findFirst({ where: { objectKey: data.objectKey }, select: { id: true } })) throw new WorkspaceAccessError(409, "INVALID_REQUEST", "Foto já vinculada.");
    await finalizeGymStorage(tx, { workspaceId: data.workspaceId, actorUserId: data.actorUserId, objectKey: data.objectKey, target: "progress_photo", size: metadata.size, studentUserId: current.userId });
    const photo = await tx.studentProgressPhoto.create({ data: { workspaceId: data.workspaceId, studentId: current.userId, uploadedBy: data.actorUserId, photoUrl: `/api/storage/file?key=${encodeURIComponent(data.objectKey)}`, objectKey: data.objectKey, ...metadata } });
    await tx.auditLog.create({ data: { userId: data.actorUserId, action: "GYM_PROGRESS_PHOTO_ATTACHED", entity: "STUDENT_PROGRESS_PHOTO", entityId: photo.id } });
    return photo;
  });
}
