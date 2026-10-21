import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { WorkspaceAccessError } from "../domain/types";
import { gymWorkoutFieldsSchema, gymTemplateListSchema, gymWorkoutAssignmentBody, gymWorkoutIdentity, parseGymWorkout } from "../domain/gym-workout-contract";
import { hasStudentMembership } from "../domain/student-membership";
import { assertActorAuthority } from "./actor-authority";
import { authorizeGymStudent } from "./student-authority";
import { getGymUnitAccess } from "./gym-unit-access";
import { serializableTransaction, type GymTransactionClient } from "./transaction";

export const gymWorkoutSelect = {
  id: true, name: true, goal: true, difficulty: true, duration: true, workspaceId: true, studentId: true, creatorId: true,
  muscleGroupLabel: true, restBetweenExercises: true, dayOfWeek: true, isActive: true, createdAt: true,
  allowRepsModification: true, allowCompleteView: true, allowSkipExercises: true,
  creator: { select: { id: true, name: true, image: true } },
  exercises: { orderBy: [{ order: "asc" }, { id: "asc" }], select: {
    id: true, exerciseId: true, sets: true, reps: true, rest: true, load: true, description: true, order: true,
    methodType: true, methodConfig: true, groupId: true, allowRepsModification: true,
    exercise: { select: { id: true, name: true, videoUrl: true, muscleGroup: { select: { name: true } } } },
  } },
  _count: { select: { exercises: true } },
} satisfies Prisma.WorkoutSelect;
export type GymWorkoutRow = Prisma.WorkoutGetPayload<{ select: typeof gymWorkoutSelect }>;
type Fields = z.infer<typeof gymWorkoutFieldsSchema>;
// The catalogue is global in the existing model. Unapproved personal requests are not gym assets.
export const gymExerciseVisibility: Prisma.ExerciseWhereInput = { status: { not: "REJECTED" }, OR: [{ isOfficial: true }, { status: { in: ["READY", "APPROVED"] } }] };
async function assertGym(tx: GymTransactionClient, workspaceId: string) {
  if (!await tx.workspace.findFirst({ where: { id: workspaceId, type: "GYM" }, select: { id: true } })) throw new WorkspaceAccessError(404, "WORKSPACE_NOT_FOUND", "Academia não encontrada.");
}
async function validateExercises(tx: GymTransactionClient, rows: readonly { exerciseId: string }[]) {
  const ids = [...new Set(rows.map(row => row.exerciseId))];
  if (await tx.exercise.count({ where: { ...gymExerciseVisibility, id: { in: ids } } }) !== ids.length) throw new WorkspaceAccessError(400, "EXERCISE_UNAVAILABLE", "Há exercícios indisponíveis no catálogo compartilhado.");
}
function exerciseData(rows: Fields["exercises"]) {
  return rows.map((row, index) => ({ exerciseId: row.exerciseId, sets: row.sets, reps: row.reps, rest: row.rest,
    load: row.load ?? null, description: row.description ?? null, order: row.order ?? index }));
}
async function updateUsage(tx: GymTransactionClient, ids: readonly string[]) {
  for (const id of [...new Set(ids)].sort()) await tx.exercise.update({ where: { id }, data: { usage: await tx.workoutExercise.count({ where: { exerciseId: id } }) } });
}
async function audit(tx: GymTransactionClient, actorUserId: string, workoutId: string, action: string) {
  await tx.auditLog.create({ data: { userId: actorUserId, entity: "WORKOUT", entityId: workoutId, action, severity: "info" } });
}
export async function authorizeTemplateMutation(tx: GymTransactionClient, workspaceId: string, actorUserId: string, templateId: string, deleting = false) {
  await assertGym(tx, workspaceId);
  await assertActorAuthority(tx, workspaceId, actorUserId, "workouts.manage.assigned");
  const template = await tx.workout.findFirst({ where: { id: templateId, workspaceId, studentId: null }, include: { exerciseGroups: true, exercises: true } });
  if (!template) throw new WorkspaceAccessError(404, "TEMPLATE_NOT_FOUND", "Modelo não encontrado nesta academia.");
  if (template.creatorId !== actorUserId) {
    try { await assertActorAuthority(tx, workspaceId, actorUserId, "workspace.manage"); }
    catch (error) {
      if (error instanceof WorkspaceAccessError && error.statusCode === 403) throw new WorkspaceAccessError(403, deleting ? "FORBIDDEN_TEMPLATE_DELETE" : "FORBIDDEN_TEMPLATE_EDIT", "Somente o autor ou a gestão podem alterar este modelo.");
      throw error;
    }
  }
  return template;
}

