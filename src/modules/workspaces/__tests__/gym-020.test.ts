import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock auth
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock prisma
const { mockPrisma } = vi.hoisted(() => {
  const mock: any = {
    workspace: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    workspaceMember: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
    },
    workspaceRoleGrant: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    gymSettings: {
      create: vi.fn(),
    },
    workspaceInvitation: { count: vi.fn() },
    gymUnit: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    gymStaffProfile: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  };
  mock.$transaction = vi.fn(async (callback: any) => callback(mock));
  return { mockPrisma: mock };
});

vi.mock("@/lib/prisma", () => ({
  default: mockPrisma,
}));

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { requireWorkspaceAccess } from "../application/guard";
import { ownershipService } from "../application/ownership-service";
import { backfillService } from "../application/backfill-service";
import { gymService } from "../application/gym-service";
import { WorkspaceAccessError } from "../domain/types";

describe("GYM-020: Guard Role Grants Resolution & Multi-role", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockPrisma.$transaction.mockImplementation(async (callback: any) => callback(mockPrisma));
  });

  it("membro com múltiplos grants ativos (TRAINER + STUDENT) recebe capacidades combinadas", async () => {
    (auth as any).mockResolvedValue({
      user: { id: "usr_dual_01", email: "dual@atlas.fit", role: "USER" },
    });

    (prisma.workspace.findUnique as any).mockResolvedValue({
      id: "ws_gym_01",
      name: "Atlas Gym Matriz",
      slug: "atlas-gym",
      ownerId: "usr_owner_01",
      isActive: true,
      type: "GYM",
      subscription: { status: "ACTIVE", endDate: null, trialEndsAt: null },
    });

    (prisma.workspaceMember.findFirst as any).mockResolvedValue({
      id: "mem_dual_01",
      role: "STUDENT", // legacy role
      isActive: true,
      unitId: null,
      roleGrants: [
        { role: "TRAINER", unitId: null, revokedAt: null },
        { role: "STUDENT", unitId: null, revokedAt: null },
      ],
    });

    const context = await requireWorkspaceAccess({ workspaceId: "ws_gym_01" });

    expect(context.workspaceType).toBe("GYM");
    expect(context.roles).toContain("TRAINER");
    expect(context.roles).toContain("STUDENT");
    // Possui capacidades de treinador
    expect(context.capabilities.has("workouts.manage.assigned")).toBe(true);
    // O papel STUDENT não concede operações administrativas.
  });

  it("grants com unitId específico são filtrados quando options.unitId não coincide", async () => {
    (auth as any).mockResolvedValue({
      user: { id: "usr_staff_01", email: "staff@atlas.fit", role: "USER" },
    });

    (prisma.workspace.findUnique as any).mockResolvedValue({
      id: "ws_gym_01",
      name: "Atlas Gym Matriz",
      slug: "atlas-gym",
      ownerId: "usr_owner_01",
      isActive: true,
      type: "GYM",
      subscription: { status: "ACTIVE", endDate: null, trialEndsAt: null },
    });

    // O usuário é RECEPTIONIST apenas na unit_alpha
    (prisma.workspaceMember.findFirst as any).mockResolvedValue({
      id: "mem_staff_01",
      role: "STUDENT",
      isActive: true,
      unitId: null,
      roleGrants: [{ role: "RECEPTIONIST", unitId: "unit_alpha", revokedAt: null }],
    });

    mockPrisma.gymUnit.findFirst.mockResolvedValue({ id: "unit_beta" });
    // Grant de outra unidade não autoriza nem reativa o papel legado.
    const context = await requireWorkspaceAccess({
      workspaceId: "ws_gym_01",
      unitId: "unit_beta",
    });

    expect(context.roles).not.toContain("RECEPTIONIST");
    expect(context.roles).toEqual([]);
    expect(context.capabilities.has("students.manage")).toBe(false);
  });

  it("compatibilidade legada: membro sem grants cai no fallback transparente de member.role", async () => {
    (auth as any).mockResolvedValue({
      user: { id: "usr_legacy_01", email: "legacy@atlas.fit", role: "USER" },
    });

    (prisma.workspace.findUnique as any).mockResolvedValue({
      id: "ws_personal_01",
      name: "Personal Lucas",
      slug: "personal-lucas",
      ownerId: "usr_owner_01",
      isActive: true,
      type: "PERSONAL",
    });

    (prisma.workspaceMember.findFirst as any).mockResolvedValue({
      id: "mem_legacy_01",
      role: "TRAINER",
      isActive: true,
      unitId: null,
      roleGrants: [], // Sem grants ainda
    });

    const context = await requireWorkspaceAccess({ workspaceId: "ws_personal_01" });

    expect(context.workspaceType).toBe("PERSONAL");
    expect(context.roles).toEqual(["TRAINER"]);
    expect(context.capabilities.has("workouts.manage.assigned")).toBe(true);
  });
});

