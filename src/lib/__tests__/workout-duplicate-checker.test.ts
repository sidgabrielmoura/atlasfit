import { describe, it, expect } from "vitest";
import {
  areWorkoutsIdentical,
  areExercisesIdentical,
  normalizeWorkoutString,
} from "../workout-duplicate-checker";

describe("workout-duplicate-checker", () => {
  describe("normalizeWorkoutString", () => {
    it("should lowercase, trim and remove accents", () => {
      expect(normalizeWorkoutString("  Treino de Força (Avançado)  ")).toBe(
        "treino de forca (avancado)"
      );
      expect(normalizeWorkoutString("Peito   e   Tríceps")).toBe("peito e triceps");
    });
  });

  describe("areExercisesIdentical", () => {
    it("should match identical exercises by exerciseId, sets, and reps", () => {
      const exA = {
        exerciseId: "ex-1",
        sets: 4,
        reps: "10-12",
      };
      const exB = {
        exerciseId: "ex-1",
        sets: 4,
        reps: "10-12",
      };
      expect(areExercisesIdentical(exA, exB)).toBe(true);
    });

    it("should match identical exercises by name when nested in exercise object", () => {
      const exA = {
        exercise: { id: "ex-1", name: "Supino Reto" },
        sets: 3,
        reps: "12",
      };
      const exB = {
        exercise: { id: "ex-diff", name: "supino reto" },
        sets: 3,
        reps: "12",
      };
      expect(areExercisesIdentical(exA, exB)).toBe(true);
    });

    it("should fail when sets or reps differ", () => {
      const exA = { exerciseId: "ex-1", sets: 4, reps: "10" };
      const exB = { exerciseId: "ex-1", sets: 3, reps: "10" };
      expect(areExercisesIdentical(exA, exB)).toBe(false);

      const exC = { exerciseId: "ex-1", sets: 4, reps: "12" };
      expect(areExercisesIdentical(exA, exC)).toBe(false);
    });
  });

  describe("areWorkoutsIdentical", () => {
    const baseWorkoutA = {
      name: "Treino A - Peito e Tríceps",
      exercises: [
        {
          id: "we-1",
          exerciseId: "ex-1",
          order: 0,
          sets: 4,
          reps: "10",
          exercise: { id: "ex-1", name: "Supino Reto" },
        },
        {
          id: "we-2",
          exerciseId: "ex-2",
          order: 1,
          sets: 3,
          reps: "12",
          exercise: { id: "ex-2", name: "Tríceps Corda" },
        },
      ],
    };

    const baseWorkoutB = {
      name: "treino a - peito e triceps",
      exercises: [
        {
          id: "we-other-1",
          exerciseId: "ex-1",
          order: 0,
          sets: 4,
          reps: "10",
          exercise: { id: "ex-1", name: "Supino Reto" },
        },
        {
          id: "we-other-2",
          exerciseId: "ex-2",
          order: 1,
          sets: 3,
          reps: "12",
          exercise: { id: "ex-2", name: "Tríceps Corda" },
        },
      ],
    };

    it("should return true for identical workouts with different casing and accents", () => {
      expect(areWorkoutsIdentical(baseWorkoutA, baseWorkoutB)).toBe(true);
    });

    it("should return false if workout names differ", () => {
      const differentName = { ...baseWorkoutB, name: "Treino B - Costas" };
      expect(areWorkoutsIdentical(baseWorkoutA, differentName)).toBe(false);
    });

    it("should return false if exercise count differs", () => {
      const oneExercise = {
        name: baseWorkoutA.name,
        exercises: [baseWorkoutA.exercises[0]],
      };
      expect(areWorkoutsIdentical(baseWorkoutA, oneExercise)).toBe(false);
    });

    it("should return false if one exercise is different", () => {
      const differentExercise = {
        name: baseWorkoutA.name,
        exercises: [
          baseWorkoutA.exercises[0],
          {
            id: "we-3",
            exerciseId: "ex-99",
            order: 1,
            sets: 3,
            reps: "12",
            exercise: { id: "ex-99", name: "Crucifixo" },
          },
        ],
      };
      expect(areWorkoutsIdentical(baseWorkoutA, differentExercise)).toBe(false);
    });

    it("should respect excludedExerciseIds parameter", () => {
      // If we exclude 'we-2' from workout A, it now only has 1 exercise
      const oneExerciseWorkout = {
        name: baseWorkoutA.name,
        exercises: [baseWorkoutA.exercises[0]],
      };

      // Comparing baseWorkoutA with excluded 'we-2' against a workout with only 'ex-1' should be true
      expect(
        areWorkoutsIdentical(baseWorkoutA, oneExerciseWorkout, ["we-2"])
      ).toBe(true);
    });

    it("should match identical workouts even if exercises are in different order", () => {
      const reversedWorkout = {
        name: baseWorkoutA.name,
        exercises: [baseWorkoutA.exercises[1], baseWorkoutA.exercises[0]],
      };
      expect(areWorkoutsIdentical(baseWorkoutA, reversedWorkout)).toBe(true);
    });
  });
});
