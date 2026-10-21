import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import prisma from "@/lib/prisma";
import { permitsOwnAccount } from "@/lib/auth/account-eligibility";
import { resolveAuthenticationPolicy } from "@/lib/auth/mfa-service";
import { completePasswordReset } from "@/lib/auth/password-reset-service";
import { getPasswordSetupInfo } from "@/lib/auth/password-setup-service";
import { parseBirthDate, civilAge } from "@/lib/privacy/civil-age";
import { validateAgeEligibility, validateGymMinorEligibility } from "@/lib/privacy/age-validator";

const target = new URL(process.env.DATABASE_URL || "http://invalid");
if (target.hostname !== "127.0.0.1" || target.port !== "56432" || target.pathname !== "/atlasfit_gym_stabilization_20261001") throw new Error("Exige PostgreSQL descartável específico.");
afterAll(async () => { await prisma.$disconnect(); });
describe("Menor acessa por responsável — conta própria bloqueada", () => {
  it("data civil rejeita rollover e calcula aniversário em São Paulo, independente do TZ do servidor", () => {
    for (const value of ["2026-02-31", "31/02/2000", "2000-13-01", "1990/01/15", "texto", "2000-01-01T99:00:00Z"]) expect(parseBirthDate(value)).toBeNull();
    expect(parseBirthDate("29/02/2000")?.toISOString()).toBe("2000-02-29T00:00:00.000Z");
    const birth = parseBirthDate("2008-10-01"); if (!birth) throw new Error("Fixture inválida.");
    expect(civilAge(birth, new Date("2026-10-01T02:59:59Z"))).toBe(17);
    expect(civilAge(birth, new Date("2026-10-01T03:00:00Z"))).toBe(18);
    expect(validateAgeEligibility("2000-02-31").isValid).toBe(false);
    expect(validateGymMinorEligibility("2000-02-31").isValid).toBe(false);
  });
  it("conta antiga com senha, reset ou convite não habilita menor; histórico e tokens permanecem", async () => {
    const token = randomUUID(); const resetToken = randomUUID();
    const user = await prisma.user.create({ data: { email: `minor-existing-${randomUUID()}@example.invalid`, birthDate: new Date("2013-01-15T00:00:00Z"), password: "hash-sintetico", setupToken: token, setupTokenExpiresAt: new Date(Date.now() + 60000) } });
    if (!user.email) throw new Error("Fixture sem email.");
    await prisma.passwordResetToken.create({ data: { email: user.email, token: resetToken, expires: new Date(Date.now() + 60000) } });
    expect(await permitsOwnAccount(user.id)).toBe(false);
    expect(await resolveAuthenticationPolicy(user.id)).toBeNull();
    expect(await completePasswordReset({ token: resetToken, password: "senha-nova-sintetica" })).toHaveProperty("error");
    expect(await getPasswordSetupInfo(token)).toHaveProperty("error");
    expect(await prisma.user.findUnique({ where: { id: user.id } })).toMatchObject({ password: user.password, setupToken: token, sessionVersion: 0 });
    expect(await prisma.passwordResetToken.count({ where: { token: resetToken } })).toBe(1);
  });
  it("flag local sem data bloqueia conta própria; adulto conhecido e PERSONAL legado são preservados", async () => {
    const owner = await prisma.user.create({ data: { email: `minor-policy-owner-${randomUUID()}@example.invalid` } });
    const workspace = await prisma.workspace.create({ data: { ownerId: owner.id, type: "GYM", name: "Política menor", slug: `minor-policy-${randomUUID()}` } });
    const user = await prisma.user.create({ data: { email: `minor-unknown-${randomUUID()}@example.invalid` } });
    await prisma.workspaceMember.create({ data: { workspaceId: workspace.id, userId: user.id, role: "STUDENT", isMinor: true } });
    expect(await permitsOwnAccount(user.id)).toBe(false);
    await prisma.user.update({ where: { id: user.id }, data: { birthDate: new Date("1990-01-15T00:00:00Z") } });
    expect(await permitsOwnAccount(user.id)).toBe(true);
    expect(await permitsOwnAccount(owner.id)).toBe(true);
    expect(await permitsOwnAccount(randomUUID())).toBe(false);
  });
});
