import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock next/headers
const mockCookieStore: Record<string, string> = {};
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockImplementation(async () => ({
    get: (name: string) => (mockCookieStore[name] ? { value: mockCookieStore[name] } : undefined),
    set: (name: string, value: string) => {
      mockCookieStore[name] = value;
    },
    delete: (name: string) => {
      delete mockCookieStore[name];
    },
  })),
}));

// Mock auth
const { mockAuthSession } = vi.hoisted(() => ({
  mockAuthSession: {
    user: {
      id: "superadmin-1",
      role: "SUPERADMIN",
    },
  },
}));

vi.mock("@/auth", () => ({
  auth: vi.fn().mockImplementation(async () => mockAuthSession),
}));

// Mock prisma
const { mockPrisma } = vi.hoisted(() => {
  const mock: any = {
    user: {
      findUnique: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
    },
    workspace: {
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      findUnique: vi.fn(),
    },
    workspaceMember: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    $transaction: vi.fn((callback) => callback(mock)),
  };
  return { mockPrisma: mock };
});

vi.mock("@/lib/prisma", () => ({
  default: mockPrisma,
}));

// Mock ably
const mockPublish = vi.fn().mockResolvedValue(true);
vi.mock("@/lib/ably", () => ({
  ablyRest: {
    channels: {
      get: vi.fn(() => ({
        publish: mockPublish,
      })),
    },
  },
  publishToChannel: vi.fn(),
}));

import { updateAdminUser } from "@/lib/auth/admin-user-service";
import { selectActiveWorkspace } from "@/modules/workspaces/application/actions";

describe("User Blocking and Workspace Suspension", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const k in mockCookieStore) delete mockCookieStore[k];
  });

  describe("updateAdminUser - Blocking rules", () => {
    it("impedes blocking the sole active superadmin", async () => {
      mockPrisma.user.findUnique.mockImplementation(async ({ where }: any) => {
        if (where.id === "superadmin-1") {
          return {
            id: "superadmin-1",
            email: "admin@atlasfit.com",
            role: "SUPERADMIN",
            isBlocked: false,
            name: "Admin",
          };
        }
        return null;
      });
      mockPrisma.user.count.mockResolvedValueOnce(1); // Only 1 superadmin

      await expect(
        updateAdminUser("superadmin-1", "superadmin-1", { isBlocked: true })
      ).rejects.toThrow("Não é permitido bloquear o único superadmin ativo.");
    });

    it("suspends all trainer workspaces and increments sessionVersion when trainer is blocked", async () => {
      mockPrisma.user.findUnique.mockImplementation(async ({ where }: any) => {
        if (where.id === "superadmin-1") {
          return {
            id: "superadmin-1",
            role: "SUPERADMIN",
          };
        }
        if (where.id === "trainer-1") {
          return {
            id: "trainer-1",
            email: "personal@atlasfit.com",
            role: "TRAINER",
            isBlocked: false,
            name: "Personal Trainer",
          };
        }
        return null;
      });

      mockPrisma.workspace.findMany.mockResolvedValueOnce([
        { id: "ws-1", name: "Studio Fit" },
        { id: "ws-2", name: "Consultoria VIP" },
      ]);

      mockPrisma.user.update.mockResolvedValueOnce({
        id: "trainer-1",
        email: "personal@atlasfit.com",
        role: "TRAINER",
        isBlocked: true,
        name: "Personal Trainer",
      });

      const updated = await updateAdminUser("trainer-1", "superadmin-1", { isBlocked: true });

      expect(updated.isBlocked).toBe(true);

      // Verify user update included sessionVersion increment
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "trainer-1" },
          data: expect.objectContaining({
            isBlocked: true,
            sessionVersion: { increment: 1 },
          }),
        })
      );

      // Verify workspaces were suspended via updateMany (isActive: false)
      expect(mockPrisma.workspace.updateMany).toHaveBeenCalledWith({
        where: { ownerId: "trainer-1", isActive: true },
        data: { isActive: false },
      });
    });
  });

  describe("selectActiveWorkspace - Rejection on suspended or blocked workspaces", () => {
    it("rejeita seleção se o workspace estiver explicitamente suspenso (isActive: false)", async () => {
      mockPrisma.workspaceMember.findFirst.mockResolvedValueOnce({
        id: "member-1",
        role: "STUDENT",
        workspaceId: "ws-suspended",
        workspace: {
          id: "ws-suspended",
          name: "Studio Suspenso",
          slug: "studio-suspenso",
          isActive: false,
          ownerId: "trainer-1",
          units: [],
        },
        roleGrants: [],
      });

      const result = await selectActiveWorkspace("ws-suspended");
      expect(result.error).toBe("Este workspace está suspenso. Procure o suporte para regularizar o acesso.");
    });

    it("rejeita seleção se o dono do workspace pessoal estiver bloqueado", async () => {
      mockPrisma.workspaceMember.findFirst.mockResolvedValueOnce({
        id: "member-2",
        role: "STUDENT",
        workspaceId: "ws-personal",
        workspace: {
          id: "ws-personal",
          name: "Personal VIP",
          slug: "personal-vip",
          type: "PERSONAL",
          isActive: true,
          ownerId: "blocked-trainer",
          units: [],
        },
        roleGrants: [],
      });

      mockPrisma.user.findUnique.mockResolvedValueOnce({
        id: "blocked-trainer",
        isBlocked: true,
      });

      const result = await selectActiveWorkspace("ws-personal");
      expect(result.error).toBe("Este workspace está suspenso. Procure o suporte para regularizar o acesso.");
    });
  });
});
