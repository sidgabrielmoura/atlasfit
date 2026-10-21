import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { Realtime } from "ably";
import prisma from "@/lib/prisma";
import { ablyRest } from "@/lib/ably";
import { resolveRealtimeCapabilities } from "@/modules/workspaces/application/realtime-capabilities";

const database = new URL(process.env.DATABASE_URL || "http://invalid");
if (process.env.GYM_EXTERNAL_SMOKE !== "authorized-20261007" || database.hostname !== "127.0.0.1" || database.port !== "56432" || database.pathname !== "/atlasfit_gym_stabilization_20261001") throw new Error("Verificação externa requer autorização e banco descartável.");
afterAll(async () => { await prisma.$disconnect(); });
async function waitUntil(check: () => boolean) {
  const limit = Date.now() + 10_000;
  while (!check()) { if (Date.now() > limit) throw new Error("Sinal realtime não confirmado no prazo."); await new Promise(resolve => setTimeout(resolve, 25)); }
}
describe("Ably real — troca de permissões sintéticas", () => {
  it("nova conexão recebe B sem acesso a A; renovação após revogação retira B", async () => {
    expect(ablyRest).not.toBeNull();
    const user = await prisma.user.create({ data: { role: "TRAINER", email: `${randomUUID()}@example.invalid` } });
    const create = () => prisma.workspace.create({ data: { name: "Realtime externo sintético", type: "PERSONAL", slug: randomUUID(), ownerId: user.id, members: { create: { userId: user.id, role: "OWNER" } } } });
    const a = await create(), b = await create();
    const channelA = `user:${user.id}:workspace:${a.id}:chat`, channelB = `user:${user.id}:workspace:${b.id}:chat`;
    const clients: Realtime[] = [];
    const clientFor = (workspaceId: string) => {
      const client = new Realtime({ autoConnect: false, authCallback: (_params, callback) => {
        void resolveRealtimeCapabilities(user.id, workspaceId).then(capability => ablyRest!.auth.createTokenRequest({ clientId: user.id, capability: JSON.stringify(capability), ttl: 60_000 }))
          .then(token => callback(null, token)).catch(() => callback("Falha sintética de autorização.", null));
      } });
      clients.push(client); return client;
    };
    try {
      const first = clientFor(a.id), messagesA: unknown[] = [];
      const tokenA = await first.auth.authorize();
      expect(JSON.parse(tokenA.capability)[channelB]).toBeUndefined();
      await first.channels.get(channelA).subscribe("synthetic:test", message => messagesA.push(message.data));
      await ablyRest!.channels.get(channelA).publish({ id: `${randomUUID()}:0`, name: "synthetic:test", data: { workspaceId: a.id } });
      await waitUntil(() => messagesA.length === 1);
      const closed = first.connection.once("closed"); first.close(); await closed;
      const second = clientFor(b.id), messagesB: unknown[] = [];
      const tokenB = await second.auth.authorize();
      expect(JSON.parse(tokenB.capability)[channelA]).toBeUndefined();
      expect(JSON.parse(tokenB.capability)[channelB]).toEqual(["subscribe"]);
      const allowed = second.channels.get(channelB);
      await allowed.subscribe("synthetic:test", message => messagesB.push(message.data));
      await expect(second.channels.get(channelA).attach()).rejects.toBeDefined();
      await expect(second.channels.get(`user:synthetic-foreign-${randomUUID()}`).attach()).rejects.toBeDefined();
      await expect(second.channels.get(`user:${user.id}`).publish("wallet:updated", { type: "SYNTHETIC_FORBIDDEN_PUBLICATION" })).rejects.toBeDefined();
      await ablyRest!.channels.get(channelB).publish({ id: `${randomUUID()}:0`, name: "synthetic:test", data: { workspaceId: b.id } });
      await waitUntil(() => messagesB.length === 1);
      await prisma.workspaceMember.update({ where: { userId_workspaceId: { userId: user.id, workspaceId: b.id } }, data: { isActive: false } });
      const renewed = await second.auth.authorize();
      expect(JSON.parse(renewed.capability)[channelB]).toBeUndefined();
      await waitUntil(() => allowed.state === "failed" || allowed.state === "detached");
      await expect(allowed.attach()).rejects.toBeDefined();
      expect(first.connection.state).toBe("closed"); expect(messagesA).toHaveLength(1);
    } finally { for (const client of clients) client.close(); }
  });
});
