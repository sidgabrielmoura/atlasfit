import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import prisma from "@/lib/prisma";
import { getPersonalStorageDashboard, personalStorageDashboardQuery } from "@/lib/personal-storage-dashboard";
import { getPersonalTrainerStorageMetrics } from "@/lib/storage-quota.service";

const target = new URL(process.env.DATABASE_URL || "http://invalid");
if (target.hostname !== "127.0.0.1" || target.port !== "56432" || target.pathname !== "/atlasfit_gym_stabilization_20261001") throw new Error("Exige banco descartável específico.");
const prefix = `storage-page-${randomUUID()}`, users: string[] = [], workspaces: string[] = [];
let baseline: Awaited<ReturnType<typeof getPersonalStorageDashboard>>;
beforeAll(async () => {
  baseline = await getPersonalStorageDashboard({});
  const student = await prisma.user.create({ data: { role: "STUDENT", name: prefix + " excluído" } });
  const plans: string[] = [];
  for (const limit of [1, 1, 0]) plans.push((await prisma.plan.create({ data: { name: prefix + " plano " + limit, price: 0, storageLimitMb: limit } })).id);
  for (let index = 0; index < 70; index++) {
    const user = await prisma.user.create({ data: { role: "TRAINER", name: `${prefix} ${String(index).padStart(3, "0")}${index === 69 ? " %_'" : ""}`, email: `${prefix}-${index}@example.invalid`, isTestAccount: index === 3, ...(index < 3 ? { subscription: { create: { planId: plans[index], status: "ACTIVE" } } } : {}), ...(index === 4 ? { freeTrial: { create: { endDate: new Date(Date.now() + 86400000) } } } : {}) } }); users.push(user.id);
    const workspace = await prisma.workspace.create({ data: { ownerId: user.id, type: "PERSONAL", name: prefix, slug: randomUUID(), members: { create: { userId: user.id, role: "OWNER" } } } }); workspaces.push(workspace.id);
  }
  const gym = await prisma.workspace.create({ data: { ownerId: users[0], type: "GYM", name: prefix, slug: randomUUID(), members: { create: { userId: users[0], role: "OWNER" } } } });
  await prisma.studentFile.createMany({ data: Array.from({ length: 4200 }, (_, index) => ({ workspaceId: workspaces[index % 70], studentId: student.id, name: "volume sintético", category: "outros", type: "file", url: "https://example.invalid/synthetic", size: 1 })) });
  for (const [index, size] of [[0, 850000], [1, 1200000], [2, 6000000]]) await prisma.studentFile.create({ data: { workspaceId: workspaces[index], studentId: student.id, name: "volume por plano", category: "outros", type: "file", url: "https://example.invalid/synthetic", size } });
  await prisma.studentProgressPhoto.createMany({ data: [{ workspaceId: workspaces[0], studentId: student.id, photoUrl: "https://example.invalid/synthetic", size: 1024 }, { workspaceId: workspaces[1], studentId: student.id, photoUrl: "https://example.invalid/synthetic", size: null }] });
  await prisma.studentFile.create({ data: { workspaceId: gym.id, studentId: student.id, name: "GYM excluído", category: "outros", type: "file", url: "https://example.invalid/synthetic", size: 99999999 } });
});
afterAll(async () => { await prisma.$disconnect(); });

