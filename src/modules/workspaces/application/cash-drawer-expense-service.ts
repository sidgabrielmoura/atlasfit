import * as expenseCatalog from "./gym-expense-catalog";
import { createInternalAccount, transferInternalAccounts, openInternalCash, moveInternalCash, closeInternalCash, reconcileInternalCash, createInternalExpense, payInternalExpense, cancelInternalExpense } from "./cash-mutations";
import prisma from "@/lib/prisma";
import { serializableTransaction } from "./transaction";
import { gymFinanceUnitReadScope } from "./manual-finance-authority";
import {
  GymFinancialAccountType,
  GymExpenseStatus,
  GymCashDrawerStatus,
  GymCashMovementType,
  Prisma
} from "@prisma/client";
import { WorkspaceAccessError } from "../domain/types";
import { safeCentsNumber } from "../domain/money";
import { expectedCash } from "../domain/cash-ledger";

export interface CreateFinancialAccountInput {
  workspaceId: string;
  unitId?: string;
  name: string;
  accountType: GymFinancialAccountType;
  initialBalanceInCents?: bigint | number;
  bankName?: string;
  agencyNumber?: string;
  accountNumber?: string;
  isDefault?: boolean;
  actorUserId: string;
}

export interface TransferBetweenAccountsInput {
  workspaceId: string;
  idempotencyKey: string;
  fromAccountId: string;
  toAccountId: string;
  amountInCents: bigint | number;
  description?: string;
  referenceId?: string;
  performedByUserId: string;
}

export interface CreateExpenseCategoryInput {
  actorUserId: string;
  workspaceId: string;
  name: string;
  code?: string;
  color?: string;
}

export interface CreateSupplierInput {
  actorUserId: string;
  workspaceId: string;
  tradeName: string;
  corporateName?: string;
  cnpjCpf?: string;
  email?: string;
  phone?: string;
  contactName?: string;
  notes?: string;
}

export interface CreateExpenseInput {
  workspaceId: string;
  idempotencyKey?: string;
  unitId?: string;
  supplierId?: string;
  supplierName?: string;
  categoryId: string;
  title: string;
  description?: string;
  documentNumber?: string;
  amountInCents: bigint | number;
  penaltyInCents?: bigint | number;
  discountInCents?: bigint | number;
  dueDate: Date;
  competenceMonth?: string;
  paidImmediately?: boolean;
  financialAccountId?: string;
  paymentMethod?: string;
  paymentProofUrl?: string;
  actorUserId: string;
}

export interface PayExpenseInput {
  workspaceId: string;
  idempotencyKey?: string;
  expenseId: string;
  financialAccountId: string;
  paidAmountInCents: bigint | number;
  paidAt?: Date;
  paymentMethod?: string;
  paymentProofUrl?: string;
  actorUserId: string;
}

export interface CancelExpenseInput {
  workspaceId: string;
  expenseId: string;
  cancellationReason: string;
  actorUserId: string;
}

export interface OpenCashDrawerInput {
  workspaceId: string;
  unitId?: string;
  financialAccountId?: string;
  openingAmountInCents: bigint | number;
  notes?: string;
  openedByUserId: string;
}

export interface RecordCashMovementInput {
  workspaceId: string;
  idempotencyKey: string;
  sessionId: string;
  movementType: "SUPPLY" | "BLEED";
  amountInCents: bigint | number;
  description?: string;
  destinationAccountId?: string; // Para sangrias depositadas em outra conta
  performedByUserId: string;
}

export interface CloseCashDrawerInput {
  workspaceId: string;
  sessionId: string;
  actualCashInCents: bigint | number;
  differenceReason?: string;
  notes?: string;
  closedByUserId: string;
}

export interface ReconcileCashDrawerInput {
  workspaceId: string;
  sessionId: string;
  reconciliationNotes: string;
  reconciledByUserId: string;
}

export class GymCashExpenseService {

  // ==========================================
  // 1. CONTAS FINANCEIRAS E TRANSFERÊNCIAS
  // ==========================================

