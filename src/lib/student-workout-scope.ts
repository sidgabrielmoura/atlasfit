import type { Prisma } from "@prisma/client";
import { z } from "zod";

/** GYM templates are prescription sources; PERSONAL's shared workouts remain visible. */
export function studentWorkoutScope(workspaceId: string, workspaceType: "GYM" | "PERSONAL", userId: string): Prisma.WorkoutWhereInput {
  return workspaceType === "GYM"
    ? { workspaceId, studentId: userId, isActive: true }
    : { workspaceId, OR: [{ studentId: userId }, { studentId: null }] };
}

const series = z.record(z.string().min(1).max(128), z.array(z.string().max(80)).max(100)).refine(value => Object.keys(value).length <= 200);
export const studentWorkoutCompletionSchema = z.object({
  workoutId: z.string().min(1).max(128),
  feedback: z.string().max(4000).optional(),
  effortScore: z.number().int().min(1).max(5).nullable().optional(),
  loads: series.optional(), reps: series.optional(), restTimes: series.optional(),
  skippedExercises: z.record(z.string().min(1).max(128), z.object({ reason: z.string().trim().min(1).max(2000) }).strict()).refine(value => Object.keys(value).length <= 200).optional(),
}).strict();
