import { seedGymAuthority } from "./gym-test-authority";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Hoisted mocks
const { mockPrisma, mockFinancialService, mockEnrollmentService } = vi.hoisted(() => {
  const prismaMock: any = {
    $transaction: vi.fn(async (cb) => cb(prismaMock)),
    workspace: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    workspaceMember: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    gymSettings: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    gymInvoice: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    gymInvoiceItem: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    gymPayment: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    gymPaymentAllocation: {
      create: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
    gymCashDrawerSession: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
    gymCashDrawerMovement: {
      create: vi.fn(),
    },
    gymFinancialAccount: {
      update: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  };

  const financialMock = {
    resolveEffectivePayer: vi.fn(),
  };

  const enrollmentMock = {
    activateEnrollment: vi.fn(),
  };

  return {
    mockPrisma: prismaMock,
    mockFinancialService: financialMock,
    mockEnrollmentService: enrollmentMock,
  };
});

vi.mock("@/lib/prisma", () => ({
  default: mockPrisma,
}));

vi.mock("@/lib/ably", () => ({
  publishToChannel: vi.fn().mockResolvedValue(true),
}));

vi.mock("../application/gym-financial-service", () => ({
  gymFinancialService: mockFinancialService,
}));

vi.mock("../application/enrollment-service", () => ({
  gymEnrollmentService: mockEnrollmentService,
}));

import { GymInvoiceService } from "../application/invoice-service";
import {
  GymInvoiceStatus,
  GymInvoiceItemType,
  GymInPersonPaymentMethod,
  GymPaymentStatus,
  GymAllocationStatus,
  GymEnrollmentStatus,
} from "@prisma/client";

describe("GYM-041: Recebíveis, Alocações, Pagamentos Presenciais e Alçada de Desconto", () => {
  let invoiceService: GymInvoiceService;

  const workspaceId = "ws-unit-alpha";
  const actorUserId = "user-receptionist-1";
  const managerUserId = "user-manager-1";
  const studentMemberId = "member-student-1";
  const studentUserId = "user-student-1";

  beforeEach(() => {
    vi.resetAllMocks();
    mockPrisma.gymInvoice.findMany.mockImplementation(async () => [await mockPrisma.gymInvoice.findFirst({})]);
    mockPrisma.gymPayment.findUniqueOrThrow = vi.fn(async () => {
      const methods = [mockPrisma.gymPayment.create, mockPrisma.gymPayment.update].filter(method => method.mock.results.length).sort((a,b) => b.mock.invocationCallOrder.at(-1) - a.mock.invocationCallOrder.at(-1));
      return { allocations: [], status: "CONFIRMED", ...await methods[0].mock.results.at(-1).value };
    });
    mockPrisma.gymCashDrawerSession.findFirst.mockResolvedValue({ id: "cash-1", financialAccountId: "account-internal", unitId: null });
    mockPrisma.workspace.findUniqueOrThrow = vi.fn(async () => mockPrisma.workspace.findUnique({}));
    mockPrisma.gymFinancialAccount.findFirst = vi.fn().mockResolvedValue({ id: "account-internal", unitId: null, isActive: true, balanceInCents: BigInt(100000) });
    seedGymAuthority(mockPrisma, "ws-unit-alpha", "user-owner", {"user-receptionist-1":"RECEPTIONIST","user-manager-1":"MANAGER"});
    mockPrisma.$transaction.mockImplementation(async (cb: any) => cb(mockPrisma));
    invoiceService = new GymInvoiceService();

    mockPrisma.$transaction.mockImplementation(async (cb: any) => cb(mockPrisma));

    // Mock do aluno e workspace padrão
    mockPrisma.workspaceMember.findFirst.mockImplementation(async ({ where }: any) => {
      if (where?.id === studentMemberId) {
        return {
          id: studentMemberId,
          workspaceId,
          userId: studentUserId,
          role: "STUDENT", isActive: true, unitId: null, roleGrants: [],
          user: { id: studentUserId, name: "Lucas Moura", email: "lucas@example.com", cpfCnpj: "12345678901" }
        };
      }
      if (where?.userId === actorUserId) {
        return {
          id: "member-receptionist-1",
          workspaceId,
          userId: actorUserId,
          role: "RECEPTIONIST",
          user: { id: actorUserId, name: "Carla Recepção", email: "carla@atlasfit.com" }
        };
      }
      if (where?.userId === managerUserId) {
        return {
          id: "member-manager-1",
          workspaceId,
          userId: managerUserId,
          role: "MANAGER",
          user: { id: managerUserId, name: "Marcos Gerente", email: "marcos@atlasfit.com" }
        };
      }
      return null;
    });

    mockPrisma.workspace.findUnique.mockResolvedValue({
      id: workspaceId,
      name: "AtlasFit Paulista",
      slug: "atlasfit-paulista", type: "GYM", isActive: true, ownerId: "user-owner", subscription: { status: "ACTIVE", endDate: null }
    });

    mockPrisma.gymSettings.findUnique.mockResolvedValue({
      workspaceId,
      maxReceptionistDiscountPercentage: 10.0,
      maxReceptionistDiscountInCents: BigInt(2000), // R$ 20,00
    });

    mockFinancialService.resolveEffectivePayer.mockResolvedValue({
      payerType: "STUDENT",
      name: "Lucas Moura",
      cpfCnpj: "12345678901",
      email: "lucas@example.com",
      phone: "11999998888"
    });
  });

  describe("1. Criação de Faturas e Cálculo Preciso de Centavos", () => {
    it("deve criar fatura com múltiplos itens e calcular subtotal, desconto e total em centavos perfeitamente", async () => {
      mockPrisma.gymInvoice.create.mockImplementation(async ({ data }: any) => ({
        id: "inv-101",
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
        items: data.items.create.map((it: any, idx: number) => ({ id: `item-${idx + 1}`, ...it }))
      }));

      const result = await invoiceService.createInvoice({idempotencyKey: "fixture-1",
        workspaceId,
        actorUserId,
        studentMemberId,
        title: "Mensalidade + Taxa de Matrícula",
        dueDate: new Date("2026-10-10"),
        competenceMonth: "2026-10",
        items: [
          {
            itemType: GymInvoiceItemType.PLAN_SUBSCRIPTION,
            description: "Plano Black Anual - Parcela 1/12",
            quantity: 1,
            unitPriceInCents: 12000 // R$ 120,00
          },
          {
            itemType: GymInvoiceItemType.ENROLLMENT_FEE,
            description: "Taxa de Matrícula Promocional",
            quantity: 1,
            unitPriceInCents: 3000 // R$ 30,00
          }
        ]
      });

      expect(result).toBeDefined();
      expect(result.id).toBe("inv-101");
      expect(result.subtotalInCents).toBe(15000); // 150,00
      expect(result.discountInCents).toBe(0);
      expect(result.totalInCents).toBe(15000);
      expect(result.paidAmountInCents).toBe(0);
      expect(result.balanceRemainingInCents).toBe(15000);
      expect(result.status).toBe(GymInvoiceStatus.OPEN);
      expect(result.invoiceNumber).toMatch(/^FAT-[A-F0-9]{24}$/);
      expect(result.items).toHaveLength(2);
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: actorUserId,
          entity: "GYM_INVOICE",
          entityId: "inv-101",
        })
      });
    });

    it("deve rejeitar criação de fatura sem itens ou com valores nulos", async () => {
      await expect(
        invoiceService.createInvoice({idempotencyKey: "fixture-2",
          workspaceId,
          actorUserId,
          studentMemberId,
          title: "Fatura Vazia",
          dueDate: new Date(),
          items: []
        })
      ).rejects.toMatchObject({ code: "INVALID_REQUEST" });
    });
  });

  describe("2. Alçada de Desconto da Recepção (Governance & Limits)", () => {
    it("deve exigir justificativa caso haja qualquer desconto aplicado", async () => {
      await expect(
        invoiceService.createInvoice({idempotencyKey: "fixture-3",
          workspaceId,
          actorUserId,
          studentMemberId,
          title: "Mensalidade com Desconto Sem Motivo",
          dueDate: new Date(),
          items: [{ itemType: GymInvoiceItemType.PLAN_SUBSCRIPTION, description: "Plano", unitPriceInCents: 10000 }],
          discountInCents: 1000 // R$ 10,00
          // sem discountReason
        })
      ).rejects.toMatchObject({ code: "INVALID_AMOUNT" });
    });

    it("deve bloquear recepcionista ao conceder desconto acima da alçada permitida (ex: 20% > 10%) sem autorização", async () => {
      await expect(
        invoiceService.createInvoice({idempotencyKey: "fixture-4",
          workspaceId,
          actorUserId, // Recepcionista comum
          studentMemberId,
          title: "Mensalidade com Super Desconto",
          dueDate: new Date(),
          items: [{ itemType: GymInvoiceItemType.PLAN_SUBSCRIPTION, description: "Plano", unitPriceInCents: 10000 }],
          discountPercentage: 20, // 20% (limite na config é 10%)
          discountReason: "Amigo do recepcionista"
        })
      ).rejects.toMatchObject({ code: "INSUFFICIENT_PERMISSIONS" });
    });

    it("deve bloquear recepcionista ao conceder desconto absoluto acima do limite em centavos (ex: R$ 25 > R$ 20)", async () => {
      await expect(
        invoiceService.createInvoice({idempotencyKey: "fixture-5",
          workspaceId,
          actorUserId,
          studentMemberId,
          title: "Mensalidade com Desconto Acima do Teto em Cents",
          dueDate: new Date(),
          items: [{ itemType: GymInvoiceItemType.PLAN_SUBSCRIPTION, description: "Plano", unitPriceInCents: 30000 }],
          discountInCents: 2500, // R$ 25,00 (teto é R$ 20,00 mesmo que 2500/30000 = 8.3% < 10%)
          discountReason: "Desconto especial"
        })
      ).rejects.toMatchObject({ code: "INSUFFICIENT_PERMISSIONS" });
    });

    it("deve permitir recepcionista conceder desconto dentro da alçada com justificativa válida", async () => {
      mockPrisma.gymInvoice.create.mockImplementation(async ({ data }: any) => ({
        id: "inv-discount-ok",
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
        items: []
      }));

      const result = await invoiceService.createInvoice({idempotencyKey: "fixture-6",
        workspaceId,
        actorUserId,
        studentMemberId,
        title: "Mensalidade com Desconto Permitido",
        dueDate: new Date(),
        items: [{ itemType: GymInvoiceItemType.PLAN_SUBSCRIPTION, description: "Plano", unitPriceInCents: 10000 }],
        discountPercentage: 8, // 8% <= 10% e R$ 8,00 <= R$ 20,00
        discountReason: "Convênio empresa parceira"
      });

      expect(result.subtotalInCents).toBe(10000);
      expect(result.discountInCents).toBe(800);
      expect(result.totalInCents).toBe(9200);
      expect(result.balanceRemainingInCents).toBe(9200);
    });

    it("deve permitir desconto acima da alçada se o operador for Gerente ou Proprietário", async () => {
      mockPrisma.gymInvoice.create.mockImplementation(async ({ data }: any) => ({
        id: "inv-manager-discount",
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
        items: []
      }));

      const result = await invoiceService.createInvoice({idempotencyKey: "fixture-7",
        workspaceId,
        actorUserId: managerUserId, // Gerente
        studentMemberId,
        title: "Bolsa de Estudos / Cortesia Gerencial",
        dueDate: new Date(),
        items: [{ itemType: GymInvoiceItemType.PLAN_SUBSCRIPTION, description: "Plano", unitPriceInCents: 10000 }],
        discountPercentage: 50, // 50%
        discountReason: "Atleta patrocinado aprovado pela gerência"
      });

      expect(result.discountInCents).toBe(5000);
      expect(result.totalInCents).toBe(5000);
    });
  });

  describe("3. Pagamentos Presenciais e Anti-Sobrealocação", () => {
    it("deve registrar pagamento presencial com sucesso e quitar fatura integralmente", async () => {
      const initialInvoice = {studentMemberId, studentUserId, enrollmentId: null,
        id: "inv-200",
        workspaceId,
        invoiceNumber: "FAT-202609-001",
        title: "Mensalidade Setembro",
        status: GymInvoiceStatus.OPEN,
        subtotalInCents: BigInt(12000),
        discountInCents: BigInt(0),
        totalInCents: BigInt(12000),
        paidAmountInCents: BigInt(0),
        balanceRemainingInCents: BigInt(12000),
        payerName: "Lucas Moura",
        payerCpfCnpj: "12345678901",
        paidAt: null
      };

      mockPrisma.gymInvoice.findFirst.mockResolvedValue(initialInvoice);
      mockPrisma.gymPayment.findUnique.mockResolvedValue(null); // Sem idempotência duplicada

      mockPrisma.gymPayment.create.mockImplementation(async ({ data }: any) => ({
        id: "pay-501",
        ...data,
        paidAt: new Date(),
        createdAt: new Date(),
        receivedByUser: { name: "Carla Recepção", email: "carla@atlasfit.com" }
      }));

      mockPrisma.gymPaymentAllocation.create.mockImplementation(async ({ data }: any) => ({
        id: "alloc-1",
        ...data,
        createdAt: new Date()
      }));

      mockPrisma.gymInvoice.update.mockImplementation(async ({ data }: any) => ({
        ...initialInvoice,
        ...data
      }));

      mockPrisma.gymInvoice.findUnique.mockResolvedValue({
        ...initialInvoice,
        status: GymInvoiceStatus.PAID,
        enrollment: null
      });

      const paymentResult = await invoiceService.recordInPersonPayment({idempotencyKey: "fixture-8",financialAccountId: "account-internal",
        workspaceId,
        actorUserId,
        paymentMethod: GymInPersonPaymentMethod.EXTERNAL_POS_CREDIT,
        amountInCents: 12000,
        posCardBrand: "MASTERCARD",
        posAuthorizationCode: "AUTH9988",
        posNsu: "000123456",
        posTerminalId: "POS-BALCAO-01",
        allocations: [
          {
            invoiceId: "inv-200",
            amountInCents: 12000
          }
        ]
      });

      expect(paymentResult).toBeDefined();
      expect(paymentResult.amountInCents).toBe(12000);
      expect(paymentResult.paymentMethod).toBe(GymInPersonPaymentMethod.EXTERNAL_POS_CREDIT);
      expect(paymentResult.posCardBrand).toBe("MASTERCARD");
      expect(paymentResult.receiptNumber).toMatch(/^REC-2026\d{2}-[A-Z0-9]+$/);
      expect(mockPrisma.gymInvoice.update).toHaveBeenCalledWith({
        where: { id: "inv-200" },
        data: expect.objectContaining({
          paidAmountInCents: { increment: BigInt(12000) },
          balanceRemainingInCents: BigInt(0),
          status: GymInvoiceStatus.PAID,
        })
      });
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: expect.stringContaining("GYM_PAYMENT_RECORDED"),
        })
      });
    });

    it("deve barrar tentativa de sobrealocação (alocar valor maior que o saldo devedor restante)", async () => {
      const openInvoice = {studentMemberId, studentUserId, enrollmentId: null,
        id: "inv-201",
        workspaceId,
        invoiceNumber: "FAT-202609-002",
        status: GymInvoiceStatus.OPEN,
        totalInCents: BigInt(10000),
        paidAmountInCents: BigInt(0),
        balanceRemainingInCents: BigInt(10000), // Saldo devedor: R$ 100,00
      };

      mockPrisma.gymInvoice.findFirst.mockResolvedValue(openInvoice);
      mockPrisma.gymPayment.findUnique.mockResolvedValue(null);

      // Tenta pagar R$ 150,00 para uma fatura que só deve R$ 100,00
      await expect(
        invoiceService.recordInPersonPayment({idempotencyKey: "fixture-9",financialAccountId: "account-internal",
          workspaceId,
          actorUserId,
          paymentMethod: GymInPersonPaymentMethod.CASH,
          amountInCents: 15000,
          allocations: [
            {
              invoiceId: "inv-201",
              amountInCents: 15000 // Excede 10000!
            }
          ]
        })
      ).rejects.toMatchObject({ code: "INVOICE_OVERALLOCATION" });
    });

    it("deve barrar divergência entre o total pago e a soma das alocações", async () => {
      await expect(
        invoiceService.recordInPersonPayment({idempotencyKey: "fixture-10",financialAccountId: "account-internal",
          workspaceId,
          actorUserId,
          paymentMethod: GymInPersonPaymentMethod.CASH,
          amountInCents: 10000, // Informou que recebeu 100
          allocations: [
            {
              invoiceId: "inv-202",
              amountInCents: 7000 // Mas só alocou 70
            }
          ]
        })
      ).rejects.toMatchObject({ code: "ALLOCATION_AMOUNT_MISMATCH" });
    });

    it("deve suportar pagamento parcial e posterior quitação em 2 etapas", async () => {
      const invoice = {studentMemberId, studentUserId, enrollmentId: null,
        id: "inv-partial",
        workspaceId,
        invoiceNumber: "FAT-202609-PARTIAL",
        status: GymInvoiceStatus.OPEN,
        totalInCents: BigInt(20000), // R$ 200,00
        paidAmountInCents: BigInt(0),
        balanceRemainingInCents: BigInt(20000),
        payerName: "Aluno Flex",
        paidAt: null
      };

      mockPrisma.gymInvoice.findFirst.mockResolvedValue(invoice);
      mockPrisma.gymPayment.findUnique.mockResolvedValue(null);

      mockPrisma.gymPayment.create.mockImplementation(async ({ data }: any) => ({
        id: "pay-step-1",
        ...data,
        paidAt: new Date(),
        createdAt: new Date(),
        receivedByUser: { name: "Carla" }
      }));
      mockPrisma.gymPaymentAllocation.create.mockResolvedValue({ id: "alloc-step-1" });
      mockPrisma.gymInvoice.findUnique.mockResolvedValue(invoice);

      // Etapa 1: Paga R$ 80,00
      await invoiceService.recordInPersonPayment({idempotencyKey: "fixture-11",financialAccountId: "account-internal",
        workspaceId,
        actorUserId,
        paymentMethod: GymInPersonPaymentMethod.CASH,
        amountInCents: 8000,
        allocations: [{ invoiceId: "inv-partial", amountInCents: 8000 }]
      });

      expect(mockPrisma.gymInvoice.update).toHaveBeenCalledWith({
        where: { id: "inv-partial" },
        data: expect.objectContaining({
          paidAmountInCents: { increment: BigInt(8000) },
          balanceRemainingInCents: BigInt(12000),
          status: GymInvoiceStatus.PARTIALLY_PAID
        })
      });

      // Etapa 2: Paga os R$ 120,00 restantes
      const partiallyPaidInvoice = {
        ...invoice,
        status: GymInvoiceStatus.PARTIALLY_PAID,
        paidAmountInCents: BigInt(8000),
        balanceRemainingInCents: BigInt(12000)
      };
      mockPrisma.gymInvoice.findFirst.mockResolvedValue(partiallyPaidInvoice);
      mockPrisma.gymInvoice.findUnique.mockResolvedValue(partiallyPaidInvoice);

      await invoiceService.recordInPersonPayment({idempotencyKey: "fixture-12",financialAccountId: "account-internal",
        workspaceId,
        actorUserId,
        paymentMethod: GymInPersonPaymentMethod.BANK_TRANSFER_MANUAL,
        amountInCents: 12000,
        bankTransferTransactionId: "PIX-E2E-12345678",
        allocations: [{ invoiceId: "inv-partial", amountInCents: 12000 }]
      });

      expect(mockPrisma.gymInvoice.update).toHaveBeenCalledWith({
        where: { id: "inv-partial" },
        data: expect.objectContaining({
          paidAmountInCents: { increment: BigInt(12000) },
          balanceRemainingInCents: BigInt(0),
          status: GymInvoiceStatus.PAID
        })
      });
    });
  });

  describe("4. Idempotência e Proteção contra Reenvio Duplicado", () => {
    it("deve retornar o pagamento existente se o idempotencyKey for idêntico sem duplicar registros", async () => {
      const existing = {
        id: "pay-existing-idem",
        workspaceId,
        paymentNumber: "PAG-202609-EXIST",
        receiptNumber: "REC-202609-EXIST",
        idempotencyKey: "idem-key-duplicate-test",
        amountInCents: BigInt(10000),
        paymentMethod: GymInPersonPaymentMethod.CASH,
        status: GymPaymentStatus.CONFIRMED,
        payerName: "Aluno", requestFingerprint: "6af0323d708042eb9f8e5ee03eba2dee7365536decde658e26db1719f96c681f",
        allocations: [{ invoice: { workspaceId, studentMemberId, studentUserId, enrollmentId: null } }]
      };

      mockPrisma.gymPayment.findUnique.mockResolvedValue(existing);

      const res = await invoiceService.recordInPersonPayment({financialAccountId: "account-internal",
        workspaceId,
        actorUserId,
        idempotencyKey: "idem-key-duplicate-test",
        paymentMethod: GymInPersonPaymentMethod.CASH,
        amountInCents: 10000,
        allocations: [{ invoiceId: "inv-any", amountInCents: 10000 }]
      });

      expect(res.id).toBe("pay-existing-idem");
      expect(mockPrisma.gymPayment.create).not.toHaveBeenCalled();
      expect(mockPrisma.gymInvoice.update).not.toHaveBeenCalled();
    });
  });

  describe("5. Reversão / Estorno com Justificativa e Restauração de Saldo", () => {
    it("deve exigir justificativa obrigatória para estorno de pagamento", async () => {
      await expect(
        invoiceService.reversePayment({
          workspaceId,
          paymentId: "pay-to-reverse",
          actorUserId: managerUserId,
          reversalReason: "   " // vazio
        })
      ).rejects.toMatchObject({ code: "REVERSAL_REASON_REQUIRED" });
    });

    it("deve estornar pagamento com sucesso, atualizar alocações para REVERSED e reabrir faturas", async () => {
      const paymentToReverse = {
        id: "pay-to-reverse",
        workspaceId,
        paymentNumber: "PAG-202609-REV", financialAccountId: "account-internal", paymentMethod: GymInPersonPaymentMethod.EXTERNAL_POS_CREDIT,
        amountInCents: BigInt(15000),
        status: GymPaymentStatus.CONFIRMED,
        allocations: [
          {
            id: "alloc-to-rev", status: "ACTIVE",
            allocatedAmountInCents: BigInt(15000),
            invoice: {
              id: "inv-reversed-target", workspaceId, studentMemberId, studentUserId, enrollmentId: null,
              paidAmountInCents: BigInt(15000),
              balanceRemainingInCents: BigInt(0),
              status: GymInvoiceStatus.PAID
            }
          }
        ]
      };

      mockPrisma.gymPayment.findFirst.mockResolvedValue(paymentToReverse);
      mockPrisma.gymPayment.update.mockImplementation(async ({ data }: any) => ({
        ...paymentToReverse,
        ...data
      }));

      const reversedResult = await invoiceService.reversePayment({
        workspaceId,
        paymentId: "pay-to-reverse",
        actorUserId: managerUserId,
        reversalReason: "Erro de digitação do valor na maquininha externa"
      });

      expect(reversedResult.status).toBe(GymPaymentStatus.REVERSED);
      expect(reversedResult.reversalReason).toBe("Erro de digitação do valor na maquininha externa");

      // Deve reverter alocação
      expect(mockPrisma.gymPaymentAllocation.update).toHaveBeenCalledWith({
        where: { id: "alloc-to-rev" },
        data: { status: GymAllocationStatus.REVERSED }
      });

      // Deve restaurar dívida na fatura
      expect(mockPrisma.gymInvoice.update).toHaveBeenCalledWith({
        where: { id: "inv-reversed-target" },
        data: expect.objectContaining({
          paidAmountInCents: BigInt(0),
          balanceRemainingInCents: BigInt(15000),
          status: GymInvoiceStatus.OPEN,
          paidAt: null
        })
      });

      // Auditoria
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: expect.stringContaining("GYM_PAYMENT_REVERSED"),
          severity: "warning"
        })
      });
    });

    it("replay de reversão conserva o pagamento sem nova baixa", async () => {
      mockPrisma.gymPayment.findFirst.mockResolvedValue({
        id: "pay-already-rev",
        workspaceId,
        status: GymPaymentStatus.REVERSED,
        allocations: [{ invoice: { workspaceId, studentMemberId, studentUserId, enrollmentId: null } }]
      });

      const result = await invoiceService.reversePayment({
          workspaceId,
          paymentId: "pay-already-rev",
          actorUserId: managerUserId,
          reversalReason: "Nova tentativa"
        });
      expect(result.status).toBe("REVERSED");
      expect(mockPrisma.gymPayment.update).not.toHaveBeenCalled();
      expect(mockPrisma.gymInvoice.update).not.toHaveBeenCalled();
    });
  });

  describe("6. Emissão de Recibo Comprovatório e Disclaimer Fiscal Legal", () => {
    it("deve gerar recibo completo com dados do operador, verificação de maquininha e advertência fiscal obrigatória", async () => {
      const paymentWithReceipt = {
        id: "pay-receipt-1",
        workspaceId,
        paymentNumber: "PAG-202609-REC1",
        receiptNumber: "REC-202609-REC1",
        amountInCents: BigInt(19900),
        paymentMethod: GymInPersonPaymentMethod.EXTERNAL_POS_DEBIT,
        status: GymPaymentStatus.CONFIRMED,
        payerName: "Renata Vasconcelos",
        payerCpfCnpj: "98765432100",
        posCardBrand: "ELO",
        posAuthorizationCode: "ELO7788",
        posNsu: "9988776655",
        posTerminalId: "TERM-04",
        taxDisclaimer: "Este documento é um recibo comprobatório de pagamento e não substitui o documento fiscal (NFS-e/NFC-e)",
        paidAt: new Date("2026-09-25T14:30:00Z"),
        receivedByUser: { name: "Carla Recepção", email: "carla@atlasfit.com" },
        reversedByUser: null,
        allocations: [
          {
            allocatedAmountInCents: BigInt(19900),
            status: GymAllocationStatus.ACTIVE,
            invoice: {
              id: "inv-r1",
              invoiceNumber: "FAT-202609-R1",
              title: "Plano Anual Flex",
              studentMember: {
                user: { name: "Renata Vasconcelos", cpfCnpj: "98765432100" }
              }
            }
          }
        ]
      };

      mockPrisma.gymPayment.findFirst.mockResolvedValue(paymentWithReceipt);

      const receipt = await invoiceService.getPaymentReceipt(workspaceId, "pay-receipt-1", actorUserId);

      expect(receipt).toBeDefined();
      expect(receipt.receiptNumber).toBe("REC-202609-REC1");
      expect(receipt.amountInCents).toBe(19900);
      expect(receipt.payer.name).toBe("Renata Vasconcelos");
      expect(receipt.payer.cpfCnpjMasked).toBe("***.***.2100");
      expect(receipt.operator.name).toBe("Carla Recepção");
      expect(receipt.verificationDetails.posCardBrand).toBe("ELO");
      expect(receipt.verificationDetails.posAuthorizationCode).toBe("ELO7788");
      expect(receipt.verificationDetails.posNsu).toBe("9988776655");
      expect(receipt.allocations).toHaveLength(1);
      expect(receipt.allocations[0].invoiceNumber).toBe("FAT-202609-R1");
      // Disclaimer fiscal legal indispensável
      expect(receipt.taxDisclaimer).toContain("Este documento é um recibo comprobatório de pagamento e não substitui o documento fiscal");
    });
  });

  describe("7. Integração com Liberação Automática de Catraca / Matrícula", () => {
    it("baixa integral não ativa matrícula sem o comando próprio", async () => {
      const invoice = {studentMemberId, studentUserId, enrollmentId: null,
        id: "inv-enr-auto",
        workspaceId,
        invoiceNumber: "FAT-AUTO-01",
        status: GymInvoiceStatus.OPEN,
        totalInCents: BigInt(10000),
        paidAmountInCents: BigInt(0),
        balanceRemainingInCents: BigInt(10000),
        payerName: "Aluno",
        paidAt: null
      };

      mockPrisma.gymInvoice.findFirst.mockResolvedValue(invoice);
      mockPrisma.gymPayment.findUnique.mockResolvedValue(null);
      mockPrisma.gymPayment.create.mockResolvedValue({
        id: "pay-auto",
        amountInCents: BigInt(10000),
        paymentMethod: GymInPersonPaymentMethod.CASH,
        status: GymPaymentStatus.CONFIRMED,
        paymentNumber: "PAG-1",
        receiptNumber: "REC-1"
      });
      mockPrisma.gymPaymentAllocation.create.mockResolvedValue({ id: "alloc-auto" });

      // Ao buscar fatura pós-pagamento:
      mockPrisma.gymInvoice.findUnique.mockResolvedValue({
        ...invoice,
        status: GymInvoiceStatus.PAID,
        enrollment: {
          id: "enr-to-activate",
          status: GymEnrollmentStatus.PENDING_ACTIVATION,
          acceptance: { id: "acc-1", acceptedAt: new Date() }
        }
      });

      await invoiceService.recordInPersonPayment({idempotencyKey: "fixture-13",financialAccountId: "account-internal",
        workspaceId,
        actorUserId,
        paymentMethod: GymInPersonPaymentMethod.CASH,
        amountInCents: 10000,
        allocations: [{ invoiceId: "inv-enr-auto", amountInCents: 10000 }]
      });

      expect(mockEnrollmentService.activateEnrollment).not.toHaveBeenCalled();
    });
  });
});
