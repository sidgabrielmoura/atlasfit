import { z } from "zod";

// Only presentation fields are retained in client responses.
export const gymWorkoutCardSchema = z.object({
  id: z.string(), name: z.string(), goal: z.string(), difficulty: z.string(), duration: z.string(),
  muscleGroupLabel: z.string().nullable(), restBetweenExercises: z.string().nullable(), creatorId: z.string().nullable(),
  allowRepsModification: z.boolean(), allowCompleteView: z.boolean(), allowSkipExercises: z.boolean(),
  creator: z.object({ id: z.string(), name: z.string().nullable(), image: z.string().nullable() }).nullable(),
  exercises: z.array(z.object({ id: z.string(), exerciseId: z.string(), sets: z.number(), reps: z.string(), rest: z.string(),
    load: z.string().nullable(), description: z.string().nullable(), methodType: z.string(), methodConfig: z.unknown(), groupId: z.string().nullable(), allowRepsModification: z.boolean().nullable(),
    exercise: z.object({ name: z.string(), muscleGroup: z.object({ name: z.string() }) }) })),
  _count: z.object({ exercises: z.number() }),
});
export type GymWorkoutCard = z.infer<typeof gymWorkoutCardSchema>;
export const gymWorkoutStudentOption = z.object({ memberId: z.string(), userId: z.string(), name: z.string(), registrationNumber: z.string().nullable() });
export const gymWorkoutExerciseOption = z.object({ id: z.string(), name: z.string(), muscleGroup: z.string() });
export const gymWorkoutStudentOptionsResponse = z.object({ data: z.array(gymWorkoutStudentOption), page: z.number(), hasNext: z.boolean() });
export const gymWorkoutExerciseOptionsResponse = z.object({ data: z.array(gymWorkoutExerciseOption), page: z.number(), hasNext: z.boolean() });
export function gymWorkoutResponseError(body: unknown, fallback: string) {
  const parsed = z.object({ error: z.object({ message: z.string() }) }).safeParse(body);
  return parsed.success ? parsed.data.error.message : fallback;
}
