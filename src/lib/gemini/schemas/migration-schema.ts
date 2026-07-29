import { z } from "zod";

// Zod schemas for server-side validation
export const ZImportedExercise = z.object({
  temporaryId: z.string().default(() => `exercise_${Math.random().toString(36).substring(2, 9)}`),
  name: z.string().nullable().default(null),
  sets: z.number().nullable().default(null),
  reps: z.string().nullable().default(null),
  load: z.number().nullable().default(null),
  restSeconds: z.number().nullable().default(null),
  notes: z.string().nullable().default(null),
});

export const ZImportedWorkout = z.object({
  temporaryId: z.string().default(() => `workout_${Math.random().toString(36).substring(2, 9)}`),
  name: z.string().nullable().default(null),
  goal: z.string().nullable().default(null),
  difficulty: z.string().nullable().default(null),
  duration: z.string().nullable().default(null),
  dayOfWeek: z.number().nullable().default(null),
  muscleGroupLabel: z.string().nullable().default(null),
  restBetweenExercises: z.string().nullable().default(null),
  exercises: z.array(ZImportedExercise).default([]),
});

export const ZImportedAssessment = z.object({
  temporaryId: z.string().default(() => `assessment_${Math.random().toString(36).substring(2, 9)}`),
  date: z.string().nullable().default(null),
  type: z.string().nullable().default(null),
  weight: z.number().nullable().default(null),
  height: z.number().nullable().default(null),
  bodyFat: z.number().nullable().default(null),
  muscleMass: z.number().nullable().default(null),
  notes: z.string().nullable().default(null),
});

export const ZImportedMeasurement = z.object({
  temporaryId: z.string().default(() => `measurement_${Math.random().toString(36).substring(2, 9)}`),
  date: z.string().nullable().default(null),
  weight: z.number().nullable().default(null),
  height: z.number().nullable().default(null),
  bodyFat: z.number().nullable().default(null),
  muscleMass: z.number().nullable().default(null),
  chest: z.number().nullable().default(null),
  waist: z.number().nullable().default(null),
  abdomen: z.number().nullable().default(null),
  hips: z.number().nullable().default(null),
  rightArm: z.number().nullable().default(null),
  leftArm: z.number().nullable().default(null),
  rightThigh: z.number().nullable().default(null),
  leftThigh: z.number().nullable().default(null),
  notes: z.string().nullable().default(null),
});

export const ZImportedStudent = z.object({
  temporaryId: z.string().default(() => `student_${Math.random().toString(36).substring(2, 9)}`),
  name: z.string().nullable().default(null),
  email: z.string().nullable().default(null),
  phone: z.string().nullable().default(null),
  birthDate: z.string().nullable().default(null),
  objective: z.string().nullable().default(null),
  weight: z.number().nullable().default(null),
  height: z.number().nullable().default(null),
  gender: z.string().nullable().default(null),
  notes: z.array(z.string()).default([]),
  confidence: z.number().optional().default(0.9),

  workouts: z.array(ZImportedWorkout).default([]),
  assessments: z.array(ZImportedAssessment).default([]),
  measurements: z.array(ZImportedMeasurement).default([]),
});

export const ZMigrationExtractionResponse = z.object({
  students: z.array(ZImportedStudent).default([]),
  unassignedWorkouts: z.array(ZImportedWorkout).default([]),
  warnings: z.array(z.string()).default([]),
  unsupportedFields: z.array(z.string()).default([]),
});

export type ImportedExercise = z.infer<typeof ZImportedExercise>;
export type ImportedWorkout = z.infer<typeof ZImportedWorkout>;
export type ImportedAssessment = z.infer<typeof ZImportedAssessment>;
export type ImportedMeasurement = z.infer<typeof ZImportedMeasurement>;
export type ImportedStudent = z.infer<typeof ZImportedStudent>;
export type MigrationExtractionResponse = z.infer<typeof ZMigrationExtractionResponse>;

// Native JSON Schema object for GoogleGenAI responseSchema config
export const GEMINI_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    students: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          temporaryId: { type: "STRING" },
          name: { type: "STRING", nullable: true },
          email: { type: "STRING", nullable: true },
          phone: { type: "STRING", nullable: true },
          birthDate: { type: "STRING", nullable: true },
          objective: { type: "STRING", nullable: true },
          weight: { type: "NUMBER", nullable: true },
          height: { type: "NUMBER", nullable: true },
          gender: { type: "STRING", nullable: true },
          notes: { type: "ARRAY", items: { type: "STRING" } },
          confidence: { type: "NUMBER", nullable: true },
          workouts: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                temporaryId: { type: "STRING" },
                name: { type: "STRING", nullable: true },
                goal: { type: "STRING", nullable: true },
                difficulty: { type: "STRING", nullable: true },
                duration: { type: "STRING", nullable: true },
                dayOfWeek: { type: "INTEGER", nullable: true },
                muscleGroupLabel: { type: "STRING", nullable: true },
                restBetweenExercises: { type: "STRING", nullable: true },
                exercises: {
                  type: "ARRAY",
                  items: {
                    type: "OBJECT",
                    properties: {
                      temporaryId: { type: "STRING" },
                      name: { type: "STRING", nullable: true },
                      sets: { type: "INTEGER", nullable: true },
                      reps: { type: "STRING", nullable: true },
                      load: { type: "NUMBER", nullable: true },
                      restSeconds: { type: "INTEGER", nullable: true },
                      notes: { type: "STRING", nullable: true },
                    },
                  },
                },
              },
            },
          },
          assessments: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                temporaryId: { type: "STRING" },
                date: { type: "STRING", nullable: true },
                type: { type: "STRING", nullable: true },
                weight: { type: "NUMBER", nullable: true },
                height: { type: "NUMBER", nullable: true },
                bodyFat: { type: "NUMBER", nullable: true },
                muscleMass: { type: "NUMBER", nullable: true },
                notes: { type: "STRING", nullable: true },
              },
            },
          },
          measurements: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                temporaryId: { type: "STRING" },
                date: { type: "STRING", nullable: true },
                weight: { type: "NUMBER", nullable: true },
                height: { type: "NUMBER", nullable: true },
                bodyFat: { type: "NUMBER", nullable: true },
                muscleMass: { type: "NUMBER", nullable: true },
                chest: { type: "NUMBER", nullable: true },
                waist: { type: "NUMBER", nullable: true },
                abdomen: { type: "NUMBER", nullable: true },
                hips: { type: "NUMBER", nullable: true },
                rightArm: { type: "NUMBER", nullable: true },
                leftArm: { type: "NUMBER", nullable: true },
                rightThigh: { type: "NUMBER", nullable: true },
                leftThigh: { type: "NUMBER", nullable: true },
                notes: { type: "STRING", nullable: true },
              },
            },
          },
        },
      },
    },
    unassignedWorkouts: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          temporaryId: { type: "STRING" },
          name: { type: "STRING", nullable: true },
          goal: { type: "STRING", nullable: true },
          exercises: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                temporaryId: { type: "STRING" },
                name: { type: "STRING", nullable: true },
                sets: { type: "INTEGER", nullable: true },
                reps: { type: "STRING", nullable: true },
                load: { type: "NUMBER", nullable: true },
                restSeconds: { type: "INTEGER", nullable: true },
                notes: { type: "STRING", nullable: true },
              },
            },
          },
        },
      },
    },
    warnings: { type: "ARRAY", items: { type: "STRING" } },
    unsupportedFields: { type: "ARRAY", items: { type: "STRING" } },
  },
};
