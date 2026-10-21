/** A revoked or not-yet-started trial never authorizes PERSONAL access. */
export function isPersonalTrialActive(trial: { isActive: boolean; startDate: Date | string; endDate: Date | string } | null | undefined, now = new Date()): boolean {
  if (!trial?.isActive) return false;
  const start = new Date(trial.startDate).getTime(), end = new Date(trial.endDate).getTime(), current = now.getTime();
  return Number.isFinite(start) && Number.isFinite(end) && Number.isFinite(current) && start <= current && current < end;
}
