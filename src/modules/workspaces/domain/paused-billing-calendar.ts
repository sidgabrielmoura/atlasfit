import type { GymBillingCycle } from "@prisma/client";
import { nextBillingDate } from "./billing-calendar";

/** Skip suspended dates, never create invoices for the skipped competences. */
export function skipPausedBillingDates(due: Date | null, start: Date, end: Date, cycle: GymBillingCycle, anchorDay: number, durationDays: number) {
  let next = due, skipped = 0;
  while (next && next >= start && next < end) {
    if (++skipped > 12000) throw new Error("Intervalo de pausa excede o limite de revisão.");
    const following = nextBillingDate(next, cycle, anchorDay, durationDays);
    if (following <= next) throw new Error("Calendário de cobrança inválido.");
    next = following;
  }
  return { next, skipped };
}
