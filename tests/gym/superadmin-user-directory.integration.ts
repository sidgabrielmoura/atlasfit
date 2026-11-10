import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it, vi } from "vitest";
import prisma from "@/lib/prisma";
import { matchesUserDirectoryCategory } from "@/lib/superadmin/user-directory";

const actor = vi.hoisted(() => ({ role: "SUPERADMIN" }));
vi.mock("@/auth", () => ({ auth: async () => ({ user: { id: "synthetic-admin", role: actor.role } }), signIn: vi.fn(), signOut: vi.fn() }));
import { GET } from "@/app/api/superadmin/users/route";

const database = new URL(process.env.DATABASE_URL || "http://invalid");
if (database.hostname !== "127.0.0.1" || database.port !== "56432" || database.pathname !== "/atlasfit_gym_stabilization_20261001") throw Error("Requires the disposable PostgreSQL database.");
afterAll(() => prisma.$disconnect());

describe("Superadmin — diretório de usuários da academia", () => {
  it("GET inclui dono e recepção USER, com ownership sem membro e grant por unidade", async () => {
    const owner = await prisma.user.create({ data: { name: "Dono sintético", role: "USER" } });
    const receptionist = await prisma.user.create({ data: { name: "Recepção sintética", role: "USER" } });
    const gym = await prisma.workspace.create({ data: { name: "Diretório sintético", slug: randomUUID(), type: "GYM", ownerId: owner.id, units: { create: { name: "Matriz" } } }, include: { units: true } });
    // A provisioned grant takes precedence over the old compatibility column.
    await prisma.workspaceMember.create({ data: { workspaceId: gym.id, userId: receptionist.id, role: "STUDENT", roleGrants: { create: { role: "RECEPTIONIST", unitId: gym.units[0].id } } } });
    const response = await GET();
    expect(response.status).toBe(200); expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    const users = await response.json();
    for (const [id, role] of [[owner.id, "OWNER"], [receptionist.id, "RECEPTIONIST"]]) {
      const rows = users.filter((user: { id: string }) => user.id === id);
      expect(rows).toHaveLength(1);
      expect(rows[0].role).toBe("USER");
      expect(rows[0].workspaceContexts).toEqual([expect.objectContaining({ id: gym.id, roles: [role], isStaff: true, isStudent: false })]);
      expect(matchesUserDirectoryCategory(rows[0], "all")).toBe(true);
      expect(matchesUserDirectoryCategory(rows[0], "gym")).toBe(true);
      expect(matchesUserDirectoryCategory(rows[0], "aluno")).toBe(false);
      for (const field of ["password", "twoFactorSecret", "twoFactorBackupCodes", "medicalConditions"]) expect(rows[0]).not.toHaveProperty(field);
    }
    expect(await prisma.workspaceMember.count({ where: { userId: owner.id, workspaceId: gym.id } })).toBe(0);
  });
  it("GET continua restrito ao SUPERADMIN", async () => {
    actor.role = "USER";
    try { expect((await GET()).status).toBe(401); }
    finally { actor.role = "SUPERADMIN"; }
  });
});
