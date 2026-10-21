import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { afterAll, it } from "vitest";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { issueCredentialProof } from "@/lib/auth/credential-proof";
import { resolveAuthenticationPolicy, authenticationPolicyKey } from "@/lib/auth/mfa-service";
import { reacceptOwnDocument } from "@/lib/privacy/reacceptance";
const database = new URL(process.env.DATABASE_URL || "http://invalid");
if (database.hostname !== "127.0.0.1" || database.port !== "56432" || database.pathname !== "/atlasfit_gym_stabilization_20261001") throw new Error("Exige banco descartável específico.");
afterAll(async () => { await prisma.$disconnect(); });
it("prepara gerente/financeiro em duas academias e PERSONAL com trial próprio", async () => {
  const password = `synthetic-context-${randomUUID()}`, users = [];
  for (const name of ["Titular visual", "Gerente e financeiro visual"]) {
    const user = await prisma.user.create({ data: { name, email: `context-${randomUUID()}@example.invalid`, role: "TRAINER", onboarded: true, birthDate: new Date("1990-01-15"), password: await bcrypt.hash(password, 10) } });
    for (const documentType of ["TERMS", "PRIVACY"] as const) {
      const now = new Date(), document = await prisma.legalDocument.findFirstOrThrow({ where: { type: documentType, status: "PUBLISHED", publishedAt: { lte: now }, effectiveAt: { lte: now } }, orderBy: [{ effectiveAt: "desc" }, { publishedAt: "desc" }, { id: "desc" }] });
      await reacceptOwnDocument(user.id, { documentType, documentId: document.id, documentVersion: document.version, documentHash: document.contentHash, accepted: true });
    }
    const policy = await resolveAuthenticationPolicy(user.id); if (!policy) throw new Error("Política ausente."); const proof = await issueCredentialProof(user.id, policy.user.password || "", authenticationPolicyKey(policy)); users.push({ id: user.id, email: user.email, proof });
  }
  const gyms = [];
  for (const [index, name] of ["Academia Contexto A", "Academia Contexto B"].entries()) {
    const gym = await prisma.workspace.create({ data: { ownerId: users[0].id, type: "GYM", name, slug: randomUUID(), members: { create: [{ userId: users[0].id, role: "OWNER" }, { userId: users[1].id, role: index === 0 ? "MANAGER" : "FINANCE" }] }, units: { create: { name: "Unidade " + name } }, subscription: { create: { status: "ACTIVE", maxStudents: 10, maxStaff: 5 } } } }); gyms.push({ id: gym.id, name });
  }
  const personal = await prisma.workspace.create({ data: { ownerId: users[0].id, type: "PERSONAL", name: "Personal Contexto Trial", slug: randomUUID(), members: { create: { userId: users[0].id, role: "OWNER" } } } });
  const trial = await prisma.freeTrial.create({ data: { userId: users[0].id, startDate: new Date(Date.now() - 86400000), endDate: new Date(Date.now() + 7 * 86400000), isActive: true } });
  writeFileSync(".tmp/gym-stabilization/context-browser-fixture.json", JSON.stringify({ users, password, gyms, personal: { id: personal.id, name: personal.name }, trialId: trial.id }));
});
