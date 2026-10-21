import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { afterAll, it } from "vitest";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { issueCredentialProof } from "@/lib/auth/credential-proof";
import { resolveAuthenticationPolicy, authenticationPolicyKey } from "@/lib/auth/mfa-service";
import { reacceptOwnDocument } from "@/lib/privacy/reacceptance";
import { gymWorkoutService } from "@/modules/workspaces/application/gym-workout-service";
const database = new URL(process.env.DATABASE_URL || "http://invalid");
if (database.hostname !== "127.0.0.1" || database.port !== "56432" || database.pathname !== "/atlasfit_gym_stabilization_20261001") throw new Error("Exige banco descartável específico.");
afterAll(async () => { await prisma.$disconnect(); });
it("prepara academia, recepção e fichas para navegador real", async () => {
  const password = `synthetic-workouts-${randomUUID()}`;
  const owner = await prisma.user.create({ data: { name: "Titular de treinos visual", email: `workouts-${randomUUID()}@example.invalid`, role: "TRAINER", birthDate: new Date("1990-01-15"), password: await bcrypt.hash(password, 10) } });
  for (const documentType of ["TERMS", "PRIVACY"] as const) {
    const now = new Date(), document = await prisma.legalDocument.findFirstOrThrow({ where: { type: documentType, status: "PUBLISHED", publishedAt: { lte: now }, effectiveAt: { lte: now } }, orderBy: [{ effectiveAt: "desc" }, { publishedAt: "desc" }, { id: "desc" }] });
    await reacceptOwnDocument(owner.id, { documentType, documentId: document.id, documentVersion: document.version, documentHash: document.contentHash, accepted: true });
  }
  const policy = await resolveAuthenticationPolicy(owner.id); if (!policy) throw new Error("Política ausente.");
  const proof = await issueCredentialProof(owner.id, policy.user.password || "", authenticationPolicyKey(policy));
  const workspace = await prisma.workspace.create({ data: { type: "GYM", ownerId: owner.id, name: "Academia treinos visual", slug: randomUUID(), members: { create: { userId: owner.id, role: "OWNER" } }, units: { create: [{ name: "Matriz visual" }, { name: "Filial visual" }] }, subscription: { create: { status: "ACTIVE", maxStudents: 10, maxStaff: 5, maxUnits: 3 } } }, include: { units: true } });
  const studentIds = [];
  for (const [index, unit] of workspace.units.entries()) {
    const student = await prisma.user.create({ data: { name: "Aluno visual " + index } });
    const member = await prisma.workspaceMember.create({ data: { workspaceId: workspace.id, userId: student.id, role: "STUDENT", unitId: unit.id, studentProfile: { create: { registrationNumber: randomUUID() } } } }); studentIds.push(member.id);
  }
  const muscle = await prisma.muscleGroup.create({ data: { name: randomUUID() } }), exercise = await prisma.exercise.create({ data: { name: "Exercício visual", muscleGroupId: muscle.id, isOfficial: true, status: "APPROVED" } });
  const template = await gymWorkoutService.createGymTemplate({ workspaceId: workspace.id, creatorUserId: owner.id, name: "Modelo visual real", goal: "Força", difficulty: "Intermediário", duration: "40 min", exercises: [0, 1, 2].map(order => ({ exerciseId: exercise.id, sets: 3, reps: "10", rest: "60s", order })) });
  const copy = await gymWorkoutService.assignWorkoutToStudent({ workspaceId: workspace.id, actorUserId: owner.id, studentMemberId: studentIds[0], templateWorkoutId: template.id, idempotencyKey: randomUUID() });
  writeFileSync(".tmp/gym-stabilization/workout-browser-fixture.json", JSON.stringify({ owner: { id: owner.id, email: owner.email, proof }, password, workspaceId: workspace.id, units: workspace.units.map(({ id, name }) => ({ id, name })), templateId: template.id, prescribedId: copy.id }));
});
