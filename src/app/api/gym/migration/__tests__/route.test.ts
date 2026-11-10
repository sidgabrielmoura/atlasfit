import { beforeEach, describe, expect, it, vi } from "vitest";
import { WorkspaceAccessError } from "@/modules/workspaces/domain/types";

const state = vi.hoisted(() => ({
  auth: vi.fn(), guard: vi.fn(), quota: vi.fn(), storage: vi.fn(),
  createJob: vi.fn(), createSource: vi.fn(), upload: vi.fn(),
}));
vi.mock("@/auth", () => ({ auth: state.auth }));
vi.mock("@/modules/workspaces/application/guard", () => ({
  requireGymWorkspaceAccess: state.guard,
  handleWorkspaceAccessError: (error: unknown) => error instanceof WorkspaceAccessError ? error.toResponse() : null,
}));
vi.mock("@/lib/migration/quota.service", () => ({ checkImportQuota: state.quota }));
vi.mock("@/lib/storage-quota.service", () => ({ checkStorageQuota: state.storage }));
vi.mock("@/lib/migration/source-upload", () => ({ uploadImportSource: state.upload }));
vi.mock("@/lib/prisma", () => ({ default: { importJob: { create: state.createJob }, importSource: { create: state.createSource } } }));

import { POST } from "../route";

beforeEach(() => {
  vi.resetAllMocks();
  state.auth.mockResolvedValue({ user: { id: "owner" } });
  state.guard.mockResolvedValue({ workspaceId: "gym", userId: "owner" });
  state.quota.mockResolvedValue({ allowed: true });
  state.storage.mockResolvedValue({ allowed: true });
  state.createJob.mockResolvedValue({ id: "job", workspaceId: "gym" });
});

describe("Importação GYM — formatos compartilhados com PERSONAL", () => {
  it("aceita texto livre sem exigir uma planilha", async () => {
    const response = await POST(new Request("http://localhost/api/gym/migration", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workspaceId: "gym", rawText: "Treino A — supino 3x12" }) }));
    expect(response.status).toBe(201);
    expect(state.createSource).toHaveBeenCalledWith({ data: expect.objectContaining({ importJobId: "job", type: "TEXT", textContent: "Treino A — supino 3x12" }) });
    expect(state.upload).not.toHaveBeenCalled();
  });
  it("aceita PDF e imagem pelo mesmo uploader usado no PERSONAL", async () => {
    const data = new FormData(); data.set("workspaceId", "gym");
    data.append("files", new File(["%PDF-1.4 synthetic"], "treino.pdf", { type: "application/pdf" }));
    data.append("files", new File(["synthetic"], "treino.png", { type: "image/png" }));
    const response = await POST(new Request("http://localhost/api/gym/migration", { method: "POST", body: data }));
    expect(response.status).toBe(201);
    expect(state.upload.mock.calls.map(([file, jobId, workspaceId, index]) => [file.name, jobId, workspaceId, index])).toEqual([["treino.pdf", "job", "gym", 0], ["treino.png", "job", "gym", 1]]);
  });
  it("continua recusando um workspace sem autoridade antes de criar ou enviar fontes", async () => {
    state.guard.mockRejectedValue(new WorkspaceAccessError(403, "FORBIDDEN_RESOURCE", "Sem vínculo."));
    const data = new FormData(); data.set("workspaceId", "other-gym"); data.append("files", new File(["synthetic"], "treino.png", { type: "image/png" }));
    const response = await POST(new Request("http://localhost/api/gym/migration", { method: "POST", body: data }));
    expect(response.status).toBe(403);
    expect(state.createJob).not.toHaveBeenCalled(); expect(state.upload).not.toHaveBeenCalled();
  });
});
