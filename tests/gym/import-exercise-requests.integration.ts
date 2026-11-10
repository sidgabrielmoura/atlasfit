import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it, vi } from "vitest";
import prisma from "@/lib/prisma";
import { commitGymMigrationJob } from "@/modules/workspaces/application/gym-migration-commit";
import { findPublicExerciseMatches } from "@/lib/migration/matching/exercise-catalog-matches";
import { publicExerciseCatalog } from "@/lib/exercises/catalog-visibility";
import { getGymUnitAccess } from "@/modules/workspaces/application/gym-unit-access";
import { assignGymStudentWorkout, readGymStudentWorkouts } from "@/modules/workspaces/application/gym-workout-commands";
import { GET as catalog, POST as match } from "@/app/api/gym/workouts/exercises/route";
import { PATCH as approve } from "@/app/api/superadmin/exercises/[id]/route";
import { GET as personalCatalog } from "@/app/api/personal/workouts/exercises/route";

const actor = vi.hoisted(() => ({ id: "", role: "USER" }));
// These tests invoke handlers without a Next request runtime. The real cache,
// expiry and invalidation are exercised in public-data-cache.test.ts.
vi.mock("next/cache", () => ({ unstable_cache: (read: unknown) => read, revalidateTag: vi.fn() }));
vi.mock("@/auth", () => ({ auth: async () => ({ user: { id: actor.id, role: actor.role } }) }));
vi.mock("@/lib/personal-commercial-context", () => ({ personalCommercialContextResponse: async () => null }));
vi.mock("@/lib/audited-request", () => ({ withAuditedRequest: (handler: unknown) => handler }));
vi.mock("@/modules/workspaces/application/guard", async original => ({ ...await original<object>(), requireGymWorkspaceAccess: async (input: { workspaceId: string }) => { await getGymUnitAccess(prisma, input.workspaceId, actor.id, "students.manage"); return { workspaceId: input.workspaceId, userId: actor.id }; } }));
const target = new URL(process.env.DATABASE_URL || "http://invalid");
if (target.hostname !== "127.0.0.1" || target.port !== "56432" || target.pathname !== "/atlasfit_gym_stabilization_20261001") throw Error("Requires disposable PostgreSQL.");
afterAll(() => prisma.$disconnect());

async function fixture() {
  const owner = await prisma.user.create({ data: { name: "Operador sintético" } });
  const workspace = await prisma.workspace.create({ data: { type: "GYM", name: "Personalizados sintéticos", slug: randomUUID(), ownerId: owner.id, subscription: { create: { status: "ACTIVE", maxStudents: 50 } }, members: { create: { role: "OWNER", userId: owner.id } } } });
  const unit = await prisma.gymUnit.create({ data: { workspaceId: workspace.id, name: "Matriz" } });
  const requestName = `Personalizado ${randomUUID()}`;
  const job = await prisma.importJob.create({ data: { workspaceId: workspace.id, createdByUserId: owner.id, status: "REVIEW", previewValidated: true, sources: { create: { type: "TEXT", status: "EXTRACTED" } } } });
  for (let i = 0; i < 2; i++) {
    await prisma.importRecord.create({ data: { importJobId: job.id, entityType: "STUDENT", temporaryEntityId: `s-${i}`, normalizedData: { name: `Aluno ${i}`, birthDate: "1990-01-15", email: `${randomUUID()}@example.invalid` }, status: "READY", reviewStatus: "APPROVED" } });
    await prisma.importRecord.create({ data: { importJobId: job.id, entityType: "WORKOUT", temporaryEntityId: `w-${i}`, normalizedData: { temporaryStudentId: `s-${i}`, name: `Treino ${i}`, dayOfWeek: i + 1, exercises: [{ name: requestName, sets: 4, reps: "12", isRequestedOfficial: true, catalogLinkRemoved: true }] }, status: "READY", reviewStatus: "APPROVED" } });
  }
  Object.assign(actor, { id: owner.id, role: "USER" });
  return { owner, workspace, unit, job, requestName, input: { jobId: job.id, workspaceId: workspace.id, actorUserId: owner.id, unitId: unit.id, commitVersion: job.commitVersion } };
}

