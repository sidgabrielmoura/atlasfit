import { seedGymAuthority } from "./gym-test-authority";
import { calculateDocumentHash } from "@/lib/privacy/legal-acceptance.service";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock prisma
const { mockPrisma } = vi.hoisted(() => {
  const mock: any = {
    $transaction: vi.fn(async (cb) => cb(mock)),
    workspace: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    workspaceMember: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    gymGuardian: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    legalDocument: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    legalAcceptance: {
      create: vi.fn(),
      findFirst: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  };
  return { mockPrisma: mock };
});

vi.mock("@/lib/prisma", () => ({
  default: mockPrisma,
}));

import { MinorService, minorService } from "../application/minor-service";
import { validateAgeEligibility, validateGymMinorEligibility } from "@/lib/privacy/age-validator";
import { LegalDocumentType } from "@prisma/client";

describe("GYM-032: Menores, Representação e Portal do Responsável", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    seedGymAuthority(mockPrisma, "ws-gym-1", "user-owner", { "user-recep": "RECEPTIONIST", "actor-manager": "MANAGER" });
    mockPrisma.$transaction.mockImplementation(async (cb: any) => cb(mockPrisma));
    mockPrisma.user.findUnique.mockImplementation(async ({where}: any) => ({ id: where.id, role: "USER", cpfCnpj: "52998224725", birthDate: new Date("1990-01-01") }));
    mockPrisma.user.findUniqueOrThrow = vi.fn().mockResolvedValue({ cpfCnpj: "11144477735", birthDate: new Date("2010-01-01") });
    mockPrisma.workspaceMember.findFirst.mockResolvedValue({workspaceId: "ws-1",gymEnrollments: [], id: "mem-1", userId: "user-minor-1", unitId: null, isMinor: true, role: "STUDENT", isActive: true, roleGrants: [] });
    mockPrisma.gymGuardian.findFirst.mockResolvedValue(null); mockPrisma.gymGuardian.updateMany = vi.fn();
    mockPrisma.legalAcceptance.findFirst.mockResolvedValue(null);

  });

  describe("Política etária contextual (age-validator)", () => {
    beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-12T15:00:00Z")); });
    afterEach(() => vi.useRealTimers());
    it("deve manter estritamente a política 18+ para fluxos tradicionais de Personal Trainer", () => {
      // 15 years old
      const fifteenYearsAgo = new Date();
      fifteenYearsAgo.setFullYear(fifteenYearsAgo.getFullYear() - 15);

      const personalResult = validateAgeEligibility(fifteenYearsAgo, 18);
      expect(personalResult.isValid).toBe(false);
      expect(personalResult.error).toContain("O AtlasFit é exclusivo para maiores de 18 anos");

      // 22 years old
      const twentyTwoYearsAgo = new Date();
      twentyTwoYearsAgo.setFullYear(twentyTwoYearsAgo.getFullYear() - 22);

      const adultResult = validateAgeEligibility(twentyTwoYearsAgo, 18);
      expect(adultResult.isValid).toBe(true);
      expect(adultResult.age).toBe(22);
    });

    it("deve permitir menores entre 12 e 17 anos no contexto de academias (GYM) com flag requiresGuardian", () => {
      // 14 years old
      const fourteenYearsAgo = new Date();
      fourteenYearsAgo.setFullYear(fourteenYearsAgo.getFullYear() - 14);

      const minorResult = validateGymMinorEligibility(fourteenYearsAgo, 12);
      expect(minorResult.isValid).toBe(true);
      expect(minorResult.isMinor).toBe(true);
      expect(minorResult.requiresGuardian).toBe(true);
      expect(minorResult.age).toBe(14);

      // 10 years old (below minMinorAge of 12)
      const tenYearsAgo = new Date();
      tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);

      const underAgeResult = validateGymMinorEligibility(tenYearsAgo, 12);
      expect(underAgeResult.isValid).toBe(false);
      expect(underAgeResult.error).toContain("A idade mínima para matrícula nesta academia é de 12 anos");
    });
  });

  describe("addGuardian", () => {
    it("deve vincular responsável com separação estrita de poderes e acesso à saúde desativado por padrão", async () => {
      mockPrisma.workspaceMember.findFirst.mockResolvedValueOnce({role: "STUDENT",roleGrants: [],isActive: true,isMinor: true,unitId: null,gymEnrollments: [],
        id: "mem-minor-1",
        workspaceId: "ws-gym-1",
        userId: "user-minor-1",
        user: {birthDate: new Date("2010-01-01"), name: "Lucas Ferreira (Menor)" },
      });

      mockPrisma.user.findFirst.mockResolvedValueOnce(null); // Guardian does not yet have app account

      mockPrisma.gymGuardian.create.mockImplementation(async ({ data }: any) => ({
        id: "guard-1",
        ...data,
      }));
      mockPrisma.workspaceMember.update.mockResolvedValueOnce({ id: "mem-minor-1", isMinor: true });
      mockPrisma.auditLog.create.mockResolvedValueOnce({ id: "audit-1" });

      const guardian = await minorService.addGuardian({
        workspaceId: "ws-gym-1",
        studentMemberId: "mem-minor-1",
        actorUserId: "user-recep",
        name: "Marcos Ferreira",
        cpf: "529.982.247-25",
        phone: "11988887777",
        relationship: "PAI",
        isLegalRepresentative: true,
        isFinancialResponsible: true,
        isEmergencyContact: true,
        // hasHealthAccess not provided -> must default to false!
      });

      expect(guardian.id).toBe("guard-1");
      expect(guardian.name).toBe("Marcos Ferreira");
      expect(guardian).not.toHaveProperty("cpf");
      expect(guardian.isLegalRepresentative).toBe(true);
      expect(guardian.isFinancialResponsible).toBe(true);
      expect(guardian.hasHealthAccess).toBe(false); // Acceptance criterion: pagador não obtém automaticamente acesso de saúde

      // Verify student was marked as minor
      expect(mockPrisma.workspaceMember.update).toHaveBeenCalledWith({
        where: { id: "mem-minor-1" },
        data: { isMinor: true },
      });

      // Verify audit log
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: "user-recep",
            entityId: "ws-gym-1",
            action: expect.stringContaining("GYM_GUARDIAN_ADDED"),
          }),
        })
      );
    });
  });

  describe("recordMinorLegalAcceptance", () => {
    it("deve registrar aceite com ator responsável e titular menor claramente delimitados", async () => {
      mockPrisma.gymGuardian.findFirst.mockResolvedValueOnce({workspace: { id: "ws-gym-1", type: "GYM", isActive: true, subscription: { status: "ACTIVE", endDate: null } },guardianUserId: "user-guardian-marcos",cpf: "52998224725",verifiedAt: new Date(),revokedAt: null,birthDate: new Date("2010-01-01"),
        id: "guard-1",
        workspaceId: "ws-gym-1",
        name: "Marcos Ferreira",
        relationship: "PAI",
        isLegalRepresentative: true,
        studentMember: {workspaceId: "ws-gym-1",role: "STUDENT",roleGrants: [],isActive: true,isMinor: true,unitId: null,gymEnrollments: [],
          id: "mem-minor-1",
          userId: "user-minor-1",
          user: {birthDate: new Date("2010-01-01"), name: "Lucas Ferreira (Menor)" },
        },
      });

      mockPrisma.legalDocument.findFirst.mockResolvedValueOnce({
        id: "doc-terms-v1",
        type: LegalDocumentType.TERMS,
        version: "1.0",
        content: "Termos sintéticos", contentHash: calculateDocumentHash("Termos sintéticos"),
      });

      mockPrisma.legalAcceptance.create.mockResolvedValueOnce({
        id: "acc-1",
        userId: "user-guardian-marcos",
        representedUserId: "user-minor-1",
        representationRole: "PAI",
        documentId: "doc-terms-v1",
        documentType: LegalDocumentType.TERMS,
        documentVersion: "1.0",
      });

      mockPrisma.auditLog.create.mockResolvedValueOnce({ id: "audit-2" });

      const acceptance = await minorService.recordMinorLegalAcceptance({
        workspaceId: "ws-gym-1",
        guardianId: "guard-1",
        guardianUserId: "user-guardian-marcos",
        documentType: LegalDocumentType.TERMS, documentId: "doc-terms-v1", documentHash: calculateDocumentHash("Termos sintéticos"), accepted: true,
      });

      expect(acceptance).toBeDefined();

      // Verify acceptance records actor and represented minor
      expect(mockPrisma.legalAcceptance.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: "user-guardian-marcos", // Actor
            representedUserId: "user-minor-1", // Minor Titular
            representationRole: "PAI",
            documentType: LegalDocumentType.TERMS,
          }),
        })
      );
    });

    it("deve bloquear aceite se o responsável não tiver poderes de representação legal", async () => {
      mockPrisma.gymGuardian.findFirst.mockResolvedValueOnce(null); // not found with isLegalRepresentative: true

      await expect(
        minorService.recordMinorLegalAcceptance({
          workspaceId: "ws-gym-1",
          guardianId: "guard-sem-poderes",
          guardianUserId: "user-guardian-outro",
          documentType: LegalDocumentType.TERMS,
        })
      ).rejects.toMatchObject({ code: "GUARDIAN_NOT_AUTHORIZED" });
    });
  });

  describe("listDependentsForGuardian", () => {
    it("deve ocultar dados de saúde confidenciais se hasHealthAccess for false", async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        id: "user-guardian-1",
        cpfCnpj: "52998224725",
        email: "pai@gmail.com", birthDate: new Date("1990-01-01"),
      });

      mockPrisma.gymGuardian.findMany.mockResolvedValueOnce([
        {workspaceId: "ws-1",guardianUserId: "user-guardian-1",cpf: "52998224725",revokedAt: null,
          id: "guard-1",
          relationship: "PAI",
          isLegalRepresentative: true,
          isFinancialResponsible: true,
          isEmergencyContact: true,
          hasHealthAccess: false, // Health access RESTRICTED
          verifiedAt: new Date(),
          workspace: {type: "GYM", isActive: true, subscription: { status: "ACTIVE", endDate: null },
            id: "ws-1",
            name: "Academia Atlas Centro",
            settings: { allowMinorSelfCheckin: true, requireGuardianSignature: true },
          },
          studentMember: {workspaceId: "ws-1",role: "STUDENT",roleGrants: [],unitId: null,gymEnrollments: [],
            id: "mem-1",
            userId: "user-minor-1",
            isMinor: true,
            plan: "Mensal",
            modality: "PRESENCIAL",
            isActive: true,
            user: {
              id: "user-minor-1",
              name: "Filho Menor",
              birthDate: new Date("2010-06-15"),
            },
            unit: { name: "Unidade 1" },
            assignedStaff: { user: { name: "Coach Silva" } },
            studentProfile: {
              registrationNumber: "MAT-2026-0001",
              medicalClearance: true,
              notes: "Histórico de asma e dor lombar", // Highly sensitive health data
            },
          },
        },
      ]);

      const dependents = await minorService.listDependentsForGuardian("user-guardian-1");

      expect(dependents).toHaveLength(1);
      const dep = dependents[0];
      expect(dep.student.name).toBe("Filho Menor");
      expect(dep.powers.hasHealthAccess).toBe(false);

      // Sensitive health data MUST be redacted when hasHealthAccess is false
      expect(dep.student.notes).toBeNull();
      expect(dep.student.medicalClearance).toBeNull();
    });
  });

  describe("revokeGuardian", () => {
    it("deve gerar log com severidade alta caso o menor fique sem nenhum responsável legal ativo", async () => {
      mockPrisma.gymGuardian.findFirst.mockResolvedValueOnce({
        id: "guard-1",
        workspaceId: "ws-1",
        name: "Guardião Revogado",
        studentMemberId: "mem-1",
      });

      mockPrisma.gymGuardian.update.mockResolvedValueOnce({ id: "guard-1", revokedAt: new Date() });
      mockPrisma.gymGuardian.count.mockResolvedValueOnce(0); // 0 remaining guardians
      mockPrisma.auditLog.create.mockResolvedValueOnce({ id: "audit-3" });

      const result = await minorService.revokeGuardian("ws-1", "guard-1", "actor-manager", "Determinação judicial");

      expect(result.remainingGuardiansCount).toBe(0);

      // High severity audit log
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            severity: "high",
            action: expect.stringContaining("remainingLegal=0"),
          }),
        })
      );
    });
  });

  describe("checkMajorityTransition", () => {
    it("deve emancipar o aluno ao completar 18 anos atualizando isMinor para false com auditoria", async () => {
      // 18 years and 1 day ago
      const eighteenYearsAgo = new Date();
      eighteenYearsAgo.setFullYear(eighteenYearsAgo.getFullYear() - 18);
      eighteenYearsAgo.setDate(eighteenYearsAgo.getDate() - 1);

      mockPrisma.workspaceMember.findFirst.mockResolvedValueOnce({
        id: "mem-emancipado",
        workspaceId: "ws-1",
        isMinor: true, // Currently marked as minor
        userId: "user-adulto",
        user: { name: "Aluno Que Fez 18 Anos", birthDate: eighteenYearsAgo },
      });

      mockPrisma.workspaceMember.update.mockResolvedValueOnce({
        id: "mem-emancipado",
        isMinor: false,
      });
      mockPrisma.auditLog.create.mockResolvedValueOnce({ id: "audit-4" });

      const result = await minorService.checkMajorityTransition("ws-1", "mem-emancipado", "actor-manager");

      expect(result.transitioned).toBe(true);
      expect(result.isMinor).toBe(false);
      expect(result.age).toBe(18);

      expect(mockPrisma.workspaceMember.update).toHaveBeenCalledWith({
        where: { id: "mem-emancipado" },
        data: { isMinor: false },
      });

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: expect.stringContaining("MAJORITY_TRANSITION_COMPLETED"),
          }),
        })
      );
    });
  });
});
