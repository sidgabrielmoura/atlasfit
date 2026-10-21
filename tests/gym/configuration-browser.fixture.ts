import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { afterAll, it } from "vitest";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { issueCredentialProof } from "@/lib/auth/credential-proof";
import { resolveAuthenticationPolicy, authenticationPolicyKey } from "@/lib/auth/mfa-service";
import { reacceptOwnDocument } from "@/lib/privacy/reacceptance";

const database = new URL(process.env.DATABASE_URL || "http://invalid");
if (database.hostname !== "127.0.0.1" || database.port !== "56432" || database.pathname !== "/atlasfit_gym_stabilization_20261001") throw new Error("Fixture exige banco descartável específico.");
afterAll(async () => { await prisma.$disconnect(); });
it("prepara dois administradores e academia somente para verificação de configurações", async () => {
  const password = `synthetic-config-${randomUUID()}`;
  const admins = [];
  for (let index = 0; index < 2; index++) {
    const user = await prisma.user.create({ data: { name: `Administrador visual ${index}`, email: `config-${randomUUID()}@example.invalid`, role: "SUPERADMIN", birthDate: new Date("1990-01-15"), password: await bcrypt.hash(password, 10) } });
    for (const documentType of ["TERMS", "PRIVACY"] as const) {
      const now = new Date();
      const document = await prisma.legalDocument.findFirstOrThrow({ where: { type: documentType, status: "PUBLISHED", publishedAt: { lte: now }, effectiveAt: { lte: now } }, orderBy: [{ effectiveAt: "desc" }, { publishedAt: "desc" }, { id: "desc" }] });
      await reacceptOwnDocument(user.id, { documentType, documentId: document.id, documentVersion: document.version, documentHash: document.contentHash, accepted: true });
    }
    const policy = await resolveAuthenticationPolicy(user.id); if (!policy) throw new Error("Política sintética ausente.");
    const proof = await issueCredentialProof(user.id, policy.user.password || "", authenticationPolicyKey(policy));
    admins.push({ id: user.id, email: user.email, proof });
  }
  const owner = await prisma.user.create({ data: { name: "Titular de configuração sintética", role: "TRAINER" } });
  const workspace = await prisma.workspace.create({ data: { type: "GYM", ownerId: owner.id, name: "Academia configuração visual", slug: `config-${randomUUID()}`,
    members: { create: { userId: owner.id, role: "OWNER" } }, units: { create: { name: "Matriz sintética", address: "Rua da matriz sintética, 10" } },
    settings: { create: { billingGracePeriodDays: 5, requireGuardianSignature: true } },
    subscription: { create: { status: "ACTIVE", maxStudents: 10, maxStaff: 5, maxUnits: 3 } } } });
  writeFileSync(".tmp/gym-stabilization/configuration-browser-fixture.json", JSON.stringify({ admins, password, workspaceId: workspace.id }));
});
