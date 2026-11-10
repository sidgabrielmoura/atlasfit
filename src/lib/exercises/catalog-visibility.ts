import type { Prisma } from "@prisma/client";

/** Requests attached to a workout become catalogue items only after official publication. */
export const publishedExerciseScope: Prisma.ExerciseWhereInput = {
  OR: [{ isOfficial: true }, { isWorkoutSpecific: false }],
};
export const publicExerciseCatalog: Prisma.ExerciseWhereInput = {
  status: { not: "REJECTED" },
  AND: [publishedExerciseScope, { OR: [{ isOfficial: true }, { status: { in: ["READY", "APPROVED"] } }] }],
};
