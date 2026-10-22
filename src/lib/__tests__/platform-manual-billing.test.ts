import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Ably
vi.mock("@/lib/ably", () => ({
  publishToChannel: vi.fn().mockResolvedValue(true),
}));

// Mock prisma
const { mockPrisma } = vi.hoisted(() => {
  const mock: any = {
    subscription: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    workspaceSubscription: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    workspace: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    $transaction: vi.fn((ops) => (Array.isArray(ops) ? Promise.all(ops) : ops(mock))),
  };
  return { mockPrisma: mock };
});

vi.mock("@/lib/prisma", () => ({
  default: mockPrisma,
}));

import { processPlatformManualSuspensions } from "@/lib/recurrence";
import { publishToChannel } from "@/lib/ably";

describe("processPlatformManualSuspensions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("suspende personal trainer com recorrência manual vencida além dos dias de tolerância", async () => {
    const pastDueDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000); // 10 days ago (tolerance 5 days -> overdue)

    mockPrisma.subscription.findMany.mockResolvedValueOnce([
      {
        id: "sub-personal-1",
        userId: "trainer-1",
        billingControlType: "MANUAL",
        autoSuspendEnabled: true,
        status: "active",
        nextDueDate: pastDueDate,
        toleranceDays: 5,
      },
    ]);

    mockPrisma.workspace.findMany.mockResolvedValueOnce([
      { id: "ws-personal-1" },
    ]);

    mockPrisma.workspaceSubscription.findMany.mockResolvedValueOnce([]);

    const result = await processPlatformManualSuspensions();

    expect(result.personalSuspended).toBe(1);
    expect(mockPrisma.workspace.update).toHaveBeenCalledWith({
      where: { id: "ws-personal-1" },
      data: { isActive: false },
    });
    expect(publishToChannel).toHaveBeenCalledWith(
      "workspace:ws-personal-1",
      "workspace:suspended",
      { workspaceId: "ws-personal-1" }
    );
  });

  it("não suspende personal trainer se ainda estiver dentro do período de tolerância", async () => {
    const recentDueDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000); // 2 days ago (tolerance 5 days -> within tolerance)

    mockPrisma.subscription.findMany.mockResolvedValueOnce([
      {
        id: "sub-personal-2",
        userId: "trainer-2",
        billingControlType: "MANUAL",
        autoSuspendEnabled: true,
        status: "active",
        nextDueDate: recentDueDate,
        toleranceDays: 5,
      },
    ]);

    mockPrisma.workspaceSubscription.findMany.mockResolvedValueOnce([]);

    const result = await processPlatformManualSuspensions();

    expect(result.personalSuspended).toBe(0);
    expect(mockPrisma.workspace.update).not.toHaveBeenCalled();
  });

  it("suspende academia com recorrência manual vencida além da tolerância", async () => {
    const pastDueDate = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000); // 8 days ago (tolerance 3 days -> overdue)

    mockPrisma.subscription.findMany.mockResolvedValueOnce([]);

    mockPrisma.workspaceSubscription.findMany.mockResolvedValueOnce([
      {
        id: "sub-gym-1",
        workspaceId: "ws-gym-1",
        billingControlType: "MANUAL",
        autoSuspendEnabled: true,
        status: "ACTIVE",
        nextDueDate: pastDueDate,
        toleranceDays: 3,
        workspace: {
          id: "ws-gym-1",
          isActive: true,
        },
      },
    ]);

    const result = await processPlatformManualSuspensions();

    expect(result.gymSuspended).toBe(1);
    expect(mockPrisma.workspace.update).toHaveBeenCalledWith({
      where: { id: "ws-gym-1" },
      data: { isActive: false },
    });
    expect(publishToChannel).toHaveBeenCalledWith(
      "workspace:ws-gym-1",
      "workspace:suspended",
      { workspaceId: "ws-gym-1" }
    );
  });
});
