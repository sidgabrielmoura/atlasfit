import { gymReportContractAggregates } from "./gym-report-contract-aggregates";
import { reportReadTransaction, type GymTransactionClient } from "./transaction";
import { gymReportAuthority } from "./gym-report-authority";
import { reportDateBoundary } from "../domain/gym-report-metrics";
import { gymReportFinancialAggregates } from "./gym-report-financial-aggregates";
import { safeCentsNumber } from "../domain/money";
import { WorkspaceAccessError } from "../domain/types";
import { spreadsheetCsvCell, moneyCsvCell, type SpreadsheetCsvCell } from "../domain/spreadsheet-csv";
import type { Prisma } from "@prisma/client";
import {
  GymEnrollmentStatus,
  GymInvoiceStatus,
  GymPaymentStatus,
  GymExpenseStatus,
} from "@prisma/client";

export interface GetGymAnalyticsInput {
  workspaceId: string;
  actorUserId: string;
  startDate?: Date | string;
  endDate?: Date | string;
  unitId?: string;
  assignedStaffId?: string;
  timezone?: string;
  includeFinancial?: boolean;
}

export interface GymAnalyticsOverview {
  access: { financial: boolean; unitIds: string[]; includeUnassigned: boolean };
  snapshot: { asOf: string; basis: "CURRENT" };
  period: {
    startDate: string;
    endDate: string;
    timezone: string;
    unitId: string | null;
  };
  executive: {
    mrrInCents: number;
    activeRecurringContracts: number;
    averageTicketInCents: number;
    activeStudentsCount: number;
    pausedStudentsCount: number;
    newEnrollmentsCount: number;
    renewalsCount: number;
    cancelledEnrollmentsCount: number;
    churnRatePercentage: number | null;
    churnBasisContractCount: number;
    churnedContractsCount: number;
    lifecycleHistoryIncompleteCount: number;
  };
  cashFlow: {
    grossReceivedInCents: number;
    reversedOrRefundedInCents: number;
    netReceivedInCents: number;
    expensesPaidInCents: number;
    netCashInCents: number;
    paymentsByMethod: Array<{ method: string; count: number; totalInCents: number }>;
    historyCoverage: { legacyPaidExpensesCount: number; unallocatedPaymentsCount: number; complete: boolean };
  };
  accountsReceivable: {
    totalReceivableInCents: number;
    currentInCents: number;
    overdue0to30InCents: number;
    overdue31to60InCents: number;
    overdue61to90InCents: number;
    overdueOver90InCents: number;
    totalOverdueInCents: number;
    defaultRatePercentage: number;
    defaultRateNumeratorInCents: number;
    defaultRateDenominatorInCents: number;
    overdueInvoicesCount: number;
  };
}

export type GymExportType =
  | "STUDENTS"
  | "ENROLLMENTS"
  | "INVOICES"
  | "PAYMENTS";

export interface ExportGymDataInput {
  workspaceId: string;
  actorUserId: string;
  exportType: GymExportType;
  startDate?: Date | string;
  endDate?: Date | string;
  unitId?: string;
  assignedStaffId?: string;
}

export interface ExportGymDataResult {
  filename: string;
  contentType: string;
  content: string;
  rowCount: number;
}

export class GymAnalyticsService {
  /**
   * Posição atual de contratos/saldos e eventos do período autorizado.
   * Histórico incompleto não é convertido em estimativa de cancelamento.
   */
  static async getOverview(input: GetGymAnalyticsInput): Promise<GymAnalyticsOverview> {
    return reportReadTransaction(tx => this.getOverviewInTransaction(tx, input));
  }

