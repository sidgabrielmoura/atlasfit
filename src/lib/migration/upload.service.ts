import crypto from "crypto";
import { IMPORT_LIMITS } from "./config/limits";
import { UnsupportedSpreadsheetFormatError } from "./parsers/spreadsheet.parser";

export interface FileValidationResult {
  isValid: boolean;
  sha256: string;
  mimeType: string;
  extension: string;
  sizeBytes: number;
  error?: string;
}

export function calculateBufferSha256(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

export function calculateTextSha256(text: string): string {
  return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}

export function validateUploadedFile(
  filename: string,
  mimeType: string,
  sizeBytes: number,
  buffer: Buffer
): FileValidationResult {
  const sha256 = calculateBufferSha256(buffer);
  const ext = filename.substring(filename.lastIndexOf(".")).toLowerCase();

  if (ext === ".xls") {
    throw new UnsupportedSpreadsheetFormatError(filename);
  }

  if (!IMPORT_LIMITS.allowedExtensions.includes(ext)) {
    return {
      isValid: false,
      sha256,
      mimeType,
      extension: ext,
      sizeBytes,
      error: `Extensão de arquivo "${ext}" não suportada.`,
    };
  }

  if (sizeBytes > IMPORT_LIMITS.maxPdfSize) {
    return {
      isValid: false,
      sha256,
      mimeType,
      extension: ext,
      sizeBytes,
      error: `Tamanho de arquivo excede o limite máximo permitido (${Math.round(
        IMPORT_LIMITS.maxPdfSize / (1024 * 1024)
      )}MB).`,
    };
  }

  return {
    isValid: true,
    sha256,
    mimeType,
    extension: ext,
    sizeBytes,
  };
}
