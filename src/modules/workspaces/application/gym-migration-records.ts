import { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { WorkspaceAccessError } from "../domain/types";
import { gymWorkoutFieldsSchema, parseGymWorkout } from "../domain/gym-workout-contract";
import { parseDayOfWeekToInt } from "@/lib/migration/utils/day-of-week";
import { registerGymStudentInTransaction, gymRegistrationGuardianSchema } from "./gym-student-commands";
import { authorizeGymStudent } from "./student-authority";
import { gymExerciseVisibility } from "./gym-workout-commands";
import type { GymTransactionClient } from "./transaction";

const number = z.coerce.number().finite().positive().max(1000).nullable().optional();
const studentSchema = z.object({
  name: z.string().trim().min(2).max(150), email: z.string().email().nullable().optional(),
  phone: z.string().max(30).nullable().optional(), cpf: z.string().max(18).nullable().optional(), cpfCnpj: z.string().max(18).nullable().optional(),
  birthDate: z.string().nullable().optional(), gender: z.string().max(30).nullable().optional(),
  guardian: gymRegistrationGuardianSchema.nullable().optional(), objective: z.string().max(2000).nullable().optional(),
  weight: number, height: number,
});
const object = (value: Prisma.JsonValue): Record<string, any> => value && typeof value === "object" && !Array.isArray(value) ? value : {};
function fail(message: string): never { throw new WorkspaceAccessError(409, "INVALID_IMPORT", message); }

export type GymImportRecord = Pick<Prisma.ImportRecordGetPayload<{}>, "id" | "entityType" | "temporaryEntityId" | "normalizedData" | "status" | "reviewStatus" | "matchedEntityId"> & Partial<Pick<Prisma.ImportRecordGetPayload<{}>, "errorCode" | "safeErrorMessage">>;
export async function writeGymMigrationRecords(tx: GymTransactionClient, input: { workspaceId: string; actorUserId: string }, unitId: string, job: { id: string }, records: GymImportRecord[], knownStudents: Map<string, { memberId: string; userId: string }>) {
  let activeRecordId = records[0]?.id;
  try {
    const students = new Map(knownStudents);
    const results: Prisma.ImportEntityResultCreateManyInput[] = [];
    const usage = new Map<string, number>();
    const recordResult = async (record: typeof records[number], entityId: string, action: "CREATED" | "UPDATED" = "CREATED") => {
      results.push({ importJobId: job.id, entityType: record.entityType, temporaryEntityId: record.temporaryEntityId, databaseEntityId: entityId, action });
    };
    for (const record of records.filter(row => row.entityType === "STUDENT")) {
      activeRecordId = record.id;
      const raw = object(record.normalizedData);
      const parsed = studentSchema.safeParse(raw);
      if (!parsed.success) fail(`Confira os campos do aluno: ${[...new Set(parsed.error.issues.map(issue => String(issue.path[0])))].join(", ")}.`);
      const data = parsed.data;
      let student: { memberId: string; userId: string };
      if (record.matchedEntityId) {
        const member = await tx.workspaceMember.findFirst({ where: { workspaceId: input.workspaceId, userId: record.matchedEntityId }, select: { id: true } });
        if (!member) fail("Correspondência de aluno fora desta academia. Faça o ingresso identificado antes da importação.");
        const target = await authorizeGymStudent(input.workspaceId, member.id, input.actorUserId, "students.manage", {}, tx);
        if (!target.isActive || !target.studentProfile || target.studentProfile.status !== "ACTIVE" || target.unitId !== unitId) fail("Aluno sem perfil ativo nesta unidade. Regularize o cadastro antes da importação.");
        student = { memberId: target.id, userId: target.userId };
        // An import never overwrites the shared identity of an existing user.
      } else {
        const result = await registerGymStudentInTransaction(tx, {
          workspaceId: input.workspaceId, actorUserId: input.actorUserId, unitId,
          name: data.name, email: data.email, whatsapp: data.phone, cpfCnpj: data.cpfCnpj ?? data.cpf,
          birthDate: data.birthDate, gender: data.gender, guardian: data.guardian,
          idempotencyKey: `migration:${job.id}:${record.id}`,
        });
        student = { memberId: result.memberId, userId: result.userId };
      }
      for (const key of [record.temporaryEntityId, raw.temporaryId, raw.temporaryStudentId].filter((key): key is string => typeof key === "string" && Boolean(key))) students.set(key, student);
      if (data.objective != null || data.weight != null || data.height != null) {
        const target = await authorizeGymStudent(input.workspaceId, student.memberId, input.actorUserId, "health.manage.assigned", {}, tx);
        const previous = object(target.studentProfile?.healthData ?? null);
        if (data.objective != null) await tx.gymStudentProfile.update({ where: { memberId: student.memberId }, data: { healthData: { ...previous, objective: data.objective } } });
        if (data.weight != null || data.height != null) await tx.studentProgress.create({ data: { workspaceId: input.workspaceId, studentId: student.userId, weight: data.weight, height: data.height } });
      }
      await recordResult(record, student.userId, record.matchedEntityId ? "UPDATED" : "CREATED");
    }
    const targetFor = (key: unknown) => {
      const target = typeof key === "string" ? students.get(key) : undefined;
      if (!target) fail("Registro sem aluno identificado. Corrija a associação na revisão.");
      return target;
    };
    const saveWorkout = async (raw: Record<string, any>, target: { memberId: string; userId: string } | null) => {
      if (!Array.isArray(raw.exercises)) fail("Informe os exercícios deste treino.");
      if (target) {
        await authorizeGymStudent(input.workspaceId, target.memberId, input.actorUserId, "workouts.manage.assigned", {}, tx);
      }
      const fields = parseGymWorkout(gymWorkoutFieldsSchema, {
        name: raw.name || "Treino importado", goal: raw.goal || "Hipertrofia", difficulty: raw.difficulty || "Intermediário", duration: raw.duration || "60 min",
        muscleGroupLabel: raw.muscleGroupLabel ?? null, restBetweenExercises: raw.restBetweenExercises || "60s",
        exercises: raw.exercises.map((row: any, index: number) => {
          const isPc = row.isBodyweight === true || String(row.load || "").toLowerCase().includes("p.c");
          const loadVal = isPc ? "Peso do Corpo (p.c.)" : row.load == null ? null : String(row.load);
          return {
            exerciseId: row.matchedExerciseId || `custom-${index}`,
            sets: Number(row.sets ?? 3),
            reps: String(row.reps ?? "10"),
            rest: row.rest || (row.restSeconds ? `${row.restSeconds}s` : "60s"),
            load: loadVal,
            description: row.notes ?? null,
          };
        }),
      });
      const ids = [...new Set<string>(raw.exercises.filter((row: any) => row.matchedExerciseId).map((row: any) => row.matchedExerciseId))];
      if (ids.length && await tx.exercise.count({ where: { ...gymExerciseVisibility, id: { in: ids } } }) !== ids.length) fail("Um exercício vinculado está indisponível. Remova o vínculo para usá-lo como personalizado.");
      const day = parseDayOfWeekToInt(raw.dayOfWeek);
      if (day === null || day === undefined || day < 0 || day > 6) fail("Dia de execução não definido ou inválido. Abra a edição do treino e selecione o dia da semana.");
      const custom = new Map<string, { id: string; name: string; requested: boolean; usage: number }>();
      for (const row of raw.exercises.filter((exercise: any) => !exercise.matchedExerciseId)) {
        const parsed = z.string().trim().min(1).max(200).safeParse(row.name);
        if (!parsed.success) fail("Existe exercício sem nome neste treino. Abra a edição do treino e preencha o nome de todos os exercícios.");
        const key = parsed.data.toLowerCase(), previous = custom.get(key);
        custom.set(key, previous ? { ...previous, requested: previous.requested || row.isRequestedOfficial === true, usage: previous.usage + 1 } : { id: randomUUID(), name: parsed.data, requested: row.isRequestedOfficial === true, usage: 1 });
      }
      if (custom.size) {
        const group = await tx.muscleGroup.upsert({ where: { name: "Geral" }, create: { name: "Geral" }, update: { name: "Geral" }, select: { id: true } });
        await tx.exercise.createMany({ data: [...custom.values()].map(row => ({ id: row.id, name: row.name, creatorId: input.actorUserId, muscleGroupId: group.id, isOfficial: false, isWorkoutSpecific: true, status: row.requested ? "PENDING" : "CUSTOM", usage: row.usage })) });
      }
      const { exercises: prescription, ...base } = fields;
      const exercises = prescription.map((row, index) => ({ ...row, exerciseId: raw.exercises[index].matchedExerciseId || custom.get(String(raw.exercises[index].name).trim().toLowerCase())!.id }));
      const workout = await tx.workout.create({
        data: {
          ...base,
          workspaceId: input.workspaceId,
          studentId: target ? target.userId : null,
          creatorId: input.actorUserId,
          dayOfWeek: day,
          exercises: {
            create: exercises.map((row, order) => {
              const rawRow = raw.exercises[order] || {};
              const methodType = ["NONE", "DROPSET", "REST_PAUSE", "BISET", "TRISET", "CIRCUIT"].includes(rawRow.methodType)
                ? rawRow.methodType
                : "NONE";
              return {
                ...row,
                order,
                methodType,
                methodConfig: methodType === "NONE" ? Prisma.DbNull : (rawRow.methodConfig ?? Prisma.DbNull),
                allowRepsModification: rawRow.allowRepsModification ?? null,
              };
            }),
          },
        },
      });
      const customIds = new Set([...custom.values()].map(row => row.id));
      for (const row of exercises) if (!customIds.has(row.exerciseId)) usage.set(row.exerciseId, (usage.get(row.exerciseId) || 0) + 1);
      return workout.id;
    };
    const workoutRecords = records.filter(row => row.entityType === "WORKOUT");
    for (const record of workoutRecords) {
      activeRecordId = record.id;
      const raw = object(record.normalizedData);
      const targetStudentIds: string[] = Array.isArray(raw.targetStudentIds) && raw.targetStudentIds.length > 0
        ? raw.targetStudentIds
        : raw.temporaryStudentId
        ? [raw.temporaryStudentId]
        : [];
      const saveToLibrary = Boolean(raw.saveToLibrary || targetStudentIds.length === 0);

      let lastWorkoutId: string | null = null;
      if (targetStudentIds.length > 0) {
        for (const tempId of targetStudentIds) {
          lastWorkoutId = await saveWorkout(raw, targetFor(tempId));
        }
      }
      if (saveToLibrary || targetStudentIds.length === 0) {
        lastWorkoutId = await saveWorkout(raw, null);
      }
      if (lastWorkoutId) {
        await recordResult(record, lastWorkoutId, "CREATED");
      }
    }
    if (!workoutRecords.length) for (const record of records.filter(row => row.entityType === "STUDENT")) {
      const raw = object(record.normalizedData);
      if (Array.isArray(raw.workouts)) for (const workout of raw.workouts) await saveWorkout(workout, targetFor(record.temporaryEntityId));
    }
    const clinical = z.object({ date: z.coerce.date().optional(), weight: number, height: number, bodyFat: number, muscleMass: number, notes: z.string().max(2000).nullable().optional() });
    for (const record of records.filter(row => ["ASSESSMENT", "MEASUREMENT"].includes(row.entityType))) {
      activeRecordId = record.id;
      const raw = object(record.normalizedData), target = targetFor(raw.temporaryStudentId);
      await authorizeGymStudent(input.workspaceId, target.memberId, input.actorUserId, "health.manage.assigned", {}, tx);
      const parsed = clinical.safeParse(raw);
      if (!parsed.success) fail("Data ou medidas clínicas inválidas.");
      const data = parsed.data;
      const created = record.entityType === "ASSESSMENT"
        ? await tx.physicalEvaluation.create({ data: { ...data, weight: data.weight ?? fail("Avaliação exige peso real."), height: data.height ?? fail("Avaliação exige altura real."), type: String(raw.type || "Avaliação física").slice(0, 100), workspaceId: input.workspaceId, studentId: target.userId } })
        : await tx.studentProgress.create({ data: { ...data, workspaceId: input.workspaceId, studentId: target.userId } });
      await recordResult(record, created.id);
    }
    if (records.some(row => !["STUDENT", "WORKOUT", "ASSESSMENT", "MEASUREMENT"].includes(row.entityType))) fail("O lote contém um tipo de registro não suportado.");

    if (results.length) await tx.importEntityResult.createMany({ data: results });
    for (const [id, increment] of [...usage].sort(([a], [b]) => a.localeCompare(b))) await tx.exercise.update({ where: { id }, data: { usage: { increment } } });
  } catch (error) {
    if (error instanceof WorkspaceAccessError) throw new WorkspaceAccessError(error.statusCode, error.code, error.message, { ...error.details, recordId: activeRecordId });
    throw error;
  }
}
