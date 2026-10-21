/** Compare calendar days in the academy's timezone, including 23/25-hour days. */
export function civilDayNumber(date: Date, timezone: string): number {
  const parts = new Intl.DateTimeFormat("en", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const value = (type: string) => Number(parts.find(part => part.type === type)?.value);
  return Date.UTC(value("year"), value("month") - 1, value("day")) / 86400000;
}

/** Shared with the browser; no server, database or monetary dependencies. */
export function reportCalendarRange(now: Date, timezone: string, period: string): { startDate: string; endDate: string } {
  const end = new Date(civilDayNumber(now, timezone) * 86400000);
  const start = new Date(end);
  if (period === "month") start.setUTCDate(1);
  else start.setUTCDate(start.getUTCDate() - ({ "7d": 6, "30d": 29, "90d": 89 }[period] ?? 29));
  return { startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10) };
}
