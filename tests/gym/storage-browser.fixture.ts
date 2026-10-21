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
it("prepara administrador próprio e quarenta registros para paginação visual", async () => {
  const password = `synthetic-storage-${randomUUID()}`, prefix = `storage-visual-${randomUUID()}`;
  const user = await prisma.user.create({ data: { name: "Administrador visual sintético", email: `storage-admin-${randomUUID()}@example.invalid`, role: "SUPERADMIN", password: await bcrypt.hash(password, 10), onboarded: true, birthDate: new Date("1990-01-15") } });
  for (const documentType of ["TERMS", "PRIVACY"] as const) {
    const now = new Date(), document = await prisma.legalDocument.findFirstOrThrow({ where: { type: documentType, status: "PUBLISHED", publishedAt: { lte: now }, effectiveAt: { lte: now } }, orderBy: [{ effectiveAt: "desc" }, { publishedAt: "desc" }, { id: "desc" }] });
    await reacceptOwnDocument(user.id, { documentType, documentId: document.id, documentVersion: document.version, documentHash: document.contentHash, accepted: true });
  }
  await prisma.user.createMany({ data: Array.from({ length: 40 }, (_, index) => ({ name: `${prefix} ${String(index).padStart(3, "0")}`, email: `${prefix}-${index}@example.invalid`, role: "TRAINER", isTestAccount: index === 38 || index === 39 })) });
  const policy = await resolveAuthenticationPolicy(user.id); if (!policy) throw new Error("Política ausente.");
  const proof = await issueCredentialProof(user.id, policy.user.password || "", authenticationPolicyKey(policy));
  // Single-use synthetic credentials stay in .tmp, never in published evidence.
  writeFileSync(".tmp/gym-stabilization/storage-browser-fixture.json", JSON.stringify({ user: { id: user.id, email: user.email, proof }, password, prefix }));
});