describe("GYM-020: Ownership Consistency & Transfer", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockPrisma.$transaction.mockImplementation(async (callback: any) => callback(mockPrisma));
  });

  it("impede remoção ou revogação do único OWNER do workspace", async () => {
    (prisma.workspaceMember.findUnique as any).mockResolvedValue({
      id: "mem_owner_01",
      workspaceId: "ws_01",
      role: "OWNER",
      roleGrants: [{ role: "OWNER" }],
    });

    // Zero outros owners no workspace
    (prisma.workspaceMember.count as any).mockResolvedValue(0);

    await expect(
      ownershipService.preventLastOwnerRemoval("ws_01", "mem_owner_01")
    ).rejects.toThrow(WorkspaceAccessError);

    await expect(
      ownershipService.preventLastOwnerRemoval("ws_01", "mem_owner_01")
    ).rejects.toMatchObject({ code: "CANNOT_REMOVE_LAST_OWNER" });
  });

  it("permite remoção/revogação de owner se existir outro owner ativo", async () => {
    (prisma.workspaceMember.findUnique as any).mockResolvedValue({
      id: "mem_owner_01",
      workspaceId: "ws_01",
      role: "OWNER",
      roleGrants: [{ role: "OWNER" }],
    });

    // Existe outro owner
    (prisma.workspaceMember.count as any).mockResolvedValue(1);

    await expect(
      ownershipService.preventLastOwnerRemoval("ws_01", "mem_owner_01")
    ).resolves.not.toThrow();
  });

  it("transferência atômica de titularidade: atualiza ownerId, concede OWNER e demite anterior para MANAGER", async () => {
    (prisma.workspace.findUnique as any).mockResolvedValue({
      id: "ws_01",
      name: "Atlas Gym",
      ownerId: "usr_alice",
      type: "GYM", isActive: true,
      subscription: { status: "ACTIVE", endDate: null, trialEndsAt: null, maxStaff: 5 },
    });

    (prisma.user.findUnique as any).mockImplementation(({ where }: any) => {
      if (where.id === "usr_bob") return Promise.resolve({ id: "usr_bob", name: "Bob Silva" });
      if (where.id === "usr_alice") return Promise.resolve({ id: "usr_alice", name: "Alice Santos", role: "USER" });
      return Promise.resolve(null);
    });

    (prisma.workspaceMember.findUnique as any).mockImplementation(({ where }: any) => {
      const userId = where.userId_workspaceId.userId;
      if (userId === "usr_bob") return Promise.resolve({ id: "mem_bob_01", userId, role: "STUDENT", workspaceId: "ws_01", isActive: true, unitId: null, roleGrants: [] });
      if (userId === "usr_alice") return Promise.resolve({ id: "mem_alice_01", userId, role: "OWNER", workspaceId: "ws_01", isActive: true, unitId: null, roleGrants: [] });
      return Promise.resolve(null);
    });
    mockPrisma.workspaceMember.count.mockResolvedValue(1);
    mockPrisma.workspaceInvitation.count.mockResolvedValue(0);
    mockPrisma.workspaceMember.upsert.mockResolvedValue({ id: "mem_bob_01" });

    const result = await ownershipService.transferWorkspaceOwnership({
      workspaceId: "ws_01",
      currentOwnerUserId: "usr_alice",
      targetUserId: "usr_bob",
      auditActorId: "usr_alice",
    });

    expect(result.success).toBe(true);
    expect(result.newOwnerId).toBe("usr_bob");
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.workspace.update).toHaveBeenCalledWith({ where: { id: "ws_01" }, data: { ownerId: "usr_bob" } });
    expect(prisma.workspaceMember.update).toHaveBeenCalledWith({ where: { id: "mem_alice_01" }, data: { role: "MANAGER", unitId: null } });
    expect(prisma.workspaceRoleGrant.create).toHaveBeenCalledWith({ data: expect.objectContaining({ memberId: "mem_bob_01", role: "OWNER" }) });
  });
});

describe("GYM-020: Backfill Service", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockPrisma.$transaction.mockImplementation(async (callback: any) => callback(mockPrisma));
  });

  it("backfillLegacyRoleGrants cria grants para membros sem grants prévios", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ role: "SUPERADMIN" });
    (prisma.workspaceMember.findMany as any).mockResolvedValue([
      { id: "mem_01", role: "TRAINER", workspaceId: "ws_01", createdAt: new Date() },
      { id: "mem_02", role: "STUDENT", workspaceId: "ws_01", createdAt: new Date() },
    ]);
    mockPrisma.workspaceMember.findFirst.mockImplementation(async ({ where }: any) => ({ id: where.id, userId: "usr_" + where.id, workspaceId: "ws_01", role: where.id === "mem_01" ? "TRAINER" : "STUDENT", unitId: null, workspace: { ownerId: "owner_01" } }));

    const result = await backfillService.backfillLegacyRoleGrants("ws_01", "admin_01");

    expect(result.backfilledCount).toBe(2);
    expect(prisma.workspaceRoleGrant.create).toHaveBeenCalledTimes(2);
    expect(prisma.workspaceRoleGrant.create).toHaveBeenCalledWith({ data: expect.objectContaining({ memberId: "mem_01", role: "TRAINER", grantedBy: "admin_01", unitId: null }) });
  });

  it("backfill sem administrador ou por operador comum não cria grants", async () => {
    await expect(backfillService.backfillLegacyRoleGrants("ws_01")).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    mockPrisma.user.findUnique.mockResolvedValue({ role: "USER" });
    await expect(backfillService.backfillLegacyRoleGrants("ws_01", "operator_01")).rejects.toMatchObject({ statusCode: 403 });
    expect(prisma.workspaceRoleGrant.create).not.toHaveBeenCalled();
  });
});