  /**
   * Lista todas as contas financeiras ativas da academia.
   */
  async listFinancialAccounts(workspaceId: string, actorUserId: string) {
    if (!actorUserId) throw new WorkspaceAccessError(401, "UNAUTHORIZED", "Ator necessário para consultar contas.");
    return serializableTransaction(async tx => {
    const scope = await gymFinanceUnitReadScope(tx, workspaceId, actorUserId, "invoices.read");
    const accounts = await tx.gymFinancialAccount.findMany({
      where: { workspaceId, isActive: true, accountType: { not: "GATEWAY_ONLINE" }, OR: [{ unitId: { in: scope.unitIds } }, ...(scope.includeUnassigned ? [{ unitId: null }] : [])] },
      include: {
        unit: { select: { id: true, name: true } }
      },
      orderBy: [{ isDefault: "desc" }, { name: "asc" }]
    });

    return accounts.map((acc) => ({
      id: acc.id,
      workspaceId: acc.workspaceId,
      unitId: acc.unitId,
      unitName: acc.unit?.name || null,
      name: acc.name,
      accountType: acc.accountType,
      balanceInCents: safeCentsNumber(acc.balanceInCents),
      initialBalanceInCents: safeCentsNumber(acc.initialBalanceInCents),
      currency: acc.currency,
      bankName: acc.bankName,
      agencyNumber: acc.agencyNumber,
      accountNumber: acc.accountNumber,
      isDefault: acc.isDefault,
      isActive: acc.isActive,
      createdAt: acc.createdAt.toISOString()
    }));
    });
  }

  /**
   * Cria nova conta financeira (bancária, cofre ou online).
   */
  async createFinancialAccount(input: CreateFinancialAccountInput) { return createInternalAccount(input); }

  /**
   * Transferência interna entre contas financeiras da academia.
   * INVARIANTE DO PLANO & BACKLOG: "Transferência entre contas não duplica receita nem despesa".
   * É uma movimentação patrimonial estritamente neutra.
   */
  async transferBetweenAccounts(input: TransferBetweenAccountsInput) { return transferInternalAccounts(input); }

  // ==========================================
  // 2. CATEGORIAS DE DESPESAS E FORNECEDORES
  // ==========================================

  async listExpenseCategories(workspaceId: string, actorUserId: string) { return expenseCatalog.listExpenseCategories(workspaceId, actorUserId); }
  async initializeExpenseCategories(workspaceId: string, actorUserId: string) { return expenseCatalog.initializeExpenseCategories(workspaceId, actorUserId); }
  async createExpenseCategory(input: CreateExpenseCategoryInput) { return expenseCatalog.createExpenseCategory(input); }
  async listSuppliers(workspaceId: string, actorUserId: string) { return expenseCatalog.listSuppliers(workspaceId, actorUserId); }
  async createSupplier(input: CreateSupplierInput) { return expenseCatalog.createSupplier(input); }

  // ==========================================
  // 3. CONTAS A PAGAR / DESPESAS
  // ==========================================

  /**
   * Lista despesas e contas a pagar com filtros e totais operacionais.
   */
  async listExpenses(params: {
    workspaceId: string;
    actorUserId: string;
    unitId?: string;
    status?: GymExpenseStatus;
    competenceMonth?: string;
    categoryId?: string;
    supplierId?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }) {
    const {
      workspaceId,
      status,
      competenceMonth,
      categoryId,
      supplierId,
      search,
      limit = 50,
      offset = 0
    } = params;
    if (!Number.isInteger(limit) || limit < 1 || limit > 100 || !Number.isInteger(offset) || offset < 0 || offset > 100000 || (status && !Object.values(GymExpenseStatus).includes(status))) throw new WorkspaceAccessError(400, "INVALID_REQUEST", "Filtros ou paginação inválidos.");
    if (!params.actorUserId) throw new WorkspaceAccessError(401, "UNAUTHORIZED", "Ator necessário para consultar despesas.");
    return serializableTransaction(async tx => {
    const scope = await gymFinanceUnitReadScope(tx, workspaceId, params.actorUserId, "invoices.read", params.unitId);
    const units = { OR: [{ unitId: { in: scope.unitIds } }, ...(scope.includeUnassigned ? [{ unitId: null }] : [])] };
    const now = new Date();
    const where: Prisma.GymExpenseWhereInput = {
      workspaceId,
      AND: [units],
      ...(status === "OVERDUE" ? { status: { in: ["PENDING", "SCHEDULED", "OVERDUE"] }, dueDate: { lt: now } } : status === "PENDING" ? { status: { in: ["PENDING", "SCHEDULED", "OVERDUE"] }, dueDate: { gte: now } } : status ? { status } : {}),
      ...(competenceMonth ? { competenceMonth } : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(supplierId ? { supplierId } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: "insensitive" } },
              { supplierName: { contains: search, mode: "insensitive" } },
              { documentNumber: { contains: search, mode: "insensitive" } }
            ]
          }
        : {})
    };

