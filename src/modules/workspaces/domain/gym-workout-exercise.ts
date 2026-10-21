import { z } from "zod";
/** Shared browser/server prescription fields, without server response dependencies. */
export const gymWorkoutExerciseSchema = z.object({
  exerciseId: z.string().trim().min(1).max(128),
  sets: z.number().int().min(1).max(100),
  reps: z.string().trim().min(1).max(100),
  rest: z.string().trim().min(1).max(80),
  load: z.string().trim().max(100).nullable().optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  order: z.number().int().min(0).max(99).optional(),
}).strict();
