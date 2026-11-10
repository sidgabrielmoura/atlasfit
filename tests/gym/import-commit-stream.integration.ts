import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it, vi } from "vitest";
import prisma from "@/lib/prisma";
import { commitGymMigrationJob, prepareGymMigrationCommit, IMPORT_COMMIT_LEASE_MS } from "@/modules/workspaces/application/gym-migration-commit";
import { generateCommitPreview } from "@/lib/migration/commit.service";
import { saveUserRecordEdit, deleteImportRecord, getReviewRecords } from "@/lib/migration/review.service";
import { readImportCommitStream, type ImportCommitEvent } from "@/lib/migration/commit-protocol";
import { importCommitStreamResponse } from "@/lib/migration/commit-stream-response";
import { publishToChannel } from "@/lib/ably";
import { POST } from "@/app/api/gym/migration/[id]/commit/route";
const actor = vi.hoisted(() => ({ id: "" }));
vi.mock("@/auth", () => ({ auth: async () => ({ user: { id: actor.id } }) }));
vi.mock("@/modules/workspaces/application/guard", async importOriginal => ({ ...await importOriginal<object>(), requireWorkspaceAccess: async () => ({ userId: actor.id }) }));
vi.mock("@/lib/ably", () => ({ publishToChannel: vi.fn() }));
const target = new URL(process.env.DATABASE_URL || "http://invalid");
if (target.hostname !== "127.0.0.1" || target.port !== "56432" || target.pathname !== "/atlasfit_gym_stabilization_20261001") throw Error("Requires disposable PostgreSQL.");
afterAll(() => prisma.$disconnect());

async function fixture(invalid = "birth", count = 3) {
  const owner = await prisma.user.create({ data: { name: "Operador sintético" } });
  const workspace = await prisma.workspace.create({ data: { type: "GYM", name: "Importação sintética", slug: randomUUID(), ownerId: owner.id, members: { create: { role: "OWNER", userId: owner.id } }, subscription: { create: { status: "ACTIVE", maxStudents: 50 } } } });
  const unit = await prisma.gymUnit.create({ data: { workspaceId: workspace.id, name: "Matriz" } });
  const muscle = await prisma.muscleGroup.create({ data: { name: randomUUID() } });
  const exercise = await prisma.exercise.create({ data: { name: "Oficial sintético", muscleGroupId: muscle.id, isOfficial: true, status: "APPROVED" } });
  const job = await prisma.importJob.create({ data: { workspaceId: workspace.id, createdByUserId: owner.id, status: "REVIEW", previewValidated: true, sources: { create: { type: "TEXT", status: "EXTRACTED" } } } });
  const rows = [];
  for (let index = 0; index < count; index++) {
    const student = await prisma.importRecord.create({ data: { importJobId: job.id, entityType: "STUDENT", temporaryEntityId: `student-${index}`, status: "READY", reviewStatus: "APPROVED", source: "USER_EDITED", normalizedData: { name: `Aluno sintético ${index}`, email: `${randomUUID()}@example.invalid`, phone: "11900000000", birthDate: invalid === "birth" && index === 1 ? null : "1990-01-15" } } });
    const workout = await prisma.importRecord.create({ data: { importJobId: job.id, entityType: "WORKOUT", temporaryEntityId: `workout-${index}`, status: "READY", reviewStatus: "APPROVED", source: "USER_EDITED", normalizedData: { name: `Treino ${index}`, temporaryStudentId: student.temporaryEntityId, dayOfWeek: 1, exercises: [{ name: exercise.name, matchedExerciseId: invalid === "exercise" && index === 1 ? null : exercise.id, sets: 3, reps: "10" }] } } });
    rows.push({ student, workout });
  }
  const input = { workspaceId: workspace.id, actorUserId: owner.id, unitId: unit.id, jobId: job.id, commitVersion: job.commitVersion };
  return { input, owner, workspace, unit, exercise, job, rows };
}