  static async getOverviewInTransaction(tx: GymTransactionClient, input: GetGymAnalyticsInput, authority?: Awaited<ReturnType<typeof gymReportAuthority>>, reportTimezone?: string): Promise<GymAnalyticsOverview> {
    const { workspaceId, unitId } = input;
    const scope = authority ?? await gymReportAuthority(tx, workspaceId, input.actorUserId, { preferFinancial: input.includeFinancial !== false, unitId, assignedStaffId: input.assignedStaffId });
    const includeFinancial = input.includeFinancial !== false && scope.financial;
    const settings = reportTimezone ? { timezone: reportTimezone } : await tx.gymSettings.findUnique({ where: { workspaceId }, select: { timezone: true } });
    const timezone = input.timezone || settings?.timezone || "America/Sao_Paulo";

    // Normalização das datas do período
    const now = new Date();
    try { new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(now); } catch { throw new WorkspaceAccessError(400, "INVALID_REQUEST", "Fuso horário inválido."); }
    const end = input.endDate ? reportDateBoundary(input.endDate, timezone, true) : now;
    const start = input.startDate
      ? reportDateBoundary(input.startDate, timezone, false)
      : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || start > end) throw new WorkspaceAccessError(400, "INVALID_REQUEST", "Período inválido.");
    const enrollmentScope = scope.enrollmentWhere;
    const invoiceScope = scope.invoiceWhere;

    // Contratos e saldos são uma posição atual; datas do filtro afetam os eventos.
    // Não há ledger suficiente para anunciar contas a receber históricas.
    const executive = await gymReportContractAggregates(tx, { workspaceId, start, end, now, scope, includeFinancial });

    const financial = includeFinancial ? await gymReportFinancialAggregates(tx, { workspaceId, start, end, now, timezone, invoiceScope, expenseScope: { workspaceId, ...scope.unitWhere }, paymentScope: { workspaceId, OR: [
      { financialAccount: { workspaceId, ...scope.unitWhere } },
      { financialAccountId: null, cashDrawerSession: { workspaceId, ...scope.unitWhere } },
      ...(scope.includeUnassigned ? [{ financialAccountId: null, cashDrawerSessionId: null }] : []),
    ] } }) : null;

