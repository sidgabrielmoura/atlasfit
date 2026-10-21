import { afterEach, describe, expect, it, vi } from "vitest";
import { runRealtimeOperation } from "./realtime-operation";
afterEach(() => vi.restoreAllMocks());
describe("Operações realtime de efeitos React", () => {
  it("trata rejeição quando uma assinatura ou cleanup encontra conexão fechada", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await expect(runRealtimeOperation(() => Promise.reject(new Error("Connection closed")))).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledTimes(1);
  });
  it("trata erro síncrono do SDK sem interromper o efeito", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await expect(runRealtimeOperation(() => { throw new Error("Connection closed"); })).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledTimes(1);
  });
  it("executa a operação imediatamente para preservar a ordem do cleanup", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const operation = vi.fn().mockResolvedValue(undefined);
    const pending = runRealtimeOperation(operation);
    expect(operation).toHaveBeenCalledTimes(1);
    await pending; expect(warn).not.toHaveBeenCalled();
  });
});
