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
const { mockAuthSession } = vi.hoisted(() => {
  return {
    mockAuthSession: {
      user: {
        id: "user-123",
        role: "USER",
      },
    },
  };
});

vi.mock("@/auth", () => ({
  auth: vi.fn().mockImplementation(async () => mockAuthSession),
}));

// Mock prisma
const { mockPrisma } = vi.hoisted(() => {
  const mock: any = {
    workspace: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    workspaceMember: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    workspaceSubscription: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    workspaceInvitation: { count: vi.fn() },
    user: {
      findUnique: vi.fn(),
    },
  };
  return { mockPrisma: mock };
});

vi.mock("@/lib/prisma", () => ({
  default: mockPrisma,
}));

import {
  EntitlementsService,
  WorkspaceContextService,
  calculateDefaultRoute,
  selectActiveWorkspace,
  clearActiveWorkspace,
  ACTIVE_WORKSPACE_COOKIE,
  LEGACY_STUDENT_COOKIE,
} from "../index";
import { WorkspaceRole, WorkspaceType, WorkspaceSubscriptionStatus } from "@prisma/client";

describe("GYM-021: Contexto, login e entitlements", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.workspaceInvitation.count.mockResolvedValue(0);
    Object.keys(mockCookieStore).forEach((key) => delete mockCookieStore[key]);
  });

  describe("EntitlementsService", () => {
    it("resolve direitos de academia ativa permitindo que funcionário USER opere sem assinatura própria", async () => {
      mockPrisma.workspace.findUnique.mockResolvedValue({
        id: "gym-1",
        type: WorkspaceType.GYM,
        isActive: true,
        ownerId: "owner-gym",
        subscription: {
          id: "sub-1",
          status: WorkspaceSubscriptionStatus.ACTIVE,
          maxStudents: 200,
          maxStaff: 15,
          maxUnits: 2,
          maxDevices: 3,
          storageLimitMb: 10240,
          trialEndsAt: null,
          endDate: null,
          plan: { name: "Academia Pro" },
        },
        units: [{ id: "unit-1" }],
        members: [
          { id: "m-1", role: WorkspaceRole.STUDENT, roleGrants: [] },
          { id: "m-2", role: WorkspaceRole.STUDENT, roleGrants: [] },
          { id: "m-3", role: WorkspaceRole.RECEPTIONIST, roleGrants: [] },
        ],
      });

      const entitlements = await EntitlementsService.resolveEntitlements("gym-1");

      expect(entitlements.workspaceType).toBe("GYM");
      expect(entitlements.isEntitled).toBe(true);
      expect(entitlements.planName).toBe("Academia Pro");
      expect(entitlements.usage.studentsCount).toBe(2);
      expect(entitlements.usage.staffCount).toBe(1);

      const canAddStudent = entitlements.canPerformAction("ADD_STUDENT");
      expect(canAddStudent.allowed).toBe(true);

      const canAddStaff = entitlements.canPerformAction("ADD_STAFF");
      expect(canAddStaff.allowed).toBe(true);
    });

    it("impede adição de alunos quando o limite de matrículas do plano da academia é atingido", async () => {
      mockPrisma.workspace.findUnique.mockResolvedValue({
        id: "gym-1",
        type: WorkspaceType.GYM,
        isActive: true,
        ownerId: "owner-gym",
        subscription: {
          id: "sub-1",
          status: WorkspaceSubscriptionStatus.ACTIVE,
          maxStudents: 2,
          maxStaff: 5,
          maxUnits: 1,
          maxDevices: 1,
          storageLimitMb: 5120,
          trialEndsAt: null,
          endDate: null,
          plan: { name: "Plano Piloto" },
        },
        units: [{ id: "unit-1" }],
        members: [
          { id: "m-1", role: WorkspaceRole.STUDENT, roleGrants: [] },
          { id: "m-2", role: WorkspaceRole.STUDENT, roleGrants: [] },
        ],
      });

      const entitlements = await EntitlementsService.resolveEntitlements("gym-1");
      const check = entitlements.canPerformAction("ADD_STUDENT");

      expect(check.allowed).toBe(false);
      expect(check.reason).toContain("Limite de alunos atingido (2/2)");
    });

    it("isolamento financeiro: workspace PERSONAL não herda recursos de gym nem utiliza assinatura de outro workspace", async () => {
      mockPrisma.workspace.findUnique.mockResolvedValue({
        id: "personal-ws",
        type: WorkspaceType.PERSONAL,
        ownerId: "personal-trainer-1",
        units: [],
        members: [{ id: "m-student-1", role: WorkspaceRole.STUDENT, roleGrants: [] }],
      });

      mockPrisma.user.findUnique.mockResolvedValue({
        id: "personal-trainer-1",
        subscription: {
          status: "ACTIVE",
          plan: {
            name: "Personal Pro",
            maxStudents: 30,
            storageLimitMb: 2048,
          },
        },
        freeTrial: null,
      });

      const entitlements = await EntitlementsService.resolveEntitlements("personal-ws");

      expect(entitlements.workspaceType).toBe("PERSONAL");
      expect(entitlements.planName).toBe("Personal Pro");

      // Tentativa de adicionar unidade ou dispositivo em workspace de personal é bloqueada
      const addUnitCheck = entitlements.canPerformAction("ADD_UNIT");
      expect(addUnitCheck.allowed).toBe(false);
      expect(addUnitCheck.reason).toContain("recursos exclusivos de workspaces do tipo Academia");
    });
  });

  describe("WorkspaceContextService e Roteamento", () => {
    it("calcula rotas padrão corretamente com base no tipo de workspace e papel", () => {
      // Recepção em academia vai para /gym/reception
      expect(calculateDefaultRoute(WorkspaceType.GYM, [WorkspaceRole.RECEPTIONIST])).toBe("/gym/reception");

      // Gerente ou Dono em academia vai para /gym/dashboard
      expect(calculateDefaultRoute(WorkspaceType.GYM, [WorkspaceRole.MANAGER])).toBe("/gym/dashboard");
      expect(calculateDefaultRoute(WorkspaceType.GYM, [WorkspaceRole.OWNER])).toBe("/gym/dashboard");
      expect(calculateDefaultRoute(WorkspaceType.GYM, [WorkspaceRole.RECEPTIONIST, WorkspaceRole.MANAGER])).toBe("/gym/dashboard");

      // Aluno em academia vai para /student/dashboard
      expect(calculateDefaultRoute(WorkspaceType.GYM, [WorkspaceRole.STUDENT])).toBe("/student/dashboard");

      // Personal Trainer em assessoria vai para /personal/dashboard
      expect(calculateDefaultRoute(WorkspaceType.PERSONAL, [WorkspaceRole.TRAINER])).toBe("/personal/dashboard");
      expect(calculateDefaultRoute(WorkspaceType.PERSONAL, [WorkspaceRole.OWNER])).toBe("/personal/dashboard");

      // Aluno em assessoria vai para /student/dashboard
      expect(calculateDefaultRoute(WorkspaceType.PERSONAL, [WorkspaceRole.STUDENT])).toBe("/student/dashboard");
    });

    it("auto-resolve para o destino correto quando o usuário possui apenas 1 workspace ativo", async () => {
      mockPrisma.workspaceMember.findMany.mockResolvedValue([
        {
          id: "member-1",
          workspaceId: "gym-academy",
          role: WorkspaceRole.RECEPTIONIST,
          workspace: {
            id: "gym-academy",
            name: "Iron Gym",
            slug: "iron-gym",
            type: WorkspaceType.GYM,
            units: [{ id: "u-1" }],
            subscription: { plan: { name: "Plano Academia" } },
          },
          roleGrants: [],
        },
      ]);

      const context = await WorkspaceContextService.resolveUserWorkspaceContext("user-123");

      expect(context.status).toBe("RESOLVED");
      expect(context.workspaceId).toBe("gym-academy");
      expect(context.defaultRoute).toBe("/gym/reception");

      // Resolver é uma leitura; a seleção explícita grava os cookies.
      expect(mockCookieStore[ACTIVE_WORKSPACE_COOKIE]).toBeUndefined();
      expect(mockCookieStore[LEGACY_STUDENT_COOKIE]).toBeUndefined();
    });

    it("retorna NEEDS_SELECTION quando o usuário possui múltiplos workspaces e não há cookie ativo válido", async () => {
      mockPrisma.workspaceMember.findMany.mockResolvedValue([
        {
          id: "member-1",
          workspaceId: "personal-ws",
          role: WorkspaceRole.TRAINER,
          workspace: {
            id: "personal-ws",
            name: "Silva Assessoria",
            slug: "silva-assessoria",
            type: WorkspaceType.PERSONAL,
            units: [],
            subscription: null,
          },
          roleGrants: [],
        },
        {
          id: "member-2",
          workspaceId: "gym-ws",
          role: WorkspaceRole.MANAGER,
          workspace: {
            id: "gym-ws",
            name: "Smart Fit Alpha",
            slug: "smart-fit-alpha",
            type: WorkspaceType.GYM,
            units: [{ id: "unit-1" }],
            subscription: null,
          },
          roleGrants: [],
        },
      ]);

      const context = await WorkspaceContextService.resolveUserWorkspaceContext("user-123");

      expect(context.status).toBe("NEEDS_SELECTION");
      expect(context.availableWorkspaces?.length).toBe(2);
      expect(context.availableWorkspaces?.[0].type).toBe("PERSONAL");
      expect(context.availableWorkspaces?.[1].type).toBe("GYM");
    });

    it("protege contra IDOR/BOLA: se o cookie apontar para um workspace onde o usuário não é membro, rejeita", async () => {
      mockCookieStore[ACTIVE_WORKSPACE_COOKIE] = "unauthorized-foreign-workspace";

      mockPrisma.workspaceMember.findMany.mockResolvedValue([
        {
          id: "m-authorized",
          workspaceId: "my-gym",
          role: WorkspaceRole.MANAGER,
          workspace: {
            id: "my-gym",
            name: "Minha Academia",
            slug: "minha-academia",
            type: WorkspaceType.GYM,
            units: [],
            subscription: null,
          },
          roleGrants: [],
        },
      ]);

      const context = await WorkspaceContextService.resolveUserWorkspaceContext("user-123");

      // Contexto estrangeiro exige seleção; nunca opera outra academia silenciosamente.
      expect(context.status).toBe("NEEDS_SELECTION");
      expect(context.workspaceId).toBeUndefined();
      expect(context.availableWorkspaces?.map(workspace => workspace.id)).toEqual(["my-gym"]);
      expect(mockCookieStore[ACTIVE_WORKSPACE_COOKIE]).toBe("unauthorized-foreign-workspace");
    });
  });

  describe("Server Actions: selectActiveWorkspace e clearActiveWorkspace", () => {
    it("ativa o workspace selecionado gravando cookies e retornando rota operacional", async () => {
      mockPrisma.workspace.findUnique.mockResolvedValue({ id: "gym-cross", type: "GYM", isActive: true, ownerId: "another-owner", subscription: { status: "ACTIVE", endDate: null, trialEndsAt: null } });
      mockPrisma.workspaceMember.findFirst.mockResolvedValue({
        id: "mem-1",
        workspaceId: "gym-cross",
        role: WorkspaceRole.MANAGER,
        workspace: {
          id: "gym-cross",
          name: "CrossFit Prime",
          slug: "crossfit-prime",
          type: WorkspaceType.GYM,
          primaryColor: "#FF5500",
          logoUrl: null,
          units: [],
        },
        roleGrants: [],
      });

      const result = await selectActiveWorkspace("gym-cross");

      expect(result.success).toBe(true);
      expect(result.defaultRoute).toBe("/gym/dashboard");
      expect(mockCookieStore[ACTIVE_WORKSPACE_COOKIE]).toBe("gym-cross");
    });

    it("rejeita seleção de workspace do qual o usuário não é membro ativo", async () => {
      mockPrisma.workspaceMember.findFirst.mockResolvedValue(null);

      const result = await selectActiveWorkspace("another-gym");

      expect(result.error).toBe("Acesso negado: você não possui vínculo ativo com este workspace.");
      expect(mockCookieStore[ACTIVE_WORKSPACE_COOKIE]).toBeUndefined();
    });

    it("limpa os cookies de workspace ativo ao executar clearActiveWorkspace", async () => {
      mockCookieStore[ACTIVE_WORKSPACE_COOKIE] = "gym-1";
      mockCookieStore[LEGACY_STUDENT_COOKIE] = "gym-1";

      await clearActiveWorkspace();

      expect(mockCookieStore[ACTIVE_WORKSPACE_COOKIE]).toBeUndefined();
      expect(mockCookieStore[LEGACY_STUDENT_COOKIE]).toBeUndefined();
    });
  });
});
