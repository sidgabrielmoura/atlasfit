import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Ably
vi.mock("@/lib/ably", () => ({
  publishToChannel: vi.fn().mockResolvedValue(true),
}));

// Mock serializableTransaction to simply run the callback with db
vi.mock("@/modules/workspaces/application/transaction", () => ({
  serializableTransaction: vi.fn(async (callback) => callback(mockPrisma)),
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
  logSystemError: vi.fn(),
}));

// Mock Prisma
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
    $queryRaw: vi.fn().mockResolvedValue([{ id: "sub-1" }]),
    $transaction: vi.fn((ops) => (Array.isArray(ops) ? Promise.all(ops) : ops(mock))),
  };
  return { mockPrisma: mock };
});

vi.mock("@/lib/prisma", () => ({
  default: mockPrisma,
}));

import {
  confirmPersonalSubscriptionPayment,
  calculatePersonalChargeExpiration,
  MAX_PERSONAL_CHARGE_VALIDITY_HOURS,
} from "@/lib/asaas-personal-billing";
import { publishToChannel } from "@/lib/ably";

describe("calculatePersonalChargeExpiration", () => {
  it("limita estritamente a validade a no máximo 3 horas se o Asaas retornar 1 ano (ex: 8.836 horas)", () => {
    const createdAt = new Date("2026-11-10T12:00:00.000Z");
    const asaasOneYearExpiry = "2027-11-10 23:59:59"; // ~8836 horas

    const result = calculatePersonalChargeExpiration(createdAt, asaasOneYearExpiry);
    const expected = new Date("2026-11-10T15:00:00.000Z").toISOString(); // exatamente 3 horas depois

    expect(result).toBe(expected);
    expect(MAX_PERSONAL_CHARGE_VALIDITY_HOURS).toBe(3);
  });

  it("respeita expiração menor se o provedor retornar algo inferior a 3 horas (ex: 1 hora)", () => {
    const createdAt = new Date("2026-11-10T12:00:00.000Z");
    const asaasOneHourExpiry = "2026-11-10T13:00:00.000Z";

    const result = calculatePersonalChargeExpiration(createdAt, asaasOneHourExpiry);
    expect(result).toBe("2026-11-10T13:00:00.000Z");
  });

  it("calcula 3 horas a partir de createdAt se o provedor não retornar expirationDate", () => {
    const createdAt = new Date("2026-11-10T12:00:00.000Z");
    const result = calculatePersonalChargeExpiration(createdAt, null);
    const expected = new Date("2026-11-10T15:00:00.000Z").toISOString();

    expect(result).toBe(expected);
  });
});

describe("confirmPersonalSubscriptionPayment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("confirma pagamento, avança data de vencimento e reativa o acesso do personal trainer", async () => {
    const previousDueDate = new Date("2026-11-10T12:00:00.000Z");

    mockPrisma.transaction.findFirst.mockResolvedValueOnce({
      id: "tx-123",
      userId: "trainer-1",
      status: "PENDING",
      expectedAmountInCents: 8990,
    });

    mockPrisma.transaction.findUnique.mockResolvedValueOnce({
      id: "tx-123",
      userId: "trainer-1",
      status: "PENDING",
      expectedAmountInCents: 8990,
    });

    mockPrisma.subscription.findUnique.mockResolvedValueOnce({
      id: "sub-1",
      userId: "trainer-1",
      status: "past_due",
      nextDueDate: previousDueDate,
      endDate: previousDueDate,
      periodicity: "MENSAL",
      toleranceDays: 5,
      plan: { name: "AtlasFit Pro" },
    });

    const updatedSub = {
      id: "sub-1",
      userId: "trainer-1",
      status: "active",
      nextDueDate: new Date("2026-12-10T12:00:00.000Z"),
      endDate: new Date("2026-12-10T12:00:00.000Z"),
    };
    mockPrisma.subscription.update.mockResolvedValueOnce(updatedSub);
    mockPrisma.transaction.update.mockResolvedValueOnce({ id: "tx-123", status: "APPROVED" });
    mockPrisma.workspace.updateMany.mockResolvedValueOnce({ count: 1 });
    mockPrisma.auditLog.create.mockResolvedValueOnce({ id: "log-1" });

    const result = await confirmPersonalSubscriptionPayment({
      transactionId: "tx-123",
      paymentMethod: "PIX",
      occurredAt: new Date("2026-11-10T14:00:00.000Z"),
      tx: mockPrisma,
    });

    expect(mockPrisma.transaction.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "tx-123" },
        data: expect.objectContaining({
          status: "APPROVED",
          paymentMethod: "PIX",
        }),
      })
    );

    expect(mockPrisma.subscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "sub-1" },
        data: expect.objectContaining({
          status: "active",
        }),
      })
    );

    expect(mockPrisma.workspace.updateMany).toHaveBeenCalledWith({
      where: { ownerId: "trainer-1", type: "PERSONAL", isActive: false },
      data: { isActive: true },
    });

    expect(mockPrisma.auditLog.create).toHaveBeenCalled();
    expect(publishToChannel).toHaveBeenCalledWith(
      "user:trainer-1",
      "subscription:updated",
      expect.objectContaining({
        status: "active",
      })
    );

    expect(result).toEqual(updatedSub);
  });

  it("garante idempotência: se a transação já foi aprovada, não duplica a operação", async () => {
    mockPrisma.transaction.findFirst.mockResolvedValueOnce({
      id: "tx-123",
      userId: "trainer-1",
      status: "APPROVED",
    });

    mockPrisma.transaction.findUnique.mockResolvedValueOnce({
      id: "tx-123",
      userId: "trainer-1",
      status: "APPROVED",
    });

    const existingSub = {
      id: "sub-1",
      userId: "trainer-1",
      status: "active",
    };
    mockPrisma.subscription.findUnique.mockResolvedValueOnce(existingSub);

    const result = await confirmPersonalSubscriptionPayment({
      transactionId: "tx-123",
      paymentMethod: "PIX",
      tx: mockPrisma,
    });

    expect(result).toEqual(existingSub);
    expect(mockPrisma.transaction.update).not.toHaveBeenCalled();
    expect(mockPrisma.subscription.update).not.toHaveBeenCalled();
    expect(mockPrisma.auditLog.create).not.toHaveBeenCalled();
  });

  it("lança erro se a transação não existir", async () => {
    mockPrisma.transaction.findFirst.mockResolvedValueOnce(null);

    await expect(
      confirmPersonalSubscriptionPayment({
        transactionId: "invalid-id",
        tx: mockPrisma,
      })
    ).rejects.toThrow("Transação não encontrada para confirmação.");
  });
});
