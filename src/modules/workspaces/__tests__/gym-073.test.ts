import { seedGymAuthority } from "./gym-test-authority";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Hoisted mocks para Prisma
const { mockPrisma } = vi.hoisted(() => {
  const prismaMock: any = {
    workspace: {
      findUnique: vi.fn(),
    },
    workspaceMember: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    workspaceRoleGrant: {
      updateMany: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
    },
    gymStaffProfile: {
      upsert: vi.fn(),
    },
    gymStudentProfile: {
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    gymClassSession: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
    gymClassBooking: {
      updateMany: vi.fn(),
    },
    gymEnrollment: {
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    gymEnrollmentEvent: {
      create: vi.fn(),
    },
    gymAccessGrant: {
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    gymAccessDevice: {
      findMany: vi.fn(),
    },
    gymDeviceCommand: {
      create: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    gymInvoice: {
      findMany: vi.fn(),
    },
    legalAcceptance: {
      findMany: vi.fn(),
    },
    privacyConsent: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
    dataSubjectRequest: {
      create: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  };
  return { mockPrisma: prismaMock };
});

vi.mock("@/lib/prisma", () => ({
  default: mockPrisma,
}));

import { GymOffboardingService } from "../application/gym-offboarding-service";
import {
  GymEnrollmentStatus,
  GymAccessGrantStatus,
  GymClassSessionStatus,
  GymDeviceCommandType,
} from "@prisma/client";

describe("GYM-073: Encerramento, Retenção e Direitos do Titular (LGPD)", () => {
  const workspaceId = "ws-gym-matriz";
  const actorUserId = "user-owner-1";
  const staffMemberId = "member-trainer-1";
  const studentMemberId = "member-student-1";

  beforeEach(() => {
    vi.resetAllMocks();
    for (const table of ["gymAdministrativeReview", "physicalEvaluation", "studentFile", "workoutLog", "dailyFeedback", "studentProgress", "studentProgressPhoto", "workout", "message", "gymGuardian"]) mockPrisma[table] = { findMany: vi.fn().mockResolvedValue([]) };
    Object.assign(mockPrisma.dataSubjectRequest, { findMany: vi.fn().mockResolvedValue([]), findFirst: vi.fn().mockResolvedValue(null), create: vi.fn(async ({data}: any) => ({ id: "request-1", ...data })), update: vi.fn(), findUniqueOrThrow: vi.fn().mockResolvedValue({ id: "request-1", metadata: {} }) });
    seedGymAuthority(mockPrisma, "ws-gym-matriz", "user-owner-1", {"user-owner-1":"OWNER"});
    mockPrisma.$transaction.mockImplementation(async (cb: any) => cb(mockPrisma));

    mockPrisma.workspace.findUnique.mockResolvedValue({
      id: workspaceId,
      name: "Atlas Gym",
      ownerId: actorUserId, type: "GYM", isActive: true, subscription: { status: "ACTIVE", endDate: null },
    });

    // Mock padrão de transação
    mockPrisma.$transaction.mockImplementation(async (callback: any) => {
      return callback(mockPrisma);
    });
  });

  describe("3. Dossiê de Portabilidade e Acesso LGPD (exportDataSubjectDossier)", () => {
    it("deve gerar dossiê estruturado e sanitizado com contratos, financeiro e presenças", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "user-titular-1",
        name: "Ana Beatriz",
        email: "ana@email.com",
        cpfCnpj: "12345678900",
        whatsapp: "11988887777",
        gender: "FEMININO",
        birthDate: new Date("1996-04-10"),
        medicalConditions: "Nenhuma",
        createdAt: new Date("2025-01-01"),
      });

      (() => { const savedAuthority = mockPrisma.workspaceMember.findUnique.getMockImplementation(); const localMember = {
        id: "member-1",
        studentProfile: { registrationNumber: "MAT-2025-01", enrolledAt: new Date("2025-01-01") },
        staffProfile: null,
        roleGrants: [{ role: "STUDENT", grantedAt: new Date() }],
        gymEnrollments: [
          {
            id: "enr-1", priceInCents: BigInt(120000), enrollmentFeeInCents: BigInt(0),
            status: "ACTIVE",
            startDate: new Date("2025-01-01"),
            endDate: new Date("2026-01-01"),
            planVersion: { name: "Plano Anual", billingCycle: "ANNUAL", priceInCents: BigInt(120000) },
            acceptance: { signedAt: new Date(), representationRole: "SELF", ipAddress: "127.0.0.1", userAgent: "Mozilla" },
            events: [],
          },
        ],
        accessGrants: [
          { credentialType: "RFID_CARD", credentialCode: "TAG-999", status: "ACTIVE", validFrom: new Date(), validUntil: null },
        ],
        accessLogs: [{ accessedAt: new Date(), direction: "ENTRY", granted: true, reasonCode: "AUTHORIZED" }],
        classBookings: [],
      }; Object.assign(localMember, { userId: "user-titular-1", role: "STUDENT", isActive: true, unitId: null, user: { name: "Ana Beatriz", email: "ana@email.com" } }); mockPrisma.workspaceMember.findUnique.mockImplementation(async (args: any) => args.where.userId_workspaceId.userId === "user-titular-1" ? localMember : savedAuthority(args)); mockPrisma.workspaceMember.findUniqueOrThrow = vi.fn(async () => localMember); })();

      mockPrisma.gymInvoice.findMany.mockResolvedValue([
        {
          id: "inv-1", paidAmountInCents: BigInt(120000), openingPaidAmountInCents: BigInt(0), balanceRemainingInCents: BigInt(0), items: [],
          status: "PAID",
          totalInCents: BigInt(120000),
          dueDate: new Date(),
          paidAt: new Date(),
          allocations: [
            { allocatedAmountInCents: BigInt(120000),
              payment: {
                amountInCents: BigInt(120000),
                paymentMethod: "CREDIT_CARD",
                status: "CONFIRMED",
                paidAt: new Date(),
              },
            },
          ],
        },
      ]);

      mockPrisma.legalAcceptance.findMany.mockResolvedValue([]);
      mockPrisma.privacyConsent.findMany.mockResolvedValue([
        { purpose: "MARKETING_EMAIL", grantedAt: new Date(), revokedAt: null },
      ]);

      const dossier = await GymOffboardingService.exportDataSubjectDossier({
        workspaceId,
        targetUserId: "user-titular-1",
        actorUserId,
      });

      expect(dossier).toBeDefined();
      expect(dossier.personalInformation.name).toBe("Ana Beatriz");
      expect(dossier.contractsAndEnrollments[0].planName).toBe("Plano Anual");
      expect(dossier.contractsAndEnrollments[0].priceInCents).toBe("120000");
      expect(dossier.financialRecords[0].amountInCents).toBe("120000");
      expect(mockPrisma.dataSubjectRequest.create).toHaveBeenCalled();
    });
  });

  describe("4. Solicitação de privacidade com escopo local", () => {
    it("registra pedido pendente sem alterar identidade, consentimentos ou equipamento", async () => {
      const authority = mockPrisma.workspaceMember.findUnique.getMockImplementation();
      mockPrisma.workspaceMember.findUnique.mockImplementation(async (args: any) => args.where.userId_workspaceId.userId === "user-titular-delete" ? { id: "member-delete-1", unitId: null } : authority(args));
      mockPrisma.dataSubjectRequest.create.mockResolvedValue({ id: "request-1", status: "PENDING" });
      const result = await GymOffboardingService.executeDataSubjectDeletion({ workspaceId, targetUserId: "user-titular-delete", actorUserId, reason: "Solicitação do titular" });
      expect(result).toEqual({ success: true, targetUserId: "user-titular-delete", requestId: "request-1", status: "PENDING" });
      expect(mockPrisma.dataSubjectRequest.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ workspaceId, type: "DELETION", requesterUserId: "user-titular-delete" }) }));
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
      expect(mockPrisma.privacyConsent.updateMany).not.toHaveBeenCalled();
      expect(mockPrisma.gymDeviceCommand.create).not.toHaveBeenCalled();
      expect(mockPrisma.gymEnrollment.updateMany).not.toHaveBeenCalled();
    });
    it("recusa titular sem vínculo com a academia", async () => {
      mockPrisma.workspaceMember.findFirst.mockResolvedValue(null);
      await expect(GymOffboardingService.requestDataSubjectDeletion({ workspaceId, targetUserId: "foreign-user", actorUserId })).rejects.toMatchObject({ code: "NOT_A_MEMBER" });
      expect(mockPrisma.dataSubjectRequest.create).not.toHaveBeenCalled();
    });
  });
});
