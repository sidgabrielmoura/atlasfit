import { z } from "zod";
import { WorkspaceAccessError } from "../domain/types";
import { authorizeGymStudent } from "./student-authority";
import { serializableTransaction } from "./transaction";

const measurement = z.preprocess(value => value === "" || value === undefined ? null : typeof value === "string" ? Number(value) : value, z.number().finite().min(0).max(1000).nullable());
const progressSchema = z.object({
  action: z.literal("logProgress"), weight: measurement, height: measurement, bodyFat: measurement, muscleMass: measurement,
  chest: measurement, waist: measurement, abdomen: measurement, hips: measurement, rightArm: measurement, leftArm: measurement,
  rightForearm: measurement, leftForearm: measurement, rightThigh: measurement, leftThigh: measurement, rightCalf: measurement, leftCalf: measurement,
  notes: z.string().trim().max(2000).nullable().optional(),
}).strict();
export async function recordGymProgress(workspaceId: string, studentMemberId: string, actorUserId: string, raw: unknown) {
  const parsed = progressSchema.safeParse(raw);
  if (!parsed.success) throw new WorkspaceAccessError(400, "INVALID_REQUEST", "Medidas inválidas.");
  const { action: _action, ...values } = parsed.data;
  return serializableTransaction(async tx => {
    const student = await authorizeGymStudent(workspaceId, studentMemberId, actorUserId, "health.manage.assigned", { allowSelf: true }, tx);
    const progress = await tx.studentProgress.create({ data: { ...values, workspaceId, studentId: student.userId } });
    await tx.auditLog.create({ data: { userId: actorUserId, action: "GYM_PROGRESS_RECORDED", entity: "STUDENT_PROGRESS", entityId: progress.id } });
    return progress;
  });
}
export function removeGymEvolutionRecord(workspaceId: string, studentMemberId: string, actorUserId: string, kind: "progress" | "photo", id: string) {
  return serializableTransaction(async tx => {
    const student = await authorizeGymStudent(workspaceId, studentMemberId, actorUserId, "health.manage.assigned", { allowSelf: true }, tx);
    const where = { id, workspaceId, studentId: student.userId };
    const result = kind === "progress" ? await tx.studentProgress.deleteMany({ where }) : await tx.studentProgressPhoto.deleteMany({ where });
    if (result.count) await tx.auditLog.create({ data: { userId: actorUserId, action: kind === "progress" ? "GYM_PROGRESS_REMOVED" : "GYM_PROGRESS_PHOTO_REMOVED", entity: kind === "progress" ? "STUDENT_PROGRESS" : "STUDENT_PROGRESS_PHOTO", entityId: id } });
    return result;
  });
}