describe("Confirmação GYM independente por aluno", () => {
  it("preserva válidos antes/depois de falha, mostra motivo real e retoma só o corrigido", async () => {
    const f = await fixture(), events: ImportCommitEvent[] = [];
    const result = await commitGymMigrationJob(f.input, { onProgress: event => events.push(event) });
    expect(result).toMatchObject({ status: "PARTIAL", processed: 3, succeeded: 2, failed: 1, interrupted: false });
    expect(result.failures[0]).toMatchObject({ recordId: f.rows[1].student.id, message: "Data de nascimento válida é obrigatória." });
    expect(await prisma.workspaceMember.count({ where: { workspaceId: f.workspace.id, role: "STUDENT" } })).toBe(2);
    expect(await prisma.workout.count({ where: { workspaceId: f.workspace.id } })).toBe(2);
    expect((await prisma.importRecord.findUniqueOrThrow({ where: { id: f.rows[1].student.id } })).reviewStatus).toBe("PENDING");
    expect((await prisma.importRecord.findUniqueOrThrow({ where: { id: f.rows[1].workout.id } })).reviewStatus).toBe("APPROVED");
    expect(events.filter(event => event.type === "progress")).toHaveLength(3);
    expect(publishToChannel).not.toHaveBeenCalled();
    const attention = await getReviewRecords({ jobId: f.job.id, tabFilter: "ATTENTION" });
    expect(attention.records.map(row => row.id).sort()).toEqual([f.rows[1].student.id, f.rows[1].workout.id].sort());
    expect(attention.records[0]).not.toHaveProperty("sourceData");
    const edited = await saveUserRecordEdit(f.rows[1].student.id, { ...(f.rows[1].student.normalizedData as object), birthDate: "1990-01-15" });
    expect(edited.safeErrorMessage).toBeNull();
    const preview = await generateCommitPreview(f.job.id, f.workspace.id);
    const retry = await commitGymMigrationJob({ ...f.input, commitVersion: preview.commitVersion });
    expect(retry).toMatchObject({ success: true, processed: 1, succeeded: 1, failed: 0 });
    expect(await prisma.workspaceMember.count({ where: { workspaceId: f.workspace.id, role: "STUDENT" } })).toBe(3);
    expect(await prisma.workout.count({ where: { workspaceId: f.workspace.id } })).toBe(3);
    expect((await prisma.exercise.findUniqueOrThrow({ where: { id: f.exercise.id } })).usage).toBe(3);
    expect(await commitGymMigrationJob({ ...f.input, commitVersion: preview.commitVersion })).toMatchObject({ alreadyCommitted: true });
  });
  it("falha de prescrição desfaz apenas seu aluno, sem deixar cadastro incompleto ou apagar os demais", async () => {
    const f = await fixture("exercise");
    const invalid = f.rows[1].workout.normalizedData as any;
    await prisma.importRecord.update({ where: { id: f.rows[1].workout.id }, data: { normalizedData: { ...invalid, exercises: [{ ...invalid.exercises[0], matchedExerciseId: f.exercise.id, sets: -1 }] } } });
    const result = await commitGymMigrationJob(f.input);
    expect(result).toMatchObject({ succeeded: 2, failed: 1 });
    expect(result.failures[0].recordId).toBe(f.rows[1].workout.id);
    expect(result.failures[0].message).toContain("Dados do treino inválidos");
    expect(await prisma.user.findUnique({ where: { email: (f.rows[1].student.normalizedData as any).email } })).toBeNull();
    const norm = f.rows[1].workout.normalizedData as any;
    await saveUserRecordEdit(f.rows[1].workout.id, { ...norm, exercises: [{ ...norm.exercises[0], matchedExerciseId: f.exercise.id }] });
    const preview = await generateCommitPreview(f.job.id, f.workspace.id);
    expect(await commitGymMigrationJob({ ...f.input, commitVersion: preview.commitVersion })).toMatchObject({ succeeded: 1, success: true });
  });
  it("rejeita confirmação concorrente, edição, exclusão e prévia durante o processamento", async () => {
    const f = await fixture("none", 1), run = await prepareGymMigrationCommit(f.input);
    await expect(prepareGymMigrationCommit(f.input)).rejects.toMatchObject({ statusCode: 409 });
    await expect(saveUserRecordEdit(f.rows[0].student.id, f.rows[0].student.normalizedData)).rejects.toMatchObject({ code: "INVALID_IMPORT_STATE" });
    await expect(deleteImportRecord(f.rows[0].student.id)).rejects.toMatchObject({ code: "INVALID_IMPORT_STATE" });
    await expect(generateCommitPreview(f.job.id, f.workspace.id)).rejects.toMatchObject({ code: "INVALID_IMPORT_STATE" });
    expect(await run()).toMatchObject({ success: true, succeeded: 1 });
  });
  it("interrupção preserva o que terminou e nova confirmação processa somente o restante", async () => {
    const f = await fixture("none"); let stop = false;
    const result = await commitGymMigrationJob(f.input, { isCancelled: () => stop, onProgress: event => { if (event.type === "progress") stop = true; } });
    expect(result).toMatchObject({ succeeded: 1, processed: 1, interrupted: true, status: "PARTIAL" });
    expect(await prisma.workout.count({ where: { workspaceId: f.workspace.id } })).toBe(1);
    const preview = await generateCommitPreview(f.job.id, f.workspace.id);
    expect(await commitGymMigrationJob({ ...f.input, commitVersion: preview.commitVersion })).toMatchObject({ success: true, processed: 2 });
    expect(await prisma.workout.count({ where: { workspaceId: f.workspace.id } })).toBe(3);
  });
  it("recupera execução expirada sem permitir que a antiga sobrescreva a nova", async () => {
    const f = await fixture("none", 1), oldRun = await prepareGymMigrationCommit(f.input);
    await prisma.importJob.update({ where: { id: f.job.id }, data: { updatedAt: new Date(Date.now() - IMPORT_COMMIT_LEASE_MS - 1000) } });
    const preview = await generateCommitPreview(f.job.id, f.workspace.id);
    const currentRun = await prepareGymMigrationCommit({ ...f.input, commitVersion: preview.commitVersion });
    expect(await oldRun()).toMatchObject({ interrupted: true, succeeded: 0 });
    expect((await prisma.importJob.findUniqueOrThrow({ where: { id: f.job.id } })).status).toBe("IMPORTING");
    expect(await currentRun()).toMatchObject({ succeeded: 1, success: true });
  });
  it("transmite resultados pela própria resposta e não depende de canal Ably", async () => {
    const f = await fixture("none", 1), run = await prepareGymMigrationCommit(f.input), events: ImportCommitEvent[] = [];
    const response = importCommitStreamResponse(run, new AbortController().signal);
    await readImportCommitStream(response, event => events.push(event));
    expect(events.map(event => event.type)).toEqual(["started", "progress", "finished"]);
    expect(events.at(-1)).toMatchObject({ type: "finished", result: { success: true, succeeded: 1 } });
    expect(publishToChannel).not.toHaveBeenCalled();
  });
  it("a rota HTTP confirma por stream e devolve erros estruturados legíveis antes de iniciar", async () => {
    const f = await fixture("none", 1); actor.id = f.owner.id;
    const request = (unitId: string) => new Request(`http://localhost/api/gym/migration/${f.job.id}/commit`, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/x-ndjson" }, body: JSON.stringify({ unitId, commitVersion: f.input.commitVersion }) });
    const denied = await POST(request("unidade-inexistente"), { params: Promise.resolve({ id: f.job.id }) });
    expect(denied.status).toBe(400);
    expect((await denied.json()).error.message).toContain("unidade autorizada");
    const response = await POST(request(f.unit.id), { params: Promise.resolve({ id: f.job.id }) });
    const events: ImportCommitEvent[] = [];
    await readImportCommitStream(response, event => events.push(event));
    expect(events.at(-1)).toMatchObject({ type: "finished", result: { success: true, succeeded: 1 } });
  });
  it("uma falha não aprova automaticamente outros registros que ainda precisam de revisão", async () => {
    const f = await fixture("none", 1);
    await prisma.importRecord.updateMany({ where: { importJobId: f.job.id }, data: { reviewStatus: "PENDING" } });
    expect(await commitGymMigrationJob(f.input)).toMatchObject({ failed: 1, succeeded: 0 });
    expect(await prisma.importRecord.count({ where: { importJobId: f.job.id, reviewStatus: "PENDING" } })).toBe(2);
  });
  it("identificadores temporários repetidos nunca associam o treino ao aluno errado", async () => {
    const f = await fixture("none");
    await prisma.importRecord.update({ where: { id: f.rows[1].student.id }, data: { temporaryEntityId: f.rows[0].student.temporaryEntityId } });
    const result = await commitGymMigrationJob(f.input);
    expect(result.succeeded).toBe(1);
    expect(await prisma.workout.count({ where: { workspaceId: f.workspace.id } })).toBe(1);
    expect(result.failures.some(failure => failure.message.includes("Identificador de aluno repetido"))).toBe(true);
  });
});
