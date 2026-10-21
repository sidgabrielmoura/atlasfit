import { afterAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import prisma from "@/lib/prisma";
import { gymWorkoutService } from "@/modules/workspaces/application/gym-workout-service";
import { editGymAdvancedTemplate, readGymAdvancedTemplate } from "@/modules/workspaces/application/gym-workout-advanced";
import { getGymWorkoutStudentOptions, getGymWorkoutExerciseOptions } from "@/modules/workspaces/application/gym-workout-query";

const database = new URL(process.env.DATABASE_URL || "http://invalid");
if (database.hostname !== "127.0.0.1" || database.port !== "56432" || database.pathname !== "/atlasfit_gym_stabilization_20261001") throw new Error("Exige PostgreSQL descartável específico.");
afterAll(async () => { await prisma.$disconnect(); });

async function fixture() {
  const owner = await prisma.user.create({ data: {} });
  const workspace = await prisma.workspace.create({ data: { subscription: { create: { status: "ACTIVE", maxStaff: 30, maxUnits: 5 } }, ownerId: owner.id, type: "GYM", name: "Treinos sintéticos", slug: randomUUID(), members: { create: { userId: owner.id, role: "OWNER" } } } });
  const a = await prisma.gymUnit.create({ data: { workspaceId: workspace.id, name: "A" } });
  const b = await prisma.gymUnit.create({ data: { workspaceId: workspace.id, name: "B" } });
  const trainer = await prisma.user.create({ data: {} });
  const instructor = await prisma.workspaceMember.create({ data: { workspaceId: workspace.id, userId: trainer.id, role: "MANAGER", unitId: a.id, roleGrants: { create: { role: "TRAINER", unitId: a.id, grantedBy: owner.id } } } });
  const addStudent = async (unitId: string, assignedStaffId: string | null = instructor.id) => {
    const user = await prisma.user.create({ data: { name: `Aluno ${randomUUID()}`, password: "synthetic-no-export", cpfCnpj: "synthetic-no-export" } });
    return prisma.workspaceMember.create({ data: { workspaceId: workspace.id, userId: user.id, role: "STUDENT", unitId, assignedStaffId, studentProfile: { create: { registrationNumber: randomUUID() } } } });
  };
  const student = await addStudent(a.id); const other = await addStudent(b.id); const unassigned = await addStudent(a.id, null);
  const group = await prisma.muscleGroup.create({ data: { name: randomUUID() } });
  const exercise = await prisma.exercise.create({ data: { name: "Exercício oficial", muscleGroupId: group.id, isOfficial: true, status: "APPROVED" } });
  const privateExercise = await prisma.exercise.create({ data: { name: "Solicitação pessoal pendente", muscleGroupId: group.id, creatorId: owner.id } });
  const fields = { name: "Ficha A", goal: "Hipertrofia", difficulty: "Iniciante", duration: "45 min", exercises: [{ exerciseId: exercise.id, sets: 3, reps: "12", rest: "60s" }] };
  const template = await gymWorkoutService.createGymTemplate({ workspaceId: workspace.id, creatorUserId: owner.id, ...fields });
  return { owner, workspace, a, b, trainer, instructor, student, other, unassigned, group, exercise, privateExercise, fields, template };
}

describe("Treinos GYM — integridade, autorização e prescrição", () => {
  it("falha da auditoria avançada reverte métodos, parâmetros e grupos na mesma transação", async () => {
    const f = await fixture(), identity = { workspaceId: f.workspace.id, actorUserId: f.owner.id, templateId: f.template.id }, baseline = await readGymAdvancedTemplate(identity);
    const before = await prisma.workoutExercise.findMany({ where: { workoutId: f.template.id } });
    const input = { workspaceId: f.workspace.id, revision: baseline.revision, groups: [], exercises: baseline.exercises.map(row => ({ id: row.id, sets: 6, reps: row.reps, rest: row.rest, load: "50 kg", description: null, order: row.order, groupId: null, allowRepsModification: false, method: { type: "REST_PAUSE", config: { pause: 20, rounds: 3 } } })) };
    await prisma.$executeRawUnsafe(`CREATE OR REPLACE FUNCTION gym_test_advanced_audit_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic advanced audit failure'; END; $$`);
    await prisma.$executeRawUnsafe(`CREATE TRIGGER gym_test_advanced_audit_failure BEFORE INSERT ON "AuditLog" FOR EACH ROW WHEN (NEW.action = 'GYM_TEMPLATE_ADVANCED_UPDATED') EXECUTE FUNCTION gym_test_advanced_audit_failure()`);
    try {
      await expect(editGymAdvancedTemplate(identity, input)).rejects.toThrow();
      expect(await prisma.workoutExercise.findMany({ where: { workoutId: f.template.id } })).toEqual(before);
      expect((await readGymAdvancedTemplate(identity)).revision).toBe(baseline.revision);
    } finally {
      await prisma.$executeRawUnsafe(`DROP TRIGGER gym_test_advanced_audit_failure ON "AuditLog"`);
      await prisma.$executeRawUnsafe(`DROP FUNCTION gym_test_advanced_audit_failure()`);
    }
    expect((await editGymAdvancedTemplate(identity, input)).exercises[0]).toMatchObject({ sets: 6, methodType: "REST_PAUSE" });
  });
  it("edição avançada preserva identidades, cópias e configuração legada; concorrência e escopo são conferidos", async () => {
    const f = await fixture(), identity = { workspaceId: f.workspace.id, actorUserId: f.owner.id, templateId: f.template.id };
    await prisma.workoutExercise.create({ data: { workoutId: f.template.id, exerciseId: f.exercise.id, sets: 4, reps: "8", rest: "90s", order: 1 } });
    await prisma.workoutExercise.update({ where: { id: f.template.exercises[0].id }, data: { methodType: "DROPSET", methodConfig: { drops: 2, reduction: 20, legacyNote: "preservar" } } });
    const prescribed = await gymWorkoutService.assignWorkoutToStudent({ workspaceId: f.workspace.id, actorUserId: f.owner.id, studentMemberId: f.student.id, templateWorkoutId: f.template.id, idempotencyKey: randomUUID() });
    const baseline = await readGymAdvancedTemplate(identity), newGroup = `new:${randomUUID()}`;
    const input = { workspaceId: f.workspace.id, revision: baseline.revision, groups: [{ id: newGroup, type: "CIRCUIT", config: { rounds: 3, restBetweenRounds: 60 } }], exercises: baseline.exercises.map((row, index) => ({ id: row.id, sets: 5, reps: "10", rest: "60s", load: "30 kg", description: "Modelo atualizado", order: index, groupId: newGroup, allowRepsModification: false, method: index === 0 ? { type: "DROPSET", config: { drops: 3, reduction: 25 } } : { type: "REST_PAUSE", config: { pause: 20, rounds: 3 } } })) };
    const attempts = await Promise.allSettled([editGymAdvancedTemplate(identity, input), editGymAdvancedTemplate(identity, input)]);
    expect(attempts.filter(row => row.status === "fulfilled")).toHaveLength(1);
    expect(attempts.find(row => row.status === "rejected")).toMatchObject({ reason: { code: "WORKOUT_EDIT_CONFLICT" } });
    const edited = attempts.find(row => row.status === "fulfilled"); if (edited?.status !== "fulfilled") throw new Error("Edição não persistiu");
    expect(edited.value.exercises.map(row => row.id)).toEqual(baseline.exercises.map(row => row.id));
    expect(edited.value.exercises[0]).toMatchObject({ sets: 5, methodType: "DROPSET", methodConfig: { drops: 3, reduction: 25, legacyNote: "preservar" } });
    expect(edited.value.exercises[1]).toMatchObject({ methodType: "REST_PAUSE", methodConfig: { pause: 20, rounds: 3 } });
    expect(await prisma.workoutExerciseGroup.findUnique({ where: { id: edited.value.exercises[0].groupId! } })).toMatchObject({ type: "CIRCUIT", config: { rounds: 3, restBetweenRounds: 60 } });
    expect(await gymWorkoutService.getStudentWorkouts(f.workspace.id, f.student.id, f.owner.id)).toEqual([prescribed]);
    expect(await prisma.auditLog.count({ where: { entityId: f.template.id, action: "GYM_TEMPLATE_ADVANCED_UPDATED" } })).toBe(1);
    const fresh = await readGymAdvancedTemplate(identity), current = { ...input, revision: fresh.revision, groups: [] as typeof input.groups, exercises: input.exercises.map(row => ({ ...row, groupId: null, method: { type: "NONE", config: null } })) };
    await expect(editGymAdvancedTemplate(identity, { ...current, actorUserId: f.owner.id })).rejects.toMatchObject({ statusCode: 400 });
    await expect(editGymAdvancedTemplate(identity, { ...current, exercises: [{ ...current.exercises[0], id: prescribed.exercises[0].id }, current.exercises[1]] })).rejects.toMatchObject({ code: "WORKOUT_ROWS_CHANGED" });
    await expect(editGymAdvancedTemplate({ ...identity, actorUserId: f.trainer.id }, current)).rejects.toMatchObject({ statusCode: 403 });
    await expect(editGymAdvancedTemplate(identity, { ...current, groups: [{ id: `new:${randomUUID()}`, type: "TRISET", config: null }] })).rejects.toMatchObject({ statusCode: 400 });
    const cleared = await editGymAdvancedTemplate(identity, current);
    expect(cleared.exercises.every(row => row.methodType === "NONE" && row.methodConfig === null && row.groupId === null)).toBe(true);
    expect(await prisma.workoutExerciseGroup.count({ where: { workoutId: f.template.id } })).toBe(0);
    await expect(editGymAdvancedTemplate(identity, current)).rejects.toMatchObject({ code: "WORKOUT_EDIT_CONFLICT" });
  });
  it("biblioteca compartilhada é distinta do PERSONAL; referências privadas e paginação inválida são recusadas", async () => {
    const f = await fixture();
    const personal = await prisma.workspace.create({ data: { type: "PERSONAL", ownerId: f.owner.id, name: "Personal", slug: randomUUID(), members: { create: { userId: f.owner.id, role: "OWNER" } } } });
    const privateTemplate = await prisma.workout.create({ data: { workspaceId: personal.id, creatorId: f.owner.id, name: "Ficha privada", goal: "Força", duration: "30 min", difficulty: "Iniciante" } });
    const listed = await gymWorkoutService.listGymTemplates({ workspaceId: f.workspace.id, actorUserId: f.trainer.id });
    expect(listed.data.map(row => row.id)).toEqual([f.template.id]);
    expect((await getGymWorkoutExerciseOptions({ workspaceId: f.workspace.id, actorUserId: f.trainer.id })).data.some(row => row.id === f.privateExercise.id)).toBe(false);
    for (const page of [0, NaN, 1.5, 10001]) await expect(gymWorkoutService.listGymTemplates({ workspaceId: f.workspace.id, actorUserId: f.owner.id, page })).rejects.toMatchObject({ statusCode: 400 });
    await expect(gymWorkoutService.listGymTemplates({ workspaceId: f.workspace.id, actorUserId: f.owner.id, limit: 51 })).rejects.toMatchObject({ statusCode: 400 });
    await expect(gymWorkoutService.listGymTemplates({ workspaceId: f.workspace.id })).rejects.toMatchObject({ statusCode: 400 });
    const original = await prisma.workoutExercise.findMany({ where: { workoutId: f.template.id } });
    await expect(gymWorkoutService.updateGymTemplate({ workspaceId: f.workspace.id, actorUserId: f.owner.id, templateId: f.template.id, exercises: [{ ...f.fields.exercises[0], exerciseId: f.privateExercise.id }] })).rejects.toMatchObject({ code: "EXERCISE_UNAVAILABLE" });
    expect(await prisma.workoutExercise.findMany({ where: { workoutId: f.template.id } })).toEqual(original);
    await expect(gymWorkoutService.assignWorkoutToStudent({ workspaceId: f.workspace.id, actorUserId: f.owner.id, studentMemberId: f.student.id, templateWorkoutId: privateTemplate.id, idempotencyKey: randomUUID() })).rejects.toMatchObject({ statusCode: 404 });
    expect(await prisma.workout.count({ where: { workspaceId: f.workspace.id, studentId: { not: null } } })).toBe(0);
  });
  it("grant local não é gestor global; leitura e escrita do aluno validam unidade, atribuição e papéis atuais", async () => {
    const f = await fixture();
    const options = await getGymWorkoutStudentOptions({ workspaceId: f.workspace.id, actorUserId: f.trainer.id });
    expect(options.data.map(row => row.memberId)).toEqual([f.student.id]);
    expect(options.data[0]).not.toHaveProperty("password"); expect(options.data[0]).not.toHaveProperty("cpfCnpj");
    await expect(gymWorkoutService.createGymTemplate({ workspaceId: f.workspace.id, creatorUserId: f.trainer.id, ...f.fields })).rejects.toMatchObject({ statusCode: 403 });
    for (const target of [f.other, f.unassigned]) {
      await expect(gymWorkoutService.assignWorkoutToStudent({ workspaceId: f.workspace.id, actorUserId: f.trainer.id, studentMemberId: target.id, templateWorkoutId: f.template.id, isManagerOrOwner: true, actorMemberId: f.instructor.id, idempotencyKey: randomUUID() })).rejects.toMatchObject({ statusCode: 403 });
      await expect(gymWorkoutService.getStudentWorkouts(f.workspace.id, target.id, f.trainer.id)).rejects.toMatchObject({ statusCode: 403 });
    }
    const assigned = await gymWorkoutService.assignWorkoutToStudent({ workspaceId: f.workspace.id, actorUserId: f.trainer.id, studentMemberId: f.student.id, templateWorkoutId: f.template.id, idempotencyKey: randomUUID() });
    expect(assigned.studentId).toBe(f.student.userId);
    await prisma.workspaceRoleGrant.updateMany({ where: { memberId: f.instructor.id }, data: { revokedAt: new Date() } });
    await expect(gymWorkoutService.getStudentWorkouts(f.workspace.id, f.student.id, f.trainer.id)).rejects.toMatchObject({ statusCode: 403 });
    const legacy = await prisma.user.create({ data: {} });
    await prisma.workspaceMember.create({ data: { workspaceId: f.workspace.id, userId: legacy.id, role: "MANAGER", unitId: f.b.id } });
    await expect(gymWorkoutService.getStudentWorkouts(f.workspace.id, f.student.id, legacy.id)).rejects.toMatchObject({ statusCode: 403 });
  });
  it("retry concorrente cria uma ficha e uma auditoria; chave adulterada e destino inválido não produzem registros", async () => {
    const f = await fixture();
    const input = { workspaceId: f.workspace.id, actorUserId: f.trainer.id, studentMemberId: f.student.id, templateWorkoutId: f.template.id, dayOfWeek: 3, idempotencyKey: randomUUID() };
    const results = await Promise.all(Array.from({ length: 4 }, () => gymWorkoutService.assignWorkoutToStudent(input)));
    expect(new Set(results.map(row => row.id)).size).toBe(1);
    expect(await prisma.workout.count({ where: { workspaceId: f.workspace.id, studentId: f.student.userId } })).toBe(1);
    expect(await prisma.auditLog.count({ where: { entity: "WORKOUT", entityId: results[0].id } })).toBe(1);
    await expect(gymWorkoutService.assignWorkoutToStudent({ ...input, dayOfWeek: 4 })).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });
    await expect(gymWorkoutService.assignWorkoutToStudent({ ...input, dayOfWeek: 7, idempotencyKey: randomUUID() })).rejects.toMatchObject({ statusCode: 400 });
    await expect(gymWorkoutService.assignWorkoutToStudent({ ...input, idempotencyKey: undefined })).rejects.toMatchObject({ statusCode: 400 });
    await prisma.workspaceMember.update({ where: { id: f.student.id }, data: { isActive: false } });
    await expect(gymWorkoutService.assignWorkoutToStudent(input)).rejects.toMatchObject({ code: "STUDENT_INACTIVE" });
    await prisma.workspace.update({ where: { id: f.workspace.id }, data: { isActive: false } });
    await expect(gymWorkoutService.assignWorkoutToStudent({ ...input, actorUserId: f.owner.id })).rejects.toMatchObject({ code: "WORKSPACE_SUSPENDED" });
  });
  it("cópia preserva métodos, grupos, cargas e preferências; desativação não apaga prescrições", async () => {
    const f = await fixture();
    const group = await prisma.workoutExerciseGroup.create({ data: { workoutId: f.template.id, type: "BISET", config: { rounds: 3 } } });
    await prisma.workoutExercise.updateMany({ where: { workoutId: f.template.id }, data: { methodType: "DROPSET", methodConfig: { drops: 2, reduction: 20 }, groupId: group.id, allowRepsModification: false, load: "20 kg", description: "Condição da ficha" } });
    await prisma.workout.update({ where: { id: f.template.id }, data: { allowCompleteView: true, allowSkipExercises: true, allowRepsModification: false } });
    const assigned = await gymWorkoutService.assignWorkoutToStudent({ workspaceId: f.workspace.id, actorUserId: f.owner.id, studentMemberId: f.student.id, templateWorkoutId: f.template.id, idempotencyKey: randomUUID() });
    expect(assigned).toMatchObject({ allowCompleteView: true, allowSkipExercises: true, allowRepsModification: false });
    expect(assigned.exercises[0]).toMatchObject({ methodType: "DROPSET", methodConfig: { drops: 2, reduction: 20 }, allowRepsModification: false, load: "20 kg", description: "Condição da ficha" });
    expect(assigned.exercises[0].groupId).not.toBe(group.id);
    expect(await prisma.workoutExerciseGroup.findUnique({ where: { id: assigned.exercises[0].groupId || "" } })).toMatchObject({ workoutId: assigned.id, type: "BISET", config: { rounds: 3 } });
    await expect(gymWorkoutService.updateGymTemplate({ workspaceId: f.workspace.id, actorUserId: f.owner.id, templateId: f.template.id, exercises: f.fields.exercises })).rejects.toMatchObject({ code: "ADVANCED_EDITOR_REQUIRED" });
    await gymWorkoutService.deleteGymTemplate(f.workspace.id, f.template.id, f.owner.id);
    expect(await gymWorkoutService.getStudentWorkouts(f.workspace.id, f.student.id, f.owner.id)).toEqual([assigned]);
    await expect(gymWorkoutService.assignWorkoutToStudent({ workspaceId: f.workspace.id, actorUserId: f.owner.id, studentMemberId: f.student.id, templateWorkoutId: f.template.id, idempotencyKey: randomUUID() })).rejects.toMatchObject({ statusCode: 404 });
  });
  it("falha da auditoria reverte a substituição inteira, sem perder os exercícios anteriores", async () => {
    const f = await fixture();
    const original = await prisma.workoutExercise.findMany({ where: { workoutId: f.template.id } });
    // Fault injection only on the explicitly guarded disposable database; removed even on failure.
    await prisma.$executeRawUnsafe(`CREATE OR REPLACE FUNCTION gym_test_workout_audit_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic audit failure'; END; $$`);
    await prisma.$executeRawUnsafe(`CREATE TRIGGER gym_test_workout_audit_failure BEFORE INSERT ON "AuditLog" FOR EACH ROW WHEN (NEW.action = 'GYM_TEMPLATE_UPDATED') EXECUTE FUNCTION gym_test_workout_audit_failure()`);
    try {
      await expect(gymWorkoutService.updateGymTemplate({ workspaceId: f.workspace.id, actorUserId: f.owner.id, templateId: f.template.id, name: "Não deve persistir", exercises: [{ ...f.fields.exercises[0], sets: 5 }] })).rejects.toThrow();
      expect(await prisma.workoutExercise.findMany({ where: { workoutId: f.template.id } })).toEqual(original);
      expect(await prisma.workout.findUnique({ where: { id: f.template.id } })).toMatchObject({ name: f.template.name });
    } finally {
      await prisma.$executeRawUnsafe(`DROP TRIGGER gym_test_workout_audit_failure ON "AuditLog"`);
      await prisma.$executeRawUnsafe(`DROP FUNCTION gym_test_workout_audit_failure()`);
    }
    const updated = await gymWorkoutService.updateGymTemplate({ workspaceId: f.workspace.id, actorUserId: f.owner.id, templateId: f.template.id, exercises: [{ ...f.fields.exercises[0], sets: 5 }] });
    expect(updated.exercises[0].sets).toBe(5);
  });
});
