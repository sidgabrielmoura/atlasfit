import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
const prefix = "mfa:v1:";
function encryptionKey() {
  const secret = process.env.MFA_ENCRYPTION_KEY || process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error("MFA_ENCRYPTION_KEY_REQUIRED");
  return createHash("sha256").update(`atlasfit:mfa:v1:${secret}`).digest();
}
export function encryptMfaSecret(secret: string) {
  if (secret.startsWith(prefix)) return secret;
  const iv = randomBytes(12), cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  return prefix + [iv, cipher.getAuthTag(), encrypted].map(value => value.toString("base64url")).join(":");
}
/** Legacy plaintext remains readable while it is migrated on successful verification. */
export function decryptMfaSecret(value: string) {
  if (!value.startsWith(prefix)) return value;
  const [iv, tag, data] = value.slice(prefix.length).split(":").map(part => Buffer.from(part, "base64url"));
  if (!iv || iv.length !== 12 || !tag || tag.length !== 16 || !data) throw new Error("INVALID_MFA_SECRET");
  const cipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv); cipher.setAuthTag(tag);
  return Buffer.concat([cipher.update(data), cipher.final()]).toString("utf8");
}
export function hashMfaBackupCode(userId: string, code: string) {
  return `sha256:${createHash("sha256").update(`atlasfit:mfa-backup:${userId}:${code.trim().toUpperCase()}`).digest("hex")}`;
}
export function mfaSecretFingerprint(secret: string) {
  return createHash("sha256").update(decryptMfaSecret(secret)).digest("hex");
}
