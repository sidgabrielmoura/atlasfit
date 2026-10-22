import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock auth
let currentSession: any = {
  user: {
    id: "admin-1",
    role: "SUPERADMIN",
  },
};

vi.mock("@/auth", () => ({
  auth: vi.fn(async () => currentSession),
}));

// Mock prisma
const { mockPrisma } = vi.hoisted(() => {
  const mock: any = {
    workspace: {
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    plan: {
      create: vi.fn(),
    },
    workspaceSubscription: {
      upsert: vi.fn(),
    },
    subscription: {
      findUnique: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    $transaction: vi.fn(async (cb) => cb(mock)),
  };
  return { mockPrisma: mock };
});

vi.mock("@/lib/prisma", () => ({
  default: mockPrisma,
}));

import { POST } from "@/app/api/superadmin/workspaces/[id]/custom-plan/route";

describe("Custom Workspace Plan API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentSession = {
      user: {
        id: "admin-1",
        role: "SUPERADMIN",
      },
    };
  });

  it("rejeita requisições de usuários que não sejam superadmin", async () => {
    currentSession = { user: { id: "user-1", role: "USER" } };

    const req = new Request("http://localhost/api/superadmin/workspaces/ws-1/custom-plan", {
      method: "POST",
      body: JSON.stringify({ name: "Plano Teste", price: 100 }),
    });

    const res = await POST(req, { params: Promise.resolve({ id: "ws-1" }) });
    expect(res.status).toBe(401);
  });

  it("configura e ativa plano personalizado para workspace do tipo GYM", async () => {
    mockPrisma.workspace.findUnique.mockResolvedValueOnce({
      id: "gym-ws-1",
      name: "Academia Iron",
      type: "GYM",
      ownerId: "owner-1",
      isActive: false,
    });

    mockPrisma.plan.create.mockResolvedValueOnce({
      id: "custom-plan-gym-1",
      name: "Plano Academia Especial",
      price: 299.9,
    });

    const req = new Request("http://localhost/api/superadmin/workspaces/gym-ws-1/custom-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Plano Academia Especial",
        price: 299.9,
        maxWorkspaces: 2,
        maxStudents: 350,
        importQuota: 50,
        storageLimitMb: 5120,
        features: "Suporte 24h, Gestão Multiusuário",
        isRecurring: true,
        periodicity: "MENSAL",
        paymentMethod: "BOLETO",
        toleranceDays: 7,
        autoSuspendEnabled: true,
      }),
    });

    const res = await POST(req, { params: Promise.resolve({ id: "gym-ws-1" }) });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);

    expect(mockPrisma.plan.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: "Plano Academia Especial",
        price: 299.9,
        maxWorkspaces: 2,
        maxStudents: 350,
        importQuota: 50,
        storageLimitMb: 5120,
      }),
    });

    expect(mockPrisma.workspaceSubscription.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { workspaceId: "gym-ws-1" },
        create: expect.objectContaining({
          priceInCents: 29990,
          toleranceDays: 7,
          autoSuspendEnabled: true,
          billingControlType: "MANUAL",
        }),
      })
    );

    // Reativação do workspace
    expect(mockPrisma.workspace.update).toHaveBeenCalledWith({
      where: { id: "gym-ws-1" },
      data: { isActive: true },
    });

    // Auditoria
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "CREATE_CUSTOM_WORKSPACE_PLAN",
        entity: "Workspace",
        entityId: "gym-ws-1",
      }),
    });
  });

  it("configura e ativa plano personalizado para workspace do tipo PERSONAL", async () => {
    mockPrisma.workspace.findUnique.mockResolvedValueOnce({
      id: "personal-ws-1",
      name: "Personal Lucas",
      type: "PERSONAL",
      ownerId: "trainer-1",
      isActive: false,
    });

    mockPrisma.plan.create.mockResolvedValueOnce({
      id: "custom-plan-personal-1",
      name: "Plano Pro VIP",
      price: 149.9,
    });

    mockPrisma.subscription.findUnique.mockResolvedValueOnce({
      id: "sub-trainer-1",
      userId: "trainer-1",
    });

    const req = new Request("http://localhost/api/superadmin/workspaces/personal-ws-1/custom-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Plano Pro VIP",
        price: 149.9,
        maxWorkspaces: 1,
        maxStudents: 60,
        importQuota: 30,
        storageLimitMb: 2048,
        isRecurring: true,
        periodicity: "MENSAL",
        paymentMethod: "PIX",
        toleranceDays: 5,
        autoSuspendEnabled: true,
      }),
    });

    const res = await POST(req, { params: Promise.resolve({ id: "personal-ws-1" }) });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);

    expect(mockPrisma.subscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "sub-trainer-1" },
        data: expect.objectContaining({
          priceInCents: 14990,
          toleranceDays: 5,
          billingControlType: "MANUAL",
          autoSuspendEnabled: true,
        }),
      })
    );

    expect(mockPrisma.workspace.update).toHaveBeenCalledWith({
      where: { id: "personal-ws-1" },
      data: { isActive: true },
    });
  });

  it("normaliza armazenamento informado em GB (ex: 3 -> 3072 MB)", async () => {
    mockPrisma.workspace.findUnique.mockResolvedValueOnce({
      id: "ws-3gb",
      name: "Academia 3GB",
      type: "GYM",
      ownerId: "owner-3gb",
      isActive: true,
    });

    mockPrisma.plan.create.mockResolvedValueOnce({
      id: "plan-3gb",
      name: "gym plan",
      price: 150,
    });

    const req = new Request("http://localhost/api/superadmin/workspaces/ws-3gb/custom-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "gym plan",
        price: 150,
        storageLimitMb: 3, // Inserido como 3 pensando em 3 GB
      }),
    });

    const res = await POST(req, { params: Promise.resolve({ id: "ws-3gb" }) });
    expect(res.status).toBe(200);

    expect(mockPrisma.plan.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: "gym plan",
        storageLimitMb: 3072, // 3 * 1024
      }),
    });
  });
});