    return {
      access: { financial: includeFinancial, unitIds: scope.units.map(unit => unit.id), includeUnassigned: scope.includeUnassigned },
      snapshot: { asOf: now.toISOString(), basis: "CURRENT" },
      period: {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        timezone,
        unitId: unitId || null,
      },
      executive,
      cashFlow: financial?.cashFlow ?? { grossReceivedInCents: 0, reversedOrRefundedInCents: 0, netReceivedInCents: 0, expensesPaidInCents: 0, netCashInCents: 0, paymentsByMethod: [], historyCoverage: { legacyPaidExpensesCount: 0, unallocatedPaymentsCount: 0, complete: false } },
      accountsReceivable: financial?.accountsReceivable ?? { totalReceivableInCents: 0, currentInCents: 0, overdue0to30InCents: 0, overdue31to60InCents: 0, overdue61to90InCents: 0, overdueOver90InCents: 0, totalOverdueInCents: 0, defaultRatePercentage: 0, defaultRateNumeratorInCents: 0, defaultRateDenominatorInCents: 0, overdueInvoicesCount: 0 },
    };
  }

  /**
   * Exporta dados consolidados em formato CSV estruturado, seguro e sanitizado.
   * Não exporta hashes, senhas nem chaves de API.
   */
  static async exportData(input: ExportGymDataInput): Promise<ExportGymDataResult> {
    const data = await reportReadTransaction(async tx => {
    const { workspaceId, exportType, unitId } = input;
    const scope = await gymReportAuthority(tx, workspaceId, input.actorUserId, { requireFinancial: exportType !== "STUDENTS", preferFinancial: exportType !== "STUDENTS", unitId, assignedStaffId: input.assignedStaffId });
    const settings = await tx.gymSettings.findUnique({ where: { workspaceId }, select: { timezone: true } });
    const timezone = settings?.timezone || "America/Sao_Paulo";
    const now = new Date();
    const end = input.endDate ? reportDateBoundary(input.endDate, timezone, true) : now;
    const start = input.startDate
      ? reportDateBoundary(input.startDate, timezone, false)
      : new Date(end.getTime() - 90 * 24 * 60 * 60 * 1000);
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || start > end) throw new WorkspaceAccessError(400, "INVALID_REQUEST", "Período inválido.");

    const escapeCsv = spreadsheetCsvCell;

    let filename = "";
    let headers: string[] = [];
    let rows: SpreadsheetCsvCell[][] = [];

    const dateStr = now.toISOString().split("T")[0];
    const invoiceUnit = scope.invoiceWhere;
    const exportLimit = 5000;
    const assertExportSize = (count: number) => {
      if (count > exportLimit) throw new WorkspaceAccessError(413, "EXPORT_LIMIT_EXCEEDED", "Exportação limitada a 5.000 registros. Selecione uma unidade ou reduza o período quando aplicável.");
    };

    switch (exportType) {
      case "STUDENTS": {
        filename = `atlasfit-alunos-${dateStr}.csv`;
        headers = [
          "Matrícula",
          "Nome",
          "E-mail",
          "Telefone",
          "Status",
          "Data Matrícula",
          "Plano Ativo",
          "Data Término",
          "Menor de Idade",
        ];

        const students = await tx.workspaceMember.findMany({
          take: exportLimit + 1,
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
          where: {
            workspaceId,
            AND: [scope.portfolio],
            OR: [{ role: "STUDENT", roleGrants: { none: {} } }, { roleGrants: { some: { role: "STUDENT", revokedAt: null, OR: unitId ? [{ unitId: null }, { unitId }] : [{ unitId: null }, { unit: { workspaceId, isActive: true } }] } } }],
          },
          select: {
            isActive: true, isMinor: true,
            user: { select: { name: true, email: true, whatsapp: true } },
            studentProfile: { select: { registrationNumber: true, status: true, enrolledAt: true } },
            gymEnrollments: {
              where: { AND: [scope.enrollmentWhere], status: GymEnrollmentStatus.ACTIVE },
              orderBy: [{ createdAt: "desc" }, { id: "desc" }],
              select: { endDate: true, planVersion: { select: { name: true } } },
              take: 1,
            },
          },
        });

        assertExportSize(students.length);
        for (const s of students) {
          const activeEnrollment = s.gymEnrollments[0];
          rows.push([
            s.studentProfile?.registrationNumber || "S/M",
            s.user.name || "Sem Nome",
            s.user.email || "",
            s.user.whatsapp || "",
            s.studentProfile?.status || (s.isActive ? "ATIVO" : "INATIVO"),
            s.studentProfile?.enrolledAt ? s.studentProfile.enrolledAt.toISOString().split("T")[0] : "",
            activeEnrollment?.planVersion?.name || "Sem plano ativo",
            activeEnrollment?.endDate ? activeEnrollment.endDate.toISOString().split("T")[0] : "Indeterminado",
            s.isMinor ? "SIM" : "NÃO",
          ]);
        }
        break;
      }

      case "ENROLLMENTS": {
        filename = `atlasfit-contratos-${dateStr}.csv`;
        headers = [
          "ID Contrato",
          "Aluno",
          "Plano",
          "Versão",
          "Ciclo",
          "Preço (R$)",
          "Início",
          "Término",
          "Status",
          "Renovação Automática",
          "Matrícula liberada",
        ];

        const enrollments = await tx.gymEnrollment.findMany({
          take: exportLimit + 1,
          where: {
            workspaceId,
            AND: [scope.enrollmentWhere],
            createdAt: { gte: start, lte: end },
          },
          select: {
            id: true, priceInCents: true, startDate: true, endDate: true, status: true, autoRenew: true, accessGranted: true,
            studentMember: { select: { user: { select: { name: true } } } },
            planVersion: { select: { name: true, version: true, billingCycle: true } },
          },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        });

        assertExportSize(enrollments.length);
        for (const e of enrollments) {
          rows.push([
            e.id,
            e.studentMember?.user?.name || "Sem Nome",
            e.planVersion.name,
            `v${e.planVersion.version}`,
            e.planVersion.billingCycle,
            moneyCsvCell(e.priceInCents),
            e.startDate.toISOString().split("T")[0],
            e.endDate ? e.endDate.toISOString().split("T")[0] : "Indeterminado",
            e.status,
            e.autoRenew ? "SIM" : "NÃO",
            e.accessGranted ? "SIM" : "NÃO",
          ]);
        }
        break;
      }

      case "INVOICES": {
        filename = `atlasfit-faturas-${dateStr}.csv`;
        headers = [
          "Número",
          "Competência",
          "Vencimento",
          "Aluno",
          "Pagador",
          "Valor Total (R$)",
          "Valor Pago (R$)",
          "Saldo Restante (R$)",
          "Status",
        ];

        const invoices = await tx.gymInvoice.findMany({
          take: exportLimit + 1,
          where: {
            workspaceId,
            ...invoiceUnit,
            dueDate: { gte: start, lte: end },
          },
          select: {
            invoiceNumber: true, competenceMonth: true, dueDate: true, payerName: true,
            totalInCents: true, paidAmountInCents: true, balanceRemainingInCents: true, status: true,
            studentMember: { select: { user: { select: { name: true } } } },
          },
          orderBy: [{ dueDate: "desc" }, { id: "desc" }],
        });

        assertExportSize(invoices.length);
        for (const inv of invoices) {
          rows.push([
            inv.invoiceNumber,
            inv.competenceMonth || "",
            inv.dueDate.toISOString().split("T")[0],
            inv.studentMember?.user?.name || "Sem Nome",
            inv.payerName || inv.studentMember?.user?.name || "",
            moneyCsvCell(inv.totalInCents),
            moneyCsvCell(inv.paidAmountInCents),
            moneyCsvCell(inv.balanceRemainingInCents),
            inv.status,
          ]);
        }
        break;
      }

      case "PAYMENTS": {
        filename = `atlasfit-recebimentos-caixa-${dateStr}.csv`;
        headers = [
          "ID Pagamento",
          "Data/Hora",
          "Recibo",
          "Método",
          "Valor alocado nas unidades autorizadas (R$)",
          "Status",
          "Operador",
          "Bandeira POS",
          "NSU",
        ];

        const payments = await tx.gymPayment.findMany({
          take: exportLimit + 1,
          where: {
            workspaceId,
            allocations: { some: { invoice: invoiceUnit } },
            paidAt: { gte: start, lte: end },
          },
          select: {
            paymentNumber: true, paidAt: true, receiptNumber: true, paymentMethod: true, status: true, posCardBrand: true, posNsu: true,
            receivedByUser: { select: { name: true } },
            allocations: { where: { invoice: invoiceUnit }, select: { allocatedAmountInCents: true } },
          },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        });

        assertExportSize(payments.length);
        for (const p of payments) {
          rows.push([
            p.paymentNumber,
            p.paidAt.toISOString(),
            p.receiptNumber || "",
            p.paymentMethod,
            moneyCsvCell(p.allocations.reduce((total, allocation) => total + allocation.allocatedAmountInCents, BigInt(0))),
            p.status,
            p.receivedByUser?.name || "Sistema",
            p.posCardBrand || "",
            p.posNsu || "",
          ]);
        }
        break;
      }

      default:
        throw new Error(`Tipo de exportação '${exportType}' não suportado.`);
    }

    return { filename, headers, rows };
    });
    const { filename, headers, rows } = data;
    const escapeCsv = spreadsheetCsvCell;
    // Format after releasing the snapshot and its connection.
    const headerLine = headers.map(escapeCsv).join(";");
    const dataLines = rows.map((r) => r.map(escapeCsv).join(";"));
    const csvContent = "\uFEFF" + [headerLine, ...dataLines].join("\r\n");

    return {
      filename,
      contentType: "text/csv; charset=utf-8",
      content: csvContent,
      rowCount: rows.length,
    };
  }
}
