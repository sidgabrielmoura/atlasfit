import { WorkspaceAccessError } from "./types";

/** A date-only form value is the academy's civil midnight, not UTC/browser midnight. */
export function gymCalendarInstant(value: Date | string, timezone: string): Date {
  if (value instanceof Date || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) throw new WorkspaceAccessError(400, "INVALID_REQUEST", "Data inválida.");
    return date;
  }
  const [year, month, day] = value.split("-").map(Number);
  const utc = Date.UTC(year, month - 1, day);
  let format: Intl.DateTimeFormat;
  try { format = new Intl.DateTimeFormat("en-US", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }); }
  catch { throw new WorkspaceAccessError(409, "INVALID_STATUS", "Revise o fuso horário da academia."); }
  function localTime(date: Date) {
    const parts = format.formatToParts(date);
    const part = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find(p => p.type === type)?.value);
    return Date.UTC(part("year"), part("month") - 1, part("day"), part("hour"), part("minute"), part("second"));
  }
  let candidate = new Date(utc);
  for (let attempt = 0; attempt < 4; attempt++) {
    const difference = utc - localTime(candidate);
    if (difference === 0) return candidate;
    candidate = new Date(candidate.getTime() + difference);
  }
  // A nonexistent civil midnight during DST needs an explicit timestamp, not silent rounding.
  throw new WorkspaceAccessError(400, "INVALID_REQUEST", "Informe um horário explícito para esta data no fuso da academia.");
}