export async function listGymWorkoutTemplates(raw: unknown) {
  const input = parseGymWorkout(gymTemplateListSchema, raw);
  return prisma.$transaction(async tx => {
    await getGymUnitAccess(tx, input.workspaceId, input.actorUserId, "workouts.read");
    const where: Prisma.WorkoutWhereInput = { workspaceId: input.workspaceId, studentId: null, isActive: true,
      ...(input.goal && input.goal !== "ALL" ? { goal: input.goal } : {}), ...(input.difficulty && input.difficulty !== "ALL" ? { difficulty: input.difficulty } : {}),
      ...(input.search ? { OR: [{ name: { contains: input.search, mode: "insensitive" } }, { muscleGroupLabel: { contains: input.search, mode: "insensitive" } }, { goal: { contains: input.search, mode: "insensitive" } }] } : {}) };
    const total = await tx.workout.count({ where });
    const data = await tx.workout.findMany({ where, select: gymWorkoutSelect, take: input.limit, skip: (input.page - 1) * input.limit, orderBy: [{ createdAt: "desc" }, { id: "desc" }] });
    return { data, meta: { total, page: input.page, limit: input.limit, totalPages: Math.ceil(total / input.limit) } };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
}
export async function createGymWorkoutTemplate(workspaceId: string, actorUserId: string, raw: unknown) {
  parseGymWorkout(gymWorkoutIdentity.omit({ templateId: true }), { workspaceId, actorUserId });
  const fields = parseGymWorkout(gymWorkoutFieldsSchema, raw);
  return serializableTransaction(async tx => {
    await assertGym(tx, workspaceId); await assertActorAuthority(tx, workspaceId, actorUserId, "workouts.manage.assigned");
    await validateExercises(tx, fields.exercises);
    const { exercises, ...base } = fields;
    const workout = await tx.workout.create({ data: { ...base, workspaceId, creatorId: actorUserId, studentId: null, exercises: { create: exerciseData(exercises) } }, select: gymWorkoutSelect });
    await updateUsage(tx, exercises.map(row => row.exerciseId));
    await audit(tx, actorUserId, workout.id, "GYM_TEMPLATE_CREATED"); return workout;
  });
}
export async function updateGymWorkoutTemplate(rawIdentity: unknown, rawFields: unknown) {
  const input = parseGymWorkout(gymWorkoutIdentity, rawIdentity);
  const fields = parseGymWorkout(gymWorkoutFieldsSchema.partial().refine(value => Object.keys(value).length > 0), rawFields);
  return serializableTransaction(async tx => {
    const existing = await authorizeTemplateMutation(tx, input.workspaceId, input.actorUserId, input.templateId);
    if (!existing.isActive) throw new WorkspaceAccessError(409, "TEMPLATE_INACTIVE", "Modelo desativado.");
    if (fields.exercises) {
      await validateExercises(tx, fields.exercises);
      if (existing.exerciseGroups.length || existing.exercises.some(row => row.methodType !== "NONE" || row.methodConfig !== null || row.allowRepsModification !== null)) throw new WorkspaceAccessError(409, "ADVANCED_EDITOR_REQUIRED", "Este modelo usa métodos avançados. A substituição simplificada dos exercícios não está disponível.");
      await tx.workoutExercise.deleteMany({ where: { workoutId: existing.id } });
    }
    const { exercises, ...base } = fields;
    const workout = await tx.workout.update({ where: { id: existing.id }, data: { ...base, ...(exercises ? { exercises: { create: exerciseData(exercises) } } : {}) }, select: gymWorkoutSelect });
    if (exercises) await updateUsage(tx, [...existing.exercises.map(row => row.exerciseId), ...exercises.map(row => row.exerciseId)]);
    await audit(tx, input.actorUserId, existing.id, "GYM_TEMPLATE_UPDATED"); return workout;
  });
}
export async function deleteGymWorkoutTemplate(raw: unknown) {
  const input = parseGymWorkout(gymWorkoutIdentity, raw);
  return serializableTransaction(async tx => {
    const existing = await authorizeTemplateMutation(tx, input.workspaceId, input.actorUserId, input.templateId, true);
    if (existing.isActive) {
      await tx.workout.update({ where: { id: existing.id }, data: { isActive: false } });
      await audit(tx, input.actorUserId, existing.id, "GYM_TEMPLATE_DEACTIVATED");
    }
    return { success: true };
  });
}
const assignmentCommand = gymWorkoutAssignmentBody.safeExtend({ actorUserId: z.string().min(1).max(128) });
export async function assignGymStudentWorkout(raw: unknown) {
  const input = parseGymWorkout(assignmentCommand, raw);
  return serializableTransaction(async tx => {
    const student = await authorizeGymStudent(input.workspaceId, input.studentMemberId, input.actorUserId, "workouts.manage.assigned", {}, tx);
    if (!student.isActive || !hasStudentMembership(student) || !student.studentProfile || student.studentProfile.status !== "ACTIVE") throw new WorkspaceAccessError(409, "STUDENT_INACTIVE", "Aluno sem vínculo e cadastro ativos.");
    if (student.unitId && !await tx.gymUnit.findFirst({ where: { id: student.unitId, workspaceId: input.workspaceId, isActive: true }, select: { id: true } })) throw new WorkspaceAccessError(409, "UNIT_INACTIVE", "Unidade do aluno indisponível.");
    const prefix = `GYM_WORKOUT_ASSIGNED:${input.workspaceId}:${createHash("sha256").update(input.idempotencyKey).digest("hex")}:`;
    const { idempotencyKey, ...request } = input;
    const action = prefix + createHash("sha256").update(JSON.stringify(request)).digest("hex");
    const previous = await tx.auditLog.findFirst({ where: { userId: input.actorUserId, entity: "WORKOUT", action: { startsWith: prefix } } });
    if (previous) {
      if (previous.action !== action) throw new WorkspaceAccessError(409, "IDEMPOTENCY_CONFLICT", "Solicitação já utilizada com outros dados.");
      if (!previous.entityId) throw new WorkspaceAccessError(409, "ASSIGNMENT_RECONCILIATION_REQUIRED", "Prescrição anterior exige reconciliação.");
      const result = await tx.workout.findFirst({ where: { id: previous.entityId, workspaceId: input.workspaceId, studentId: student.userId }, select: gymWorkoutSelect });
      if (!result) throw new WorkspaceAccessError(409, "ASSIGNMENT_RECONCILIATION_REQUIRED", "Prescrição anterior exige reconciliação.");
      return result;
    }
    const source = input.templateWorkoutId ? await tx.workout.findFirst({ where: { id: input.templateWorkoutId, workspaceId: input.workspaceId, studentId: null, isActive: true }, include: { exerciseGroups: true, exercises: { orderBy: [{ order: "asc" }, { id: "asc" }] } } }) : null;
    if (input.templateWorkoutId && !source) throw new WorkspaceAccessError(404, "TEMPLATE_NOT_FOUND", "Modelo ativo não encontrado nesta academia.");
    const fields = input.customWorkout;
    const rows = source?.exercises || fields?.exercises;
    if (!rows?.length) throw new WorkspaceAccessError(409, "EMPTY_WORKOUT", "A ficha precisa de exercícios.");
    await validateExercises(tx, rows);
    const base = source || fields;
    if (!base) throw new WorkspaceAccessError(400, "INVALID_WORKOUT", "Ficha não informada.");
    const workout = await tx.workout.create({ data: { workspaceId: input.workspaceId, studentId: student.userId, creatorId: input.actorUserId,
      name: base.name, goal: base.goal, difficulty: base.difficulty, duration: base.duration, muscleGroupLabel: base.muscleGroupLabel ?? null,
      restBetweenExercises: base.restBetweenExercises, dayOfWeek: input.dayOfWeek, allowRepsModification: base.allowRepsModification,
      allowCompleteView: base.allowCompleteView, allowSkipExercises: base.allowSkipExercises } });
    if (source) {
      const groupIds = new Map<string, string>();
      for (const group of source.exerciseGroups) {
        const copy = await tx.workoutExerciseGroup.create({ data: { workoutId: workout.id, type: group.type, config: group.config === null ? Prisma.DbNull : group.config } });
        groupIds.set(group.id, copy.id);
      }
      for (const row of source.exercises) {
        const groupId = row.groupId ? groupIds.get(row.groupId) : null;
        if (row.groupId && !groupId) throw new WorkspaceAccessError(409, "TEMPLATE_RECONCILIATION_REQUIRED", "Grupo de exercícios incompatível com o modelo.");
        await tx.workoutExercise.create({ data: { workoutId: workout.id, exerciseId: row.exerciseId, sets: row.sets, reps: row.reps, rest: row.rest,
          load: row.load, description: row.description, order: row.order, methodType: row.methodType,
          methodConfig: row.methodConfig === null ? Prisma.DbNull : row.methodConfig, groupId, allowRepsModification: row.allowRepsModification } });
      }
    } else await tx.workoutExercise.createMany({ data: exerciseData(fields?.exercises || []).map(row => ({ ...row, workoutId: workout.id })) });
    await updateUsage(tx, rows.map(row => row.exerciseId));
    await audit(tx, input.actorUserId, workout.id, action);
    return tx.workout.findUniqueOrThrow({ where: { id: workout.id }, select: gymWorkoutSelect });
  });
}
export async function readGymStudentWorkouts(workspaceId: string, studentMemberId: string, actorUserId: string | undefined, logs = false, limit = 20) {
  const input = parseGymWorkout(z.object({ workspaceId: z.string().min(1).max(128), studentMemberId: z.string().min(1).max(128), actorUserId: z.string().min(1).max(128), limit: z.number().int().min(1).max(50) }).strict(), { workspaceId, studentMemberId, actorUserId, limit });
  return prisma.$transaction(async tx => {
    const student = await authorizeGymStudent(input.workspaceId, input.studentMemberId, input.actorUserId, "workouts.read", {}, tx);
    if (logs) return tx.workoutLog.findMany({ where: { workspaceId: input.workspaceId, studentId: student.userId, workout: { workspaceId: input.workspaceId, studentId: student.userId } }, take: input.limit, orderBy: [{ completedAt: "desc" }, { id: "desc" }], select: { id: true, completedAt: true, workout: { select: { id: true, name: true, goal: true } } } });
    return tx.workout.findMany({ where: { workspaceId: input.workspaceId, studentId: student.userId, isActive: true }, select: gymWorkoutSelect, take: input.limit, orderBy: [{ dayOfWeek: "asc" }, { createdAt: "desc" }, { id: "desc" }] });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
}
