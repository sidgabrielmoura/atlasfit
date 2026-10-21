import { seedGymAuthority } from "./gym-test-authority";
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  GymFinancialAccountType,
  GymExpenseStatus,
  GymCashDrawerStatus,
  GymCashMovementType,
  GymInPersonPaymentMethod,
  GymPaymentStatus,
  GymAllocationStatus,
  GymInvoiceStatus
} from "@prisma/client";

// Mock do prisma hoisted
const { mockPrisma } = vi.hoisted(() => {
  const mock: any = {
    gymFinancialAccount: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn()
    },
    gymAccountTransfer: {
      create: vi.fn()
    },
    gymExpenseCategory: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn()
    },
    gymSupplier: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn()
    },
    gymExpense: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn()
    },
    gymCashDrawerSession: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn()
    },
    gymCashDrawerMovement: {
      create: vi.fn(),
      findMany: vi.fn()
    },
    gymPayment: {
      findUnique: vi.fn(),
      create: vi.fn()
    },
    gymPaymentAllocation: {
      create: vi.fn()
    },
    gymInvoice: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn()
    },
    gymSettings: {
      findUnique: vi.fn()
    },
    workspaceMember: {
      findFirst: vi.fn()
    },
    auditLog: {
      create: vi.fn()
    }
  };
  mock.$transaction = vi.fn(async (cb: any) => cb(mock));
  return { mockPrisma: mock };
});

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
  default: mockPrisma
}));

vi.mock("@/lib/ably", () => ({
  publishToChannel: vi.fn().mockResolvedValue(undefined)
}));

import { gymCashExpenseService } from "../application/cash-drawer-expense-service";
import { gymInvoiceService } from "../application/invoice-service";

