import { afterAll, describe, expect, it } from "vitest";
import { createHash, randomUUID, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { issueImpersonationStart, issueImpersonationReturn, consumeImpersonationGrant } from "@/lib/auth/impersonation-service";
import { changeOwnPassword } from "@/lib/auth/password-change-service";

const target = new URL(process.env.DATABASE_URL || "http://invalid");
if (target.hostname !== "127.0.0.1" || target.port !== "56432" || target.pathname !== "/atlasfit_gym_stabilization_20261001") throw new Error("Exige banco descartável específico.");
afterAll(async () => { await prisma.$disconnect(); });
const password = "Synthetic-password-2026!";
const digest = (token: string) => createHash("sha256").update(token).digest("hex");
async function fixture() {
  const hash = await bcrypt.hash(password, 10);
  const admin = await prisma.user.create({ data: { email: `admin-${randomUUID()}@example.invalid`, password: hash, role: "SUPERADMIN" } });
  const user = await prisma.user.create({ data: { email: `target-${randomUUID()}@example.invalid`, password: hash } });
  return { admin, user };
}
const start = (f: Awaited<ReturnType<typeof fixture>>) => issueImpersonationStart(f.admin, { targetUserId: f.user.id, reason: "Ensaio sintético de suporte" });

describe("PostgreSQL — revogação e grants de suporte", () => {
  it("grava só hash, consumo concorrente tem um vencedor e retorno restaura apenas o administrador original", async () => {
    const f = await fixture(), issued = await start(f);
    expect(await prisma.verificationToken.findUnique({ where: { token: issued.token } })).toBeNull();
    expect(await prisma.verificationToken.findUnique({ where: { token: digest(issued.token) } })).not.toBeNull();
    const results = await Promise.all([consumeImpersonationGrant(issued.token), consumeImpersonationGrant(issued.token)]);
    expect(results.filter(Boolean)).toHaveLength(1); const support = results.find(result => result !== null)!;
    expect(support).toMatchObject({ id: f.user.id, originalAdminUserId: f.admin.id, originalAdminSessionVersion: 0, isImpersonated: true });
    await expect(issueImpersonationStart(support, { targetUserId: f.admin.id, reason: "Tentativa de cadeia" })).rejects.toMatchObject({ statusCode: 403 });
    const returning = await issueImpersonationReturn(support);
    expect(await consumeImpersonationGrant(returning.token)).toMatchObject({ id: f.admin.id, isImpersonated: false });
    expect(await consumeImpersonationGrant(returning.token)).toBeNull();
    const audits = await prisma.auditLog.findMany({ where: { userId: f.admin.id } });
    expect(audits.map(row => row.action)).toContain("IMPERSONATION_RETURN_CONSUMED");
    expect(JSON.stringify(audits)).not.toContain(issued.token); expect(JSON.stringify(audits)).not.toContain(returning.token);
  });
  it("revogar administrador ou alvo antes de consumir invalida o grant; token antigo por e-mail e expirado também falham", async () => {
    for (const subject of ["admin", "user"] as const) {
      const f = await fixture(), issued = await start(f);
      await prisma.user.update({ where: { id: f[subject].id }, data: { sessionVersion: { increment: 1 } } });
      expect(await consumeImpersonationGrant(issued.token)).toBeNull();
    }
    const f = await fixture(), issued = await start(f);
    await prisma.verificationToken.update({ where: { token: digest(issued.token) }, data: { expires: new Date(Date.now() - 1) } });
    expect(await consumeImpersonationGrant(issued.token)).toBeNull();
    const legacy = randomBytes(32).toString("hex"); await prisma.verificationToken.create({ data: { token: legacy, identifier: `IMPERSONATION:${f.user.email}:${f.admin.email}`, expires: new Date(Date.now() + 60000) } });
    expect(await consumeImpersonationGrant(legacy)).toBeNull();
  });
  it("retorno pendente não sobrevive à revogação do administrador nem da sessão efetiva", async () => {
    for (const subject of ["admin", "user"] as const) {
      const f = await fixture(), issued = await start(f), support = await consumeImpersonationGrant(issued.token);
      if (!support) throw new Error("Grant válido ausente.");
      const returning = await issueImpersonationReturn(support);
      await prisma.user.update({ where: { id: f[subject].id }, data: { sessionVersion: { increment: 1 } } });
      expect(await consumeImpersonationGrant(returning.token)).toBeNull();
      await expect(issueImpersonationReturn(support)).rejects.toMatchObject({ statusCode: 403 });
    }
  });
  it("conta administrativa exige login próprio; promoção do alvo não transforma suporte em sessão administrativa", async () => {
    const f = await fixture(), protectedAdmin = await prisma.user.create({ data: { role: "SUPERADMIN", password: await bcrypt.hash(password, 10), email: `${randomUUID()}@example.invalid` } });
    await expect(issueImpersonationStart(f.admin, { targetUserId: protectedAdmin.id, reason: "Login administrativo deve ser próprio" })).rejects.toMatchObject({ statusCode: 403 });
    const issued = await start(f);
    await prisma.user.update({ where: { id: f.user.id }, data: { role: "SUPERADMIN" } });
    expect(await consumeImpersonationGrant(issued.token)).toBeNull();
  });
  it("troca própria de senha limpa links e revoga versão; suporte, senha inválida e sessão antiga não alteram credenciais", async () => {
    const f = await fixture();
    const reset = await prisma.passwordResetToken.create({ data: { email: f.user.email!, token: randomUUID(), expires: new Date(Date.now() + 60000) } });
    const input = { action: "changePassword", currentPassword: password, newPassword: "New-synthetic-password!" };
    await expect(changeOwnPassword({ ...f.user, isImpersonated: true }, input)).rejects.toMatchObject({ statusCode: 403 });
    await expect(changeOwnPassword(f.user, { ...input, newPassword: "😀".repeat(20) })).rejects.toMatchObject({ statusCode: 400 });
    await expect(changeOwnPassword(f.user, { ...input, actorUserId: f.admin.id })).rejects.toMatchObject({ statusCode: 400 });
    await expect(changeOwnPassword(f.user, { ...input, currentPassword: "wrong" })).rejects.toMatchObject({ statusCode: 400 });
    expect(await changeOwnPassword(f.user, input)).toMatchObject({ success: true });
    const changed = await prisma.user.findUniqueOrThrow({ where: { id: f.user.id } });
    expect(changed.sessionVersion).toBe(1); expect(await bcrypt.compare(input.newPassword, changed.password!)).toBe(true);
    expect(await prisma.passwordResetToken.findUnique({ where: { id: reset.id } })).toBeNull();
    await expect(changeOwnPassword(f.user, { ...input, currentPassword: input.newPassword })).rejects.toMatchObject({ statusCode: 403 });
    expect(await prisma.auditLog.count({ where: { userId: f.user.id, action: "PASSWORD_CHANGED_REVOKE_SESSIONS" } })).toBe(1);
  });
});
