import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolve } from "node:path";
import { performance as nodePerformance } from "node:perf_hooks";

vi.hoisted(async () => {
  const { AsyncLocalStorage } = await import("node:async_hooks");
  Object.assign(globalThis, { AsyncLocalStorage });
});
const db = vi.hoisted(() => ({
  systemSetting: { findMany: vi.fn() },
  exercise: { findMany: vi.fn() },
  muscleGroup: { findMany: vi.fn(), createMany: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ default: db }));

// Use Next's real cache implementation rather than mocking unstable_cache.
import { IncrementalCache } from "next/dist/server/lib/incremental-cache";
import { nodeFs } from "next/dist/server/lib/node-fs-methods";
import { workAsyncStorage } from "next/dist/server/app-render/work-async-storage.external";
import {
  getPublicPlatformSettings, getPublicExerciseCatalog, getMuscleGroups,
  invalidatePublicPlatformSettings, invalidatePublicExerciseCatalog, invalidateMuscleGroups, PUBLIC_CACHE_TAGS,
} from "../cache/public-data";

const preview = { previewModeId: "cache-test", previewModeEncryptionKey: "test", previewModeSigningKey: "test" };
const cache = new IncrementalCache({
  dev: false, flushToDisk: false, fs: nodeFs, serverDistDir: resolve(".tmp/public-cache-test/server"),
  maxMemoryCacheSize: 2_000_000, requestHeaders: {}, previewProps: preview,
  prerenderManifest: { version: 4, routes: {}, dynamicRoutes: {}, notFoundRoutes: [], preview },
});
const nextGlobals = globalThis as typeof globalThis & { __incrementalCache?: IncrementalCache };
nextGlobals.__incrementalCache = cache;
const tick = () => new Promise(resolve => setTimeout(resolve, 5));

async function invalidate(run: () => void) {
  const store = { page: "/api/cache-test/route", route: "/api/cache-test", incrementalCache: cache, pendingRevalidatedTags: [] } as unknown as NonNullable<ReturnType<typeof workAsyncStorage.getStore>>;
  workAsyncStorage.run(store, run);
  for (const item of store.pendingRevalidatedTags || []) {
    await cache.revalidateTag(item.tag, typeof item.profile === "object" ? item.profile : undefined);
  }
  await tick();
}

beforeEach(async () => {
  vi.resetAllMocks();
  await cache.revalidateTag(Object.values(PUBLIC_CACHE_TAGS));
  await tick();
});

describe("Public data using the Next Data Cache", () => {
  it("reuses public settings across calls and immediately sees updates after invalidation", async () => {
    db.systemSetting.findMany.mockResolvedValue([{ key: "platform_name", value: "AtlasFit" }]);
    expect(await getPublicPlatformSettings()).toEqual({ platform_name: "AtlasFit" });
    expect(await getPublicPlatformSettings()).toEqual({ platform_name: "AtlasFit" });
    expect(db.systemSetting.findMany).toHaveBeenCalledTimes(1);
    expect(db.systemSetting.findMany.mock.calls[0][0].where.key.in).toEqual(["platform_name", "support_email", "support_whatsapp"]);
    db.systemSetting.findMany.mockResolvedValue([{ key: "platform_name", value: "New name" }]);
    await invalidate(invalidatePublicPlatformSettings);
    expect(await getPublicPlatformSettings()).toEqual({ platform_name: "New name" });
    expect(db.systemSetting.findMany).toHaveBeenCalledTimes(2);
  });
  it("does not cache database failures as empty settings", async () => {
    db.systemSetting.findMany.mockRejectedValueOnce(new Error("database unavailable")).mockResolvedValueOnce([]);
    await expect(getPublicPlatformSettings()).rejects.toThrow("database unavailable");
    expect(await getPublicPlatformSettings()).toEqual({});
    expect(db.systemSetting.findMany).toHaveBeenCalledTimes(2);
  });
  it("refreshes public settings after the five-minute TTL", async () => {
    db.systemSetting.findMany.mockResolvedValueOnce([{ key: "platform_name", value: "Before" }]).mockResolvedValueOnce([{ key: "platform_name", value: "After" }]);
    await getPublicPlatformSettings();
    const now = nodePerformance.now();
    const clock = vi.spyOn(nodePerformance, "now").mockReturnValue(now + 301_000);
    try {
      expect(await getPublicPlatformSettings()).toEqual({ platform_name: "After" });
      expect(db.systemSetting.findMany).toHaveBeenCalledTimes(2);
    } finally { clock.mockRestore(); }
  });
  it("shares only published catalog names/IDs and refreshes after publication/deletion", async () => {
    db.exercise.findMany.mockResolvedValue([{ id: "official", name: "Supino" }]);
    await getPublicExerciseCatalog(); await getPublicExerciseCatalog();
    expect(db.exercise.findMany).toHaveBeenCalledTimes(1);
    expect(db.exercise.findMany.mock.calls[0][0].select).toEqual({ id: true, name: true });
    const where = JSON.stringify(db.exercise.findMany.mock.calls[0][0].where);
    expect(where).toContain("isWorkoutSpecific"); expect(where).toContain("REJECTED");
    db.exercise.findMany.mockResolvedValue([]);
    await invalidate(invalidatePublicExerciseCatalog);
    expect(await getPublicExerciseCatalog()).toEqual([]);
  });
  it("initializes missing muscle groups in one batch only and invalidates on creation", async () => {
    const date = new Date("2026-01-01");
    const group = { id: "chest", name: "Peito", createdAt: date, updatedAt: date };
    db.muscleGroup.findMany.mockResolvedValue([group]);
    db.muscleGroup.createMany.mockResolvedValue({ count: 11 });
    await getMuscleGroups(); await getMuscleGroups();
    expect(db.muscleGroup.createMany).toHaveBeenCalledTimes(1);
    expect(db.muscleGroup.createMany.mock.calls[0][0]).toMatchObject({ skipDuplicates: true });
    expect(db.muscleGroup.createMany.mock.calls[0][0].data).toHaveLength(11);
    expect(db.muscleGroup.findMany).toHaveBeenCalledTimes(2);
    await invalidate(invalidateMuscleGroups);
    await getMuscleGroups();
    expect(db.muscleGroup.findMany).toHaveBeenCalledTimes(4);
  });
});
