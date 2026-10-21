/** Date of birth is a civil date. UTC storage must not move birthdays in a negative offset. */
export function parseBirthDate(input: string | Date | null | undefined): Date | null {
  let year: number; let month: number; let day: number;
  if (input instanceof Date) {
    if (!Number.isFinite(input.getTime())) return null;
    year = input.getUTCFullYear(); month = input.getUTCMonth() + 1; day = input.getUTCDate();
  } else if (typeof input === "string") {
    const value = input.trim();
    const br = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
    const iso = /^(\d{4})-(\d{2})-(\d{2})(?:T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z)?$/.exec(value);
    if (br) { year = Number(br[3]); month = Number(br[2]); day = Number(br[1]); }
    else if (iso) { year = Number(iso[1]); month = Number(iso[2]); day = Number(iso[3]); if (value.length > 10 && !Number.isFinite(new Date(value).getTime())) return null; }
    else return null;
  } else return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() + 1 !== month || date.getUTCDate() !== day) return null;
  return date;
}

export function civilAge(birthDate: Date, now = new Date()): number {
  const parts = new Intl.DateTimeFormat("en", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const part = (type: "year" | "month" | "day") => Number(parts.find(value => value.type === type)?.value);
  const year = part("year"); const month = part("month"); const day = part("day");
  let age = year - birthDate.getUTCFullYear();
  if (month < birthDate.getUTCMonth() + 1 || (month === birthDate.getUTCMonth() + 1 && day < birthDate.getUTCDate())) age--;
  return age;
}
