import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock next/headers
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockImplementation(async () => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  })),
}));

// Mock auth
const { mockAuthSession } = vi.hoisted(() => ({
  mockAuthSession: {
    user: {
      id: "trainer-1",
      role: "TRAINER",
      name: "Personal Trainer",
    },
  },
}));

vi.mock("@/auth", () => ({
  auth: vi.fn().mockImplementation(async () => mockAuthSession),
}));

vi.mock("@/lib/personal-commercial-context", () => ({
  personalCommercialContextResponse: vi.fn().mockResolvedValue(null),
}));

// Mock Prisma
const { mockPrisma } = vi.hoisted(() => {
  const mock: any = {
    workspace: {
      findUnique: vi.fn(),
    },
    workspaceMember: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    workspacePayment: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    studentBilling: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  };
  return { mockPrisma: mock };
});

vi.mock("@/lib/prisma", () => ({
  default: mockPrisma,
}));

// Mock workspaces module guard
vi.mock("@/modules/workspaces", () => ({
  requirePersonalWorkspaceAccess: vi.fn().mockResolvedValue({
    workspaceId: "ws-1",
    userId: "trainer-1",
    isOwner: true,
    capabilities: new Set(["invoices.read", "invoices.issue"]),
    hasCapability: () => true,
  }),
  handleWorkspaceAccessError: vi.fn().mockReturnValue(null),
}));

// Mock notifications
vi.mock("@/lib/notifications/service", () => ({
  NotificationService: {
    sendNotification: vi.fn().mockResolvedValue(true),
  },
}));

// Import route handlers
import { GET as handleFinanceGet } from "../route";
import { PATCH as handlePaymentPatch, DELETE as handlePaymentDelete } from "@/app/api/personal/finance/payments/[id]/route";

describe("Personal Client Finance & Digital Invoices", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("merges digital StudentBilling invoices into the student finance history", async () => {
    mockPrisma.workspaceMember.findFirst.mockResolvedValue({
      id: "member-1",
      userId: "student-1",
      workspaceId: "ws-1",
      plan: "Mensal",
      user: { name: "Aluno Teste" },
      workspace: { id: "ws-1", ownerId: "trainer-1", type: "PERSONAL" },
    });

    // 1 manual payment (pago)
    mockPrisma.workspacePayment.findMany.mockResolvedValue([
      {
        id: "pay-1",
        workspaceId: "ws-1",
        studentName: "Aluno Teste",
        planName: "Mensalidade Manual",
        amount: 100,
        status: "pago",
        method: "DINHEIRO",
        createdAt: new Date("2026-08-01"),
        billingOrigin: "MANUAL",
        billingMode: "MANUAL",
        isAutomaticBilled: false,
        gatewayBilling: null,
      },
    ]);

    // 1 digital billing (PENDING and past due -> overdue)
    mockPrisma.studentBilling.findMany.mockResolvedValue([
      {
        id: "billing-overdue-1",
        title: "Consultoria Mensal de Treino",
        grossAmountInCents: BigInt(1500), // R$ 15,00
        status: "PENDING",
        paymentMethod: "PIX",
        dueDate: new Date("2026-09-01"), // past due
        createdAt: new Date("2026-08-15"),
        paidAt: null,
        settledAt: null,
        hostedInvoiceUrl: "https://asaas.com/i/123",
        pixPayloadEncrypted: "pix-code",
        workspacePaymentId: null,
      },
    ]);

    const req = new Request("http://localhost:3000/api/personal/clients/student-1/finance?workspaceId=ws-1");
    const response = await handleFinanceGet(req, { params: Promise.resolve({ id: "student-1" }) });

    expect(response.status).toBe(200);
    const data = await response.json();

    // Verify both items are returned
    expect(data.payments).toHaveLength(2);

    const digitalPayment = data.payments.find((p: any) => p.id === "billing-overdue-1");
    expect(digitalPayment).toBeDefined();
    expect(digitalPayment.amount).toBe(15);
    expect(digitalPayment.status).toBe("atrasado");
    expect(digitalPayment.isGateway).toBe(true);
    expect(digitalPayment.hostedInvoiceUrl).toBe("https://asaas.com/i/123");

    // Verify computed metrics
    expect(data.metrics.totalReceived).toBe(100);
    expect(data.metrics.totalOverdue).toBe(15);
    expect(data.metrics.totalPending).toBe(0);
    expect(data.summary.overdueCount).toBe(1);
    expect(data.summary.paidCount).toBe(1);
  });

  it("marks a digital StudentBilling invoice as paid via PATCH", async () => {
    // Payment not in WorkspacePayment
    mockPrisma.workspacePayment.findUnique.mockResolvedValue(null);

    // Found in StudentBilling
    mockPrisma.studentBilling.findUnique.mockResolvedValue({
      id: "billing-1",
      title: "Consultoria Mensal",
      grossAmountInCents: BigInt(1500),
      status: "PENDING",
      paymentMethod: "PIX",
      createdAt: new Date("2026-08-15"),
      studentUserId: "student-1",
      workspaceId: "ws-1",
      workspacePaymentId: null,
      account: { personalUserId: "trainer-1" },
    });

    mockPrisma.studentBilling.update.mockResolvedValue({
      id: "billing-1",
      title: "Consultoria Mensal",
      grossAmountInCents: BigInt(1500),
      status: "SETTLED",
      paymentMethod: "PIX",
      createdAt: new Date("2026-08-15"),
    });

    const req = new Request("http://localhost:3000/api/personal/finance/payments/billing-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "pago" }),
    });

    const response = await handlePaymentPatch(req, { params: Promise.resolve({ id: "billing-1" }) });
    expect(response.status).toBe(200);
    const data = await response.json();

    expect(data.id).toBe("billing-1");
    expect(data.status).toBe("pago");
    expect(data.isGateway).toBe(true);

    // Verify Prisma updated billing to SETTLED
    expect(mockPrisma.studentBilling.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "billing-1" },
        data: expect.objectContaining({ status: "SETTLED" }),
      })
    );

    // Verify audit log created
    expect(mockPrisma.auditLog.create).toHaveBeenCalled();
  });

  it("cancels a digital StudentBilling invoice via DELETE", async () => {
    mockPrisma.workspacePayment.findUnique.mockResolvedValue(null);

    mockPrisma.studentBilling.findUnique.mockResolvedValue({
      id: "billing-1",
      title: "Consultoria Mensal",
      studentUserId: "student-1",
      workspaceId: "ws-1",
      workspacePaymentId: null,
      account: { personalUserId: "trainer-1" },
    });

    mockPrisma.studentBilling.update.mockResolvedValue({
      id: "billing-1",
      status: "CANCELLED",
    });

    const req = new Request("http://localhost:3000/api/personal/finance/payments/billing-1", {
      method: "DELETE",
    });

    const response = await handlePaymentDelete(req, { params: Promise.resolve({ id: "billing-1" }) });
    expect(response.status).toBe(200);

    expect(mockPrisma.studentBilling.update).toHaveBeenCalledWith({
      where: { id: "billing-1" },
      data: { status: "CANCELLED" },
    });

    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          entity: "StudentBilling",
          entityId: "billing-1",
        }),
      })
    );
  });
});
