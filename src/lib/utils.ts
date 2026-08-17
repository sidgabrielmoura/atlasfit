import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPhone(value: string) {
  const raw = value.replace(/\D/g, "");
  if (raw.length <= 2) {
    return raw;
  } else if (raw.length <= 6) {
    return `(${raw.slice(0, 2)}) ${raw.slice(2)}`;
  } else if (raw.length <= 10) {
    return `(${raw.slice(0, 2)}) ${raw.slice(2, 6)}-${raw.slice(6)}`;
  } else {
    return `(${raw.slice(0, 2)}) ${raw.slice(2, 7)}-${raw.slice(7, 11)}`;
  }
}

export function simplifyCommaSeparatedString(val: string | null | undefined): string {
  if (!val) return "";
  const str = String(val).trim();
  if (!str.includes(",")) return str;

  const parts = str.split(",").map((s) => s.trim());
  if (parts.every((p) => p === "")) return "";

  const firstNonEmpty = parts.find((p) => p !== "");
  if (firstNonEmpty !== undefined) {
    const allMatching = parts.every((p) => p === "" || p === firstNonEmpty);
    if (allMatching) {
      return firstNonEmpty;
    }
  }

  return str;
}
