import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const KEY_VERSION = "v1";

function getDerivedKey(): Buffer {
  const secret = process.env.ASAAS_ENCRYPTION_SECRET || process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("ASAAS_ENCRYPTION_SECRET ou AUTH_SECRET inválido ou ausente no ambiente (mínimo 32 caracteres)");
  }
  return crypto.createHash("sha256").update(secret).digest();
}

export function encryptSubAccountApiKey(plaintext: string): { encrypted: string; keyVersion: string } {
  const key = getDerivedKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encryptedBuf = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  const payload = Buffer.concat([iv, authTag, encryptedBuf]).toString("base64");
  return { encrypted: payload, keyVersion: KEY_VERSION };
}

export function decryptSubAccountApiKey(encrypted: string): string {
  const key = getDerivedKey();
  const buf = Buffer.from(encrypted, "base64");
  const iv = buf.subarray(0, 12);
  const authTag = buf.subarray(12, 28);
  const ciphertext = buf.subarray(28);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return decipher.update(ciphertext) + decipher.final("utf8");
}
