import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
const read = vi.hoisted(() => vi.fn());
vi.mock("@/lib/storage.service", () => ({ storageService: { getObjectStream: read } }));
import { sourceTextContent } from "../migration/source-payload";

describe("import payload storage", () => {
  const source = { storageKey: "workspace/ws/imports/job/object", textContent: null, sha256: createHash("sha256").update("csv").digest("hex"), extension: ".csv", mimeType: "text/csv" };
  it("checks scope before external access and verifies content hash", async () => {
    await expect(sourceTextContent(source, "foreign", "job")).rejects.toThrow("SCOPE_MISMATCH");
    expect(read).not.toHaveBeenCalled();
    read.mockResolvedValue({ contentLength: 3, body: (async function* () { yield Buffer.from("csv"); })() });
    expect(await sourceTextContent(source, "ws", "job")).toBe("csv");
    read.mockResolvedValue({ contentLength: 3, body: (async function* () { yield Buffer.from("bad"); })() });
    await expect(sourceTextContent(source, "ws", "job")).rejects.toThrow("HASH_MISMATCH");
  });
  it("preserves legacy sources without object access", async () => {
    expect(await sourceTextContent({ ...source, storageKey: null, textContent: "BASE64_XLSX:YQ==" }, "ws", "job")).toBe("BASE64_XLSX:YQ==");
  });
});
