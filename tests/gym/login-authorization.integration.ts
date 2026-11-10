import { randomUUID, createHash } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { authorizeCredentials } from "@/lib/auth/credential-authorization";
import { issueCredentialProof } from "@/lib/auth/credential-proof";
import { resolveAuthenticationPolicy, authenticationPolicyKey } from "@/lib/auth/mfa-service";

const target = new URL(process.env.DATABASE_URL || "http://invalid");
if (target.hostname !== "127.0.0.1" || target.port !== "56432" || target.pathname !== "/atlasfit_gym_stabilization_20261001") throw new Error("Requires disposable PostgreSQL.");
afterAll(() => prisma.$disconnect());
const request = () => new Request("https://app.example.invalid/api/auth/callback/credentials");
async function fixture() {
  const user = await prisma.user.create({ data: { email: `login-cache-${randomUUID()}@example.invalid`, password: await bcrypt.hash("synthetic-password", 4), birthDate: new Date("1990-01-01"), twoFactorEnabled: true } });
  const policy = await resolveAuthenticationPolicy(user.id);
  if (!policy || !user.password) throw new Error("Missing fixture policy");
  const proof = await issueCredentialProof(user.id, user.password, authenticationPolicyKey(policy));
  return { user, proof };
}
describe("Login with real one-use credential proofs", () => {
  it("requires MFA proof and allows only one concurrent consumption without a raw password", async () => {
    const { user, proof } = await fixture();
    expect(await authorizeCredentials({ email: user.email, password: "synthetic-password" }, request())).toBeNull();
    const results = await Promise.all([1, 2, 3].map(() => authorizeCredentials({ email: user.email, authenticationProof: proof }, request())));
    expect(results.filter(Boolean)).toHaveLength(1);
  });
  it("does not accept a proof for another identity", async () => {
    const first = await fixture(), other = await fixture();
    expect(await authorizeCredentials({ email: other.user.email, authenticationProof: first.proof }, request())).toBeNull();
    expect(await authorizeCredentials({ email: first.user.email, authenticationProof: first.proof }, request())).toMatchObject({ id: first.user.id });
  });
  it("rejects expired proofs", async () => {
    const { user, proof } = await fixture();
    await prisma.verificationToken.updateMany({ where: { token: createHash("sha256").update(proof).digest("hex") }, data: { expires: new Date(Date.now() - 1000) } });
    expect(await authorizeCredentials({ email: user.email, authenticationProof: proof }, request())).toBeNull();
  });
  it.each(["password", "sessionVersion", "isBlocked"] as const)("rejects proofs after changing %s", async field => {
    const { user, proof } = await fixture();
    const data = field === "password" ? { password: await bcrypt.hash("changed-password", 4) } : field === "sessionVersion" ? { sessionVersion: { increment: 1 } } : { isBlocked: true };
    await prisma.user.update({ where: { id: user.id }, data });
    expect(await authorizeCredentials({ email: user.email, authenticationProof: proof }, request())).toBeNull();
  });
});
