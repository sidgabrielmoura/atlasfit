import { Prisma } from "@prisma/client";
import { z } from "zod";
import { authorizeGymStudent } from "./student-authority";
import { serializableTransaction } from "./transaction";
import { WorkspaceAccessError } from "../domain/types";

const text = z.string().trim().max(2000).nullable().optional();
const metric = z.preprocess(v => v === "" || v === undefined ? null : typeof v === "string" ? Number(v) : v, z.number().finite().positive().max(1000).nullable());
export const gymHealthIntakeSchema = z.object({ objective: text, experienceLevel: text, medicalConditions: text, bio: text, weight: metric, height: metric }).strict();
export async function readGymHealthProfile(workspaceId: string, memberId: string, actorUserId: string) {
  return serializableTransaction(async tx => {
    const member = await authorizeGymStudent(workspaceId, memberId, actorUserId, "health.read.assigned", { allowSelf: true, allowGuardian: true }, tx);
    const progress = await tx.studentProgress.findFirst({ where: { workspaceId, studentId: member.userId, date: { lte: new Date() } }, orderBy: [{ date: "desc" }, { id: "desc" }], select: { weight: true, height: true, bodyFat: true, muscleMass: true } });
    return { intake: member.studentProfile?.healthData ?? {}, onboardedAt: member.studentProfile?.onboardedAt ?? null, physicalData: progress ?? { weight: null, height: null, bodyFat: null, muscleMass: null } };
  });
}
export async function saveGymHealthProfile(workspaceId: string, memberId: string, actorUserId: string, raw: unknown, onboarding = false) {
  const parsed = gymHealthIntakeSchema.safeParse(raw);
  if (!parsed.success) throw new WorkspaceAccessError(400, "INVALID_REQUEST", "Confira os dados de saúde e as medidas.");
  return serializableTransaction(async tx => {
    const member = await authorizeGymStudent(workspaceId, memberId, actorUserId, "health.manage.assigned", { allowSelf: true }, tx);
    const { weight, height, ...intake } = parsed.data;
    const previous = member.studentProfile?.healthData;
    const healthData = { ...(previous && typeof previous === "object" && !Array.isArray(previous) ? previous : {}), ...intake } as Prisma.InputJsonObject;
    await tx.gymStudentProfile.upsert({ where: { memberId }, create: { memberId, workspaceId, healthData, onboardedAt: onboarding ? new Date() : null }, update: { healthData, ...(onboarding ? { onboardedAt: new Date() } : {}) } });
    if (weight !== null || height !== null) await tx.studentProgress.create({ data: { workspaceId, studentId: member.userId, weight, height } });
    await tx.auditLog.create({ data: { userId: actorUserId, action: onboarding ? "GYM_HEALTH_ONBOARDING_COMPLETED" : "GYM_HEALTH_PROFILE_UPDATED", entity: "GYM_STUDENT_PROFILE", entityId: memberId } });
    return { success: true };
  });
}
