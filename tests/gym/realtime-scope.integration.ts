import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import prisma from "@/lib/prisma";
import { resolveRealtimeCapabilities } from "@/modules/workspaces/application/realtime-capabilities";

const database = new URL(process.env.DATABASE_URL || "http://invalid");
if (database.hostname !== "127.0.0.1" || database.port !== "56432" || database.pathname !== "/atlasfit_gym_stabilization_20261001") throw new Error("Exige banco descartável específico.");
afterAll(async () => { await prisma.$disconnect(); });
describe("Realtime — contexto selecionado", () => {
  it("troca PERSONAL/GYM concede somente canais do contexto e revogação remove acesso na emissão seguinte", async () => {
    const user = await prisma.user.create({ data: { role: "TRAINER", email: `${randomUUID()}@example.invalid` } });
    const create = (type: "PERSONAL" | "GYM") => prisma.workspace.create({ data: { name: "Realtime sintético", slug: randomUUID(), ownerId: user.id, type,
      subscription: { create: { status: "ACTIVE", maxStaff: 50, maxStudents: 50, maxUnits: 1 } }, members: { create: { userId: user.id, role: "OWNER" } } } });
    const personal = await create("PERSONAL"), gym = await create("GYM");
    const first = await prisma.conversation.create({ data: { workspaceId: personal.id, type: "DIRECT", participants: { create: { userId: user.id } } } });
    const second = await prisma.conversation.create({ data: { workspaceId: gym.id, type: "DIRECT", participants: { create: { userId: user.id } } } });
    const personalCaps = await resolveRealtimeCapabilities(user.id, personal.id);
    expect(personalCaps[`workspace:${personal.id}`]).toEqual(["subscribe"]);
    expect(personalCaps[`conversation:${first.id}`]).toEqual(["subscribe"]);
    expect(personalCaps[`conversation:${second.id}`]).toBeUndefined();
    expect(personalCaps[`workspace:${gym.id}:finance`]).toBeUndefined();
    expect(personalCaps[`user:${user.id}:workspace:${personal.id}:chat`]).toEqual(["subscribe"]);
    expect(personalCaps[`user:${user.id}:workspace:${gym.id}:chat`]).toBeUndefined();
    expect(personalCaps[`user:${user.id}:chat`]).toBeUndefined();
    const gymCaps = await resolveRealtimeCapabilities(user.id, gym.id);
    expect(gymCaps[`workspace:${gym.id}:finance`]).toEqual(["subscribe"]);
    expect(gymCaps[`conversation:${second.id}`]).toEqual(["subscribe"]);
    expect(gymCaps[`conversation:${first.id}`]).toBeUndefined();
    expect(gymCaps[`workspace:${personal.id}`]).toBeUndefined();
    expect(gymCaps[`migration:${gym.id}`]).toBeUndefined();
    await prisma.workspaceMember.update({ where: { userId_workspaceId: { userId: user.id, workspaceId: personal.id } }, data: { isActive: false } });
    const revoked = await resolveRealtimeCapabilities(user.id, personal.id);
    expect(Object.keys(revoked).some(name => name.includes(personal.id) || name.includes(first.id))).toBe(false);
    await prisma.workspaceSubscription.update({ where: { workspaceId: gym.id }, data: { status: "EXPIRED" } });
    const expired = await resolveRealtimeCapabilities(user.id, gym.id);
    expect(Object.keys(expired).some(name => name.includes(gym.id) || name.includes(second.id))).toBe(false);
  });
  it("sem seleção ou com workspace estrangeiro preserva apenas canais pessoais/globais permitidos", async () => {
    const user = await prisma.user.create({ data: { role: "USER" } });
    const workspace = await prisma.workspace.create({ data: { name: "Contexto sintético", slug: randomUUID(), type: "PERSONAL", ownerId: user.id, members: { create: { userId: user.id, role: "OWNER" } } } });
    for (const selection of [null, randomUUID()]) {
      const caps = await resolveRealtimeCapabilities(user.id, selection);
      expect(caps[`user:${user.id}`]).toEqual(["subscribe"]);
      expect(caps[`user:${user.id}:notifications`]).toEqual(["subscribe"]);
      expect(Object.keys(caps).some(name => name.includes(workspace.id))).toBe(false);
      expect(Object.keys(caps).some(name => name.startsWith("workspace:") || name.startsWith("conversation:") || name.startsWith("migration:"))).toBe(false);
    }
  });
});
