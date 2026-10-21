import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock prisma
const { mockPrisma } = vi.hoisted(() => {
  const mock: any = {
    $transaction: vi.fn(async (cb) => cb(mock)),
    workspace: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    workspaceMember: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
    },
    workspaceRoleGrant: {
      create: vi.fn(),
    },
    workspaceSubscription: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
    },
    gymSettings: {
      create: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
    },
    gymUnit: {
      create: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
    },
    systemSetting: { findMany: vi.fn() },
    gymExpenseCategory: { createMany: vi.fn() },
    auditLog: {
      create: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  };
  return { mockPrisma: mock };
});

vi.mock("@/lib/prisma", () => ({
  default: mockPrisma,
}));

import { SuperAdminGymService } from "../application/superadmin-service";
import { WorkspaceRole, WorkspaceType, WorkspaceSubscriptionStatus } from "@prisma/client";

describe("GYM-023: Superadmin e Configuração da Academia", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockPrisma.$transaction.mockImplementation(async (callback: any) => callback(mockPrisma));
    mockPrisma.systemSetting.findMany.mockResolvedValue([]);
    mockPrisma.user.findUnique.mockImplementation(async ({ where }: any) => ({ id: where.id, name: "Titular sintético", role: where.id === "superadmin-root" ? "SUPERADMIN" : "USER" }));
  });

  describe("provisionWorkspace", () => {
    it("provisiona workspace GYM completo atomicamente com subscription, settings e unidade inicial", async () => {
      mockPrisma.workspace.findUnique
        .mockResolvedValueOnce(null) // slug check
        .mockResolvedValueOnce({
          id: "ws-gym-1",
          slug: "academia-pro-fit",
          settings: null,
          units: [],
        }); // ensureGymSettingsAndDefaultUnit check

      mockPrisma.workspace.create.mockResolvedValueOnce({
        id: "ws-gym-1",
        name: "Academia Pro Fit",
        slug: "academia-pro-fit",
        type: WorkspaceType.GYM,
        ownerId: "owner-1",
        isActive: true,
      });

      mockPrisma.workspaceMember.create.mockResolvedValueOnce({
        id: "mem-owner",
        workspaceId: "ws-gym-1",
        userId: "owner-1",
        role: WorkspaceRole.OWNER,
      });

      mockPrisma.gymSettings.create.mockResolvedValueOnce({
        id: "settings-1",
        workspaceId: "ws-gym-1",
        maxStudents: 300,
        maxStaff: 30,
        maxUnits: 3,
        requireGuardianSignature: true,
      });

      mockPrisma.gymUnit.create.mockImplementation(async ({ data }: any) => ({
        id: "unit-1",
        ...data,
      }));

      mockPrisma.workspaceSubscription.create.mockResolvedValueOnce({
        id: "sub-1",
        workspaceId: "ws-gym-1",
        status: WorkspaceSubscriptionStatus.ACTIVE,
        maxStudents: 300,
        maxStaff: 30,
        maxUnits: 3,
      });

      const result = await SuperAdminGymService.provisionWorkspace(
        {
          name: "Academia Pro Fit",
          slug: "academia-pro-fit",
          ownerId: "owner-1",
          type: WorkspaceType.GYM,
          initialUnitName: "Matriz Centro",
          maxStudents: 300,
          maxStaff: 30,
          maxUnits: 3,
        },
        "superadmin-root"
      );

      expect(result).toBeDefined();
      expect(result.id).toBe("ws-gym-1");
      expect(result.type).toBe(WorkspaceType.GYM);

      // Verify atomic operations
      expect(mockPrisma.workspace.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: WorkspaceType.GYM,
            ownerId: "owner-1",
          }),
        })
      );
      expect(mockPrisma.workspaceMember.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: "owner-1",
            role: WorkspaceRole.OWNER,
          }),
        })
      );
      expect(mockPrisma.gymSettings.create).toHaveBeenCalled();
      expect(mockPrisma.gymUnit.create).toHaveBeenCalled();
      expect(mockPrisma.gymExpenseCategory.createMany).toHaveBeenCalledWith(expect.objectContaining({ skipDuplicates: true, data: expect.arrayContaining([expect.objectContaining({ workspaceId: "ws-gym-1", code: "ALUGUEL" })]) }));
      expect(mockPrisma.workspaceSubscription.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            workspaceId: "ws-gym-1",
            status: WorkspaceSubscriptionStatus.TRIAL,
          }),
        })
      );
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            entity: "WORKSPACE",
            severity: "success",
          }),
        })
      );
    });

    it("impede criação se slug já estiver em uso", async () => {
      mockPrisma.workspace.findUnique.mockResolvedValueOnce({ id: "existing-ws" });

      await expect(
        SuperAdminGymService.provisionWorkspace(
          {
            name: "Academia Existente",
            slug: "academia-existente",
            ownerId: "owner-1",
          },
          "superadmin-root"
        )
      ).rejects.toMatchObject({ statusCode: 409, code: "INVALID_REQUEST" });
      expect(mockPrisma.workspace.create).not.toHaveBeenCalled();
    });
  });

  describe("updateGymConfig", () => {
    it("atualiza limites e políticas sincronizando subscription ativa", async () => {
      mockPrisma.workspace.findUnique
        .mockResolvedValueOnce({
          id: "ws-gym-1",
          name: "Academia Pro Fit",
          type: WorkspaceType.GYM,
          subscription: { id: "sub-1" },
          settings: { id: "settings-1" },
        })
        .mockResolvedValueOnce({
          id: "ws-gym-1",
          name: "Academia Pro Fit",
          type: WorkspaceType.GYM,
          settings: { id: "settings-1", billingGracePeriodDays: 7 },
          subscription: { id: "sub-1", maxStudents: 500 },
          units: [],
        });

      mockPrisma.gymSettings.upsert.mockResolvedValueOnce({
        id: "settings-1",
        billingGracePeriodDays: 7,
      });

      mockPrisma.workspaceSubscription.upsert.mockResolvedValueOnce({
        id: "sub-1",
        maxStudents: 500,
      });

      const result = await SuperAdminGymService.updateGymConfig({
        workspaceId: "ws-gym-1",
        adminUserId: "superadmin-root",
        subscription: {
          maxStudents: 500,
          maxStaff: 40,
        },
        settings: {
          billingGracePeriodDays: 7,
        },
      });

      expect(result).toBeDefined();
      expect(mockPrisma.gymSettings.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { workspaceId: "ws-gym-1" },
          update: expect.objectContaining({
            billingGracePeriodDays: 7,
          }),
        })
      );
      expect(mockPrisma.workspaceSubscription.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { workspaceId: "ws-gym-1" },
          update: expect.objectContaining({
            maxStudents: 500,
            maxStaff: 40,
          }),
        })
      );
      expect(mockPrisma.auditLog.create).toHaveBeenCalled();
    });

    it("rejeita atualização para workspaces não-GYM", async () => {
      mockPrisma.workspace.findUnique.mockResolvedValueOnce({
        id: "ws-personal-1",
        name: "Personal Lucas",
        type: WorkspaceType.PERSONAL,
      });

      await expect(
        SuperAdminGymService.updateGymConfig({
          workspaceId: "ws-personal-1",
          adminUserId: "superadmin-root",
          subscription: { maxStudents: 50 },
        })
      ).rejects.toMatchObject({ statusCode: 404, code: "WORKSPACE_NOT_FOUND" });
      expect(mockPrisma.workspaceSubscription.upsert).not.toHaveBeenCalled();
    });
  });

  describe("addGymUnit", () => {
    it("adiciona nova filial respeitando o limite maxUnits da licença", async () => {
      mockPrisma.workspace.findUnique.mockResolvedValueOnce({
        id: "ws-gym-1",
        name: "Academia Pro Fit",
        slug: "academia-pro-fit",
        type: WorkspaceType.GYM,
        isActive: true,
        subscription: { status: "ACTIVE", endDate: null, trialEndsAt: null, maxUnits: 3 },
        units: [{ id: "u-1", isActive: true }, { id: "u-2", isActive: true }],
      });
      mockPrisma.gymUnit.count.mockResolvedValue(2);

      mockPrisma.gymUnit.create.mockResolvedValueOnce({
        id: "unit-3",
        name: "Unidade Jardins",
        code: "U03",
        workspaceId: "ws-gym-1",
      });

      const unit = await SuperAdminGymService.addGymUnit(
        "ws-gym-1",
        {
          name: "Unidade Jardins",
          code: "U03",
          address: "Alameda Santos, 500",
        },
        "superadmin-root"
      );

      expect(unit).toBeDefined();
      expect(unit.name).toBe("Unidade Jardins");
      expect(mockPrisma.gymUnit.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: "Unidade Jardins",
            code: "U03",
            workspaceId: "ws-gym-1",
          }),
        })
      );
      expect(mockPrisma.auditLog.create).toHaveBeenCalled();
    });

    it("bloqueia adição de filial se o limite contratado maxUnits for atingido", async () => {
      mockPrisma.workspace.findUnique.mockResolvedValueOnce({
        id: "ws-gym-1",
        name: "Academia Pro Fit",
        slug: "academia-pro-fit",
        type: WorkspaceType.GYM,
        isActive: true,
        subscription: { status: "ACTIVE", endDate: null, trialEndsAt: null, maxUnits: 2 },
        units: [{ id: "u-1", isActive: true }, { id: "u-2", isActive: true }],
      });
      mockPrisma.gymUnit.count.mockResolvedValue(2);

      await expect(
        SuperAdminGymService.addGymUnit(
          "ws-gym-1",
          {
            name: "Unidade Excedente",
            code: "U03",
          },
          "superadmin-root"
        )
      ).rejects.toMatchObject({ statusCode: 409, code: "INVALID_REQUEST" });
      expect(mockPrisma.gymUnit.create).not.toHaveBeenCalled();
    });
  });

  it("operador comum não provisiona academia nem modifica limites administrativos", async () => {
    await expect(SuperAdminGymService.provisionWorkspace({ name: "Academia sintética", slug: "academia-sintetica", ownerId: "owner-1" }, "operator-1")).rejects.toMatchObject({ statusCode: 403, code: "INSUFFICIENT_PERMISSIONS" });
    await expect(SuperAdminGymService.updateGymConfig({ workspaceId: "ws-gym-1", adminUserId: "operator-1", subscription: { maxStudents: 50 } })).rejects.toMatchObject({ statusCode: 403, code: "INSUFFICIENT_PERMISSIONS" });
    expect(mockPrisma.workspace.create).not.toHaveBeenCalled();
    expect(mockPrisma.workspaceSubscription.upsert).not.toHaveBeenCalled();
  });
});
