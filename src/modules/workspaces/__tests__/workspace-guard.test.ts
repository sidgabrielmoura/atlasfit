import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  WorkspaceRole,
  WorkspaceCapability,
  ALL_CAPABILITIES,
  DEFAULT_ROLE_CAPABILITIES,
  getRoleCapabilities,
  resolveEffectiveCapabilities,
} from "../domain/roles";
import {
  WorkspaceAccessError,
} from "../domain/types";
import {
  sanitizeStudentListItem,
  sanitizeStudentDetail,
  buildAvatarFallback,
} from "../domain/dto";
import {
  requireWorkspaceAccess,
  handleWorkspaceAccessError,
  assertWorkspaceCapability,
  hasWorkspaceCapability,
} from "../application/guard";

// Mock dependencies
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    workspace: {
      findUnique: vi.fn(),
    },
    workspaceMember: {
      findFirst: vi.fn(),
    },
  },
}));

import { auth } from "@/auth";
import prisma from "@/lib/prisma";

describe("Workspace Authorization & Isolation Module (GYM-010)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. Roles and Capabilities Domain Logic", () => {
    it("deve conceder todas as capacidades para OWNER", () => {
      const caps = getRoleCapabilities("OWNER");
      expect(caps).toEqual(ALL_CAPABILITIES);
      expect(caps).toContain("refunds.approve");
      expect(caps).toContain("workspace.manage");
      expect(caps).toContain("students.manage");
    });

    it("MANAGER pode reverter recebimentos locais; módulos retirados não concedem capacidades", () => {
      const caps = getRoleCapabilities("MANAGER");
      expect(caps).toContain("refunds.approve");
      expect(caps).toContain("students.manage");
      expect(caps).not.toContain("classes.manage");
    });

    it("RECEPTIONIST deve possuir acesso a matrículas, alunos e pagamentos presenciais", () => {
      const caps = getRoleCapabilities("RECEPTIONIST");
      expect(caps).toContain("students.read");
      expect(caps).toContain("students.manage");
      expect(caps).toContain("enrollments.manage");
      expect(caps).toContain("payments.record");
      expect(caps).not.toContain("access.read");
      expect(caps).not.toContain("access.override");
      expect(caps).not.toContain("refunds.approve");
      expect(caps).not.toContain("reports.finance");
    });

    it("FINANCE deve possuir relatórios financeiros e aprovação de estorno", () => {
      const caps = getRoleCapabilities("FINANCE");
      expect(caps).toContain("invoices.issue");
      expect(caps).toContain("payments.record");
      expect(caps).toContain("refunds.approve");
      expect(caps).toContain("reports.finance");
      expect(caps).not.toContain("access.override");
      expect(caps).not.toContain("workouts.manage.assigned");
    });

    it("TRAINER deve possuir treinos e avaliações atribuídas mas não financeiro", () => {
      const caps = getRoleCapabilities("TRAINER");
      expect(caps).toContain("workouts.read");
      expect(caps).toContain("workouts.manage.assigned");
      expect(caps).toContain("health.read.assigned");
      expect(caps).not.toContain("invoices.issue");
      expect(caps).not.toContain("payments.record");
    });

    it("STUDENT não deve possuir capacidade de gerenciamento de equipe ou alunos", () => {
      const caps = getRoleCapabilities("STUDENT");
      expect(caps).not.toContain("students.read");
      expect(caps).not.toContain("students.manage");
      expect(caps).not.toContain("staff.manage");
      expect(caps).not.toContain("invoices.issue");
    });

    it("resolveEffectiveCapabilities deve combinar múltiplos papéis sem duplicações", () => {
      const combined = resolveEffectiveCapabilities(["TRAINER", "RECEPTIONIST"]);
      expect(combined.has("workouts.manage.assigned")).toBe(true);
      expect(combined.has("payments.record")).toBe(true);
      expect(combined.has("refunds.approve")).toBe(false);
    });
  });

  describe("2. DTO Sanitization (Security Rule #29 & D01)", () => {
    it("buildAvatarFallback formata iniciais corretamente", () => {
      expect(buildAvatarFallback("Carlos Alberto", "carlos@test.com")).toBe("CA");
      expect(buildAvatarFallback("Mariana", "mariana@test.com")).toBe("M");
      expect(buildAvatarFallback(null, "aluno@test.com")).toBe("A");
    });

    it("sanitizeStudentListItem deve OMITIR setupToken, senha e dados sensíveis", () => {
      const rawStudent = {
        isActive: true,
        plan: "Semestral",
        modality: "PRESENCIAL",
        streak: 12,
        bestStreak: 15,
        progress: 80,
        lastActive: new Date("2026-09-24T12:00:00Z"),
        user: {
          id: "usr_123",
          name: "Gabriel Aluno",
          email: "gabriel@test.com",
          whatsapp: "11999999999",
          image: "https://r2.atlasfit.app/avatar.jpg",
          password: "super_hashed_bcrypt_password",
          setupToken: "leaked_setup_token_uuid",
          twoFactorSecret: "SECRETKEY123",
        },
      };

      const sanitized: any = sanitizeStudentListItem(rawStudent as any);

      expect(sanitized.id).toBe("usr_123");
      expect(sanitized.name).toBe("Gabriel Aluno");
      expect(sanitized.email).toBe("gabriel@test.com");
      expect(sanitized.hasPassword).toBe(true);
      expect(sanitized.avatarFallback).toBe("GA");

      // Verify strict omission of credentials and secrets
      expect(sanitized.setupToken).toBeUndefined();
      expect(sanitized.password).toBeUndefined();
      expect(sanitized.twoFactorSecret).toBeUndefined();
    });

    it("sanitizeStudentDetail inclui dados de perfil sem expor credenciais", () => {
      const rawStudent = {
        isActive: true,
        plan: "Anual",
        modality: "ONLINE",
        streak: 5,
        bestStreak: 10,
        progress: 40,
        lastActive: null,
        canDoAnyWorkoutDay: true,
        user: {
          id: "usr_456",
          name: "Ana Beatriz",
          email: "ana@test.com",
          whatsapp: null,
          image: null,
          gender: "F",
          birthDate: new Date("2000-01-01"),
          height: 165,
          weight: 60,
          objective: "Hipertrofia",
          password: null,
          setupToken: "secret_token_123",
        },
      };

      const detail: any = sanitizeStudentDetail(rawStudent as any);

      expect(detail.id).toBe("usr_456");
      expect(detail.gender).toBe("F");
      expect(detail.height).toBe(165);
      expect(detail.weight).toBe(60);
      expect(detail.objective).toBe("Hipertrofia");
      expect(detail.canDoAnyWorkoutDay).toBe(true);
      expect(detail.hasPassword).toBe(false);
      expect(detail.setupToken).toBeUndefined();
      expect(detail.password).toBeUndefined();
    });
  });

  describe("3. Central requireWorkspaceAccess Guard", () => {
    it("deve lançar 401 UNAUTHORIZED quando não houver sessão ativa", async () => {
      vi.mocked(auth).mockResolvedValueOnce(null as any);

      await expect(
        requireWorkspaceAccess({ workspaceId: "ws_123" })
      ).rejects.toMatchObject({
        statusCode: 401,
        code: "UNAUTHORIZED",
      });
    });

    it("deve lançar 400 WORKSPACE_REQUIRED quando workspaceId estiver vazio", async () => {
      vi.mocked(auth).mockResolvedValueOnce({
        user: { id: "usr_1", role: "TRAINER" },
      } as any);

      await expect(
        requireWorkspaceAccess({ workspaceId: "" })
      ).rejects.toMatchObject({
        statusCode: 400,
        code: "WORKSPACE_REQUIRED",
      });
    });

    it("deve lançar 404 WORKSPACE_NOT_FOUND quando workspace não existir", async () => {
      vi.mocked(auth).mockResolvedValueOnce({
        user: { id: "usr_1", role: "TRAINER" },
      } as any);

      vi.mocked(prisma.workspace.findUnique).mockResolvedValueOnce(null);

      await expect(
        requireWorkspaceAccess({ workspaceId: "ws_nonexistent" })
      ).rejects.toMatchObject({
        statusCode: 404,
        code: "WORKSPACE_NOT_FOUND",
      });
    });

    it("deve lançar 403 NOT_A_MEMBER quando usuário não pertencer ao workspace", async () => {
      vi.mocked(auth).mockResolvedValueOnce({
        user: { id: "usr_intruder", role: "TRAINER" },
      } as any);

      vi.mocked(prisma.workspace.findUnique).mockResolvedValue({
        type: "GYM", subscription: { status: "ACTIVE", endDate: null, trialEndsAt: null },
        id: "ws_gym1",
        name: "Academia Atlas",
        slug: "atlas",
        ownerId: "usr_owner",
        isActive: true,
      } as any);

      vi.mocked(prisma.workspaceMember.findFirst).mockResolvedValueOnce(null);

      await expect(
        requireWorkspaceAccess({ workspaceId: "ws_gym1" })
      ).rejects.toMatchObject({
        statusCode: 403,
        code: "NOT_A_MEMBER",
      });
    });

    it("deve lançar 403 MEMBER_INACTIVE quando membro estiver inativo", async () => {
      vi.mocked(auth).mockResolvedValueOnce({
        user: { id: "usr_suspended", role: "TRAINER" },
      } as any);

      vi.mocked(prisma.workspace.findUnique).mockResolvedValue({
        type: "GYM", subscription: { status: "ACTIVE", endDate: null, trialEndsAt: null },
        id: "ws_gym1",
        name: "Academia Atlas",
        slug: "atlas",
        ownerId: "usr_owner",
        isActive: true,
      } as any);

      vi.mocked(prisma.workspaceMember.findFirst).mockResolvedValueOnce({
        roleGrants: [], unitId: null,
        id: "mbr_suspended",
        role: "TRAINER",
        isActive: false,
      } as any);

      await expect(
        requireWorkspaceAccess({ workspaceId: "ws_gym1" })
      ).rejects.toMatchObject({
        statusCode: 403,
        code: "MEMBER_INACTIVE",
      });
    });

    it("deve permitir membro inativo se allowInactive for explicitamente true", async () => {
      vi.mocked(auth).mockResolvedValueOnce({
        user: { id: "usr_suspended", role: "STUDENT" },
      } as any);

      vi.mocked(prisma.workspace.findUnique).mockResolvedValue({
        type: "GYM", subscription: { status: "ACTIVE", endDate: null, trialEndsAt: null },
        id: "ws_gym1",
        name: "Academia Atlas",
        slug: "atlas",
        ownerId: "usr_owner",
        isActive: true,
      } as any);

      vi.mocked(prisma.workspaceMember.findFirst).mockResolvedValueOnce({
        roleGrants: [], unitId: null,
        id: "mbr_suspended",
        role: "STUDENT",
        isActive: false,
      } as any);

      const ctx = await requireWorkspaceAccess({
        workspaceId: "ws_gym1",
        allowInactive: true,
      });

      expect(ctx.isActive).toBe(false);
      expect(ctx.workspaceId).toBe("ws_gym1");
    });

    it("deve lançar 403 INSUFFICIENT_PERMISSIONS quando faltar a capacidade exigida (ex: STUDENT tentando students.read)", async () => {
      vi.mocked(auth).mockResolvedValueOnce({
        user: { id: "usr_student", role: "STUDENT" },
      } as any);

      vi.mocked(prisma.workspace.findUnique).mockResolvedValue({
        type: "GYM", subscription: { status: "ACTIVE", endDate: null, trialEndsAt: null },
        id: "ws_gym1",
        name: "Academia Atlas",
        slug: "atlas",
        ownerId: "usr_owner",
        isActive: true,
      } as any);

      vi.mocked(prisma.workspaceMember.findFirst).mockResolvedValueOnce({
        roleGrants: [], unitId: null,
        id: "mbr_student",
        role: "STUDENT",
        isActive: true,
      } as any);

      await expect(
        requireWorkspaceAccess({
          workspaceId: "ws_gym1",
          capability: "students.read",
        })
      ).rejects.toMatchObject({
        statusCode: 403,
        code: "INSUFFICIENT_PERMISSIONS",
      });
    });

    it("deve conceder acesso a TRAINER ativo para capacidade students.read", async () => {
      vi.mocked(auth).mockResolvedValueOnce({
        user: { id: "usr_trainer", role: "TRAINER" },
      } as any);

      vi.mocked(prisma.workspace.findUnique).mockResolvedValue({
        type: "GYM", subscription: { status: "ACTIVE", endDate: null, trialEndsAt: null },
        id: "ws_gym1",
        name: "Academia Atlas",
        slug: "atlas",
        ownerId: "usr_owner",
        isActive: true,
      } as any);

      vi.mocked(prisma.workspaceMember.findFirst).mockResolvedValueOnce({
        roleGrants: [], unitId: null,
        id: "mbr_trainer",
        role: "TRAINER",
        isActive: true,
      } as any);

      const ctx = await requireWorkspaceAccess({
        workspaceId: "ws_gym1",
        capability: "students.read",
      });

      expect(ctx.workspaceId).toBe("ws_gym1");
      expect(ctx.memberRole).toBe("TRAINER");
      expect(ctx.capabilities.has("students.read")).toBe(true);
      expect(ctx.isOwner).toBe(false);
    });

    it("deve conceder acesso irrestrito ao OWNER do workspace", async () => {
      vi.mocked(auth).mockResolvedValueOnce({
        user: { id: "usr_owner", role: "TRAINER" },
      } as any);

      vi.mocked(prisma.workspace.findUnique).mockResolvedValue({
        type: "GYM", subscription: { status: "ACTIVE", endDate: null, trialEndsAt: null },
        id: "ws_gym1",
        name: "Academia Atlas",
        slug: "atlas",
        ownerId: "usr_owner",
        isActive: true,
      } as any);

      vi.mocked(prisma.workspaceMember.findFirst).mockResolvedValueOnce({
        roleGrants: [], unitId: null,
        id: "mbr_owner",
        role: "OWNER",
        isActive: true,
      } as any);

      const ctx = await requireWorkspaceAccess({
        workspaceId: "ws_gym1",
        capability: "refunds.approve",
      });

      expect(ctx.isOwner).toBe(true);
      expect(ctx.capabilities.has("refunds.approve")).toBe(true);
    });

    it("deve respeitar restrição de resourceOwnerId (IDOR protection)", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "usr_student_alice", role: "STUDENT" },
      } as any);

      vi.mocked(prisma.workspace.findUnique).mockResolvedValue({
        type: "GYM", subscription: { status: "ACTIVE", endDate: null, trialEndsAt: null },
        id: "ws_gym1",
        name: "Academia Atlas",
        slug: "atlas",
        ownerId: "usr_owner",
        isActive: true,
      } as any);

      vi.mocked(prisma.workspaceMember.findFirst).mockResolvedValue({
        roleGrants: [], unitId: null,
        id: "mbr_student_alice",
        role: "STUDENT",
        isActive: true,
      } as any);

      // Student trying to read data of another student (Bob)
      await expect(
        requireWorkspaceAccess({
          workspaceId: "ws_gym1",
          resourceOwnerId: "usr_student_bob",
        })
      ).rejects.toMatchObject({
        statusCode: 403,
        code: "FORBIDDEN_RESOURCE",
      });

      // Student reading own data
      const selfCtx = await requireWorkspaceAccess({
        workspaceId: "ws_gym1",
        resourceOwnerId: "usr_student_alice",
      });
      expect(selfCtx.userId).toBe("usr_student_alice");
    });
  });

  describe("4. Error Response Conversion", () => {
    it("handleWorkspaceAccessError formata resposta HTTP padronizada", () => {
      const error = new WorkspaceAccessError(
        403,
        "INSUFFICIENT_PERMISSIONS",
        "Você não possui a capacidade exigida.",
        { required: "students.manage" }
      );

      const response = handleWorkspaceAccessError(error);
      expect(response).not.toBeNull();
      expect(response?.status).toBe(403);
    });

    it("handleWorkspaceAccessError retorna null para erros desconhecidos", () => {
      const response = handleWorkspaceAccessError(new Error("Erro de banco"));
      expect(response).toBeNull();
    });
  });
});
