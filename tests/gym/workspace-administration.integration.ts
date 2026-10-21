import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import prisma from "@/lib/prisma";
import { updateWorkspaceAdministration } from "@/modules/workspaces/application/workspace-administration";

const database = new URL(process.env.DATABASE_URL || "http://invalid");
if (database.hostname !== "127.0.0.1" || database.port !== "56432" || database.pathname !== "/atlasfit_gym_stabilization_20261001") throw new Error("Exige PostgreSQL descartável específico.");
afterAll(async () => { await prisma.$disconnect(); });
async function fixture(type: "GYM" | "PERSONAL" = "GYM") {
  const admin = await prisma.user.create({ data: { role: "SUPERADMIN" } });
  const owner = await prisma.user.create({ data: {} });
  const target = await prisma.user.create({ data: {} });
  const workspace = await prisma.workspace.create({ data: { name: "Administração de workspace", slug: `admin-${randomUUID()}`, type, ownerId: owner.id, members: { create: { userId: owner.id, role: "OWNER", roleGrants: { create: { role: "OWNER" } } } } } });
  if (type === "GYM") await prisma.workspaceSubscription.create({ data: { workspaceId: workspace.id, status: "ACTIVE", maxStaff: 10 } });
  return { admin, owner, target, workspace };
}
describe("GYM PostgreSQL — administração e recuperação", () => {
  it("suspensão concorrente respeita baseline; reativação é possível e inputs/tipo/ator indevidos não modificam dados", async () => {
    const f = await fixture();
    const body = { isActive: false, expectedIsActive: true };
    const attempts = await Promise.allSettled([updateWorkspaceAdministration(f.workspace.id, body, f.admin.id), updateWorkspaceAdministration(f.workspace.id, body, f.admin.id)]);
    expect(attempts.filter(result => result.status === "fulfilled")).toHaveLength(1);
    const denied = attempts.find(result => result.status === "rejected");
    expect(denied?.status === "rejected" ? denied.reason : null).toMatchObject({ statusCode: 409 });
    expect((await prisma.workspace.findUniqueOrThrow({ where: { id: f.workspace.id } })).isActive).toBe(false);
    await expect(updateWorkspaceAdministration(f.workspace.id, { isActive: true, expectedIsActive: true }, f.admin.id)).rejects.toMatchObject({ statusCode: 409 });
    expect((await updateWorkspaceAdministration(f.workspace.id, { isActive: true, expectedIsActive: false }, f.admin.id)).isActive).toBe(true);
    for (const invalid of [{ isActive: "false", expectedIsActive: true }, { isActive: false }, { name: "" }, { actorUserId: f.admin.id, name: "Nova academia" }]) await expect(updateWorkspaceAdministration(f.workspace.id, invalid, f.admin.id)).rejects.toMatchObject({ statusCode: 400 });
    await expect(updateWorkspaceAdministration(f.workspace.id, { type: "PERSONAL" }, f.admin.id)).rejects.toMatchObject({ statusCode: 409 });
    await expect(updateWorkspaceAdministration(f.workspace.id, { name: "Alteração indevida" }, f.owner.id)).rejects.toMatchObject({ statusCode: 403 });
  });
  it("titularidade e atributos mudam juntos; conflito não deixa transferência parcial e PERSONAL conserva seu tipo", async () => {
    const [a, b] = await Promise.all([fixture(), fixture("PERSONAL")]);
    const slug = `shared-${randomUUID()}`;
    const attempts = await Promise.allSettled([a, b].map(f => updateWorkspaceAdministration(f.workspace.id, { ownerId: f.target.id, name: "Workspace atualizado", slug }, f.admin.id)));
    expect(attempts.filter(result => result.status === "fulfilled")).toHaveLength(1);
    const conflict = attempts.find(result => result.status === "rejected");
    expect(conflict?.status === "rejected" ? conflict.reason : null).toMatchObject({ statusCode: 409 });
    for (const [index, f] of [a, b].entries()) {
      const current = await prisma.workspace.findUniqueOrThrow({ where: { id: f.workspace.id } });
      const success = attempts[index].status === "fulfilled";
      expect(current.ownerId).toBe(success ? f.target.id : f.owner.id);
      expect(current.name).toBe(success ? "Workspace atualizado" : f.workspace.name);
      expect(current.type).toBe(f.workspace.type);
      expect(await prisma.auditLog.count({ where: { entityId: f.workspace.id, action: { startsWith: "WORKSPACE_OWNERSHIP_TRANSFER:" } } })).toBe(success ? 1 : 0);
      if (success) {
        const old = await prisma.workspaceMember.findUniqueOrThrow({ where: { userId_workspaceId: { userId: f.owner.id, workspaceId: f.workspace.id } }, include: { roleGrants: true } });
        expect(old.role).toBe("MANAGER"); expect(old.roleGrants.filter(grant => grant.role === "OWNER" && !grant.revokedAt)).toHaveLength(0);
      }
    }
  });
});
