import type { GymBillingCycle } from "@prisma/client";

export function billingCompetence(date: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit" }).formatToParts(date);
  return `${parts.find(part => part.type === "year")?.value}-${parts.find(part => part.type === "month")?.value}`;
}

/** Calendar dates are stored at noon UTC to remain on the intended Brazilian calendar day. */
export function nextBillingDate(date: Date, cycle: GymBillingCycle, anchorDay: number, durationDays: number): Date {
  if (cycle === "CUSTOM") {
    if (!Number.isSafeInteger(durationDays) || durationDays < 1) throw new Error("Periodicidade personalizada inválida.");
    return new Date(date.getTime() + durationDays * 86400000);
  }
  const months = { MONTHLY: 1, BIMONTHLY: 2, QUARTERLY: 3, SEMIANNUAL: 6, ANNUAL: 12 }[cycle];
  const first = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1, 12));
  const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  first.setUTCDate(Math.min(anchorDay, last));
  return first;
}
