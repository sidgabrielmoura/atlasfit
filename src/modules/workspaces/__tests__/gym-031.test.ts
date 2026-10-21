import { seedGymAuthority } from "./gym-test-authority";
import { describe, it, expect, vi, beforeEach } from "vitest";

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
    gymStudentProfile: {
      create: vi.fn(),
      upsert: vi.fn(),
    },
    gymUnit: {
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

import { GymStudentService, gymStudentService } from "../application/gym-student-service";
import { WorkspaceContext } from "../domain/types";

describe("GYM-031: Alunos e Cadastro Assistido", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    seedGymAuthority(mockPrisma, "ws-gym-1", "user-owner", { "user-recep": "RECEPTIONIST", "user-trainer": "TRAINER" });
    const authority = mockPrisma.workspaceMember.findUnique.getMockImplementation();
    mockPrisma.workspaceMember.findUnique.mockImplementation(async (args: any) => { const result = await authority(args); if (result?.role === "TRAINER") result.id = "mem-trainer-1"; return result; });
    mockPrisma.$transaction.mockImplementation(async (cb: any) => cb(mockPrisma));
    mockPrisma.gymUnit.findFirst.mockResolvedValue({ id: "unit-1" });
    mockPrisma.gymUnit.findMany.mockResolvedValue([{ id: "unit-1" }]);
    mockPrisma.gymStudentProfile.findUnique = vi.fn().mockResolvedValue(null);
    mockPrisma.gymStudentProfile.findFirst = vi.fn().mockResolvedValue(null);
    mockPrisma.user.findMany = vi.fn();
    mockPrisma.user.findFirst.mockResolvedValue(null);
    mockPrisma.workspaceRoleGrant = { create: vi.fn() };
    mockPrisma.verificationToken = { deleteMany: vi.fn(), count: vi.fn().mockResolvedValue(0), create: vi.fn() };

  });

  const mockReceptionistContext: WorkspaceContext = {
    userId: "user-recep",
    userEmail: "recep@fit.com",
    userRole: "USER",
    workspaceId: "ws-gym-1",
    workspaceName: "Academia Atlas",
    workspaceSlug: "academia-atlas",
    workspaceType: "GYM",
    isOwner: false,
    memberId: "mem-recep",
    memberRole: "RECEPTIONIST",
    roles: ["RECEPTIONIST"],
    capabilities: new Set(["students.read", "students.manage"]),
    hasCapability: (cap) => ["students.read", "students.manage"].includes(cap),
    isActive: true,
    isSuperAdmin: false,
  };

  const mockTrainerContext: WorkspaceContext = {
    userId: "user-trainer",
    userEmail: "trainer@fit.com",
    userRole: "USER",
    workspaceId: "ws-gym-1",
    workspaceName: "Academia Atlas",
    workspaceSlug: "academia-atlas",
    workspaceType: "GYM",
    isOwner: false,
    memberId: "mem-trainer-1",
    memberRole: "TRAINER",
    roles: ["TRAINER"],
    capabilities: new Set(["students.read"]), // Does NOT have students.manage
    hasCapability: (cap) => ["students.read"].includes(cap),
    isActive: true,
    isSuperAdmin: false,
  };

  describe("listStudents", () => {
    it("deve filtrar exclusivamente alunos da carteira do treinador quando o perfil for TRAINER restrito", async () => {
      mockPrisma.workspaceMember.findMany.mockResolvedValueOnce([
        {
          id: "stu-1",
          workspaceId: "ws-gym-1",
          userId: "user-stu-1",
          plan: "Mensal",
          modality: "PRESENCIAL",
          isActive: true,
          unitId: "unit-1",
          assignedStaffId: "mem-trainer-1",
          createdAt: new Date(),
          user: { id: "user-stu-1", name: "Aluno do Treinador", email: "aluno1@test.com" },
          unit: { id: "unit-1", name: "Matriz Centro", code: "CEN" },
          assignedStaff: { id: "mem-trainer-1", role: "TRAINER", user: { name: "Treinador 1" } },
          studentProfile: {
            id: "prof-1",
            registrationNumber: "MAT-2026-0001",
            status: "ACTIVE",
          },
        },
      ]);
      mockPrisma.workspaceMember.count.mockResolvedValueOnce(1);

      const result = await gymStudentService.listStudents({
        workspaceId: "ws-gym-1",
        actorContext: mockTrainerContext,
      });

      expect(result.students).toHaveLength(1);
      expect(result.students[0].name).toBe("Aluno do Treinador");
      expect(result.students[0].assignedStaffId).toBe("mem-trainer-1");

      // Verify Prisma query was restricted to assignedStaffId: "mem-trainer-1"
      const filter = JSON.stringify(mockPrisma.workspaceMember.findMany.mock.calls[0][0].where);
      expect(filter).toContain('"workspaceId":"ws-gym-1"');
      expect(filter).toContain('"assignedStaffId":"mem-trainer-1"');
    });

    it("deve sanitizar campos sensíveis omitindo senhas e setupToken da listagem de alunos", async () => {
      mockPrisma.workspaceMember.findMany.mockResolvedValueOnce([
        {
          id: "stu-2",
          workspaceId: "ws-gym-1",
          userId: "user-stu-2",
          plan: "Anual",
          modality: "PRESENCIAL",
          isActive: true,
          createdAt: new Date(),
          user: {
            id: "user-stu-2",
            name: "Maria Santos",
            email: "maria@test.com",
            password: "hashed_secret_password",
            setupToken: "secret_setup_token_uuid",
          },
          unit: null,
          assignedStaff: null,
          studentProfile: {
            registrationNumber: "MAT-2026-0002",
            status: "ACTIVE",
          },
        },
      ]);
      mockPrisma.workspaceMember.count.mockResolvedValueOnce(1);

      const result = await gymStudentService.listStudents({
        workspaceId: "ws-gym-1",
        actorContext: mockReceptionistContext,
      });

      const student = result.students[0] as any;
      expect(student.name).toBe("Maria Santos");
      expect(student.password).toBeUndefined();
      expect(student.setupToken).toBeUndefined();
    });
  });

  describe("checkDuplicate", () => {
    it("deve identificar aluno já cadastrado globalmente e sugerir vinculação com dados mascarados", async () => {
      mockPrisma.user.findMany.mockResolvedValueOnce([{
        id: "user-global-1",
        name: "Carlos Eduardo Silva",
        email: "carlos.eduardo@gmail.com",
        cpfCnpj: "52998224725",
        whatsapp: "11999998888",
        birthDate: new Date("1995-05-15"),
      }]);

      // Not yet a member of ws-gym-1
      mockPrisma.workspaceMember.findFirst.mockResolvedValueOnce(null);

      const result = await gymStudentService.checkDuplicate("ws-gym-1", {
        cpf: "529.982.247-25",
      }, "user-recep", "unit-1");

      expect(result.status).toBe("EXISTING_USER_CAN_LINK");
      expect(result.user?.id).toMatch(/^[a-f0-9]{64}$/);
      expect(result.user).toMatchObject({ name: null, emailMasked: null, cpfMasked: null });
      expect(mockPrisma.verificationToken.create).toHaveBeenCalled();
    });

    it("deve acusar ALREADY_MEMBER se o usuário já possuir matrícula neste workspace", async () => {
      mockPrisma.user.findMany.mockResolvedValueOnce([{
        id: "user-global-2",
        name: "Ana Clara",
        email: "ana@fit.com",
        cpfCnpj: "98765432100",
      }]);

      const oldAuthority = mockPrisma.workspaceMember.findUnique.getMockImplementation();
      mockPrisma.workspaceMember.findUnique.mockImplementation(async (args: any) => args.where.userId_workspaceId.userId === "user-global-2" ? {
        id: "mem-ana",
        workspaceId: "ws-gym-1",
        userId: "user-global-2",
        role: "STUDENT",
        isActive: true, unitId: "unit-1",
      } : oldAuthority(args));

      const result = await gymStudentService.checkDuplicate("ws-gym-1", {
        email: "ana@fit.com",
      }, "user-recep", "unit-1");

      expect(result.status).toBe("ALREADY_MEMBER");
      expect(result.memberId).toBe("mem-ana");
    });
  });

  describe("registerStudent", () => {
    it("deve impedir matrícula caso o limite maxStudents da licença esteja atingido", async () => {

      mockPrisma.workspaceMember.count.mockResolvedValueOnce(50);

      await expect(
        gymStudentService.registerStudent({idempotencyKey: "registration-1", birthDate: "1990-01-01",
          workspaceId: "ws-gym-1",
          actorUserId: "user-recep",
          name: "Novo Aluno",
        })
      ).rejects.toMatchObject({ code: "STUDENT_LIMIT_REACHED" });
    });

    it("deve permitir cadastro assistido no balcão sem criar e-mails fictícios quando e-mail não for informado", async () => {

      mockPrisma.workspaceMember.count
        .mockResolvedValueOnce(10) // capacity check
        .mockResolvedValueOnce(10); // sequential matricula count

      mockPrisma.gymUnit.findFirst.mockResolvedValueOnce({ id: "unit-1", isActive: true });
      mockPrisma.workspaceMember.findFirst.mockResolvedValueOnce({ id: "mem-trainer-1", isActive: true, role: "TRAINER", unitId: "unit-1", roleGrants: [], workspace: { ownerId: "user-owner" } });

      mockPrisma.user.create.mockResolvedValueOnce({
        id: "user-novo-balcao",
        name: "Sebastião da Silva",
        email: null, // No fake email!
        cpfCnpj: "52998224725",
        whatsapp: "11988887777",
      });

      mockPrisma.workspaceMember.create.mockResolvedValueOnce({
        id: "mem-sebastiao",
        workspaceId: "ws-gym-1",
        userId: "user-novo-balcao",
        role: "STUDENT",
        unitId: "unit-1",
        assignedStaffId: "mem-trainer-1",
        plan: "Trimestral",
      });

      mockPrisma.gymStudentProfile.create.mockResolvedValueOnce({
        id: "prof-sebastiao",
        memberId: "mem-sebastiao",
        registrationNumber: "MAT-2026-0011",
      });

      mockPrisma.auditLog.create.mockResolvedValueOnce({ id: "audit-1" });

      const result = await gymStudentService.registerStudent({idempotencyKey: "registration-2", birthDate: "1990-01-01",
        workspaceId: "ws-gym-1",
        actorUserId: "user-recep",
        name: "Sebastião da Silva",
        email: null, // Sem e-mail informado
        cpfCnpj: "529.982.247-25",
        whatsapp: "11988887777",
        unitId: "unit-1",
        assignedStaffId: "mem-trainer-1",
        plan: "Trimestral",
        emergencyContactName: "Teresa",
        emergencyContactPhone: "11977776666",
      });

      expect(result.userId).toBe("user-novo-balcao");
      expect(result.registrationNumber).toBe("MAT-2026-0011");

      // Verify User was created with email: null (NO fake email created)
      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: "Sebastião da Silva",
            email: null,
            cpfCnpj: "52998224725",
          }),
        })
      );

      // Verify audit log creation
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: "user-recep",
            entityId: "ws-gym-1",
            action: expect.stringContaining("STUDENT_REGISTERED"),
          }),
        })
      );
    });

    it("ID global sem autorização de identidade não cria vínculo", async () => {

      mockPrisma.workspaceMember.count
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(5);

      const accountAuthority = mockPrisma.user.findUnique.getMockImplementation();
      mockPrisma.user.findUnique.mockImplementation(async (args: any) => args.where.id === "user-existente-1" ? {
        id: "user-existente-1",
        name: "Beatriz Lima",
        email: "beatriz@gmail.com", birthDate: new Date("1990-01-01"),
      } : accountAuthority(args));
      mockPrisma.workspaceMember.findFirst.mockResolvedValueOnce(null); // not already member

      mockPrisma.workspaceMember.create.mockResolvedValueOnce({
        id: "mem-beatriz",
        workspaceId: "ws-gym-1",
        userId: "user-existente-1",
        role: "STUDENT",
        plan: "Semestral",
      });

      mockPrisma.gymStudentProfile.create.mockResolvedValueOnce({
        id: "prof-beatriz",
        memberId: "mem-beatriz",
        registrationNumber: "MAT-2026-0006",
      });

      mockPrisma.auditLog.create.mockResolvedValueOnce({ id: "audit-2" });

      await expect(gymStudentService.registerStudent({idempotencyKey: "registration-3", birthDate: "1990-01-01",
        workspaceId: "ws-gym-1",
        actorUserId: "user-recep",
        existingUserId: "user-existente-1",
        plan: "Semestral",
      })).rejects.toMatchObject({ code: "FORBIDDEN_RESOURCE" });

      // Verify no new user was created
      expect(mockPrisma.user.create).not.toHaveBeenCalled();

      expect(mockPrisma.workspaceMember.create).not.toHaveBeenCalled();
    });
  });

  describe("getStudentById", () => {
    it("deve bloquear acesso de treinador a aluno que não seja da sua carteira", async () => {
      mockPrisma.workspaceMember.findFirst.mockResolvedValueOnce(null);

      await expect(
        gymStudentService.getStudentById("ws-gym-1", "stu-outro", mockTrainerContext)
      ).rejects.toMatchObject({ code: "STUDENT_NOT_FOUND" });
    });
  });
});
