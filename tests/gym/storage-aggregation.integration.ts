import { afterAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import prisma from "@/lib/prisma";
import { checkStorageQuota, getPersonalTrainerStorageMetrics, getWorkspaceStorageBytes } from "@/lib/storage-quota.service";

const target = new URL(process.env.DATABASE_URL || "http://invalid");
if (target.hostname !== "127.0.0.1" || target.port !== "56432" || target.pathname !== "/atlasfit_gym_stabilization_20261001") throw new Error("Exige banco descartável específico.");
afterAll(async () => { await prisma.$disconnect(); });

describe("PERSONAL PostgreSQL — agregação de armazenamento", () => {
  it("soma 2400 arquivos e tamanhos nulos entre assessorias, sem incluir outro titular ou GYM", async () => {
    const owner = await prisma.user.create({ data: { role: "TRAINER" } });
    const student = await prisma.user.create({ data: {} });
    const foreign = await prisma.user.create({ data: { role: "TRAINER" } });
    const workspaces: Array<{ id: string }> = [];
    for (const [ownerId, type] of [[owner.id, "PERSONAL"], [owner.id, "PERSONAL"], [owner.id, "GYM"], [foreign.id, "PERSONAL"]] as const) {
      workspaces.push(await prisma.workspace.create({ data: { ownerId, type, name: "Volume sintético", slug: randomUUID(), members: { create: { userId: ownerId, role: "OWNER" } } } }));
    }
    for (const [index, size, count] of [[0, 32, 1200], [1, 64, 1200], [2, 512, 1], [3, 1024, 300]]) {
      await prisma.studentFile.createMany({ data: Array.from({ length: count }, (_, row) => ({ workspaceId: workspaces[index].id, studentId: student.id, name: `Arquivo ${row}`, category: "outros", type: "file", url: "https://example.invalid/synthetic", size })) });
    }
    await prisma.studentFile.create({ data: { workspaceId: workspaces[0].id, studentId: student.id, name: "Link sem bytes", category: "outros", type: "link", url: "https://example.invalid/link", size: null } });
    await prisma.studentProgressPhoto.createMany({ data: [{ workspaceId: workspaces[0].id, studentId: student.id, photoUrl: "https://example.invalid/photo", size: 1024 }, { workspaceId: workspaces[1].id, studentId: student.id, photoUrl: "https://example.invalid/legacy", size: null }] });
    expect(await getWorkspaceStorageBytes(workspaces[0].id)).toEqual({ totalBytes: 39424, fileCount: 1202 });
    expect(await getWorkspaceStorageBytes(workspaces[1].id)).toEqual({ totalBytes: 76800, fileCount: 1201 });
    expect(await getPersonalTrainerStorageMetrics(owner.id)).toMatchObject({ totalUsedBytes: 116224, totalFiles: 2403, workspacesCount: 2 });
  });

  it("falha de leitura não vira consumo zero nem libera upload", async () => {
    const owner = await prisma.user.create({ data: { role: "TRAINER" } });
    const workspace = await prisma.workspace.create({ data: { ownerId: owner.id, type: "PERSONAL", name: "Quota sintética", slug: randomUUID(), members: { create: { userId: owner.id, role: "OWNER" } } } });
    const fault = vi.spyOn(prisma.studentFile, "aggregate").mockRejectedValue(new Error("Falha sintética de leitura"));
    try {
      await expect(checkStorageQuota(workspace.id, owner.id, 1)).rejects.toThrow("Falha sintética de leitura");
      expect(await prisma.notification.count({ where: { userId: owner.id } })).toBe(0);
    } finally { fault.mockRestore(); }
  });
});
