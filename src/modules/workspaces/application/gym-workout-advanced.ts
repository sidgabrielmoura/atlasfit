import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { gymAdvancedEditSchema } from "../domain/gym-workout-advanced";
import { gymWorkoutIdentity, parseGymWorkout } from "../domain/gym-workout-contract";
import { WorkspaceAccessError } from "../domain/types";
import { authorizeTemplateMutation, gymWorkoutSelect } from "./gym-workout-commands";
import { serializableTransaction } from "./transaction";
type Template = Awaited<ReturnType<typeof authorizeTemplateMutation>>;
function revision(template: Template) {
  return createHash("sha256").update(JSON.stringify({ updatedAt: template.updatedAt, isActive: template.isActive, exercises: [...template.exercises].sort((a, b) => a.id.localeCompare(b.id)), groups: [...template.exerciseGroups].sort((a, b) => a.id.localeCompare(b.id)) })).digest("hex");
}
function mergeConfig(previous: Prisma.JsonValue | null, next: Record<string, number> | null) {
  return next === null ? Prisma.DbNull : { ...(previous && typeof previous === "object" && !Array.isArray(previous) ? previous : {}), ...next };
}
export async function readGymAdvancedTemplate(raw: unknown) {
  const input = parseGymWorkout(gymWorkoutIdentity, raw);
  return serializableTransaction(async tx => {
    const template = await authorizeTemplateMutation(tx, input.workspaceId, input.actorUserId, input.templateId);
    if (!template.isActive) throw new WorkspaceAccessError(409, "TEMPLATE_INACTIVE", "Modelo desativado.");
    return { revision: revision(template), exercises: [...template.exercises].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id)).map(({ id, sets, reps, rest, load, description, order, methodType, methodConfig, groupId, allowRepsModification }) => ({ id, sets, reps, rest, load, description, order, methodType, methodConfig, groupId, allowRepsModification })), groups: template.exerciseGroups.map(({ id, type, config }) => ({ id, type, config })) };
  });
}
export async function editGymAdvancedTemplate(rawIdentity: unknown, raw: unknown) {
  const identity = parseGymWorkout(gymWorkoutIdentity, rawIdentity), input = parseGymWorkout(gymAdvancedEditSchema, raw);
  if (input.workspaceId !== identity.workspaceId) throw new WorkspaceAccessError(403, "WORKSPACE_MISMATCH", "Academia incompatível.");
  return serializableTransaction(async tx => {
    await authorizeTemplateMutation(tx, identity.workspaceId, identity.actorUserId, identity.templateId);
    await tx.$queryRaw`SELECT id FROM "Workout" WHERE id = ${identity.templateId} FOR UPDATE`;
    const existing = await authorizeTemplateMutation(tx, identity.workspaceId, identity.actorUserId, identity.templateId);
    if (!existing.isActive) throw new WorkspaceAccessError(409, "TEMPLATE_INACTIVE", "Modelo desativado.");
    if (revision(existing) !== input.revision) throw new WorkspaceAccessError(409, "WORKOUT_EDIT_CONFLICT", "O modelo foi alterado. Reabra o editor para conferir os dados atuais.");
    // Keep row identities and all previously prescribed copies/history intact.
    if (input.exercises.length !== existing.exercises.length || input.exercises.some(row => !existing.exercises.some(old => old.id === row.id))) throw new WorkspaceAccessError(409, "WORKOUT_ROWS_CHANGED", "Os exercícios não correspondem ao modelo atual.");
    const groupIds = new Map<string, string>();
    for (const group of input.groups) {
      const previous = existing.exerciseGroups.find(row => row.id === group.id);
      if (!previous && !/^new:[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(group.id)) throw new WorkspaceAccessError(400, "INVALID_GROUP", "Grupo não pertence ao modelo.");
      const config = mergeConfig(previous?.type === group.type ? previous.config : null, group.config);
      const persisted = previous ? await tx.workoutExerciseGroup.update({ where: { id: previous.id }, data: { type: group.type, config } }) : await tx.workoutExerciseGroup.create({ data: { workoutId: existing.id, type: group.type, config } });
      groupIds.set(group.id, persisted.id);
    }
    for (const row of input.exercises) {
      const previous = existing.exercises.find(old => old.id === row.id)!;
      const { id, method, groupId, ...fields } = row;
      await tx.workoutExercise.update({ where: { id }, data: { ...fields, methodType: method.type, methodConfig: mergeConfig(previous.methodType === method.type ? previous.methodConfig : null, method.config), groupId: groupId ? groupIds.get(groupId)! : null } });
    }
    await tx.workoutExerciseGroup.deleteMany({ where: { workoutId: existing.id, id: { notIn: [...groupIds.values()] } } });
    const workout = await tx.workout.update({ where: { id: existing.id }, data: { updatedAt: new Date(Math.max(Date.now(), existing.updatedAt.getTime() + 1)) }, select: gymWorkoutSelect });
    await tx.auditLog.create({ data: { userId: identity.actorUserId, entity: "WORKOUT", entityId: existing.id, action: "GYM_TEMPLATE_ADVANCED_UPDATED", severity: "info" } });
    return workout;
  });
}
