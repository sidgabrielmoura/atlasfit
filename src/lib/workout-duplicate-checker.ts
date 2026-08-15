/**
 * Utility functions to deeply compare workouts for duplication detection.
 * Considers both workout names and exercise composition (exercise IDs, names, sets, reps).
 */

export function normalizeWorkoutString(str?: string | null): string {
  if (!str) return "";
  return str
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents/diacritics
    .replace(/\s+/g, " "); // Replace multiple consecutive spaces with a single space
}

export interface WorkoutExerciseComparisonItem {
  id?: string;
  exerciseId?: string;
  sets?: number | string;
  reps?: string;
  order?: number;
  methodType?: string;
  exercise?: {
    id?: string;
    name?: string;
  } | null;
  name?: string;
}

export interface WorkoutComparisonTarget {
  name?: string | null;
  exercises?: WorkoutExerciseComparisonItem[] | null;
}

/**
 * Checks if two exercise items are identical in prescription and identity.
 */
export function areExercisesIdentical(
  exA: WorkoutExerciseComparisonItem,
  exB: WorkoutExerciseComparisonItem
): boolean {
  if (!exA || !exB) return false;

  // 1. Identify exercise (by exerciseId or normalized exercise name)
  const idA = exA.exerciseId || exA.exercise?.id || exA.id;
  const idB = exB.exerciseId || exB.exercise?.id || exB.id;

  const nameA = normalizeWorkoutString(exA.exercise?.name || exA.name);
  const nameB = normalizeWorkoutString(exB.exercise?.name || exB.name);

  const isSameExerciseEntity =
    (Boolean(idA) && Boolean(idB) && idA === idB) ||
    (Boolean(nameA) && Boolean(nameB) && nameA === nameB);

  if (!isSameExerciseEntity) {
    return false;
  }

  // 2. Check sets
  const setsA = Number(exA.sets);
  const setsB = Number(exB.sets);
  if (!isNaN(setsA) && !isNaN(setsB) && setsA !== setsB) {
    return false;
  }

  // 3. Check reps
  const repsA = normalizeWorkoutString(String(exA.reps ?? ""));
  const repsB = normalizeWorkoutString(String(exB.reps ?? ""));
  if (repsA && repsB && repsA !== repsB) {
    return false;
  }

  return true;
}

/**
 * Strictly verifies whether two workouts are identical.
 * Compares normalized names AND full list of exercises.
 *
 * @param workoutA The workout to duplicate (with custom name/active exercises)
 * @param workoutB The existing workout to compare against
 * @param excludedExerciseIds Optional list of exercise IDs excluded from workoutA
 */
export function areWorkoutsIdentical(
  workoutA: WorkoutComparisonTarget,
  workoutB: WorkoutComparisonTarget,
  excludedExerciseIds: string[] = []
): boolean {
  if (!workoutA || !workoutB) return false;

  // 1. Check Name
  const nameA = normalizeWorkoutString(workoutA.name);
  const nameB = normalizeWorkoutString(workoutB.name);

  if (!nameA || !nameB || nameA !== nameB) {
    return false;
  }

  // 2. Filter exercises
  const excludedSet = new Set(excludedExerciseIds);
  const exercisesA = (workoutA.exercises || []).filter(
    (ex) => !excludedSet.has(ex.id || "") && !excludedSet.has(ex.exerciseId || "")
  );
  const exercisesB = workoutB.exercises || [];

  // If both have zero exercises and same name -> identical
  if (exercisesA.length === 0 && exercisesB.length === 0) {
    return true;
  }

  // If exercise counts differ -> not identical
  if (exercisesA.length !== exercisesB.length) {
    return false;
  }

  // 3. Compare sorted by order
  const sortedA = [...exercisesA].sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
  const sortedB = [...exercisesB].sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));

  const allMatchInOrder = sortedA.every((exA, idx) =>
    areExercisesIdentical(exA, sortedB[idx])
  );

  if (allMatchInOrder) {
    return true;
  }

  // 4. Fallback: Multiset equality if order was rearranged
  const matchedIndicesInB = new Set<number>();
  for (const exA of sortedA) {
    let foundMatch = false;
    for (let i = 0; i < sortedB.length; i++) {
      if (!matchedIndicesInB.has(i) && areExercisesIdentical(exA, sortedB[i])) {
        matchedIndicesInB.add(i);
        foundMatch = true;
        break;
      }
    }
    if (!foundMatch) {
      return false;
    }
  }

  return matchedIndicesInB.size === sortedA.length;
}
