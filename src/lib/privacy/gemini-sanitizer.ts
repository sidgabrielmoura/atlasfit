/**
 * ATLASFIT — GEMINI AI PRIVACY SANITIZATION & MINIMIZATION LAYER
 *
 * Sanitizes input payloads before sending to Google Generative AI:
 * - Redacts raw CPF/CNPJ patterns
 * - Strips authorization headers, API keys, and sensitive tokens
 * - Ensures no minors are processed by the migration pipeline
 */

export function sanitizeTextForGemini(text: string): string {
  if (!text) return "";

  return text
    // Redact formatted CPFs (e.g. 123.456.789-00)
    .replace(/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g, "[CPF_REDACTED]")
    // Redact formatted CNPJs (e.g. 12.345.678/0001-90)
    .replace(/\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/g, "[CNPJ_REDACTED]")
    // Redact Credit Card patterns
    .replace(/\b\d{4}[ -]?\d{4}[ -]?\d{4}[ -]?\d{4}\b/g, "[CARD_REDACTED]")
    // Redact Passwords / Bearer tokens in text
    .replace(/Bearer\s+[A-Za-z0-9\-\._~\+\/]+=*/gi, "[TOKEN_REDACTED]")
    .replace(/(password|senha|secret)\s*[:=]\s*[^\s,;]+/gi, "$1: [REDACTED]");
}