describe("GYM-043: Despesas, Contas Financeiras e Caixa da Recepção", () => {
  const workspaceId = "ws-alpha-123";
  const actorUserId = "user-receptionist-1";
  const managerUserId = "user-manager-1";
  const defaultCashAccountId = "acc-cash-balcao-1";

  beforeEach(() => {
    vi.resetAllMocks();
    mockPrisma.gymAccountTransfer.findUnique = vi.fn().mockResolvedValue(null);
    mockPrisma.gymAccountTransfer.create.mockImplementation(async ({ data }: any) => ({ id: "transfer-1", ...data }));
    mockPrisma.gymCashDrawerMovement.findUnique = vi.fn().mockResolvedValue(null);
    mockPrisma.gymCashDrawerMovement.update = vi.fn();
    mockPrisma.gymExpense.findUnique = vi.fn().mockResolvedValue(null);
    mockPrisma.gymExpensePayment = { findUnique: vi.fn().mockResolvedValue(null), create: vi.fn().mockImplementation(async ({data}: any) => ({id: "expense-payment-1", ...data})) };
    mockPrisma.gymFinancialAccount.findFirst.mockImplementation(async ({where}: any) => ({ id: where.id || defaultCashAccountId, workspaceId, unitId: null, accountType: where.id === "acc-safe-1" ? "SAFE_RESERVE" : "CASH", balanceInCents: BigInt(100000), isActive: true }));
    mockPrisma.gymInvoice.findMany = vi.fn(async () => [await mockPrisma.gymInvoice.findFirst({})]);
    mockPrisma.gymPayment.findUniqueOrThrow = vi.fn(async () => await mockPrisma.gymPayment.create.mock.results.at(-1).value);
    seedGymAuthority(mockPrisma, "ws-alpha-123", "user-owner", {"user-receptionist-1":"RECEPTIONIST","user-manager-1":"MANAGER"});
    mockPrisma.$transaction.mockImplementation(async (cb: any) => cb(mockPrisma));
  });

  describe("1. Contas Financeiras e Transferências Neutras", () => {
    it("deve criar uma conta financeira com saldo inicial e registrar auditoria", async () => {
      const createdAcc = {unitId: null,
        id: "acc-bank-itau-1",
        workspaceId,
        name: "Itaú Conta Corrente",
        accountType: GymFinancialAccountType.BANK_ACCOUNT,
        balanceInCents: BigInt(500000), // R$ 5.000,00
        initialBalanceInCents: BigInt(500000),
        currency: "BRL",
        bankName: "Itaú Unibanco",
        agencyNumber: "1234",
        accountNumber: "56789-0",
        isDefault: false,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockPrisma.gymFinancialAccount.create.mockResolvedValue(createdAcc);

      const result = await gymCashExpenseService.createFinancialAccount({
        workspaceId,
        name: "Itaú Conta Corrente",
        accountType: GymFinancialAccountType.BANK_ACCOUNT,
        initialBalanceInCents: 500000,
        bankName: "Itaú Unibanco",
        agencyNumber: "1234",
        accountNumber: "56789-0",
        actorUserId
      });

      expect(result.id).toBe("acc-bank-itau-1");
      expect(result.balanceInCents).toBe(500000);
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: actorUserId,
            action: expect.stringContaining("GYM_ACCOUNT_CREATED")
          })
        })
      );
    });

    it("deve realizar transferência interna debitando origem e creditando destino sem gerar receita ou despesa", async () => {
      const fromAccount = {unitId: null,
        id: "acc-cash-1",
        workspaceId,
        name: "Caixa Balcão",
        balanceInCents: BigInt(150000), // R$ 1.500,00
        isActive: true
      };

      const toAccount = {unitId: null,
        id: "acc-safe-1",
        workspaceId,
        name: "Cofre Central",
        balanceInCents: BigInt(1000000), // R$ 10.000,00
        isActive: true
      };

      mockPrisma.gymFinancialAccount.findFirst
        .mockResolvedValueOnce(fromAccount)
        .mockResolvedValueOnce(toAccount);

      mockPrisma.gymAccountTransfer.create.mockResolvedValue({
        id: "transf-1",
        workspaceId,
        fromAccountId: fromAccount.id,
        toAccountId: toAccount.id,
        amountInCents: BigInt(100000), // R$ 1.000,00
        transferredAt: new Date()
      });

      const result = await gymCashExpenseService.transferBetweenAccounts({
        idempotencyKey: "legacy-test-4816",
        workspaceId,
        fromAccountId: fromAccount.id,
        toAccountId: toAccount.id,
        amountInCents: 100000,
        performedByUserId: actorUserId
      });

      expect(result.amountInCents).toBe(100000);
      expect(mockPrisma.gymFinancialAccount.update).toHaveBeenCalledWith({
        where: { id: fromAccount.id },
        data: { balanceInCents: { decrement: BigInt(100000) } }
      });
      expect(mockPrisma.gymFinancialAccount.update).toHaveBeenCalledWith({
        where: { id: toAccount.id },
        data: { balanceInCents: { increment: BigInt(100000) } }
      });
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: expect.stringContaining("GYM_ACCOUNT_TRANSFER")
          })
        })
      );
    });

    it("deve barrar transferência caso o saldo da conta de origem seja insuficiente", async () => {
      const fromAccount = {unitId: null,
        id: "acc-cash-1",
        workspaceId,
        name: "Caixa Balcão",
        balanceInCents: BigInt(20000), // R$ 200,00
        isActive: true
      };

      const toAccount = {unitId: null,
        id: "acc-bank-1",
        workspaceId,
        name: "Banco",
        balanceInCents: BigInt(50000),
        isActive: true
      };

      mockPrisma.gymFinancialAccount.findFirst
        .mockResolvedValueOnce(fromAccount)
        .mockResolvedValueOnce(toAccount);

      await expect(
        gymCashExpenseService.transferBetweenAccounts({
        idempotencyKey: "legacy-test-6333",
          workspaceId,
          fromAccountId: fromAccount.id,
          toAccountId: toAccount.id,
          amountInCents: 50000, // R$ 500,00 > R$ 200,00
          performedByUserId: actorUserId
        })
      ).rejects.toThrow("Saldo insuficiente");
    });
  });

  describe("2. Abertura e Movimentações de Caixa (Suprimento e Sangria)", () => {
    it("deve abrir caixa com fundo de troco e criar movimento de abertura", async () => {
      mockPrisma.gymCashDrawerSession.findFirst.mockResolvedValue(null); // Nenhum caixa aberto
      mockPrisma.gymFinancialAccount.findFirst.mockResolvedValue({unitId: null,
        id: defaultCashAccountId,
        workspaceId,
        name: "Caixa Recepção",
        accountType: GymFinancialAccountType.CASH,
        isActive: true
      });

      mockPrisma.gymCashDrawerSession.create.mockImplementation(async ({ data }: any) => ({
        id: "session-1", status: "OPEN",
        openedAt: new Date(),
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
      }));

      const result = await gymCashExpenseService.openCashDrawer({
        workspaceId,
        openingAmountInCents: 15000, // R$ 150,00
        openedByUserId: actorUserId
      });

      expect(result.id).toBe("session-1");
      expect(result.status).toBe(GymCashDrawerStatus.OPEN);
      expect(result.openingAmountInCents).toBe(15000);

      expect(mockPrisma.gymCashDrawerMovement.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          sessionId: "session-1",
          movementType: GymCashMovementType.OPENING,
          amountInCents: BigInt(15000)
        })
      });
    });

    it("deve barrar tentativa de abrir nova sessão caso o operador já possua caixa aberto", async () => {
      mockPrisma.gymCashDrawerSession.findFirst.mockResolvedValue({openedByUserId: actorUserId,
        id: "session-open-1",
        sessionNumber: "CX-202609-XYZ123",
        status: GymCashDrawerStatus.OPEN
      });

      await expect(
        gymCashExpenseService.openCashDrawer({
          workspaceId,
          openingAmountInCents: 10000,
          openedByUserId: actorUserId
        })
      ).rejects.toMatchObject({ code: "CASH_DRAWER_ALREADY_OPEN" });
    });

    it("deve registrar suprimento e sangria de caixa atualizando a conta financeira", async () => {
      const openSession = {openingAmountInCents: BigInt(100000),movements: [],unitId: null,openedByUserId: actorUserId,
        id: "session-1",
        workspaceId,
        financialAccountId: defaultCashAccountId,
        sessionNumber: "CX-202609-001",
        status: GymCashDrawerStatus.OPEN,
        financialAccount: { id: defaultCashAccountId, name: "Caixa Balcão" }
      };

      mockPrisma.gymCashDrawerSession.findFirst.mockResolvedValue(openSession);

      // Suprimento de R$ 50,00
      mockPrisma.gymCashDrawerMovement.create.mockImplementation(async ({ data }: any) => ({
        id: "mov-sup-1",
        ...data,
        createdAt: new Date()
      }));

      const supply = await gymCashExpenseService.recordCashMovement({
        idempotencyKey: "legacy-test-9274",
        workspaceId,
        sessionId: "session-1",
        movementType: "SUPPLY",
        amountInCents: 5000,
        description: "Adição de troco em moedas",
        performedByUserId: actorUserId
      });

      expect(supply.movementType).toBe("SUPPLY");
      expect(mockPrisma.gymFinancialAccount.update).toHaveBeenCalledWith({
        where: { id: defaultCashAccountId },
        data: { balanceInCents: { increment: BigInt(5000) } }
      });

      // Sangria de R$ 100,00 com destino ao cofre
      mockPrisma.gymCashDrawerMovement.create.mockImplementation(async ({ data }: any) => ({
        id: "mov-bld-1",
        ...data,
        createdAt: new Date()
      }));

      const bleed = await gymCashExpenseService.recordCashMovement({
        idempotencyKey: "legacy-test-10028",
        workspaceId,
        sessionId: "session-1",
        movementType: "BLEED",
        amountInCents: 10000,
        description: "Retirada de excesso para cofre",
        destinationAccountId: "acc-safe-1",
        performedByUserId: actorUserId
      });

      expect(bleed.movementType).toBe("BLEED");
      expect(mockPrisma.gymFinancialAccount.update).toHaveBeenCalledWith({
        where: { id: defaultCashAccountId },
        data: { balanceInCents: { decrement: BigInt(10000) } }
      });
      // Verifica transferência patrimonial neutra automática vinculada à sangria
      expect(mockPrisma.gymAccountTransfer.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          fromAccountId: defaultCashAccountId,
          toAccountId: "acc-safe-1",
          amountInCents: BigInt(10000)
        })
      });
    });

    it("deve barrar movimentações caso a sessão de caixa já esteja fechada (invariante do aceite)", async () => {
      mockPrisma.gymCashDrawerSession.findFirst.mockResolvedValue({openedByUserId: actorUserId,financialAccountId: defaultCashAccountId,openingAmountInCents: BigInt(100000),movements: [],unitId: null,
        id: "session-closed-1",
        workspaceId,
        status: GymCashDrawerStatus.CLOSED
      });

      await expect(
        gymCashExpenseService.recordCashMovement({
        idempotencyKey: "legacy-test-11241",
          workspaceId,
          sessionId: "session-closed-1",
          movementType: "SUPPLY",
          amountInCents: 5000,
          performedByUserId: actorUserId
        })
      ).rejects.toMatchObject({ code: "CASH_DRAWER_CLOSED" });
    });
  });

  describe("3. Fechamento de Caixa e Conferência de Divergências", () => {
    it("deve fechar caixa com sucesso quando saldo contado bate exatamente com o esperado", async () => {
      const session = {financialAccountId: defaultCashAccountId,unitId: null,openedByUserId: actorUserId,
        id: "session-1",
        workspaceId,
        sessionNumber: "CX-202609-001",
        status: GymCashDrawerStatus.OPEN,
        openingAmountInCents: BigInt(10000), // R$ 100,00
        movements: [
          { movementType: GymCashMovementType.SUPPLY, amountInCents: BigInt(5000) }, // +50
          { movementType: GymCashMovementType.CASH_INFLOW_PAYMENT, amountInCents: BigInt(12900) }, // +129
          { movementType: GymCashMovementType.BLEED, amountInCents: BigInt(7900) } // -79
        ]
        // Esperado = 100 + 50 + 129 - 79 = R$ 200,00 (20000 cents)
      };

      mockPrisma.gymCashDrawerSession.findFirst.mockResolvedValue(session);
      mockPrisma.gymCashDrawerSession.update.mockImplementation(async ({ data }: any) => ({
        ...session,
        ...data
      }));

      const result = await gymCashExpenseService.closeCashDrawer({
        workspaceId,
        sessionId: "session-1",
        actualCashInCents: 20000, // Contado exatamente R$ 200,00
        closedByUserId: actorUserId
      });

      expect(result.status).toBe(GymCashDrawerStatus.CLOSED);
      expect(result.expectedCashInCents).toBe(20000);
      expect(result.actualCashInCents).toBe(20000);
      expect(result.differenceInCents).toBe(0);
      expect(result.differenceReason).toBeNull();

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            severity: "info",
            action: expect.stringContaining("GYM_CASH_DRAWER_CLOSED")
          })
        })
      );
    });

    it("deve barrar fechamento com divergência caso a justificativa não seja informada (aceite obrigatório)", async () => {
      const session = {openedByUserId: actorUserId,financialAccountId: defaultCashAccountId,unitId: null,
        id: "session-1",
        workspaceId,
        status: GymCashDrawerStatus.OPEN,
        openingAmountInCents: BigInt(10000),
        movements: [] // Esperado = 10000
      };

      mockPrisma.gymCashDrawerSession.findFirst.mockResolvedValue(session);

      // Contado 9000 (Falta de R$ 10,00) sem justificativa
      await expect(
        gymCashExpenseService.closeCashDrawer({
          workspaceId,
          sessionId: "session-1",
          actualCashInCents: 9000,
          differenceReason: "",
          closedByUserId: actorUserId
        })
      ).rejects.toMatchObject({ code: "CASH_DRAWER_DIFFERENCE_REASON_REQUIRED" });
    });

    it("deve fechar com divergência justificada e registrar alerta de auditoria", async () => {
      const session = {financialAccountId: defaultCashAccountId,unitId: null,openedByUserId: actorUserId,
        id: "session-1",
        workspaceId,
        sessionNumber: "CX-202609-001",
        status: GymCashDrawerStatus.OPEN,
        openingAmountInCents: BigInt(10000),
        movements: [] // Esperado = 10000
      };

      mockPrisma.gymCashDrawerSession.findFirst.mockResolvedValue(session);
      mockPrisma.gymCashDrawerSession.update.mockImplementation(async ({ data }: any) => ({
        ...session,
        ...data
      }));

      const result = await gymCashExpenseService.closeCashDrawer({
        workspaceId,
        sessionId: "session-1",
        actualCashInCents: 9500, // Falta de R$ 5,00
        differenceReason: "Diferença em moedas de troco conferida com cliente",
        closedByUserId: actorUserId
      });

      expect(result.status).toBe(GymCashDrawerStatus.CLOSED);
      expect(result.differenceInCents).toBe(-500);
      expect(result.differenceReason).toBe("Diferença em moedas de troco conferida com cliente");

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            severity: "warning",
            action: expect.stringContaining("difference=-500")
          })
        })
      );
    });

    it("deve permitir que o gerente faça a reconciliação e auditoria da sessão fechada", async () => {
      mockPrisma.gymCashDrawerSession.findFirst.mockResolvedValue({financialAccountId: defaultCashAccountId,openingAmountInCents: BigInt(100000),movements: [],unitId: null,openedByUserId: actorUserId,
        id: "session-1",
        workspaceId,
        sessionNumber: "CX-202609-001",
        status: GymCashDrawerStatus.CLOSED
      });

      mockPrisma.gymCashDrawerSession.update.mockImplementation(async ({ data }: any) => ({openedByUserId: actorUserId,
        id: "session-1",
        sessionNumber: "CX-202609-001",
        ...data
      }));

      const result = await gymCashExpenseService.reconcileCashDrawer({
        workspaceId,
        sessionId: "session-1",
        reconciliationNotes: "Conferido envelopes no cofre. Aprovado.",
        reconciledByUserId: managerUserId
      });

      expect(result.status).toBe(GymCashDrawerStatus.RECONCILED);
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: expect.stringContaining("GYM_CASH_DRAWER_RECONCILED")
          })
        })
      );
    });
  });

  describe("4. Despesas e Contas a Pagar", () => {
    it("deve registrar obrigação a pagar com status PENDING e competência", async () => {
      mockPrisma.gymExpenseCategory.findFirst.mockResolvedValue({
        id: "cat-luz-1",
        name: "Energia Elétrica",
        workspaceId
      });

      mockPrisma.gymSupplier.findFirst.mockResolvedValue({
        id: "sup-enel-1",
        tradeName: "Enel Distribuição",
        workspaceId
      });

      mockPrisma.gymExpense.create.mockImplementation(async ({ data }: any) => ({
        id: "exp-1",
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
      }));

      const result = await gymCashExpenseService.createExpense({idempotencyKey: "operation-1",
        workspaceId,
        categoryId: "cat-luz-1",
        supplierId: "sup-enel-1",
        title: "Conta de Luz - Setembro/2026",
        documentNumber: "FAT-ENEL-8899",
        amountInCents: 185000, // R$ 1.850,00
        dueDate: new Date("2026-10-10"),
        competenceMonth: "2026-09",
        actorUserId
      });

      expect(result.id).toBe("exp-1");
      expect(result.status).toBe(GymExpenseStatus.PENDING);
      expect(result.amountInCents).toBe(185000);
      expect(mockPrisma.auditLog.create).toHaveBeenCalled();
    });

    it("deve quitar despesa pendente debitando da conta financeira informada", async () => {
      mockPrisma.gymExpense.findFirst.mockResolvedValue({paidAmountInCents: BigInt(0),penaltyInCents: BigInt(0),discountInCents: BigInt(0),dueDate: new Date("2026-10-10"),unitId: null,
        id: "exp-1",
        workspaceId,
        title: "Conta de Luz",
        amountInCents: BigInt(185000),
        status: GymExpenseStatus.PENDING
      });

      mockPrisma.gymFinancialAccount.findFirst.mockResolvedValue({unitId: null,
        id: "acc-bank-1",
        workspaceId,
        name: "Itaú Corrente",
        accountType: GymFinancialAccountType.BANK_ACCOUNT,
        balanceInCents: BigInt(5000000),
        isActive: true
      });

      mockPrisma.gymExpense.update.mockImplementation(async ({ data }: any) => ({
        id: "exp-1",
        paidAmountInCents: BigInt(185000),
        paidAt: new Date(),
        status: GymExpenseStatus.PAID,
        ...data
      }));

      const result = await gymCashExpenseService.payExpense({idempotencyKey: "operation-2",
        workspaceId,
        expenseId: "exp-1",
        financialAccountId: "acc-bank-1",
        paidAmountInCents: 185000,
        paymentMethod: "BOLETO",
        actorUserId
      });

      expect(result.status).toBe(GymExpenseStatus.PAID);
      expect(result.paidAmountInCents).toBe(185000);

      // Verifica débito na conta bancária
      expect(mockPrisma.gymFinancialAccount.update).toHaveBeenCalledWith({
        where: { id: "acc-bank-1" },
        data: { balanceInCents: { decrement: BigInt(185000) } }
      });
    });

    it("deve cancelar despesa pendente com justificativa e rejeitar sem justificativa", async () => {
      mockPrisma.gymExpense.findFirst.mockResolvedValue({paidAmountInCents: BigInt(0),penaltyInCents: BigInt(0),discountInCents: BigInt(0),dueDate: new Date("2026-10-10"),unitId: null,
        id: "exp-1",
        workspaceId,
        title: "Manutenção Ar Condicionado",
        status: GymExpenseStatus.PENDING
      });

      // Sem justificativa
      await expect(
        gymCashExpenseService.cancelExpense({
          workspaceId,
          expenseId: "exp-1",
          cancellationReason: "",
          actorUserId
        })
      ).rejects.toMatchObject({ code: "INVALID_REQUEST" });

      // Com justificativa válida
      mockPrisma.gymExpense.update.mockResolvedValue({
        id: "exp-1",
        status: GymExpenseStatus.CANCELLED,
        cancelledAt: new Date()
      });

      const result = await gymCashExpenseService.cancelExpense({
        workspaceId,
        expenseId: "exp-1",
        cancellationReason: "Serviço cancelado pelo fornecedor",
        actorUserId
      });

      expect(result.status).toBe(GymExpenseStatus.CANCELLED);
    });
  });

  describe("5. Integração com Pagamento Presencial (CASH)", () => {
    it("deve associar recebimento em dinheiro à sessão de caixa aberta do operador", async () => {
      const openSession = {openingAmountInCents: BigInt(100000),movements: [],unitId: null,
        id: "session-balcao-1",
        workspaceId,
        financialAccountId: defaultCashAccountId,
        status: GymCashDrawerStatus.OPEN,
        openedByUserId: actorUserId
      };

      mockPrisma.gymCashDrawerSession.findFirst.mockResolvedValue(openSession);

      const mockInv = {unitId: null,payments: [],
        studentMemberId: "student-member", studentUserId: "student-user", enrollmentId: null,
        id: "inv-1",
        workspaceId,
        invoiceNumber: "FAT-001",
        status: GymInvoiceStatus.OPEN,
        balanceRemainingInCents: BigInt(12900),
        paidAmountInCents: BigInt(0),
        totalInCents: BigInt(12900),
        payerName: "Aluno Lucas",
        enrollment: null
      };

      mockPrisma.gymInvoice.findFirst.mockResolvedValue(mockInv);
      mockPrisma.workspaceMember.findFirst.mockResolvedValue({ id: "student-member", userId: "student-user", unitId: null });
      mockPrisma.gymInvoice.findUnique.mockResolvedValue(mockInv);

      mockPrisma.gymPaymentAllocation.create.mockImplementation(async ({ data }: any) => ({
        id: "alloc-1",
        ...data,
        invoice: mockInv
      }));

      mockPrisma.gymPayment.create.mockImplementation(async ({ data }: any) => ({
        id: "pay-1",
        ...data,
        allocations: []
      }));

      const payment = await gymInvoiceService.recordInPersonPayment({idempotencyKey: "operation-3",
        workspaceId,
        actorUserId,
        paymentMethod: GymInPersonPaymentMethod.CASH,
        amountInCents: 12900,
        allocations: [{ invoiceId: "inv-1", amountInCents: 12900 }],
        payerName: "Aluno Lucas"
      });

      expect(payment).toBeDefined();

      // Verifica que o pagamento gravou cashDrawerSessionId
      expect(mockPrisma.gymPayment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            cashDrawerSessionId: "session-balcao-1",
            amountInCents: BigInt(12900),
            paymentMethod: GymInPersonPaymentMethod.CASH
          })
        })
      );

      // Verifica criação do movimento CASH_INFLOW_PAYMENT no caixa
      expect(mockPrisma.gymCashDrawerMovement.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          sessionId: "session-balcao-1",
          movementType: GymCashMovementType.CASH_INFLOW_PAYMENT,
          amountInCents: BigInt(12900),
          paymentId: "pay-1"
        })
      });

      // Verifica incremento do saldo da conta física do caixa
      expect(mockPrisma.gymFinancialAccount.update).toHaveBeenCalledWith({
        where: { id: defaultCashAccountId },
        data: { balanceInCents: { increment: BigInt(12900) } }
      });
    });
  });
});
