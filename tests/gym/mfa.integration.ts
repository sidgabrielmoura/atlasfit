import { afterAll, describe, expect, it } from "vitest";
import { randomUUID, createHash } from "node:crypto";
import prisma from "@/lib/prisma";
import { resolveAuthenticationPolicy, prepareEmailFactor, consumeEmailFactor, consumeAuthenticatorFactor, authenticationPolicyKey } from "@/lib/auth/mfa-service";
import { issueCredentialProof, consumeCredentialProof } from "@/lib/auth/credential-proof";
import { generateTOTPSecret, generateTOTPToken } from "@/lib/auth/totp";
import { completePasswordReset } from "@/lib/auth/password-reset-service";
import { adminUserSelect, updateAdminUser } from "@/lib/auth/admin-user-service";
import bcrypt from "bcryptjs";
import { mutateMfaSettings as mutateWithProof } from "@/lib/auth/mfa-settings-service";
import { mfaSettingsProofKey, reauthenticateMfaSettings } from "@/lib/auth/mfa-reauthentication";

const target = new URL(process.env.DATABASE_URL || "http://invalid");
if (target.hostname !== "127.0.0.1" || target.port !== "56432" || target.pathname !== "/atlasfit_gym_stabilization_20261001") throw new Error("Exige banco descartável específico.");
afterAll(async () => { await prisma.$disconnect(); });
async function account() { return prisma.user.create({ data: { email: `mfa-${randomUUID()}@example.invalid`, password: "hash-sintetico", twoFactorEnabled: true, role: "SUPERADMIN" } }); }
async function mutateMfaSettings(userId: string, version: number, input: unknown) {
  const policy = await resolveAuthenticationPolicy(userId);
  const proof = policy ? await issueCredentialProof(userId, policy.user.password || "", mfaSettingsProofKey(policy)) : undefined;
  return mutateWithProof(userId, version, input, proof);
}

