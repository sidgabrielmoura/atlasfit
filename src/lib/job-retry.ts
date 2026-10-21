/** Bounded exponential delay with jitter; a bad first page must not starve other jobs. */
export function jobRetryAt(failures: number, now = new Date(), baseMs = 15 * 60_000) {
  const delay = Math.min(24 * 60 * 60_000, baseMs * 2 ** Math.min(Math.max(failures, 0), 10));
  return new Date(now.getTime() + delay + Math.floor(Math.random() * Math.min(delay * 0.1, 60_000)));
}
