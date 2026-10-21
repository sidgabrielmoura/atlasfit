import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { afterAll, expect, it } from "vitest";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { gymStudentService } from "@/modules/workspaces/application/gym-student-service";
import { issueCredentialProof } from "@/lib/auth/credential-proof";
import { resolveAuthenticationPolicy, authenticationPolicyKey } from "@/lib/auth/mfa-service";
import { reacceptOwnDocument } from "@/lib/privacy/reacceptance";

const target = new URL(process.env.DATABASE_URL || "http://invalid");
if (target.hostname !== "127.0.0.1" || target.port !== "56432" || target.pathname !== "/atlasfit_gym_stabilization_20261001") throw new Error("Exige banco descartável específico.");
afterAll(async () => { await prisma.$disconnect(); });
const path = ".tmp/gym-stabilization/student-ingress-browser-fixture.json";
it("prepara operador, novo aluno sem e-mail e titular com PERSONAL privado", async () => {
  const password = "senha-visual-" + randomUUID(), users = [];
  for (const name of ["Operador ingresso visual", "Titular ingresso visual"]) {
    const user = await prisma.user.create({ data: { name, email: `ingress-visual-${randomUUID()}@example.invalid`, role: "TRAINER", password: await bcrypt.hash(password, 10), birthDate: new Date("1990-01-15"), onboarded: true, twoFactorEnabled: false } });
    for (const type of ["TERMS", "PRIVACY"] as const) {
      const now = new Date(), document = await prisma.legalDocument.findFirstOrThrow({ where: { type, status: "PUBLISHED", publishedAt: { lte: now }, effectiveAt: { lte: now } }, orderBy: [{ effectiveAt: "desc" }, { publishedAt: "desc" }, { id: "desc" }] });
      await reacceptOwnDocument(user.id, { documentType: type, documentId: document.id, documentVersion: document.version, documentHash: document.contentHash, accepted: true });
    }
    users.push(user);
  }
  const [owner, existing] = users;
  const gym = await prisma.workspace.create({ data: { type: "GYM", name: "Academia Ingresso Visual", slug: randomUUID(), ownerId: owner.id, members: { create: { userId: owner.id, role: "OWNER" } }, units: { create: { name: "Unidade Ingresso" } }, subscription: { create: { status: "ACTIVE", maxStudents: 10, maxStaff: 5 } } } });
  const unit = await prisma.gymUnit.findFirstOrThrow({ where: { workspaceId: gym.id } });
  const student = await gymStudentService.registerStudent({ workspaceId: gym.id, actorUserId: owner.id, unitId: unit.id, name: "Novo aluno ingresso visual", birthDate: "1990-01-15", idempotencyKey: randomUUID() });
  await prisma.user.update({ where: { id: student.userId }, data: { cpfCnpj: "52998224725", twoFactorEnabled: false } });
  const personal = await prisma.workspace.create({ data: { type: "PERSONAL", name: "PERSONAL privado ingresso", slug: randomUUID(), ownerId: existing.id, members: { create: { userId: existing.id, role: "OWNER" } } } });
  const trial = await prisma.freeTrial.create({ data: { userId: existing.id, isActive: true, startDate: new Date(Date.now() - 86400000), endDate: new Date(Date.now() + 7 * 86400000) } });
  const policy = await resolveAuthenticationPolicy(owner.id); if (!policy) throw new Error("Política ausente.");
  const proof = await issueCredentialProof(owner.id, policy.user.password || "", authenticationPolicyKey(policy));
  writeFileSync(path, JSON.stringify({ owner: { id: owner.id, email: owner.email, proof }, existing: { id: existing.id, email: existing.email, name: existing.name, passwordHash: existing.password, sessionVersion: existing.sessionVersion }, password, gym: { id: gym.id, name: gym.name }, personalId: personal.id, trialId: trial.id, unitId: unit.id, student, studentName: "Novo aluno ingresso visual", studentEmail: `ingress-own-${randomUUID()}@example.invalid`, studentPassword: "senha-propria-visual" }));
});
it("confere estado persistido depois do ingresso visual", async () => {
  const f = JSON.parse(readFileSync(path, "utf8"));
  const student = await prisma.user.findUniqueOrThrow({ where: { id: f.student.userId } });
  expect(student).toMatchObject({ email: f.studentEmail, role: "USER", setupToken: null });
  expect(await bcrypt.compare(f.studentPassword, student.password!)).toBe(true);
  expect(await prisma.legalAcceptance.count({ where: { userId: student.id, source: "GYM_STUDENT_INGRESS" } })).toBe(2);
  expect(await prisma.freeTrial.findUnique({ where: { userId: student.id } })).toBeNull();
  const existing = await prisma.user.findUniqueOrThrow({ where: { id: f.existing.id } });
  expect(existing).toMatchObject({ name: f.existing.name, birthDate: new Date("1990-01-15"), role: "TRAINER", password: f.existing.passwordHash, sessionVersion: f.existing.sessionVersion });
  expect(await prisma.workspaceMember.findFirst({ where: { workspaceId: f.gym.id, userId: existing.id } })).toMatchObject({ role: "STUDENT", isActive: true });
  expect(await prisma.workspaceMember.findFirst({ where: { workspaceId: f.personalId, userId: existing.id } })).toMatchObject({ role: "OWNER", isActive: true });
  expect(await prisma.freeTrial.findUnique({ where: { userId: existing.id } })).toMatchObject({ id: f.trialId, isActive: true });
  expect(await prisma.gymPayment.count({ where: { workspaceId: f.gym.id } })).toBe(0);
});
