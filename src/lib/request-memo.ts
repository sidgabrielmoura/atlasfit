import { AsyncLocalStorage } from "node:async_hooks";

const globals = globalThis as typeof globalThis & { __atlasfitRequestMemo?: AsyncLocalStorage<Map<string, Promise<unknown>>> };
const storage = globals.__atlasfitRequestMemo ??= new AsyncLocalStorage<Map<string, Promise<unknown>>>();

/** GET-only reuse. A fresh request always rechecks revocation and tenant authority. */
export function withRequestMemo<Args extends unknown[], Result>(handler: (...args: Args) => Promise<Result>) {
  return (...args: Args): Promise<Result> => {
    const request = args[0];
    if (request instanceof Request && !["GET", "HEAD"].includes(request.method)) return handler(...args);
    return storage.getStore() ? handler(...args) : storage.run(new Map(), () => handler(...args));
  };
}

export function requestMemo<T>(key: string, load: () => Promise<T>): Promise<T> {
  const values = storage.getStore();
  if (!values) return load();
  const existing = values.get(key);
  if (existing) return existing as Promise<T>;
  const pending = load();
  values.set(key, pending);
  return pending;
}