describe("Exercícios da importação: personalizado privado e aprovação", () => {
  it("solicitações são utilizáveis no próprio treino, independentes entre alunos e ocultas até oficialização", async () => {
    const f = await fixture();
    expect(await commitGymMigrationJob(f.input)).toMatchObject({ success: true, succeeded: 2 });
    const requests = await prisma.exercise.findMany({ where: { creatorId: f.owner.id, name: f.requestName }, include: { workoutExercises: { include: { workout: true } } } });
    expect(requests).toHaveLength(2);
    for (const row of requests) {
      expect(row).toMatchObject({ isOfficial: false, isWorkoutSpecific: true, status: "PENDING", usage: 1 });
      expect(row.workoutExercises).toHaveLength(1);
      expect(row.workoutExercises[0]).toMatchObject({ sets: 4, reps: "12" });
    }
    expect(requests[0].workoutExercises[0].workoutId).not.toBe(requests[1].workoutExercises[0].workoutId);
    expect(await prisma.exercise.count({ where: { ...publicExerciseCatalog, id: { in: requests.map(row => row.id) } } })).toBe(0);
    expect((await findPublicExerciseMatches([f.requestName]))[0]?.exerciseId).not.toBe(requests[0].id);
    const response = await catalog(new Request(`http://localhost/api/gym/workouts/exercises?workspaceId=${f.workspace.id}&search=${encodeURIComponent(f.requestName)}`));
    expect(await response.json()).toEqual([]);
    expect(await (await personalCatalog(new Request(`http://localhost/api/personal/workouts/exercises?search=${encodeURIComponent(f.requestName)}`))).json()).toEqual([]);
    const student = await prisma.workspaceMember.findFirstOrThrow({ where: { workspaceId: f.workspace.id, userId: requests[0].workoutExercises[0].workout.studentId! } });
    const visible = await readGymStudentWorkouts(f.workspace.id, student.id, f.owner.id) as any[];
    expect(visible[0].exercises[0].exercise).toMatchObject({ id: requests[0].id, isWorkoutSpecific: true, isOfficial: false });
    const copied = { workspaceId: f.workspace.id, actorUserId: f.owner.id, studentMemberId: student.id, idempotencyKey: randomUUID(), dayOfWeek: 2, customWorkout: { name: "Outra ficha", goal: "Força", difficulty: "Iniciante", duration: "30 min", exercises: [{ exerciseId: requests[0].id, sets: 3, reps: "10", rest: "60s" }] } };
    await expect(assignGymStudentWorkout(copied)).rejects.toMatchObject({ code: "EXERCISE_UNAVAILABLE" });
    const params = { params: Promise.resolve({ id: requests[0].id }) };
    const patch = (body: object) => new Request(`http://localhost/api/superadmin/exercises/${requests[0].id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    expect((await approve(patch({ isOfficial: true }), params)).status).toBe(401);
    const admin = await prisma.user.create({ data: { role: "SUPERADMIN" } });
    Object.assign(actor, { id: admin.id, role: "SUPERADMIN" });
    await approve(patch({ status: "APPROVED" }), params);
    expect(await prisma.exercise.count({ where: { ...publicExerciseCatalog, id: requests[0].id } })).toBe(0);
    expect((await approve(patch({ isOfficial: true }), params)).status).toBe(200);
    expect((await findPublicExerciseMatches([f.requestName]))[0]?.exerciseId).toBe(requests[0].id);
    expect(await prisma.exercise.count({ where: { ...publicExerciseCatalog, id: requests[1].id } })).toBe(0);
    Object.assign(actor, { id: f.owner.id, role: "USER" });
    expect(await assignGymStudentWorkout(copied)).toMatchObject({ studentId: student.userId });
    expect(await prisma.workoutExercise.count({ where: { workoutId: requests[0].workoutExercises[0].workoutId, exerciseId: requests[0].id } })).toBe(1);
    expect(await commitGymMigrationJob(f.input)).toMatchObject({ alreadyCommitted: true });
    expect(await prisma.exercise.count({ where: { creatorId: f.owner.id, name: f.requestName } })).toBe(2);
  });
  it("um exercício sem vínculo nem solicitação também pode permanecer personalizado", async () => {
    const f = await fixture();
    const record = await prisma.importRecord.findFirstOrThrow({ where: { importJobId: f.job.id, entityType: "WORKOUT" } });
    const norm = record.normalizedData as any;
    await prisma.importRecord.update({ where: { id: record.id }, data: { normalizedData: { ...norm, exercises: [{ ...norm.exercises[0], isRequestedOfficial: false }] } } });
    expect(await commitGymMigrationJob(f.input)).toMatchObject({ success: true });
    expect(await prisma.exercise.count({ where: { creatorId: f.owner.id, isWorkoutSpecific: true, status: "CUSTOM" } })).toBe(1);
  });
  it("endpoint resolve nomes em lote e não devolve solicitações privadas como candidatos", async () => {
    const f = await fixture(), muscleGroup = await prisma.muscleGroup.upsert({ where: { name: "Geral" }, create: { name: "Geral" }, update: {} });
    const name = `Elevação sintética ${randomUUID()}`;
    const official = await prisma.exercise.create({ data: { name, muscleGroupId: muscleGroup.id, isOfficial: true, status: "APPROVED" } });
    const response = await match(new Request("http://localhost/api/gym/workouts/exercises", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workspaceId: f.workspace.id, names: [name, "Supino barra reta"] }) }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.matches).toHaveLength(2);
    expect(body.matches[0]).toMatchObject({ exerciseId: official.id, confidence: 1 });
  });
  it("rascunho bloqueado pela antiga obrigatoriedade de catálogo pode ser confirmado sem refazer alunos", async () => {
    const f = await fixture();
    await prisma.importRecord.updateMany({ where: { importJobId: f.job.id, entityType: "WORKOUT" }, data: { status: "FAILED", reviewStatus: "PENDING", errorCode: "INVALID_IMPORT", safeErrorMessage: "Associe todos os exercícios deste treino ao catálogo da academia." } });
    expect(await commitGymMigrationJob(f.input)).toMatchObject({ success: true, succeeded: 2 });
    expect(await prisma.exercise.count({ where: { creatorId: f.owner.id, isWorkoutSpecific: true, status: "PENDING" } })).toBe(2);
  });
});