    const sums = { amountInCents: true, penaltyInCents: true, discountInCents: true, paidAmountInCents: true } as const;
    const [expenses, totalCount, pending, overdue, received] = await Promise.all([
      tx.gymExpense.findMany({
        where,
        include: {
          category: { select: { id: true, name: true, color: true } },
          supplier: { select: { id: true, tradeName: true } },
          financialAccount: { select: { id: true, name: true, accountType: true } },
          payments: { orderBy: { paidAt: "desc" }, take: 100, select: { id: true, amountInCents: true, paidAt: true, paymentMethod: true, reversedAt: true, recordedByUser: { select: { name: true } }, financialAccount: { select: { name: true } } } },
          _count: { select: { payments: true } }
        },
        orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
        take: limit,
        skip: offset
      }),
      tx.gymExpense.count({ where }),
      tx.gymExpense.aggregate({ where: { AND: [where, { status: { in: ["PENDING", "SCHEDULED", "OVERDUE"] }, dueDate: { gte: now } }] }, _sum: sums }),
      tx.gymExpense.aggregate({ where: { AND: [where, { status: { in: ["PENDING", "SCHEDULED", "OVERDUE"] }, dueDate: { lt: now } }] }, _sum: sums }),
      tx.gymExpense.aggregate({ where: { AND: [where, { status: { not: "CANCELLED" } }] }, _sum: { paidAmountInCents: true } })
    ]);

    const remaining = (sum: typeof pending._sum) => safeCentsNumber((sum.amountInCents || BigInt(0)) + (sum.penaltyInCents || BigInt(0)) - (sum.discountInCents || BigInt(0)) - (sum.paidAmountInCents || BigInt(0)));

