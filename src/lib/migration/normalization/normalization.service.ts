/**
 * Pure functions for data normalization.
 * Retains original value alongside normalized value.
 */

export interface NormalizedResult<T> {
  originalValue: any;
  normalizedValue: T | null;
  isValid: boolean;
}

export function normalizePhone(rawPhone: any): NormalizedResult<string> {
  if (rawPhone === null || rawPhone === undefined) {
    return { originalValue: rawPhone, normalizedValue: null, isValid: false };
  }

  const str = String(rawPhone).trim();
  // Remove non-numeric characters
  const digits = str.replace(/\D/g, "");

  if (!digits || digits.length < 8 || digits.length > 15) {
    return { originalValue: rawPhone, normalizedValue: null, isValid: false };
  }

  // Format Brazilian phone numbers (e.g. 5585999999999 or 85999999999)
  let formatted = digits;
  if (digits.length === 10 || digits.length === 11) {
    formatted = `55${digits}`;
  }

  return {
    originalValue: rawPhone,
    normalizedValue: formatted,
    isValid: true,
  };
}

export function normalizeEmail(rawEmail: any): NormalizedResult<string> {
  if (rawEmail === null || rawEmail === undefined) {
    return { originalValue: rawEmail, normalizedValue: null, isValid: false };
  }

  const str = String(rawEmail).trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(str)) {
    return { originalValue: rawEmail, normalizedValue: null, isValid: false };
  }

  return {
    originalValue: rawEmail,
    normalizedValue: str,
    isValid: true,
  };
}

export function normalizeDate(rawDate: any): NormalizedResult<string> {
  if (rawDate === null || rawDate === undefined) {
    return { originalValue: rawDate, normalizedValue: null, isValid: false };
  }

  if (rawDate instanceof Date && !isNaN(rawDate.getTime())) {
    return {
      originalValue: rawDate,
      normalizedValue: rawDate.toISOString().split("T")[0],
      isValid: true,
    };
  }

  const str = String(rawDate).trim();

  // Try parsing DD/MM/YYYY
  const brDateMatch = str.match(/^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{4})$/);
  if (brDateMatch) {
    const day = brDateMatch[1].padStart(2, "0");
    const month = brDateMatch[2].padStart(2, "0");
    const year = brDateMatch[3];
    return {
      originalValue: rawDate,
      normalizedValue: `${year}-${month}-${day}`,
      isValid: true,
    };
  }

  // Try standard ISO parsing YYYY-MM-DD
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return {
      originalValue: rawDate,
      normalizedValue: parsed.toISOString().split("T")[0],
      isValid: true,
    };
  }

  return { originalValue: rawDate, normalizedValue: null, isValid: false };
}

export function normalizeNumber(rawNum: any): NormalizedResult<number> {
  if (rawNum === null || rawNum === undefined) {
    return { originalValue: rawNum, normalizedValue: null, isValid: false };
  }

  if (typeof rawNum === "number" && !isNaN(rawNum)) {
    return { originalValue: rawNum, normalizedValue: rawNum, isValid: true };
  }

  const str = String(rawNum).trim().replace(",", ".");
  const num = parseFloat(str);

  if (isNaN(num)) {
    return { originalValue: rawNum, normalizedValue: null, isValid: false };
  }

  return { originalValue: rawNum, normalizedValue: num, isValid: true };
}

export function slugifyExerciseName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
