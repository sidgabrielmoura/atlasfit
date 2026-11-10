import { z } from "zod";

// Zod schemas for server-side validation
export const ZImportedExercise = z.object({
  temporaryId: z.string().default(() => `exercise_${Math.random().toString(36).substring(2, 9)}`),
  name: z.string().nullable().default(null),
  sets: z.number().nullable().default(null),
  reps: z.string().nullable().default(null),
  load: z.union([z.number(), z.string()]).nullable().default(null),
  restSeconds: z.number().nullable().default(null),
  notes: z.string().nullable().default(null),
  isBodyweight: z.boolean().nullable().default(null),
  methodType: z.enum(["NONE", "DROPSET", "REST_PAUSE", "BISET", "TRISET", "CIRCUIT"]).nullable().default("NONE"),
  drops: z.number().nullable().default(null),
  reduction: z.number().nullable().default(null),
  restPauseSeconds: z.number().nullable().default(null),
  restPauseRounds: z.number().nullable().default(null),
  isIndividual: z.boolean().nullable().default(null),
  individualSets: z.array(z.object({
    reps: z.string().nullable().default(null),
    load: z.string().nullable().default(null),
    rest: z.string().nullable().default(null),
  })).nullable().default(null),
});

export const ZImportedWorkout = z.object({
  temporaryId: z.string().default(() => `workout_${Math.random().toString(36).substring(2, 9)}`),
  name: z.string().nullable().default(null),
  goal: z.string().nullable().default(null),
  difficulty: z.string().nullable().default(null),
  duration: z.string().nullable().default(null),
  dayOfWeek: z.number().int().min(0).max(6).nullable().default(null),
  muscleGroupLabel: z.string().nullable().default(null),
  restBetweenExercises: z.string().nullable().default(null),
  targetStudentIds: z.array(z.string()).default([]),
  saveToLibrary: z.boolean().default(false),
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
  rightCalf: z.number().nullable().default(null),
  leftCalf: z.number().nullable().default(null),
  notes: z.string().nullable().default(null),
});

export const ZImportedStudent = z.object({
  temporaryId: z.string().default(() => `student_${Math.random().toString(36).substring(2, 9)}`),
  name: z.string().nullable().default(null),
  email: z.string().nullable().default(null),
  phone: z.string().nullable().default(null),
  cpfCnpj: z.string().nullable().default(null),
  birthDate: z.string().nullable().default(null),
  objective: z.string().nullable().default(null),
  weight: z.number().nullable().default(null),
  height: z.number().nullable().default(null),
  gender: z.string().nullable().default(null),
  notes: z.array(z.string()).default([]),
  confidence: z.number().min(0).max(1).nullish().transform(value => value ?? 0.9),

  workouts: z.array(ZImportedWorkout).default([]),
  assessments: z.array(ZImportedAssessment).default([]),
  measurements: z.array(ZImportedMeasurement).default([]),
});

export const ZMigrationExtractionResponse = z.object({
  students: z.array(ZImportedStudent).default([]),
  unassignedWorkouts: z.array(ZImportedWorkout).default([]),
  warnings: z.array(z.string()).default([]),
  unsupportedFields: z.array(z.string()).default([]),
}).superRefine((response, ctx) => {
  const meaningfulWorkout = (workout: z.infer<typeof ZImportedWorkout>) => Boolean(workout.name?.trim() || workout.exercises.some(exercise => exercise.name?.trim()));
  for (const [index, student] of response.students.entries()) {
    if (!student.name?.trim() && !student.email?.trim() && !student.phone?.trim() && !student.cpfCnpj?.trim() && !student.workouts.some(meaningfulWorkout) && !student.assessments.length && !student.measurements.length) {
      ctx.addIssue({ code: "custom", path: ["students", index], message: "A IA retornou um aluno vazio. Refaça a extração antes de criar os cards." });
    }
    for (const [workoutIndex, workout] of student.workouts.entries()) if (!meaningfulWorkout(workout)) ctx.addIssue({ code: "custom", path: ["students", index, "workouts", workoutIndex], message: "A IA retornou um treino sem nome e sem exercícios." });
  }
  for (const [index, workout] of response.unassignedWorkouts.entries()) if (!meaningfulWorkout(workout)) ctx.addIssue({ code: "custom", path: ["unassignedWorkouts", index], message: "A IA retornou um treino vazio." });
});

export type ImportedExercise = z.infer<typeof ZImportedExercise>;
export type ImportedWorkout = z.infer<typeof ZImportedWorkout>;
export type ImportedAssessment = z.infer<typeof ZImportedAssessment>;
export type ImportedMeasurement = z.infer<typeof ZImportedMeasurement>;
export type ImportedStudent = z.infer<typeof ZImportedStudent>;
export type MigrationExtractionResponse = z.infer<typeof ZMigrationExtractionResponse>;

// Native JSON Schema object for GoogleGenAI responseSchema config
const migrationResponseSchema = {
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
          cpfCnpj: { type: "STRING", nullable: true },
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
                      isBodyweight: { type: "BOOLEAN", nullable: true },
                      methodType: { type: "STRING", nullable: true },
                      drops: { type: "INTEGER", nullable: true },
                      reduction: { type: "INTEGER", nullable: true },
                      restPauseSeconds: { type: "INTEGER", nullable: true },
                      restPauseRounds: { type: "INTEGER", nullable: true },
                      individualSets: {
                        type: "ARRAY",
                        items: {
                          type: "OBJECT",
                          properties: {
                            reps: { type: "STRING", nullable: true },
                            load: { type: "STRING", nullable: true },
                            rest: { type: "STRING", nullable: true },
                          },
                        },
                      },
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
                rightCalf: { type: "NUMBER", nullable: true },
                leftCalf: { type: "NUMBER", nullable: true },
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
                isBodyweight: { type: "BOOLEAN", nullable: true },
                methodType: { type: "STRING", nullable: true },
                drops: { type: "INTEGER", nullable: true },
                reduction: { type: "INTEGER", nullable: true },
                restPauseSeconds: { type: "INTEGER", nullable: true },
                restPauseRounds: { type: "INTEGER", nullable: true },
                individualSets: {
                  type: "ARRAY",
                  items: {
                    type: "OBJECT",
                    properties: {
                      reps: { type: "STRING", nullable: true },
                      load: { type: "STRING", nullable: true },
                      rest: { type: "STRING", nullable: true },
                    },
                  },
                },
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

type ResponseSchemaNode = { type: string; properties?: Record<string, ResponseSchemaNode>; items?: ResponseSchemaNode; [key: string]: unknown };
function requireResponseProperties(schema: ResponseSchemaNode): ResponseSchemaNode {
  return { ...schema,
    ...(schema.properties ? { properties: Object.fromEntries(Object.entries(schema.properties).map(([key, node]) => [key, requireResponseProperties(node)])), required: Object.keys(schema.properties) } : {}),
    ...(schema.items ? { items: requireResponseProperties(schema.items) } : {}),
  };
}
// Gemini otherwise permits objects containing only temporaryId, losing every field.
export const GEMINI_RESPONSE_SCHEMA = requireResponseProperties(migrationResponseSchema);
