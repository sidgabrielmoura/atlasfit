interface SharedRequest {
  promise: Promise<unknown>;
  expiresAt: number;
}

const requests = new Map<string, SharedRequest>();

/** Browser-only read deduplication. Scope must include the user and session version. */
export function sharedJsonRequest<T>(url: string, scope: string, maxAgeMs = 5_000): Promise<T> {
  if (!scope) throw new Error("A request scope is required");
  const key = JSON.stringify([scope, url]);
  const now = Date.now();
  for (const [oldKey, entry] of requests) if (entry.expiresAt <= now) requests.delete(oldKey);
  const existing = requests.get(key);
  if (existing) return existing.promise as Promise<T>;
  // Bound the registry across workspace changes and long browser sessions.
  if (requests.size >= 64) requests.delete(requests.keys().next().value!);
  const entry: SharedRequest = {
    expiresAt: Infinity,
    promise: fetch(url, { cache: "no-store" }).then(async response => {
      if (!response.ok) throw new Error(`Request failed (${response.status})`);
      return response.json();
    }),
  };
  requests.set(key, entry);
  void entry.promise.then(
    () => { entry.expiresAt = Date.now() + maxAgeMs; },
    () => { if (requests.get(key) === entry) requests.delete(key); },
  );
  return entry.promise as Promise<T>;
}
