import { createHash, randomBytes, randomInt } from "node:crypto";
import prisma from "@/lib/prisma";
import { resolveAccessRoles } from "@/modules/workspaces/domain/access-roles";
import { serializableTransaction, type GymTransactionClient } from "@/modules/workspaces/application/transaction";
import { generateTOTPToken } from "./totp";
import { permitsOwnAccount } from "./account-eligibility";

export async function resolveAuthenticationPolicy(userId: string, db: GymTransactionClient = prisma) {
  const user = await db.user.findUnique({ where: { id: userId }, select: { id: true, email: true, role: true, password: true, sessionVersion: true, twoFactorEnabled: true, twoFactorType: true, twoFactorSecret: true, threeFactorEnabled: true, totpDevices: { select: { id: true, secret: true } } } });
  if (!user?.password || !user.email) return null;
  if (!await permitsOwnAccount(user.id, db)) return null;
  const global = await db.systemSetting.findUnique({ where: { key: "two_factor_auth_enabled" } });
  const mandatory = await db.systemSetting.findUnique({ where: { key: "gym_security_require_2fa_managers" } });
  let gymMandatory = false;
  if (mandatory?.value === "true") {
    const memberships = await db.workspaceMember.findMany({ where: { userId, isActive: true, workspace: { type: "GYM", isActive: true } }, include: { roleGrants: true, workspace: { select: { ownerId: true } } } });
    gymMandatory = memberships.some(member => member.workspace.ownerId === userId || member.roleGrants.some(grant => !grant.revokedAt && ["OWNER", "MANAGER", "FINANCE"].includes(grant.role)) || resolveAccessRoles(member.role, member.roleGrants).some(role => ["OWNER", "MANAGER", "FINANCE"].includes(role)));
  }
  const hasTotp = Boolean(user.twoFactorSecret) || user.totpDevices.length > 0;
  const threeFactor = user.role === "SUPERADMIN" && user.threeFactorEnabled === true && hasTotp;
  const requiresMfa = gymMandatory || (user.twoFactorEnabled ?? global?.value === "true") || threeFactor;
  const requiresTotp = requiresMfa && hasTotp && (threeFactor || user.twoFactorType === "AUTHENTICATOR");
  return { user, requiresMfa, requiresTotp, requiresEmail: requiresMfa && (!requiresTotp || threeFactor), threeFactor, identifier: `MFA:${userId}:${user.sessionVersion}:${createHash("sha256").update(user.password).digest("hex")}` };
}

export async function resolveAuthenticationPolicyByEmail(email: string) {
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  return user ? resolveAuthenticationPolicy(user.id) : null;
}

function digest(identifier: string, code: string) { return createHash("sha256").update(`${identifier}:${code}`).digest("hex"); }
export function authenticationPolicyKey(policy: NonNullable<Awaited<ReturnType<typeof resolveAuthenticationPolicy>>>) {
  return `${policy.identifier}:${policy.requiresEmail}:${policy.requiresTotp}:${policy.threeFactor}`;
}
const ttl = 10 * 60000;

/** Returns the raw code only to the server mail dispatcher, never to the browser. */
export async function prepareEmailFactor(identifier: string, forceNew: boolean) {
  return serializableTransaction(async tx => {
    const existing = await tx.verificationToken.findFirst({ where: { identifier, expires: { gt: new Date() } } });
    if (existing && !forceNew) return { existing: true, code: null };
    await tx.verificationToken.deleteMany({ where: { identifier } });
    const code = randomInt(100000, 1000000).toString();
    await tx.verificationToken.create({ data: { identifier, token: digest(identifier, code), expires: new Date(Date.now() + ttl) } });
    return { existing: false, code };
  });
}

export async function consumeEmailFactor(identifier: string, code: string, requireTotp: boolean) {
  if (!/^\d{6}$/.test(code)) return false;
  return serializableTransaction(async tx => {
    const claim = await tx.verificationToken.deleteMany({ where: { identifier, token: digest(identifier, code), expires: { gt: new Date() } } });
    if (claim.count !== 1) return false;
    if (requireTotp) {
      const next = `${identifier}:EMAIL_VERIFIED`;
      await tx.verificationToken.deleteMany({ where: { identifier: next } });
      await tx.verificationToken.create({ data: { identifier: next, token: randomBytes(32).toString("hex"), expires: new Date(Date.now() + ttl) } });
    }
    return true;
  });
}

/** TOTP steps, backup codes and 3FA's email proof are consumed in the same transaction. */
export async function consumeAuthenticatorFactor(userId: string, identifier: string, code: string, requireEmailProof: boolean) {
  return serializableTransaction(async tx => {
    const user = await tx.user.findUnique({ where: { id: userId }, select: { twoFactorSecret: true, twoFactorBackupCodes: true, totpDevices: { select: { id: true, secret: true } } } });
    if (!user) return false;
    const next = `${identifier}:EMAIL_VERIFIED`;
    if (requireEmailProof && !await tx.verificationToken.findFirst({ where: { identifier: next, expires: { gt: new Date() } } })) return false;
    const clean = code.trim().toUpperCase();
    const devices = [...user.totpDevices, ...(user.twoFactorSecret ? [{ id: "LEGACY", secret: user.twoFactorSecret }] : [])];
    let valid = false;
    if (/^\d{6}$/.test(clean)) {
      const counter = Math.floor(Date.now() / 30000);
      for (const device of devices) {
        for (const offset of [-1, 0, 1]) {
          if (generateTOTPToken(device.secret, offset) !== clean) continue;
          const usedIdentifier = `TOTP_USED:${userId}:${device.id}:${counter + offset}`;
          if (await tx.verificationToken.findFirst({ where: { identifier: usedIdentifier } })) return false;
          await tx.verificationToken.create({ data: { identifier: usedIdentifier, token: digest(usedIdentifier, "used"), expires: new Date(Date.now() + 120000) } });
          if (device.id !== "LEGACY") await tx.userTotpDevice.update({ where: { id: device.id }, data: { lastUsedAt: new Date() } });
          valid = true;
          break;
        }
        if (valid) break;
      }
    } else if (user.twoFactorBackupCodes.includes(clean)) {
      const updated = await tx.user.updateMany({ where: { id: userId, twoFactorBackupCodes: { has: clean } }, data: { twoFactorBackupCodes: user.twoFactorBackupCodes.filter(value => value !== clean) } });
      valid = updated.count === 1;
    }
    if (!valid) return false;
    if (requireEmailProof && (await tx.verificationToken.deleteMany({ where: { identifier: next, expires: { gt: new Date() } } })).count !== 1) throw new Error("Prova de e-mail consumida simultaneamente.");
    return true;
  });
}