describe("Autenticação PostgreSQL — fatores e provas", () => {
  it("edição MFA exige prova própria recente; prova de login, usuário estrangeiro e ausência não autorizam", async () => {
    const user = await account(), other = await account();
    const policy = await resolveAuthenticationPolicy(user.id), foreign = await resolveAuthenticationPolicy(other.id);
    if (!policy || !foreign) throw new Error("Fixture sem política.");
    const input = { operation: "DISABLE" };
    await expect(mutateWithProof(user.id, 0, input)).rejects.toMatchObject({ statusCode: 403 });
    const loginProof = await issueCredentialProof(user.id, user.password || "", authenticationPolicyKey(policy));
    await expect(mutateWithProof(user.id, 0, input, loginProof)).rejects.toMatchObject({ statusCode: 403 });
    const foreignProof = await issueCredentialProof(other.id, other.password || "", mfaSettingsProofKey(foreign));
    await expect(mutateWithProof(user.id, 0, input, foreignProof)).rejects.toMatchObject({ statusCode: 403 });
    const expired = await issueCredentialProof(user.id, user.password || "", mfaSettingsProofKey(policy));
    await prisma.verificationToken.updateMany({ where: { token: createHash("sha256").update(expired).digest("hex") }, data: { expires: new Date(Date.now() - 1000) } });
    await expect(mutateWithProof(user.id, 0, input, expired)).rejects.toMatchObject({ statusCode: 403 });
    expect(await prisma.user.findUnique({ where: { id: user.id } })).toMatchObject({ twoFactorEnabled: true, sessionVersion: 0 });
  });
  it("reautenticação confirma senha e TOTP atuais; prova é consumida junto com alteração/versionamento", async () => {
    const user = await account(), secret = generateTOTPSecret();
    await prisma.user.update({ where: { id: user.id }, data: { password: await bcrypt.hash("password-current-synthetic", 10), twoFactorSecret: secret, twoFactorType: "AUTHENTICATOR", threeFactorEnabled: false } });
    await expect(reauthenticateMfaSettings(user.id, 0, { password: "password-wrong" })).rejects.toMatchObject({ statusCode: 401 });
    expect(await reauthenticateMfaSettings(user.id, 0, { password: "password-current-synthetic" })).toMatchObject({ success: false, step: "TOTP" });
    const response = await reauthenticateMfaSettings(user.id, 0, { password: "password-current-synthetic", totpCode: generateTOTPToken(secret) });
    if (!response.success) throw new Error("Confirmação incompleta.");
    const results = await Promise.allSettled([mutateWithProof(user.id, 0, { operation: "DISABLE" }, response.reauthenticationProof), mutateWithProof(user.id, 0, { operation: "DISABLE" }, response.reauthenticationProof)]);
    expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1);
    expect(await prisma.user.findUnique({ where: { id: user.id } })).toMatchObject({ twoFactorEnabled: false, twoFactorSecret: null, sessionVersion: 1 });
    expect(await prisma.auditLog.count({ where: { userId: user.id, action: "MFA_DISABLE_REVOKE_SESSIONS" } })).toBe(1);
  });
  it("MFA recusa boolean falso em string e conta sem privilégio; dispositivo e versão são atômicos", async () => {
    const user = await account(); const other = await account(); const secret = generateTOTPSecret();
    await expect(mutateMfaSettings(user.id, 0, { operation: "THREE_FACTOR", enabled: "false" })).rejects.toMatchObject({ code: "INVALID_REQUEST" });
    await prisma.user.update({ where: { id: other.id }, data: { role: "USER" } });
    await expect(mutateMfaSettings(other.id, 0, { operation: "DISABLE" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    const paired = await mutateMfaSettings(user.id, 0, { operation: "PAIR", secret, token: generateTOTPToken(secret), deviceName: "Simulador" });
    expect(paired).toMatchObject({ success: true, reauthenticationRequired: true });
    if (!paired.success || !paired.device) throw new Error("Não houve pareamento.");
    expect(paired.backupCodes).toHaveLength(8);
    await expect(mutateMfaSettings(user.id, 0, { operation: "DISABLE" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(mutateMfaSettings(other.id, 0, { operation: "REMOVE", deviceId: paired.device.id })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    const removed = await mutateMfaSettings(user.id, 1, { operation: "REMOVE", deviceId: paired.device.id });
    expect(removed).toMatchObject({ remainingCount: 0, reauthenticationRequired: true });
    expect(await prisma.user.findUnique({ where: { id: user.id } })).toMatchObject({ sessionVersion: 2, twoFactorSecret: null, threeFactorEnabled: false, twoFactorType: "EMAIL", twoFactorBackupCodes: [] });
  });
  it("mudanças MFA concorrentes com a mesma sessão não produzem estados misturados ou auditoria duplicada", async () => {
    const user = await account(); const secret = generateTOTPSecret();
    const input = { operation: "PAIR", secret, token: generateTOTPToken(secret), deviceName: "Simulador concorrente" };
    const results = await Promise.allSettled([mutateMfaSettings(user.id, 0, input), mutateMfaSettings(user.id, 0, input)]);
    expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1);
    expect(await prisma.userTotpDevice.count({ where: { userId: user.id } })).toBe(1);
    expect(await prisma.auditLog.count({ where: { userId: user.id, action: "MFA_PAIR_REVOKE_SESSIONS" } })).toBe(1);
    const accountState = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(accountState.sessionVersion).toBe(1); expect(accountState.twoFactorSecret).toBe(secret);
  });
  it("reset concorrente troca senha uma vez, revoga sessões e invalida provas anteriores", async () => {
    const user = await account();
    const before = await resolveAuthenticationPolicy(user.id);
    if (!before || !user.email) throw new Error("Fixture sem política.");
    const proof = await issueCredentialProof(user.id, before.user.password || "", authenticationPolicyKey(before));
    const token = randomUUID();
    await prisma.passwordResetToken.create({ data: { email: user.email, token, expires: new Date(Date.now() + 60000) } });
    const resets = await Promise.all([completePasswordReset({ token, password: "nova-senha-sintetica" }), completePasswordReset({ token, password: "nova-senha-sintetica" })]);
    expect(resets.filter(result => result.success)).toHaveLength(1);
    const after = await resolveAuthenticationPolicy(user.id);
    if (!after) throw new Error("Fixture sem política atual.");
    expect(after.user.sessionVersion).toBe(before.user.sessionVersion + 1);
    expect(await bcrypt.compare("nova-senha-sintetica", after.user.password || "")).toBe(true);
    expect(await consumeCredentialProof(user.id, after.user.password || "", proof, authenticationPolicyKey(after))).toBe(false);
    expect(await prisma.passwordResetToken.count({ where: { email: user.email } })).toBe(0);
  });
  it("reset expirado não altera conta; admin DTO não retorna segredos e mudança de papel revoga sessão", async () => {
    const admin = await account(); const target = await account(); const token = randomUUID();
    if (!target.email) throw new Error("Fixture sem email.");
    await prisma.passwordResetToken.create({ data: { email: target.email, token, expires: new Date(Date.now() - 1000) } });
    expect(await completePasswordReset({ token, password: "nova-senha" })).toMatchObject({ error: expect.any(String) });
    const unchanged = await prisma.user.findUniqueOrThrow({ where: { id: target.id } });
    expect(unchanged.sessionVersion).toBe(0); expect(unchanged.password).toBe(target.password);
    await prisma.user.update({ where: { id: target.id }, data: { setupToken: randomUUID(), twoFactorSecret: "segredo-sintetico", twoFactorBackupCodes: ["backup-sintetico"] } });
    const dto = await updateAdminUser(target.id, admin.id, { role: "USER", twoFactorEnabled: false });
    for (const field of ["password", "setupToken", "sessionVersion", "twoFactorSecret", "twoFactorBackupCodes"]) expect(dto).not.toHaveProperty(field);
    const selected = await prisma.user.findUniqueOrThrow({ where: { id: target.id }, select: adminUserSelect });
    expect(selected).toEqual(dto);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: target.id } })).sessionVersion).toBe(1);
    await expect(updateAdminUser(target.id, target.id, { role: "SUPERADMIN" })).rejects.toMatchObject({ code: "INSUFFICIENT_PERMISSIONS" });
    await expect(updateAdminUser(target.id, admin.id, { twoFactorEnabled: "false" })).rejects.toMatchObject({ code: "INVALID_REQUEST" });
    await expect(updateAdminUser(target.id, admin.id, { sessionVersion: 0 })).rejects.toMatchObject({ code: "INVALID_REQUEST" });
  });
  it("e-mail é armazenado como digest, consumido uma vez e não serve para outro usuário", async () => {
    const user = await account(); const other = await account();
    const policy = await resolveAuthenticationPolicy(user.id); const otherPolicy = await resolveAuthenticationPolicy(other.id);
    if (!policy || !otherPolicy) throw new Error("Fixture sem política.");
    const factor = await prepareEmailFactor(policy.identifier, false);
    if (!factor.code) throw new Error("Fixture sem código.");
    expect((await prisma.verificationToken.findFirst({ where: { identifier: policy.identifier } }))?.token).not.toBe(factor.code);
    expect(await consumeEmailFactor(otherPolicy.identifier, factor.code, false)).toBe(false);
    const attempts = await Promise.all([consumeEmailFactor(policy.identifier, factor.code, false), consumeEmailFactor(policy.identifier, factor.code, false)]);
    expect(attempts.filter(Boolean)).toHaveLength(1);
  });
  it("3FA exige e-mail e autenticador; código TOTP e marcador de e-mail não podem ser reutilizados", async () => {
    const user = await account(); const secret = generateTOTPSecret();
    await prisma.user.update({ where: { id: user.id }, data: { threeFactorEnabled: true, twoFactorType: "AUTHENTICATOR", twoFactorSecret: secret } });
    const policy = await resolveAuthenticationPolicy(user.id);
    if (!policy) throw new Error("Fixture sem política.");
    expect(policy).toMatchObject({ requiresEmail: true, requiresTotp: true, threeFactor: true });
    const code = generateTOTPToken(secret);
    expect(await consumeAuthenticatorFactor(user.id, policy.identifier, code, true)).toBe(false);
    const factor = await prepareEmailFactor(policy.identifier, false);
    if (!factor.code) throw new Error("Fixture sem código.");
    expect(await consumeEmailFactor(policy.identifier, factor.code, true)).toBe(true);
    expect(await consumeAuthenticatorFactor(user.id, policy.identifier, code, true)).toBe(true);
    expect(await consumeAuthenticatorFactor(user.id, policy.identifier, code, false)).toBe(false);
    expect(await consumeEmailFactor(policy.identifier, factor.code, true)).toBe(false);
  });
  it("backup concorrente tem um consumo e prova é vinculada à versão e política atuais", async () => {
    const user = await account(); const secret = generateTOTPSecret();
    await prisma.user.update({ where: { id: user.id }, data: { twoFactorType: "AUTHENTICATOR", twoFactorSecret: secret, twoFactorBackupCodes: ["SYNTHETIC-BACKUP"] } });
    const policy = await resolveAuthenticationPolicy(user.id); if (!policy) throw new Error("Fixture sem política.");
    const attempts = await Promise.allSettled([consumeAuthenticatorFactor(user.id, policy.identifier, "SYNTHETIC-BACKUP", false), consumeAuthenticatorFactor(user.id, policy.identifier, "SYNTHETIC-BACKUP", false)]);
    expect(attempts.filter(attempt => attempt.status === "fulfilled" && attempt.value)).toHaveLength(1);
    expect((await prisma.user.findUnique({ where: { id: user.id } }))?.twoFactorBackupCodes).toEqual([]);
    const key = authenticationPolicyKey(policy);
    const proof = await issueCredentialProof(user.id, user.password || "", key);
    await prisma.user.update({ where: { id: user.id }, data: { sessionVersion: { increment: 1 } } });
    const refreshed = await resolveAuthenticationPolicy(user.id); if (!refreshed) throw new Error("Fixture sem política.");
    expect(await consumeCredentialProof(user.id, user.password || "", proof, authenticationPolicyKey(refreshed))).toBe(false);
    expect(await consumeCredentialProof(user.id, user.password || "", proof, key)).toBe(true);
  });
  it("exigência de gestores GYM independe de papel global USER e da assinatura pessoal", async () => {
    const user = await prisma.user.create({ data: { email: `manager-${randomUUID()}@example.invalid`, password: "synthetic", role: "USER", twoFactorEnabled: false } });
    const workspace = await prisma.workspace.create({ data: { ownerId: user.id, name: "Academia", slug: `gym-mfa-${randomUUID()}`, type: "GYM" } });
    await prisma.workspaceMember.create({ data: { workspaceId: workspace.id, userId: user.id, role: "OWNER" } });
    await prisma.systemSetting.upsert({ where: { key: "gym_security_require_2fa_managers" }, create: { key: "gym_security_require_2fa_managers", value: "true" }, update: { value: "true" } });
    try { expect(await resolveAuthenticationPolicy(user.id)).toMatchObject({ requiresMfa: true, requiresEmail: true }); }
    finally { await prisma.systemSetting.update({ where: { key: "gym_security_require_2fa_managers" }, data: { value: "false" } }); }
  });
});
