import prisma from "@/lib/prisma";
import { publicExerciseCatalog } from "@/lib/exercises/catalog-visibility";
import { matchExerciseBatch, type ExerciseCandidate } from "./exercise-similarity";

export async function findPublicExerciseMatches(names: readonly string[], loadCatalog: () => Promise<ExerciseCandidate[]> = loadPublicExerciseCatalog) {
  if (!names.length) return [];
  const catalog = await loadCatalog();
  return matchExerciseBatch(names, catalog);
}
// Jobs and CLI callers can use the uncached loader without a Next request context.
export const loadPublicExerciseCatalog = () => prisma.exercise.findMany({ where: publicExerciseCatalog, select: { id: true, name: true } });
