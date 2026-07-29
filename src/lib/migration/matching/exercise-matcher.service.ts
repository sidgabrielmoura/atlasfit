import prisma from "@/lib/prisma";
import { slugifyExerciseName } from "../normalization/normalization.service";

export interface ExerciseMatchResult {
  exerciseId: string;
  exerciseName: string;
  isCustom: boolean;
}

/**
 * Matches an extracted exercise name against existing Exercise records in AtlasFit.
 * Matches official exercises and exercises created by the current trainer/workspace.
 */
export async function matchExerciseName(
  rawName: string,
  creatorId?: string
): Promise<ExerciseMatchResult | null> {
  if (!rawName || !rawName.trim()) return null;

  const targetSlug = slugifyExerciseName(rawName);

  // Fetch official exercises and creator exercises
  const exercises = await prisma.exercise.findMany({
    where: {
      OR: [
        { isOfficial: true },
        ...(creatorId ? [{ creatorId }] : []),
      ],
    },
    select: {
      id: true,
      name: true,
      creatorId: true,
      isOfficial: true,
    },
  });

  for (const ex of exercises) {
    const slug = slugifyExerciseName(ex.name);
    if (slug === targetSlug) {
      return {
        exerciseId: ex.id,
        exerciseName: ex.name,
        isCustom: !ex.isOfficial,
      };
    }
  }

  return null;
}
