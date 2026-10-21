import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });
describe("GYM upload signatures — no storage request", () => {
  it("binds the content length and type in the actual SDK signature", async () => {
    vi.stubEnv("CLOUDFLARE_ID_TOKEN_ACCESS", "synthetic-access-never-used-remotely");
    vi.stubEnv("CLOUDFLARE_SECRET_ACCESS_KEY", "synthetic-secret-never-used-remotely");
    vi.resetModules();
    const { storageService } = await import("./storage.service");
    const first = new URL(await storageService.getPresignedUploadUrl("workspace/synthetic/files/upload.pdf", "application/pdf", 600, 100));
    const second = new URL(await storageService.getPresignedUploadUrl("workspace/synthetic/files/upload.pdf", "application/pdf", 600, 101));
    expect(first.searchParams.get("X-Amz-SignedHeaders")?.split(";")).toEqual(expect.arrayContaining(["content-length", "content-type"]));
    expect(first.searchParams.get("X-Amz-Signature")).not.toBe(second.searchParams.get("X-Amz-Signature"));
    expect(first.searchParams.get("X-Amz-Expires")).toBe("600");
    await expect(storageService.getPresignedUploadUrl("upload.pdf", "application/pdf", 600, 0)).rejects.toThrow("Tamanho de upload inválido");
  });
});
