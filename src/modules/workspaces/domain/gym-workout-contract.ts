import { z } from "zod";
import { WorkspaceAccessError } from "./types";
import { gymWorkoutExerciseSchema } from "./gym-workout-exercise";
export { gymWorkoutExerciseSchema } from "./gym-workout-exercise";

const id = z.string().trim().min(1).max(128);
const exercises = z.array(gymWorkoutExerciseSchema).min(1).max(100).refine(rows => new Set(rows.map((row, index) => row.order ?? index)).size === rows.length, "Ordem dos exercícios deve ser única.");
export const gymWorkoutFieldsSchema = z.object({
  name: z.string().trim().min(1).max(200),
  goal: z.string().trim().min(1).max(100),
  difficulty: z.string().trim().min(1).max(80),
  duration: z.string().trim().min(1).max(80),
  muscleGroupLabel: z.string().trim().max(200).nullable().optional(),
  restBetweenExercises: z.string().trim().min(1).max(80).optional(),
  allowRepsModification: z.boolean().optional(),
  allowCompleteView: z.boolean().optional(),
  allowSkipExercises: z.boolean().optional(),
  exercises,
}).strict();
export const gymTemplateCreateBody = gymWorkoutFieldsSchema.extend({ workspaceId: id }).strict();
export const gymTemplateUpdateBody = gymWorkoutFieldsSchema.partial().extend({ workspaceId: id }).strict().refine(value => Object.keys(value).length > 1, "Informe uma alteração.");
export const gymTemplateListSchema = z.object({
  workspaceId: id, actorUserId: id,
  search: z.string().trim().max(200).optional(), goal: z.string().trim().max(100).optional(), difficulty: z.string().trim().max(80).optional(),
  page: z.number().int().min(1).max(10_000).default(1), limit: z.number().int().min(1).max(50).default(20),
}).strict();
export const gymWorkoutAssignmentBody = z.object({
  workspaceId: id, studentMemberId: id, templateWorkoutId: id.optional(),
  idempotencyKey: z.string().regex(/^[\w:.-]{8,128}$/),
  customWorkout: gymWorkoutFieldsSchema.optional(),
  dayOfWeek: z.number().int().min(0).max(6).nullable().default(null),
}).strict().refine(value => Boolean(value.templateWorkoutId) !== Boolean(value.customWorkout), "Informe exatamente um modelo ou uma ficha própria.");
export const gymWorkoutIdentity = z.object({ workspaceId: id, actorUserId: id, templateId: id }).strict();
export function parseGymWorkout<T>(schema: z.ZodType<T>, raw: unknown): T {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) throw new WorkspaceAccessError(400, "INVALID_WORKOUT", "Dados do treino inválidos. Confira os campos, exercícios e limites.");
  return parsed.data;
}
