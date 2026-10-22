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
      update: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      delete: vi.fn(),
    },
    workspaceSubscription: {
      upsert: vi.fn(),
      update: vi.fn(),
    },
    subscription: {
      findUnique: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
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

import { POST, PATCH, PUT, DELETE } from "@/app/api/superadmin/workspaces/[id]/custom-plan/route";

const offer = {
  id: "plan-1", name: "Plano VIP", price: 100, interval: "month",
  features: "Até 50 alunos ativos, Suporte prioritário", imageUrl: "https://example.com/plan.png",
  maxWorkspaces: 2, maxStudents: 50, importQuota: 0, storageLimitMb: 0,
  paymentMethods: "PIX,CARD", customWorkspaceId: "ws-1", publishedGlobalPlanId: null,
};
const input = {
  name: "Plano VIP editado", price: 0, maxWorkspaces: 3, maxStudents: null,
  features: "Alunos ilimitados, Suporte VIP", imageUrl: "https://example.com/new.png",
  importQuota: 0, storageLimitMb: 0, periodicity: "ANUAL", paymentMethods: "PIX,CARD",
  paymentMethod: "PIX", isRecurring: true, toleranceDays: 0,
};
function request(method: string, body: unknown) {
  return new Request("http://localhost/api/superadmin/workspaces/ws-1/custom-plan", {
    method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
}
const context = () => ({ params: Promise.resolve({ id: "ws-1" }) });
function assigned(type = "GYM", plan: Omit<typeof offer, "customWorkspaceId" | "publishedGlobalPlanId"> & { customWorkspaceId: string | null; publishedGlobalPlanId: string | null } = offer) {
  const sub = { id: "sub-1", userId: "owner-1", planId: plan.id, plan, status: "PAST_DUE" };
  mockPrisma.workspace.findUnique.mockResolvedValue({ id: "ws-1", type, ownerId: "owner-1", subscription: type === "GYM" ? sub : null });
  mockPrisma.subscription.findUnique.mockResolvedValue(sub);
  mockPrisma.plan.update.mockImplementation(async ({ data }: any) => ({ ...plan, ...data }));
  return sub;
}

describe("Custom Workspace Plan API", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockPrisma.$transaction.mockImplementation(async (cb: any) => cb(mockPrisma));
    currentSession = {
      user: {
        id: "admin-1",
        role: "SUPERADMIN",
      },
    };
  });

  it.each(["GYM", "PERSONAL"])("edita %s sem criar plano ou alterar seu ID", async type => {
    assigned(type);
    const res = await PATCH(request("PATCH", { ...input, planId: offer.id }), context());
    expect(res.status).toBe(200);
    expect(mockPrisma.plan.create).not.toHaveBeenCalled();
    expect(mockPrisma.plan.update).toHaveBeenCalledWith({ where: { id: offer.id }, data: expect.objectContaining({
      name: input.name, price: 0, maxStudents: null, importQuota: 0, storageLimitMb: 0, features: input.features,
    }) });
    const update = type === "GYM" ? mockPrisma.workspaceSubscription.upsert.mock.calls[0][0].update : mockPrisma.subscription.update.mock.calls[0][0].data;
    expect(update.planId).toBe(offer.id);
    expect(update.priceInCents).toBe(0);
    expect(update.status).toBeUndefined();
    expect(mockPrisma.workspace.update).not.toHaveBeenCalled();
  });

  it("recusa edição de um plano que não é mais o atribuído", async () => {
    assigned();
    const res = await PATCH(request("PATCH", { ...input, planId: "old-plan" }), context());
    expect(res.status).toBe(409);
    expect(mockPrisma.plan.update).not.toHaveBeenCalled();
    expect(mockPrisma.plan.create).not.toHaveBeenCalled();
  });

  it("publica cópia global com todos os dados persistidos e preserva a atribuição", async () => {
    assigned();
    mockPrisma.plan.create.mockResolvedValue({ ...offer, id: "global-1", customWorkspaceId: null });
    const res = await PUT(request("PUT", { planId: offer.id }), context());
    expect(res.status).toBe(200);
    const { id, publishedGlobalPlanId, ...fields } = offer;
    expect(mockPrisma.plan.create).toHaveBeenCalledWith({ data: { ...fields, customWorkspaceId: null } });
    expect(mockPrisma.plan.update).toHaveBeenCalledWith({ where: { id }, data: { publishedGlobalPlanId: "global-1" } });
    expect(mockPrisma.workspaceSubscription.upsert).not.toHaveBeenCalled();
    expect(mockPrisma.subscription.update).not.toHaveBeenCalled();
  });

  it.each([
    { ...offer, customWorkspaceId: null },
    { ...offer, publishedGlobalPlanId: "global-1" },
  ])("bloqueia nova publicação quando já é global ou possui cópia", async plan => {
    assigned("GYM", plan);
    const res = await PUT(request("PUT", { planId: offer.id }), context());
    expect(res.status).toBe(409);
    expect(mockPrisma.plan.create).not.toHaveBeenCalled();
  });

  it("recusa publicação de oferta idêntica já existente no catálogo", async () => {
    assigned();
    mockPrisma.plan.findFirst.mockResolvedValue({ id: "matching-global" });
    const res = await PUT(request("PUT", { planId: offer.id }), context());
    expect(res.status).toBe(409);
    expect(mockPrisma.plan.create).not.toHaveBeenCalled();
  });

  it("não aceita dados substitutos na request de publicação", async () => {
    assigned();
    const res = await PUT(request("PUT", { planId: offer.id, price: 999 }), context());
    expect(res.status).toBe(400);
    expect(mockPrisma.plan.create).not.toHaveBeenCalled();
  });

  it.each(["WORKSPACE", "GLOBAL"])("cria uma oferta com escopo %s", async scope => {
    assigned();
    mockPrisma.plan.create.mockResolvedValue({ ...offer, id: "new-plan" });
    const res = await POST(request("POST", { ...input, scope }), context());
    expect(res.status).toBe(200);
    expect(mockPrisma.plan.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      customWorkspaceId: scope === "GLOBAL" ? null : "ws-1",
    }) });
  });

  it("deleta plano exclusivo e cancela a licença do workspace", async () => {
    assigned();
    mockPrisma.plan.findUnique.mockResolvedValue({ _count: { subscriptions: 0, workspaceSubscriptions: 0, subscriptionActivities: 0 } });
    const res = await DELETE(request("DELETE", { planId: offer.id }), context());
    expect(res.status).toBe(200);
    expect(mockPrisma.workspaceSubscription.update).toHaveBeenCalledWith({ where: { workspaceId: "ws-1" }, data: expect.objectContaining({ planId: null, status: "CANCELED" }) });
    expect(mockPrisma.plan.delete).toHaveBeenCalledWith({ where: { id: offer.id } });
  });

  it("preserva planos exclusivos com histórico financeiro", async () => {
    assigned();
    mockPrisma.plan.findUnique.mockResolvedValue({ _count: { subscriptions: 0, workspaceSubscriptions: 0, subscriptionActivities: 1 } });
    const res = await DELETE(request("DELETE", { planId: offer.id }), context());
    expect(res.status).toBe(200);
    expect(mockPrisma.plan.delete).not.toHaveBeenCalled();
  });

  it("remove a atribuição global sem excluir a oferta do catálogo", async () => {
    assigned("PERSONAL", { ...offer, customWorkspaceId: null });
    const res = await DELETE(request("DELETE", { planId: offer.id }), context());
    expect(res.status).toBe(200);
    expect(mockPrisma.subscription.delete).toHaveBeenCalledWith({ where: { id: "sub-1" } });
    expect(mockPrisma.plan.delete).not.toHaveBeenCalled();
  });

  it.each([PATCH, PUT, DELETE])("protege todas as mutações contra usuários sem acesso", async handler => {
    currentSession = { user: { id: "user", role: "USER" } };
    const res = await handler(request("POST", { planId: offer.id }), context());
    expect(res.status).toBe(401);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
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

  it("preserva a unidade MB, inclusive para valores menores que 50", async () => {
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
        storageLimitMb: 3,
      }),
    });

    const res = await POST(req, { params: Promise.resolve({ id: "ws-3gb" }) });
    expect(res.status).toBe(200);

    expect(mockPrisma.plan.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: "gym plan",
        storageLimitMb: 3,
      }),
    });
  });
});
