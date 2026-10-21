import { describe, expect, it, vi } from "vitest";
import { requestMemo, withRequestMemo } from "../request-memo";

describe("request-local reuse", () => {
  it("coalesces concurrent work and never shares across requests or tenants", async () => {
    const load = vi.fn(async () => ({}));
    const read = withRequestMemo(async () => {
      const [a, b] = await Promise.all([requestMemo("tenant:a", load), requestMemo("tenant:a", load)]);
      expect(a).toBe(b);
      await requestMemo("tenant:b", load);
      return a;
    });
    const [a, b] = await Promise.all([read(), read()]);
    expect(a).not.toBe(b);
    expect(load).toHaveBeenCalledTimes(4);
  });
  it("revalidates mutations and does not memoize outside a request", async () => {
    const load = vi.fn(async () => true);
    const write = withRequestMemo(async (_req: Request) => {
      await requestMemo("authority", load); await requestMemo("authority", load);
    });
    await write(new Request("https://example.invalid", { method: "POST" }));
    await requestMemo("authority", load);
    expect(load).toHaveBeenCalledTimes(3);
  });
});
