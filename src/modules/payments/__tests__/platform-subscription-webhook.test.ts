import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Ably
vi.mock("@/lib/ably", () => ({
  publishToChannel: vi.fn().mockResolvedValue(true),
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
  logSystemError: vi.fn(),
}));

// Mock prisma
const { mockPrisma } = vi.hoisted(() => {
  const mock: any = {
    transaction: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    subscription: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    workspace: {
      updateMany: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    paymentWebhookEvent: {
      createMany: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
    },
    $queryRaw: vi.fn().mockResolvedValue([{ id: "1" }]),
    $transaction: vi.fn((cb) => cb(mock)),
  };
  return { mockPrisma: mock };
});

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));
vi.mock("@/modules/workspaces/application/transaction", () => ({
  serializableTransaction: vi.fn(async (cb) => cb(mockPrisma)),
}));

import { applyPersonalWebhookEffects } from "../webhooks/personal-webhook-effects";
import { AsaasAdapter } from "../providers/asaas/asaas-adapter";

describe("Webhook do Asaas - Pagamento de Assinatura da Plataforma", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("ASAAS_WEBHOOK_SECRET", "whsec_test_secret_123");
  });

  it("valida autenticidade do webhook com timingSafeEqualString", async () => {
    const adapter = new AsaasAdapter();

    // Token correto
    const valid = await adapter.verifyWebhook(
      { "asaas-access-token": "whsec_test_secret_123" },
      "{}"
    );
    expect(valid).toBe(true);

    // Token incorreto
    const invalid = await adapter.verifyWebhook(
      { "asaas-access-token": "wrong_secret" },
      "{}"
    );
    expect(invalid).toBe(false);

    // Sem token
    const missing = await adapter.verifyWebhook({}, "{}");
    expect(missing).toBe(false);
  });

  it("processa evento PAYMENT_RECEIVED de plano da plataforma, aprovando transação e renovando assinatura", async () => {
    const txPlatform = {
      id: "tx-platform-1",
      userId: "trainer-100",
      status: "PENDING",
      providerCheckoutId: "pay_asaas_123",
      paymentMethod: "PIX",
      expectedAmountInCents: 8990,
    };

    // 1ª chamada em personal-webhook-effects e 2ª em confirmPersonalSubscriptionPayment
    mockPrisma.transaction.findFirst
      .mockResolvedValueOnce(txPlatform)
      .mockResolvedValueOnce(txPlatform);

    mockPrisma.transaction.findUnique.mockResolvedValueOnce(txPlatform);

    mockPrisma.subscription.findUnique.mockResolvedValueOnce({
      id: "sub-100",
      userId: "trainer-100",
      status: "past_due",
      nextDueDate: new Date("2026-11-10T12:00:00Z"),
      periodicity: "MENSAL",
    });

    mockPrisma.subscription.update.mockResolvedValueOnce({
      id: "sub-100",
      status: "active",
      nextDueDate: new Date("2026-12-10T12:00:00Z"),
    });

    const normalizedEvent: any = {
      providerEventId: "evt_123",
      eventType: "PAYMENT_RECEIVED",
      resourceType: "PAYMENT",
      resourceId: "pay_asaas_123",
      occurredAt: new Date(),
      rawPayload: {
        event: "PAYMENT_RECEIVED",
        payment: { id: "pay_asaas_123", billingType: "PIX" },
      },
    };

    await applyPersonalWebhookEffects(
      mockPrisma,
      "webhook-evt-1",
      "PRODUCTION" as any,
      normalizedEvent
    );

    // Verifica que a transação foi aprovada
    expect(mockPrisma.transaction.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "tx-platform-1" },
        data: expect.objectContaining({ status: "APPROVED" }),
      })
    );

    // Verifica que a assinatura foi ativada
    expect(mockPrisma.subscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "sub-100" },
        data: expect.objectContaining({ status: "active" }),
      })
    );

    // Verifica reativação de workspaces
    expect(mockPrisma.workspace.updateMany).toHaveBeenCalledWith({
      where: { ownerId: "trainer-100", type: "PERSONAL", isActive: false },
      data: { isActive: true },
    });
  });

  it("processa evento PAYMENT_FAILED atualizando a transação para FAILED", async () => {
    mockPrisma.transaction.findFirst.mockResolvedValueOnce({
      id: "tx-platform-2",
      userId: "trainer-100",
      status: "PENDING",
      providerCheckoutId: "pay_asaas_failed",
    });

    const normalizedEvent: any = {
      providerEventId: "evt_fail_123",
      eventType: "PAYMENT_FAILED",
      resourceType: "PAYMENT",
      resourceId: "pay_asaas_failed",
      occurredAt: new Date(),
      rawPayload: { event: "PAYMENT_FAILED" },
    };

    await applyPersonalWebhookEffects(
      mockPrisma,
      "webhook-evt-2",
      "PRODUCTION" as any,
      normalizedEvent
    );

    expect(mockPrisma.transaction.update).toHaveBeenCalledWith({
      where: { id: "tx-platform-2" },
      data: { status: "FAILED" },
    });
  });

  it("processa evento PAYMENT_REFUNDED atualizando a transação para REFUNDED", async () => {
    mockPrisma.transaction.findFirst.mockResolvedValueOnce({
      id: "tx-platform-3",
      userId: "trainer-100",
      status: "APPROVED",
      providerCheckoutId: "pay_asaas_refunded",
    });

    const normalizedEvent: any = {
      providerEventId: "evt_ref_123",
      eventType: "PAYMENT_REFUNDED",
      resourceType: "PAYMENT",
      resourceId: "pay_asaas_refunded",
      occurredAt: new Date(),
      rawPayload: { event: "PAYMENT_REFUNDED" },
    };

    await applyPersonalWebhookEffects(
      mockPrisma,
      "webhook-evt-3",
      "PRODUCTION" as any,
      normalizedEvent
    );

    expect(mockPrisma.transaction.update).toHaveBeenCalledWith({
      where: { id: "tx-platform-3" },
      data: { status: "REFUNDED" },
    });
  });
});