    return {
      expenses: expenses.map((e) => ({
        id: e.id,
        title: e.title,
        description: e.description,
        documentNumber: e.documentNumber,
        category: e.category,
        supplierName: e.supplierName || e.supplier?.tradeName || "Não informado",
        amountInCents: safeCentsNumber(e.amountInCents),
        totalInCents: safeCentsNumber(e.amountInCents + e.penaltyInCents - e.discountInCents),
        balanceRemainingInCents: safeCentsNumber(e.amountInCents + e.penaltyInCents - e.discountInCents - e.paidAmountInCents),
        paidAmountInCents: safeCentsNumber(e.paidAmountInCents),
        penaltyInCents: safeCentsNumber(e.penaltyInCents),
        discountInCents: safeCentsNumber(e.discountInCents),
        dueDate: e.dueDate.toISOString(),
        competenceMonth: e.competenceMonth,
        status: e.status !== "PAID" && e.status !== "CANCELLED" ? e.dueDate < now ? "OVERDUE" : "PENDING" : e.status,
        paidAt: e.paidAt ? e.paidAt.toISOString() : null,
        paymentMethod: e.paymentMethod,
        financialAccountName: e.financialAccount?.name || null,
        createdAt: e.createdAt.toISOString(),
        paymentsCount: e._count.payments,
        payments: e.payments.map(payment => ({ id: payment.id, amountInCents: safeCentsNumber(payment.amountInCents), paidAt: payment.paidAt.toISOString(), paymentMethod: payment.paymentMethod, reversedAt: payment.reversedAt?.toISOString() || null, operatorName: payment.recordedByUser.name, accountName: payment.financialAccount.name }))
      })),
      pagination: {
        totalCount,
        limit,
        offset
      },
      kpis: {
        totalPendingInCents: remaining(pending._sum),
        totalPaidInCents: safeCentsNumber(received._sum.paidAmountInCents || BigInt(0)),
        totalOverdueInCents: remaining(overdue._sum)
      }
    };
    });
  }

  /**
   * Cria obrigação a pagar ou despesa quitada no ato.
   */
  async createExpense(input: CreateExpenseInput) { return createInternalExpense(input); }

  /**
   * Baixa / pagamento de uma obrigação financeira pendente.
   */
  async payExpense(input: PayExpenseInput) { return payInternalExpense(input); }

  /**
   * Cancela obrigação a pagar com justificativa.
   */
  async cancelExpense(input: CancelExpenseInput) { return cancelInternalExpense(input); }

  // ==========================================
  // 4. SESSÕES DE CAIXA DA RECEPÇÃO
  // ==========================================

  /**
   * Obtém a sessão de caixa atualmente aberta para o operador autenticado ou unidade.
   */
  async getCurrentSession(workspaceId: string, userId: string) {
    return serializableTransaction(async tx => {
    const scope = await gymFinanceUnitReadScope(tx, workspaceId, userId, "payments.read");
    const session = await tx.gymCashDrawerSession.findFirst({
      where: {
        workspaceId,
        openedByUserId: userId,
        financialAccount: { workspaceId },
        OR: [{ unitId: { in: scope.unitIds } }, ...(scope.includeUnassigned ? [{ unitId: null }] : [])],
        status: GymCashDrawerStatus.OPEN
      },
      include: {
        financialAccount: true,
        movements: {
          orderBy: { createdAt: "desc" }
        },
        payments: {
          select: {
            id: true,
            receiptNumber: true,
            amountInCents: true,
            payerName: true,
            paidAt: true
          }
        }
      }
    });

    if (!session) {
      return null;
    }

    // Calcular saldo esperado atual dinamicamente
    const expectedInCents = expectedCash(session.openingAmountInCents, session.movements);

    return {
      id: session.id,
      sessionNumber: session.sessionNumber,
      status: session.status,
      financialAccountId: session.financialAccountId,
      financialAccountName: session.financialAccount.name,
      openedAt: session.openedAt.toISOString(),
      openingAmountInCents: safeCentsNumber(session.openingAmountInCents),
      expectedCashInCents: safeCentsNumber(expectedInCents),
      movementsCount: session.movements.length,
      paymentsCount: session.payments.length,
      movements: session.movements.map((m) => ({
        id: m.id,
        movementType: m.movementType,
        amountInCents: safeCentsNumber(m.amountInCents),
        description: m.description,
        createdAt: m.createdAt.toISOString()
      }))
    };
    });
  }

  /**
   * Abertura de caixa da recepção.
   */
  async openCashDrawer(input: OpenCashDrawerInput) { return openInternalCash(input); }

  /**
   * Registro de Suprimento (adicionar troco) ou Sangria (retirar dinheiro do caixa).
   * INVARIANTE: Caixa fechado não pode ser editado.
   */
  async recordCashMovement(input: RecordCashMovementInput) { return moveInternalCash(input); }

  /**
   * Fechamento de sessão de caixa.
   * REGRA DE OURO DO ACEITE: "Diferenças exigem justificativa obrigatória".
   */
  async closeCashDrawer(input: CloseCashDrawerInput) { return closeInternalCash(input); }

  /**
   * Reconciliação / Auditoria gerencial de caixa fechado.
   */
  async reconcileCashDrawer(input: ReconcileCashDrawerInput) { return reconcileInternalCash(input); }

  /**
   * Lista o histórico de sessões de caixa.
   */
  async listCashDrawerSessions(params: {
    workspaceId: string;
    actorUserId: string;
    status?: GymCashDrawerStatus;
    openedByUserId?: string;
    limit?: number;
    offset?: number;
  }) {
    const { workspaceId, status, openedByUserId, limit = 20, offset = 0 } = params;
    if (!params.actorUserId) throw new WorkspaceAccessError(401, "UNAUTHORIZED", "Ator necessário para consultar histórico de caixa.");
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100 || !Number.isSafeInteger(offset) || offset < 0 || offset > 100000) throw new WorkspaceAccessError(400, "INVALID_REQUEST", "Paginação inválida.");
    return serializableTransaction(async tx => {
    const scope = await gymFinanceUnitReadScope(tx, workspaceId, params.actorUserId, "payments.read");

    const where: Prisma.GymCashDrawerSessionWhereInput = {
      workspaceId,
      financialAccount: { workspaceId },
      OR: [{ unitId: { in: scope.unitIds } }, ...(scope.includeUnassigned ? [{ unitId: null }] : [])],
      ...(status ? { status } : {}),
      ...(openedByUserId ? { openedByUserId } : {})
    };

    const sessions = await tx.gymCashDrawerSession.findMany({
        where,
        include: {
          financialAccount: { select: { id: true, name: true } },
          openedByUser: { select: { id: true, name: true, email: true } },
          closedByUser: { select: { id: true, name: true } }
        },
        orderBy: { openedAt: "desc" },
        take: limit,
        skip: offset
      });
    const totalCount = await tx.gymCashDrawerSession.count({ where });

    return {
      sessions: sessions.map((s) => ({
        id: s.id,
        sessionNumber: s.sessionNumber,
        status: s.status,
        financialAccountName: s.financialAccount.name,
        openedByUserName: s.openedByUser.name || s.openedByUser.email,
        closedByUserName: s.closedByUser?.name || null,
        openingAmountInCents: safeCentsNumber(s.openingAmountInCents),
        expectedCashInCents: safeCentsNumber(s.expectedCashInCents),
        actualCashInCents: s.actualCashInCents !== null ? safeCentsNumber(s.actualCashInCents) : null,
        differenceInCents: s.differenceInCents !== null ? safeCentsNumber(s.differenceInCents) : null,
        differenceReason: s.differenceReason,
        openedAt: s.openedAt.toISOString(),
        closedAt: s.closedAt ? s.closedAt.toISOString() : null
      })),
      pagination: {
        totalCount,
        limit,
        offset
      }
    };
    });
  }
}

export const gymCashExpenseService = new GymCashExpenseService();
