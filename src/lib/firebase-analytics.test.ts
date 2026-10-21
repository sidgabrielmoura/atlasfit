import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FirebaseApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { initializeOptionalAnalytics } from "./firebase-analytics";
vi.mock("firebase/analytics", () => ({ getAnalytics: vi.fn(), isSupported: vi.fn() }));
const app = (options: FirebaseApp["options"]) => ({ options }) as FirebaseApp;
const configured = app({ apiKey: "synthetic", projectId: "synthetic", appId: "synthetic" });
beforeEach(() => { vi.resetAllMocks(); vi.stubGlobal("window", {}); });
afterEach(() => vi.unstubAllGlobals());
describe("Analytics opcional", () => {
  it("não chama o SDK sem configuração completa", async () => {
    for (const options of [{}, { apiKey: "key", appId: "app" }, { apiKey: "key", projectId: "project", appId: " " }]) expect(await initializeOptionalAnalytics(app(options))).toBeNull();
    expect(isSupported).not.toHaveBeenCalled(); expect(getAnalytics).not.toHaveBeenCalled();
  });
  it("não inicializa durante SSR", async () => {
    vi.stubGlobal("window", undefined);
    expect(await initializeOptionalAnalytics(configured)).toBeNull(); expect(isSupported).not.toHaveBeenCalled();
  });
  it("não inicializa em navegador sem suporte", async () => {
    vi.mocked(isSupported).mockResolvedValue(false);
    expect(await initializeOptionalAnalytics(configured)).toBeNull(); expect(getAnalytics).not.toHaveBeenCalled();
  });
  it("rejeição da verificação de suporte é tratada", async () => {
    vi.mocked(isSupported).mockRejectedValue(new Error("indisponível"));
    expect(await initializeOptionalAnalytics(configured)).toBeNull();
  });
  it("erro de inicialização é tratado", async () => {
    vi.mocked(isSupported).mockResolvedValue(true); vi.mocked(getAnalytics).mockImplementation(() => { throw new Error("configuração inválida"); });
    expect(await initializeOptionalAnalytics(configured)).toBeNull();
  });
  it("inicializa configuração suportada sem exigir measurementId opcional", async () => {
    vi.mocked(isSupported).mockResolvedValue(true); const analytics = { app: configured }; vi.mocked(getAnalytics).mockReturnValue(analytics);
    expect(await initializeOptionalAnalytics(configured)).toBe(analytics); expect(getAnalytics).toHaveBeenCalledWith(configured);
  });
});
