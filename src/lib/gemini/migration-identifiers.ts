import { isValidCpfCnpj } from "@/lib/cpf-validator";
import { sanitizeTextForGemini } from "@/lib/privacy/gemini-sanitizer";

/** Keep a local reversible map so text redaction never erases imported contacts. */
export function prepareMigrationText(text: string) {
  const values = new Map<string, string>();
  const pattern = /\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b|\b\d{3}\.\d{3}\.\d{3}-\d{2}\b|\b(?:\d{14}|\d{11})\b|(?:\+?55\s*)?(?:\(\d{2}\)|\b\d{2})[\s.-]?\d{4,5}[\s.-]?\d{4}\b/g;
  const protectedText = text.replace(pattern, (value, offset: number) => {
    const label = text.slice(text.lastIndexOf("\n", offset) + 1, offset);
    const document = /cpf|cnpj/i.test(label) || /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(value) || value.includes("/") || isValidCpfCnpj(value);
    const token = `[ATLAS_${document ? "DOCUMENT" : "CONTACT"}_${values.size + 1}]`;
    values.set(token, value); return token;
  });
  return { text: sanitizeTextForGemini(protectedText), values };
}

export function restoreMigrationIdentifiers<T>(value: T, values: ReadonlyMap<string, string>): T {
  if (typeof value === "string") return value.replace(/\[ATLAS_(?:DOCUMENT|CONTACT)_\d+\]/g, token => values.get(token) ?? token) as T;
  if (Array.isArray(value)) return value.map(item => restoreMigrationIdentifiers(item, values)) as T;
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, restoreMigrationIdentifiers(item, values)])) as T;
  return value;
}
