const privateKey = /password|senha|secret|token|authorization|cookie|api.?key|cpf|cnpj|email|phone|whatsapp|birth.?date|medical|health|anamnese|diagnos|dobras|circunferencias|postural|dorMobilidade|testesFisicos|cvv|cvc|card/i;
export function redactPrivateText(input: string): string {
  return input
    .replace(/(["']?(?:password|senha|secret|token|apiKey|access_token|refresh_token|cookie|medicalConditions|anamnese)["']?\s*[:=]\s*)("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|[^\s,}]+)/gi, "$1[REDACTED]")
    .replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, "Bearer [REDACTED]")
    .replace(/([?&](?:token|code|key|signature|X-Amz-[^=\s&]+)=)[^\s&]+/gi, "$1[REDACTED]")
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[EMAIL_REDACTED]")
    .replace(/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g, "[CPF_REDACTED]")
    .replace(/\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/g, "[CNPJ_REDACTED]")
    .replace(/\b\d{10,16}\b/g, "[IDENTIFIER_REDACTED]")
    .replace(/\b\d{4}[ -]\d{4}[ -]\d{4}[ -]\d{4}\b/g, "[CARD_REDACTED]")
    .replace(/((?:cvv|cvc)\s*[:=]\s*)["']?\d{3,4}["']?/gi, "$1[REDACTED]");
}
export function redactLogValue(value: unknown, depth = 0): unknown {
  if (depth > 8) return "[TRUNCATED]";
  if (value instanceof Error) return { type: value.name };
  if (typeof value === "string") return redactPrivateText(value).slice(0, 4000);
  if (Array.isArray(value)) return value.slice(0, 100).map(item => redactLogValue(item, depth + 1));
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).slice(0, 100).map(([key, item]) => [key, privateKey.test(key) ? "[REDACTED]" : redactLogValue(item, depth + 1)]));
  return value;
}
