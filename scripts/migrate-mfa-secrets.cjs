// Dry-run by default. Run with the same stable encryption key as the application.
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
require('ts-node').register({ skipProject: true, transpileOnly: true, compilerOptions: { module: 'CommonJS', moduleResolution: 'node', target: 'ES2022' } });
const { encryptMfaSecret, decryptMfaSecret, hashMfaBackupCode } = require('../src/lib/auth/mfa-secrets.ts');
const supplied = process.env.DIRECT_URL || process.env.DATABASE_URL;
require('dotenv').config({ quiet: true });
const database = supplied || process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!database) throw new Error('Configure DATABASE_URL ou DIRECT_URL.');
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: database }) });
const apply = process.argv.includes('--apply');
(async () => {
  let cursor, users = 0, devices = 0;
  for (;;) {
    const page = await db.user.findMany({ where: { OR: [{ twoFactorSecret: { not: null } }, { twoFactorBackupCodes: { isEmpty: false } }] }, select: { id: true }, orderBy: { id: 'asc' }, take: 100, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}) });
    for (const candidate of page) await db.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "User" WHERE id=${candidate.id} FOR UPDATE`;
      const user = await tx.user.findUnique({ where: { id: candidate.id }, select: { twoFactorSecret: true, twoFactorBackupCodes: true } });
      if (!user) return;
      if (user.twoFactorSecret?.startsWith('mfa:v1:')) decryptMfaSecret(user.twoFactorSecret);
      const legacySecret = user.twoFactorSecret && !user.twoFactorSecret.startsWith('mfa:v1:');
      const legacyCodes = user.twoFactorBackupCodes.some(code => !code.startsWith('sha256:'));
      if (!legacySecret && !legacyCodes) return;
      users++;
      if (apply) await tx.user.update({ where: { id: candidate.id }, data: {
        ...(legacySecret ? { twoFactorSecret: encryptMfaSecret(user.twoFactorSecret) } : {}),
        ...(legacyCodes ? { twoFactorBackupCodes: user.twoFactorBackupCodes.map(code => code.startsWith('sha256:') ? code : hashMfaBackupCode(candidate.id, code)) } : {}),
      } });
    });
    if (page.length < 100) break; cursor = page.at(-1).id;
  }
  cursor = undefined;
  for (;;) {
    const page = await db.userTotpDevice.findMany({ select: { id: true, secret: true }, orderBy: { id: 'asc' }, take: 100, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}) });
    for (const device of page) {
      if (device.secret.startsWith('mfa:v1:')) { decryptMfaSecret(device.secret); continue; }
      devices++;
      if (apply) await db.userTotpDevice.updateMany({ where: { id: device.id, secret: device.secret }, data: { secret: encryptMfaSecret(device.secret) } });
    }
    if (page.length < 100) break; cursor = page.at(-1).id;
  }
  console.log(JSON.stringify({ dryRun: !apply, users, devices }));
})().catch(error => { console.error('MFA_MIGRATION_FAILED', error.code || error.name); process.exitCode = 1; }).finally(() => db.$disconnect());
