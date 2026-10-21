import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { afterAll, it } from "vitest";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { issueCredentialProof } from "@/lib/auth/credential-proof";
import { resolveAuthenticationPolicy, authenticationPolicyKey } from "@/lib/auth/mfa-service";
import { reacceptOwnDocument } from "@/lib/privacy/reacceptance";
import { createPrivatePersonalWorkspace } from "@/modules/workspaces/application/personal-affiliation";

const database = new URL(process.env.DATABASE_URL || "http://invalid");
if (database.hostname !== "127.0.0.1" || database.port !== "56432" || database.pathname !== "/atlasfit_gym_stabilization_20261001") throw new Error("Fixture exige banco descartável específico.");
afterAll(async () => { await prisma.$disconnect(); });
it("prepara personal afiliado adulto, aluno atribuído e assessoria privada para navegador", async () => {
  const password = `synthetic-affiliation-${randomUUID()}`;
  const user = await prisma.user.create({ data: { name: "Personal visual sintético", email: `affiliation-${randomUUID()}@example.invalid`, role: "USER", birthDate: new Date("1990-01-15"), password: await bcrypt.hash(password, 10) } });
  for (const documentType of ["TERMS", "PRIVACY"] as const) {
    const now = new Date();
    const document = await prisma.legalDocument.findFirstOrThrow({ where: { type: documentType, status: "PUBLISHED", publishedAt: { lte: now }, effectiveAt: { lte: now } }, orderBy: [{ effectiveAt: "desc" }, { publishedAt: "desc" }, { id: "desc" }] });
    await reacceptOwnDocument(user.id, { documentType, documentId: document.id, documentVersion: document.version, documentHash: document.contentHash, accepted: true });
  }
  const owner = await prisma.user.create({ data: { name: "Titular visual sintético", role: "TRAINER" } });
  const workspace = await prisma.workspace.create({ data: { type: "GYM", ownerId: owner.id, name: "Academia visual afiliada", slug: `affiliation-${randomUUID()}`, primaryColor: "#2B4FCC", members: { create: { userId: owner.id, role: "OWNER" } }, units: { create: { name: "Unidade visual" } }, subscription: { create: { status: "ACTIVE", maxStudents: 10, maxStaff: 5 } } } });
  const unit = await prisma.gymUnit.findFirstOrThrow({ where: { workspaceId: workspace.id } });
  const member = await prisma.workspaceMember.create({ data: { userId: user.id, workspaceId: workspace.id, role: "TRAINER", unitId: unit.id, roleGrants: { create: { role: "TRAINER", unitId: unit.id } } } });
  const student = await prisma.user.create({ data: { name: "Aluno visual atribuído", birthDate: new Date("1995-01-15") } });
  await prisma.workspaceMember.create({ data: { userId: student.id, workspaceId: workspace.id, role: "STUDENT", unitId: unit.id, assignedStaffId: member.id, studentProfile: { create: {} } } });
  const personal = await createPrivatePersonalWorkspace(user.id, { name: "Assessoria visual privada", slug: `private-${randomUUID()}` });
  const plan = await prisma.plan.create({ data: { name: "Plano visual afiliado " + randomUUID().slice(0, 8), price: 49, interval: "month", maxWorkspaces: 1, maxStudents: 10 } });
  const policy = await resolveAuthenticationPolicy(user.id); if (!policy) throw new Error("Política sintética ausente.");
  const proof = await issueCredentialProof(user.id, policy.user.password || "", authenticationPolicyKey(policy));
  writeFileSync(".tmp/gym-stabilization/affiliation-browser-fixture.json", JSON.stringify({ user: { id: user.id, email: user.email, proof }, password, workspaceId: workspace.id, personalId: personal.workspace.id, planName: plan.name }));
});