describe("PERSONAL PostgreSQL — dashboard de armazenamento paginado", () => {
  it("limita payload a 25, ordena sem repetição e conserva resumo global em todas as páginas", async () => {
    const first = await getPersonalStorageDashboard({ search: prefix });
    const second = await getPersonalStorageDashboard({ search: prefix, page: 2 });
    const third = await getPersonalStorageDashboard({ search: prefix, page: 3 });
    expect(first.pagination).toEqual({ page: 1, pageSize: 25, total: 70, totalPages: 3 });
    expect([first.personalsMetrics.length, second.personalsMetrics.length, third.personalsMetrics.length]).toEqual([25, 25, 20]);
    expect([...first.personalsMetrics, ...second.personalsMetrics, ...third.personalsMetrics].map(row => row.userId)).toEqual(users);
    expect(second.summary).toEqual(first.summary); expect(third.summary).toEqual(first.summary);
    expect(first.summary.totalPersonals - baseline.summary.totalPersonals).toBe(70);
    expect(first.summary.warningCount - baseline.summary.warningCount).toBe(1);
    expect(first.summary.exceededCount - baseline.summary.exceededCount).toBe(1);
    expect(first.summary.testCount - baseline.summary.testCount).toBe(2);
    expect(JSON.stringify(first).length).toBeLessThan(30000);
    expect((await getPersonalStorageDashboard({ search: prefix, page: 4 })).personalsMetrics).toEqual([]);
  });

  it("agregação conserva bytes, fotos nulas, plano ilimitado e exclusão GYM; filtros alcançam dados além da primeira página", async () => {
    for (const id of users.slice(0, 3)) {
      const page = await getPersonalStorageDashboard({ search: `${prefix}-${users.indexOf(id)}@example.invalid` });
      expect(page.personalsMetrics).toEqual([await getPersonalTrainerStorageMetrics(id)]);
    }
    expect((await getPersonalStorageDashboard({ search: prefix, status: "WARNING" })).personalsMetrics.map(row => row.userId)).toEqual([users[0]]);
    expect((await getPersonalStorageDashboard({ search: prefix, status: "EXCEEDED" })).personalsMetrics.map(row => row.userId)).toEqual([users[1]]);
    expect((await getPersonalStorageDashboard({ search: prefix, status: "TEST" })).personalsMetrics.map(row => row.userId)).toEqual([users[3], users[4]]);
    expect((await getPersonalStorageDashboard({ search: prefix + " 069 %_'" })).personalsMetrics.map(row => row.userId)).toEqual([users[69]]);
    expect((await getPersonalStorageDashboard({ search: "' OR 1=1 --" })).pagination.total).toBe(0);
    const plan = await getPersonalStorageDashboard({ search: prefix + " plano 0" }); expect(plan.personalsMetrics.map(row => row.userId)).toEqual([users[2]]);
  });

  it("valida limites e propaga indisponibilidade sem apresentar lista vazia como sucesso", async () => {
    for (const input of [{ page: 0 }, { pageSize: 101 }, { page: 1.5 }, { search: "x".repeat(121) }, { status: "OTHER" }, { userId: users[0] }]) await expect(getPersonalStorageDashboard(input)).rejects.toThrow();
    const fault = vi.spyOn(prisma, "$queryRaw").mockRejectedValue(new Error("Falha sintética no dashboard"));
    try { await expect(getPersonalStorageDashboard({})).rejects.toThrow("Falha sintética no dashboard"); } finally { fault.mockRestore(); }
  });

  it("registra EXPLAIN e 20 amostras de latência no volume sintético, sem atribuir p95 de produção", async () => {
    const { writeFileSync, mkdirSync } = await import("node:fs");
    const { Prisma } = await import("@prisma/client");
    const plan = await prisma.$queryRaw(Prisma.sql`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${personalStorageDashboardQuery({ search: prefix })}`);
    const durations: number[] = []; let payloadBytes = 0;
    for (let index = 0; index < 20; index++) { const start = performance.now(); const result = await getPersonalStorageDashboard({ search: prefix, page: index % 3 + 1 }); durations.push(performance.now() - start); payloadBytes = Math.max(payloadBytes, Buffer.byteLength(JSON.stringify(result))); }
    const sorted = [...durations].sort((a, b) => a - b);
    mkdirSync(".tmp/gym-stabilization", { recursive: true });
    writeFileSync(".tmp/gym-stabilization/storage-dashboard-performance.json", JSON.stringify({ recordedAt: new Date().toISOString(), synthetic: true, fixture: { users: 70, files: 4203, photos: 2, excludedGymFiles: 1 }, samples: 20, durationsMs: durations, p95Ms: sorted[Math.ceil(sorted.length * .95) - 1], maxPayloadBytes: payloadBytes, pageSize: 25, plan, limitations: ["Base descartável com outros fixtures históricos; nenhum SLA ou p95 de produção inferido.", "Resumo global agrega no banco; sua leitura ainda cresce com o volume total e precisa de medição operacional."] }, null, 2) + "\n");
    expect(payloadBytes).toBeLessThan(30000);
  });
});
