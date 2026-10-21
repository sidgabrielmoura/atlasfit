/** Product policy explicitly requested by the platform owner; not a legal deadline. */
export const gymRetentionPolicy = {
  version: 2,
  mode: "PURGE_WITHIN_ONE_CALENDAR_MONTH",
  automaticPurge: true,
  purgeAllowed: true,
  maximumCalendarMonths: 1,
  sharedIdentities: "PRESERVE_OTHER_WORKSPACES",
  immediatePurge: "SUPERADMIN_ONLY",
  externalCancellation: "REQUIRES_CONFIRMED_RECONCILIATION",
} as const;

export function gymPurgeDeadline(closedAt: Date) {
  const deadline = new Date(closedAt);
  const day = deadline.getUTCDate();
  deadline.setUTCDate(1);
  deadline.setUTCMonth(deadline.getUTCMonth() + 1);
  const lastDay = new Date(Date.UTC(deadline.getUTCFullYear(), deadline.getUTCMonth() + 1, 0)).getUTCDate();
  deadline.setUTCDate(Math.min(day, lastDay));
  return deadline;
}

/** Start a day before the maximum so retries/batches have time to finish. */
export function gymPurgeStartsAt(deadline: Date) { return new Date(deadline.getTime() - 86_400_000); }
