import type { Prisma } from "@prisma/client";
import { z } from "zod";

/** GYM templates are prescription sources; PERSONAL's shared workouts remain visible. */
export function studentWorkoutScope(workspaceId: string, workspaceType: "GYM" | "PERSONAL", userId: string): Prisma.WorkoutWhereInput {
  return workspaceType === "GYM"
    ? { workspaceId, studentId: userId, isActive: true }
    : { workspaceId, OR: [{ studentId: userId }, { studentId: null }] };
}

const seriesValue = z.union([
  z.string().max(80),
  z.number().transform(v => String(v)),
]);

const series = z.record(z.string().min(1).max(128), z.array(seriesValue).max(100)).refine(value => Object.keys(value).length <= 200);
const skippedOrPostponedExerciseSchema = z.object({
  reason: z.string().max(2000).transform(r => r.trim() || "Exercício pulado").default("Exercício pulado"),
  status: z.enum(["SKIPPED", "POSTPONED"]).default("SKIPPED"),
  postponed: z.boolean().optional(),
  completed: z.boolean().optional(),
  originalOrder: z.number().int().optional(),
  executedOrder: z.number().int().optional(),
  exercisesDoneBeforeCount: z.number().int().optional(),
  exercisesDoneBeforeNames: z.array(z.string().max(100)).max(50).optional(),
});

export const studentWorkoutCompletionSchema = z.object({
  workoutId: z.string().min(1).max(128),
  feedback: z.string().max(4000).optional(),
  effortScore: z.number().int().min(1).max(5).nullable().optional(),
  loads: series.optional(),
  reps: series.optional(),
  restTimes: series.optional(),
  skippedExercises: z.record(
    z.string().min(1).max(128),
    skippedOrPostponedExerciseSchema
  ).refine(value => Object.keys(value).length <= 200).optional(),
}).strict();
