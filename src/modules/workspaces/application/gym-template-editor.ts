import { Prisma } from "@prisma/client";
import { z } from "zod";
import { gymWorkoutFieldsSchema, gymWorkoutIdentity, parseGymWorkout } from "../domain/gym-workout-contract";
import { gymWorkoutExerciseSchema } from "../domain/gym-workout-exercise";
import { gymAdvancedGroupSchema, gymExerciseMethodSchema } from "../domain/gym-workout-advanced";
import { WorkspaceAccessError } from "../domain/types";
import { assertActorAuthority } from "./actor-authority";
import { authorizeTemplateMutation, gymExerciseVisibility } from "./gym-workout-commands";
import { getGymUnitAccess } from "./gym-unit-access";
import { serializableTransaction, type GymTransactionClient } from "./transaction";

const editorExercise = gymWorkoutExerciseSchema.extend({
  id: z.string().min(1).max(128).optional(),
  methodType: z.enum(["NONE", "DROPSET", "REST_PAUSE"]).default("NONE"),
  methodConfig: z.record(z.string(), z.unknown()).nullable().optional(),
  groupId: z.string().min(1).max(128).nullable().optional(),
  allowRepsModification: z.boolean().nullable().optional(),
}).strip().superRefine((row, ctx) => {
  const config = row.methodType === "DROPSET" ? { drops: row.methodConfig?.drops, reduction: row.methodConfig?.reduction } : row.methodType === "REST_PAUSE" ? { pause: row.methodConfig?.pause, rounds: row.methodConfig?.rounds } : null;
  if (!gymExerciseMethodSchema.safeParse({ type: row.methodType, config }).success) {
    ctx.addIssue({ code: "custom", message: "Método de exercício inválido." });
  }
});
export const gymTemplateEditorSchema = gymWorkoutFieldsSchema.extend({
  workspaceId: z.string().trim().min(1).max(128),
  exercises: z.array(editorExercise).min(1).max(100),
  groups: z.array(gymAdvancedGroupSchema).max(50).default([]),
}).superRefine((input, ctx) => {
  const ids = new Set(input.groups.map(group => group.id));
  if (ids.size !== input.groups.length) ctx.addIssue({ code: "custom", message: "Grupos duplicados." });
  for (const row of input.exercises) if (row.groupId && !ids.has(row.groupId)) ctx.addIssue({ code: "custom", message: "Grupo indisponível." });
  for (const group of input.groups) if (input.exercises.filter(row => row.groupId === group.id).length < (group.type === "TRISET" ? 3 : 2)) ctx.addIssue({ code: "custom", message: "Grupo incompleto." });
});
const detailInclude = {
  exercises: { orderBy: [{ order: "asc" }, { id: "asc" }], include: { exercise: { include: { muscleGroup: true, muscleGroups: true } }, group: true } },
  exerciseGroups: true,
} satisfies Prisma.WorkoutInclude;

