import { afterEach, describe, expect, it, vi } from "vitest";
import { sharedJsonRequest } from "../http/shared-json-request";

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
describe("Shared browser reads", () => {
  it("shares one read across banner, card and popup, then refreshes after five seconds", async () => {
    vi.useFakeTimers();
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify([{ id: "campaign" }])));
    vi.stubGlobal("fetch", fetch);
    const url = "/api/engage/active?workspaceId=dedup";
    const [banner, card] = await Promise.all([sharedJsonRequest(url, "user:1"), sharedJsonRequest(url, "user:1")]);
    await vi.advanceTimersByTimeAsync(1800);
    const popup = await sharedJsonRequest(url, "user:1");
    expect(banner).toEqual(card); expect(card).toEqual(popup);
    expect(fetch).toHaveBeenCalledTimes(1);
    fetch.mockResolvedValue(new Response("[]"));
    await vi.advanceTimersByTimeAsync(5001);
    expect(await sharedJsonRequest(url, "user:1")).toEqual([]);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it("never shares responses across users, session versions or workspaces", async () => {
    const fetch = vi.fn().mockImplementation(async () => new Response("[]"));
    vi.stubGlobal("fetch", fetch);
    await Promise.all([
      sharedJsonRequest("/api/engage/active?workspaceId=a", "alice:v1"),
      sharedJsonRequest("/api/engage/active?workspaceId=a", "bob:v1"),
      sharedJsonRequest("/api/engage/active?workspaceId=a", "alice:v2"),
      sharedJsonRequest("/api/engage/active?workspaceId=b", "alice:v1"),
    ]);
    expect(fetch).toHaveBeenCalledTimes(4);
  });
  it("does not cache failures and retries on the next call", async () => {
    const fetch = vi.fn().mockResolvedValueOnce(new Response("Unauthorized", { status: 401 })).mockResolvedValueOnce(new Response("[]"));
    vi.stubGlobal("fetch", fetch);
    await expect(sharedJsonRequest("/failure", "user:3")).rejects.toThrow("401");
    expect(await sharedJsonRequest("/failure", "user:3")).toEqual([]);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
