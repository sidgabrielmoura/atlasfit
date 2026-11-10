import { describe, expect, it, vi } from "vitest";
import { EventEmitter } from "node:events";
import type { RealtimeChannel } from "ably";
import { createMigrationUpdates, listenToImportChannel } from "../realtime";

function channelFixture() {
  const states = new EventEmitter();
  const messages = new EventEmitter();
  const channel = { state: "initialized", on: states.on.bind(states), off: states.off.bind(states),
    subscribe: vi.fn(async (event, handler) => { messages.on(event, handler); }),
    unsubscribe: vi.fn((event, handler) => { messages.off(event, handler); }), detach: vi.fn() };
  return { channel: channel as unknown as RealtimeChannel, states, messages, detach: channel.detach };
}

describe("Importação via Ably", () => {
  it("sincroniza ao conectar e após perda de continuidade; reconexão com replay não consulta a API", () => {
    const f = channelFixture(), sync = vi.fn(), update = vi.fn(), unavailable = vi.fn();
    const cleanup = listenToImportChannel(f.channel, "job_updated", update, sync, unavailable);
    f.states.emit("attached", { resumed: false });
    f.messages.emit("job_updated", { data: { jobId: "job", progressPercentage: 60 } });
    f.states.emit("attached", { resumed: true });
    expect(sync).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledTimes(1);
    f.states.emit("suspended", {});
    expect(unavailable).toHaveBeenCalledTimes(1);
    f.states.emit("attached", { resumed: false });
    f.states.emit("update", { resumed: false });
    expect(sync).toHaveBeenCalledTimes(3);
    cleanup();
  });

  it("desmontar um consumidor mantém os demais inscritos no mesmo canal", () => {
    const f = channelFixture(), other = vi.fn(), removed = vi.fn();
    const cleanup = listenToImportChannel(f.channel, "job_updated", removed, vi.fn(), vi.fn());
    listenToImportChannel(f.channel, "job_updated", other, vi.fn(), vi.fn());
    cleanup();
    f.messages.emit("job_updated", { data: { jobId: "job" } });
    expect(other).toHaveBeenCalledOnce();
    expect(removed).not.toHaveBeenCalled();
    expect(f.detach).not.toHaveBeenCalled();
  });

  it("rejeição assíncrona da inscrição é tratada sem atualizar um consumidor desmontado", async () => {
    const f = channelFixture(), unavailable = vi.fn();
    let reject!: (error: Error) => void;
    f.channel.subscribe = vi.fn(() => new Promise<null>((_, fail) => { reject = fail; })) as typeof f.channel.subscribe;
    const cleanup = listenToImportChannel(f.channel, "job_updated", vi.fn(), vi.fn(), unavailable);
    cleanup();
    reject(new Error("scope fechado"));
    await Promise.resolve();
    expect(unavailable).not.toHaveBeenCalled();
  });

  it("resposta HTTP atrasada não regride progresso, consumo ou status recebido pelo Ably", () => {
    const updates = createMigrationUpdates(), startedAt = updates.revision();
    updates.receive({ jobId: "job", status: "PROCESSING", progressPercentage: 72, creditsConsumed: 15 });
    updates.receive({ jobId: "job", status: "REVIEW", progressPercentage: 100, creditsConsumed: 15 });
    expect(updates.merge({ id: "job", status: "PROCESSING", creditsConsumed: 0 }, startedAt))
      .toMatchObject({ status: "REVIEW", progressPercentage: 100, creditsConsumed: 15 });
  });

  it("sincronização posterior preserva progresso transitório e aceita estado final mais recente do banco", () => {
    const updates = createMigrationUpdates();
    updates.receive({ jobId: "job", status: "PROCESSING", progressPercentage: 72, creditsConsumed: 15 });
    expect(updates.merge({ id: "job", status: "PROCESSING", creditsConsumed: 20 }, updates.revision()))
      .toMatchObject({ progressPercentage: 72, creditsConsumed: 20 });
    expect(updates.merge({ id: "job", status: "COMPLETED", creditsConsumed: 20 }, updates.revision()))
      .toEqual({ id: "job", status: "COMPLETED", creditsConsumed: 20 });
  });

  it("uma retomada não reaproveita 100% do processamento anterior nem afeta outros jobs", () => {
    const updates = createMigrationUpdates();
    updates.receive({ jobId: "job", status: "PARTIAL", progressPercentage: 100, progressMessage: "Pausado" });
    updates.receive({ jobId: "job", status: "PROCESSING", progressPercentage: 5 });
    expect(updates.merge({ id: "job", status: "PROCESSING" }, 0)).toMatchObject({ progressPercentage: 5 });
    expect(updates.merge({ id: "other", status: "UPLOADED" }, 0)).toEqual({ id: "other", status: "UPLOADED" });
  });
});
