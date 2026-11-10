import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies
const { mockPrisma, mockAuth, mockWorkspaceFacts, mockGuard, mockContextService } = vi.hoisted(() => ({
  mockPrisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
  mockAuth: vi.fn(),
  mockWorkspaceFacts: vi.fn(),
  mockGuard: vi.fn(),
  mockContextService: {
    getActiveWorkspaceIdFromCookie: vi.fn(),
    resolveUserWorkspaceContext: vi.fn(),
  },
}));

vi.mock("@/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));
vi.mock("@/lib/workspace-request-facts", () => ({ workspaceRequestFacts: mockWorkspaceFacts }));
vi.mock("@/modules/workspaces/application/guard", () => ({
  requirePersonalWorkspaceAccess: mockGuard,
  handleWorkspaceAccessError: vi.fn(),
}));
vi.mock("@/modules/workspaces/application/context-service", () => ({
  WorkspaceContextService: mockContextService,
}));

import { personalCommercialContextResponse } from "@/lib/personal-commercial-context";

describe("personalCommercialContextResponse - Carência e Expiração", () => {
  const userId = "trainer-uuid";
  const workspaceId = "ws-personal-uuid";
  const baseStartDate = new Date("2026-01-01T00:00:00Z");

  beforeEach(() => {
    vi.resetAllMocks();
    mockAuth.mockResolvedValue({ user: { id: userId, role: "TRAINER" } });
    mockContextService.getActiveWorkspaceIdFromCookie.mockResolvedValue(workspaceId);
    mockGuard.mockResolvedValue(undefined);
    mockWorkspaceFacts.mockResolvedValue({
      id: workspaceId,
      ownerId: userId,
      type: "PERSONAL",
      isActive: true,
    });
  });

  it("permite acesso normal quando o vencimento é hoje e há 3 dias de carência", async () => {
    const todayDueDate = new Date();
    // Hoje, vencendo agora
    mockPrisma.user.findUnique.mockResolvedValue({
      isTestAccount: false,
      subscription: {
        id: "sub-1",
        status: "active",
        startDate: baseStartDate,
        endDate: todayDueDate,
        nextDueDate: todayDueDate,
        billingControlType: "MANUAL",
        toleranceDays: 3,
        autoSuspendEnabled: true,
      },
      freeTrial: null,
    });

    const response = await personalCommercialContextResponse();
    // Deve permitir o acesso (retorna null)
    expect(response).toBeNull();
  });

  it("bloqueia com 402 PERSONAL_SUBSCRIPTION_EXPIRED quando a carência de 3 dias já tiver esgotado", async () => {
    // Vencido há 5 dias (tolerância era 3 dias -> esgotou)
    const pastDueDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    mockPrisma.user.findUnique.mockResolvedValue({
      isTestAccount: false,
      subscription: {
        id: "sub-2",
        status: "active",
        startDate: baseStartDate,
        endDate: pastDueDate,
        nextDueDate: pastDueDate,
        billingControlType: "MANUAL",
        toleranceDays: 3,
        autoSuspendEnabled: true,
      },
      freeTrial: null,
    });

    const response = await personalCommercialContextResponse();
    expect(response).not.toBeNull();
    expect(response?.status).toBe(402);
    const data = await response?.json();
    expect(data).toMatchObject({
      code: "PERSONAL_SUBSCRIPTION_EXPIRED",
      error: "Sua assinatura pessoal expirou.",
    });
  });
});
