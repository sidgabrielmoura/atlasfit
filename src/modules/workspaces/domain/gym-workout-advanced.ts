import { z } from "zod";
import { gymWorkoutExerciseSchema } from "./gym-workout-exercise";
const id = z.string().min(1).max(128);
export const gymExerciseMethodSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("NONE"), config: z.null() }).strict(),
  z.object({ type: z.literal("DROPSET"), config: z.object({ drops: z.number().int().min(1).max(20), reduction: z.number().min(1).max(100) }).strict() }).strict(),
  z.object({ type: z.literal("REST_PAUSE"), config: z.object({ pause: z.number().int().min(1).max(600), rounds: z.number().int().min(1).max(20) }).strict() }).strict(),
]);
export const gymAdvancedGroupSchema = z.object({ id, type: z.enum(["BISET", "TRISET", "CIRCUIT"]), config: z.object({ rounds: z.number().int().min(1).max(100).optional(), restBetweenRounds: z.number().int().min(0).max(3600).optional() }).strict().nullable() }).strict();
export const gymAdvancedExerciseSchema = gymWorkoutExerciseSchema.omit({ exerciseId: true }).extend({ id, order: z.number().int().min(0).max(99), method: gymExerciseMethodSchema, groupId: id.nullable(), allowRepsModification: z.boolean().nullable() }).strict();
export const gymAdvancedEditSchema = z.object({ workspaceId: id, revision: z.string().regex(/^[a-f0-9]{64}$/), exercises: z.array(gymAdvancedExerciseSchema).min(1).max(100), groups: z.array(gymAdvancedGroupSchema).max(50) }).strict().superRefine((input, context) => {
  if (new Set(input.exercises.map(row => row.id)).size !== input.exercises.length || new Set(input.exercises.map(row => row.order)).size !== input.exercises.length || new Set(input.groups.map(row => row.id)).size !== input.groups.length) context.addIssue({ code: "custom", message: "IDs e ordens devem ser únicos." });
  for (const row of input.exercises) if (row.groupId && !input.groups.some(group => group.id === row.groupId)) context.addIssue({ code: "custom", message: "Grupo não encontrado." });
  for (const group of input.groups) if (input.exercises.filter(row => row.groupId === group.id).length < (group.type === "TRISET" ? 3 : 2)) context.addIssue({ code: "custom", message: `${group.type} exige ${group.type === "TRISET" ? 3 : 2} exercícios.` });
});
export type GymAdvancedEdit = z.infer<typeof gymAdvancedEditSchema>;