async function readTemplate(tx: GymTransactionClient, workspaceId: string, actorUserId: string, templateId: string) {
  await getGymUnitAccess(tx, workspaceId, actorUserId, "workouts.read");
  const template = await tx.workout.findFirst({ where: { id: templateId, workspaceId, studentId: null, isActive: true }, include: detailInclude });
  if (!template || template.workspaceId !== workspaceId || template.studentId !== null) throw new WorkspaceAccessError(404, "TEMPLATE_NOT_FOUND", "Modelo não encontrado nesta academia.");
  return template;
}
export function readGymTemplateEditor(raw: unknown) {
  const input = parseGymWorkout(gymWorkoutIdentity, raw);
  return serializableTransaction(tx => readTemplate(tx, input.workspaceId, input.actorUserId, input.templateId));
}
async function updateUsage(tx: GymTransactionClient, exerciseIds: string[]) {
  for (const id of [...new Set(exerciseIds)].sort()) await tx.exercise.update({ where: { id }, data: { usage: await tx.workoutExercise.count({ where: { exerciseId: id } }) } });
}
export function saveGymTemplateEditor(actorUserId: string, raw: unknown, templateId?: string) {
  const input = parseGymWorkout(gymTemplateEditorSchema, raw);
  return serializableTransaction(async tx => {
    await assertActorAuthority(tx, input.workspaceId, actorUserId, "workouts.manage.assigned");
    const existing = templateId ? await authorizeTemplateMutation(tx, input.workspaceId, actorUserId, templateId) : null;
    if (existing && !existing.isActive) throw new WorkspaceAccessError(409, "TEMPLATE_INACTIVE", "Modelo desativado.");
    const exerciseIds = [...new Set(input.exercises.map(row => row.exerciseId))];
    if (await tx.exercise.count({ where: { ...gymExerciseVisibility, id: { in: exerciseIds } } }) !== exerciseIds.length) throw new WorkspaceAccessError(400, "EXERCISE_UNAVAILABLE", "Há exercícios indisponíveis no catálogo.");
    const { workspaceId, exercises, groups, ...fields } = input;
    const workout = existing
      ? await tx.workout.update({ where: { id: existing.id }, data: fields })
      : await tx.workout.create({ data: { ...fields, workspaceId, creatorId: actorUserId, studentId: null } });
    if (existing) {
      await tx.workoutExercise.deleteMany({ where: { workoutId: workout.id } });
      await tx.workoutExerciseGroup.deleteMany({ where: { workoutId: workout.id } });
    }
    const groupIds = new Map<string, string>();
    for (const group of groups) {
      const created = await tx.workoutExerciseGroup.create({ data: { workoutId: workout.id, type: group.type, config: group.config ?? Prisma.DbNull } });
      groupIds.set(group.id, created.id);
    }
    for (const [index, row] of exercises.entries()) {
      await tx.workoutExercise.create({ data: {
        workoutId: workout.id, exerciseId: row.exerciseId, sets: row.sets, reps: row.reps, rest: row.rest,
        load: row.load ?? null, description: row.description ?? null, order: index,
        methodType: row.methodType, methodConfig: row.methodType === "NONE" ? Prisma.DbNull : row.methodConfig as Prisma.InputJsonObject,
        groupId: row.groupId ? groupIds.get(row.groupId)! : null, allowRepsModification: row.allowRepsModification ?? null,
      } });
    }
    await updateUsage(tx, [...exerciseIds, ...(existing?.exercises.map(row => row.exerciseId) ?? [])]);
    await tx.auditLog.create({ data: { userId: actorUserId, entity: "WORKOUT", entityId: workout.id, action: existing ? "GYM_TEMPLATE_UPDATED" : "GYM_TEMPLATE_CREATED" } });
    return readTemplate(tx, workspaceId, actorUserId, workout.id);
  });
}
const duplicateSchema = gymWorkoutIdentity.extend({
  name: z.string().trim().min(1).max(200).optional(), goal: z.string().trim().min(1).max(100).optional(),
  difficulty: z.string().trim().min(1).max(80).optional(), duration: z.string().trim().min(1).max(80).optional(),
  muscleGroupLabel: z.string().trim().max(200).nullable().optional(), restBetweenExercises: z.string().trim().min(1).max(80).optional(),
});
export function duplicateGymTemplate(raw: unknown) {
  const input = parseGymWorkout(duplicateSchema, raw);
  return serializableTransaction(async tx => {
    await assertActorAuthority(tx, input.workspaceId, input.actorUserId, "workouts.manage.assigned");
    const source = await readTemplate(tx, input.workspaceId, input.actorUserId, input.templateId);
    const copy = await tx.workout.create({ data: {
      workspaceId: input.workspaceId, creatorId: input.actorUserId, studentId: null,
      name: input.name ?? `${source.name.slice(0, 190)} (Cópia)`, goal: input.goal ?? source.goal,
      difficulty: input.difficulty ?? source.difficulty, duration: input.duration ?? source.duration,
      muscleGroupLabel: input.muscleGroupLabel === undefined ? source.muscleGroupLabel : input.muscleGroupLabel,
      restBetweenExercises: input.restBetweenExercises ?? source.restBetweenExercises,
      allowRepsModification: source.allowRepsModification, allowCompleteView: source.allowCompleteView, allowSkipExercises: source.allowSkipExercises,
    } });
    const groups = new Map<string, string>();
    for (const group of source.exerciseGroups) {
      const created = await tx.workoutExerciseGroup.create({ data: { workoutId: copy.id, type: group.type, config: group.config ?? Prisma.DbNull } });
      groups.set(group.id, created.id);
    }
    for (const row of source.exercises) {
      if (row.groupId && !groups.has(row.groupId)) throw new WorkspaceAccessError(409, "TEMPLATE_RECONCILIATION_REQUIRED", "Grupo incompatível com o modelo.");
      await tx.workoutExercise.create({ data: { workoutId: copy.id, exerciseId: row.exerciseId, sets: row.sets, reps: row.reps, rest: row.rest, load: row.load, description: row.description, order: row.order, methodType: row.methodType, methodConfig: row.methodConfig ?? Prisma.DbNull, groupId: row.groupId ? groups.get(row.groupId)! : null, allowRepsModification: row.allowRepsModification } });
    }
    await updateUsage(tx, source.exercises.map(row => row.exerciseId));
    await tx.auditLog.create({ data: { userId: input.actorUserId, entity: "WORKOUT", entityId: copy.id, action: "GYM_TEMPLATE_DUPLICATED" } });
    return readTemplate(tx, input.workspaceId, input.actorUserId, copy.id);
  });
}
