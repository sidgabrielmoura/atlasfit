import { z } from "zod";
import { serializableTransaction } from "./transaction";
import { authorizeGymStudent } from "./student-authority";
import { studentWorkoutCompletionSchema } from "@/lib/student-workout-scope";
import { calculateStreaks } from "@/lib/streak-helper";
import { WorkspaceAccessError } from "../domain/types";
const feedbackSchema = z.object({ energy: z.number().finite().min(0).max(100), fatigue: z.number().finite().min(0).max(100), humor: z.number().finite().min(0).max(100) }).strict();
export async function saveGymDailyFeedback(workspaceId: string, memberId: string, actorUserId: string, raw: unknown) {
  const parsed = feedbackSchema.safeParse(raw); if (!parsed.success) throw new WorkspaceAccessError(400, "INVALID_REQUEST", "Feedback inválido.");
  return serializableTransaction(async tx => {
    const member = await authorizeGymStudent(workspaceId, memberId, actorUserId, "workouts.manage.assigned", { allowSelf: true }, tx);
    if (member.userId !== actorUserId) throw new WorkspaceAccessError(403, "FORBIDDEN_RESOURCE", "O feedback deve ser registrado pelo próprio titular.");
    const now = new Date(); const start = new Date(now); start.setHours(0, 0, 0, 0); const end = new Date(start); end.setDate(end.getDate() + 1);
    const existing = await tx.dailyFeedback.findFirst({ where: { workspaceId, studentId: member.userId, date: { gte: start, lt: end } } });
    const row = existing ? await tx.dailyFeedback.update({ where: { id: existing.id }, data: parsed.data }) : await tx.dailyFeedback.create({ data: { ...parsed.data, workspaceId, studentId: member.userId, date: now } });
    await tx.auditLog.create({ data: { userId: actorUserId, action: "GYM_DAILY_FEEDBACK_RECORDED", entity: "DAILY_FEEDBACK", entityId: row.id } });
    return { success: true, ...(existing ? { updated: row, action: "update" } : { created: row, action: "create" }) };
  });
}
export async function recordGymWorkoutCompletion(workspaceId: string, memberId: string, actorUserId: string, raw: unknown) {
  const parsed = studentWorkoutCompletionSchema.safeParse(raw); if (!parsed.success) throw new WorkspaceAccessError(400, "INVALID_REQUEST", "Registro de treino inválido.");
  return serializableTransaction(async tx => {
    const member = await authorizeGymStudent(workspaceId, memberId, actorUserId, "workouts.manage.assigned", { allowSelf: true }, tx);
    if (member.userId !== actorUserId) throw new WorkspaceAccessError(403, "FORBIDDEN_RESOURCE", "Execução deve ser registrada pelo próprio titular.");
    const { workoutId, ...values } = parsed.data;
    const workout = await tx.workout.findFirst({ where: { id: workoutId, workspaceId, studentId: member.userId }, select: { dayOfWeek: true, exercises: { select: { id: true } } } });
    if (!workout) throw new WorkspaceAccessError(404, "RESOURCE_NOT_FOUND", "Treino indisponível neste vínculo.");
    const ids = new Set(workout.exercises.map(e => e.id));
    if ([values.loads, values.reps, values.restTimes, values.skippedExercises].some(records => records && Object.keys(records).some(id => !ids.has(id)))) throw new WorkspaceAccessError(400, "INVALID_REQUEST", "Exercício fora deste treino.");
    const now = new Date(); const start = new Date(now); start.setHours(0, 0, 0, 0); const end = new Date(start); end.setDate(end.getDate() + 1);
    if (member.canDoAnyWorkoutDay === false && ((workout.dayOfWeek != null && workout.dayOfWeek !== now.getDay()) || await tx.workoutLog.count({ where: { workspaceId, studentId: member.userId, workoutId, completedAt: { gte: start, lt: end } } }))) throw new WorkspaceAccessError(403, "FORBIDDEN_RESOURCE", "Execução fora do dia permitido ou já registrada hoje.");
    const log = await tx.workoutLog.create({ data: { ...values, workoutId, workspaceId, studentId: member.userId, completedAt: now } });
    const history = await tx.workoutLog.findMany({ where: { workspaceId, studentId: member.userId }, select: { completedAt: true } });
    const streaks = calculateStreaks(history.map(row => row.completedAt));
    const week = new Date(start); week.setDate(week.getDate() - (week.getDay() || 7) + 1);
    const frequency = await tx.workout.count({ where: { workspaceId, studentId: member.userId, dayOfWeek: { not: null } } });
    const progress = Math.min(100, Math.round(history.filter(row => row.completedAt >= week).length / (frequency || 4) * 100));
    await tx.workspaceMember.update({ where: { id: member.id }, data: { streak: streaks.streak, bestStreak: streaks.bestStreak, progress, lastActive: now } });
    await tx.auditLog.create({ data: { userId: actorUserId, action: "GYM_WORKOUT_COMPLETION_RECORDED", entity: "WORKOUT_LOG", entityId: log.id } });
    return { success: true, log, ...streaks, progress };
  });
}
