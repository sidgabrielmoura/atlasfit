import crypto from "crypto";
import QRCode from "qrcode";

// Base32 character set according to RFC 4648
const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/**
 * Codifica um Buffer em formato Base32
 */
export function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = "";

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;

    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

/**
 * Decodifica uma string Base32 em Buffer
 */
export function base32Decode(base32: string): Buffer {
  const clean = base32.toUpperCase().replace(/[\s=-]/g, "");
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (let i = 0; i < clean.length; i++) {
    const val = BASE32_ALPHABET.indexOf(clean[i]);
    if (val === -1) continue; // ignora caracteres inválidos

    value = (value << 5) | val;
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

/**
 * Gera um segredo criptograficamente seguro para o TOTP (20 bytes = 160 bits)
 */
export function generateTOTPSecret(): string {
  const buffer = crypto.randomBytes(20);
  return base32Encode(buffer);
}

/**
 * Gera a URI no padrão otpauth:// para escaneamento no Google Authenticator
 */
export function generateTOTPUri(
  email: string,
  secret: string,
  issuer: string = "AtlasFit"
): string {
  const cleanIssuer = encodeURIComponent(issuer.trim());
  const cleanEmail = encodeURIComponent(email.trim());
  return `otpauth://totp/${cleanIssuer}:${cleanEmail}?secret=${secret}&issuer=${cleanIssuer}&algorithm=SHA1&digits=6&period=30`;
}

/**
 * Gera o QR Code em formato Data URL (base64 PNG)
 */
export async function generateQRCodeDataURL(otpauthUri: string): Promise<string> {
  return await QRCode.toDataURL(otpauthUri, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 280,
    color: {
      dark: "#000000",
      light: "#ffffff",
    },
  });
}

/**
 * Calcula o token TOTP de 6 dígitos para determinado timeStepOffset
 */
export function generateTOTPToken(
  secret: string,
  timeStepOffset: number = 0,
  stepSeconds: number = 30
): string {
  const key = base32Decode(secret);
  const epochSeconds = Math.floor(Date.now() / 1000);
  const counter = Math.floor(epochSeconds / stepSeconds) + timeStepOffset;

  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigInt64BE(BigInt(counter));

  const hmac = crypto.createHmac("sha1", key);
  hmac.update(counterBuffer);
  const digest = hmac.digest();

  // Dynamic truncation (RFC 4226)
  const offset = digest[digest.length - 1] & 0x0f;
  const binaryCode =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);

  const otp = binaryCode % 1000000;
  return otp.toString().padStart(6, "0");
}

/**
 * Valida o token de 6 dígitos contra o segredo, tolerando desvio de relógio (±1 passo = ±30s)
 */
export function verifyTOTP(
  secret: string,
  token: string,
  windowSteps: number = 1
): boolean {
  if (!secret || !token) return false;
  const cleanToken = token.trim().replace(/\s+/g, "");
  if (cleanToken.length !== 6) return false;

  for (let offset = -windowSteps; offset <= windowSteps; offset++) {
    const calculated = generateTOTPToken(secret, offset);
    if (crypto.timingSafeEqual(Buffer.from(cleanToken), Buffer.from(calculated))) {
      return true;
    }
  }

  return false;
}

/**
 * Gera códigos de backup de contingência
 */
export function generateBackupCodes(count: number = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const raw = crypto.randomBytes(4).toString("hex").toUpperCase();
    codes.push(`${raw.slice(0, 4)}-${raw.slice(4, 8)}`);
  }
  return codes;
}
