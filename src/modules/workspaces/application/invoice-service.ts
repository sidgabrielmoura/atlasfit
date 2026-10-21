import { issueManualInvoice } from "./manual-invoice-service";
import { manualFinanceService } from "./manual-finance-service";
import { gymPublicUserSelect } from "../domain/public-user";
import { safeCentsNumber } from "../domain/money";
import { gymFinanceInvoiceReadScope } from "./manual-finance-authority";
import { serializableTransaction } from "./transaction";
import type { Prisma, GymInvoice, GymInvoiceItem, GymPayment, GymPaymentAllocation } from "@prisma/client";
import prisma from "@/lib/prisma";
import crypto from "crypto";
import {
  GymInvoiceStatus,
  GymInvoiceItemType,
  GymInPersonPaymentMethod,
  GymPaymentStatus,
  GymAllocationStatus,
  GymEnrollmentStatus,
  GymCashDrawerStatus,
  GymCashMovementType
} from "@prisma/client";
import { WorkspaceAccessError } from "../domain/types";
import { publishToChannel } from "@/lib/ably";
import { gymFinancialService, ResolvePayerParams } from "./gym-financial-service";
import { gymEnrollmentService } from "./enrollment-service";

export interface CreateInvoiceItemInput {
  itemType: GymInvoiceItemType;
  description: string;
  quantity?: number;
  unitPriceInCents: bigint | number;
  planVersionId?: string;
}

export interface CreateGymInvoiceInput {
  workspaceId: string;
  actorUserId: string;
  idempotencyKey?: string;
  studentMemberId: string;
  studentUserId?: string;
  enrollmentId?: string;
  title: string;
  description?: string;
  dueDate: Date | string;
  competenceMonth?: string;
  items: CreateInvoiceItemInput[];
  discountInCents?: bigint | number;
  discountPercentage?: number;
  discountReason?: string;
  discountAuthorizedByUserId?: string;
  customPayer?: {
    name: string;
    cpfCnpj: string;
    email: string;
    phone?: string;
  };
  preferredPayerType?: "STUDENT" | "GUARDIAN" | "CUSTOM";
  guardianId?: string;
}

export interface PaymentAllocationItemInput {
  invoiceId: string;
  amountInCents: bigint | number;
}

export interface RecordInPersonPaymentInput {
  workspaceId: string;
  actorUserId: string; // Staff/Caixa que recebeu o valor
  paymentMethod: GymInPersonPaymentMethod;
  amountInCents: bigint | number;
  allocations: PaymentAllocationItemInput[];
  idempotencyKey?: string;
  payerName?: string;
  payerCpfCnpj?: string;
  // Origem verificável (POS / Maquininha externa / Transferência bancária)
  posCardBrand?: string;
  posAuthorizationCode?: string;
  posNsu?: string;
  posTerminalId?: string;
  bankTransferProofUrl?: string;
  bankTransferTransactionId?: string;
  financialAccountId?: string;
  paidAt?: Date | string;
  notes?: string;
}

export interface ReversePaymentInput {
  workspaceId: string;
  paymentId: string;
  actorUserId: string;
  reversalReason: string;
}

export interface ListGymInvoicesFilter {
  unitId?: string;
  page?: number;
  limit?: number;
  status?: GymInvoiceStatus;
  studentMemberId?: string;
  enrollmentId?: string;
  search?: string;
}

export interface ListGymPaymentsFilter {
  unitId?: string;
  page?: number;
  limit?: number;
  status?: GymPaymentStatus;
  paymentMethod?: GymInPersonPaymentMethod;
  receivedByUserId?: string;
}

type InvoiceSerializationInput = GymInvoice & {
  items?: readonly GymInvoiceItem[];
  allocations?: readonly (GymPaymentAllocation & { payment?: { paymentNumber: string; receiptNumber: string } })[];
  studentMember?: { id: string; user?: { name: string | null; email: string | null; image: string | null } } | null;
  enrollment?: { id: string; planVersion?: { name: string } } | null;
};
type PaymentSerializationInput = GymPayment & {
  receivedByUser?: { id: string; name: string | null; email: string | null } | null;
  allocations?: readonly (GymPaymentAllocation & { invoice?: { invoiceNumber: string; title: string } })[];
};

export class GymInvoiceService {
  private cleanDoc(val: string): string {
    return val ? val.replace(/\D/g, "") : "";
  }

  private maskDoc(doc: string): string {
    const clean = this.cleanDoc(doc);
    if (!clean) return "";
    if (clean.length > 4) {
      return `***.***.${clean.slice(-4)}`;
    }
    return clean;
  }

  private generateInvoiceNumber(): string {
    const d = new Date();
    const ym = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`;
    const rand = crypto.randomBytes(3).toString("hex").toUpperCase();
    return `FAT-${ym}-${rand}`;
  }

  private generatePaymentNumber(): string {
    const d = new Date();
    const ym = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`;
    const rand = crypto.randomBytes(3).toString("hex").toUpperCase();
    return `PAG-${ym}-${rand}`;
  }

  private generateReceiptNumber(): string {
    const d = new Date();
    const ym = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`;
    const rand = crypto.randomBytes(3).toString("hex").toUpperCase();
    return `REC-${ym}-${rand}`;
  }

  /**
   * Cria uma fatura com itens, cálculo preciso de centavos e alçada de desconto.
   */
  async createInvoice(input: CreateGymInvoiceInput) { return this.serializeInvoice(await issueManualInvoice(input)); }

  /**
   * Registra um pagamento presencial no balcão da academia (Dinheiro, Maquininha POS, Pix manual).
   * Suporta pagamento parcial e alocações seguras impedindo sobrealocação.
   */
  async recordInPersonPayment(input: RecordInPersonPaymentInput) {
    return this.serializePayment(await manualFinanceService.recordPayment(input));
  }

  /**
   * Reversão / Estorno de pagamento presencial com justificativa obrigatória e recálculo de faturas.
   */
  async reversePayment(input: ReversePaymentInput) {
    return this.serializePayment(await manualFinanceService.reversePayment(input));
  }

  /**
   * Obtém os dados completos do recibo comprovatório de pagamento presencial.
   * Contém expressamente a advertência legal: "não substitui documento fiscal".
   */
  async getPaymentReceipt(workspaceId: string, paymentId: string, actorUserId?: string) {
    if (!actorUserId) throw new WorkspaceAccessError(401, "UNAUTHORIZED", "Identifique o operador da consulta.");
    const scope = await gymFinanceInvoiceReadScope(prisma, workspaceId, actorUserId, "payments.read");
    const payment = await prisma.gymPayment.findFirst({
      where: { id: paymentId, workspaceId, allocations: { some: { invoice: scope }, every: { invoice: scope } } },
      include: {
        receivedByUser: { select: { name: true, email: true } },
        reversedByUser: { select: { name: true } },
        allocations: {
          include: {
            invoice: {
              select: {
                id: true,
                invoiceNumber: true,
                title: true,
                studentMember: {
                  select: {
                    user: { select: { name: true, cpfCnpj: true } }
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!payment) {
      throw new WorkspaceAccessError(404, "PAYMENT_NOT_FOUND", "Pagamento não encontrado.");
    }

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { name: true, slug: true }
    });

    return {
      receiptNumber: payment.receiptNumber,
      paymentNumber: payment.paymentNumber,
      paidAt: payment.paidAt.toISOString(),
      amountInCents: safeCentsNumber(payment.amountInCents),
      paymentMethod: payment.paymentMethod,
      status: payment.status,
      payer: {
        name: payment.payerName,
        cpfCnpjMasked: this.maskDoc(payment.payerCpfCnpj || "")
      },
      operator: {
        name: payment.receivedByUser?.name || "Operador",
        email: payment.receivedByUser?.email || ""
      },
      workspace: {
        name: workspace?.name || "Academia"
      },
      verificationDetails: {
        posCardBrand: payment.posCardBrand,
        posAuthorizationCode: payment.posAuthorizationCode,
        posNsu: payment.posNsu,
        posTerminalId: payment.posTerminalId,
        bankTransferTransactionId: payment.bankTransferTransactionId
      },
      allocations: payment.allocations.map((a) => ({
        invoiceNumber: a.invoice.invoiceNumber,
        title: a.invoice.title,
        studentName: a.invoice.studentMember?.user?.name || "Aluno",
        amountInCents: safeCentsNumber(a.allocatedAmountInCents),
        status: a.status
      })),
      reversal: payment.status === GymPaymentStatus.REVERSED ? {
        reversedAt: payment.reversedAt?.toISOString() || null,
        reversedByName: payment.reversedByUser?.name || "Gerente",
        reason: payment.reversalReason
      } : null,
      taxDisclaimer: payment.taxDisclaimer
    };
  }

  /**
   * Listagem de faturas com filtros por status, aluno ou busca textual.
   */
  async listInvoices(workspaceId: string, filter: ListGymInvoicesFilter = {}, actorUserId?: string) {
    if (!actorUserId) throw new WorkspaceAccessError(401, "UNAUTHORIZED", "Identifique o operador da consulta.");
    return serializableTransaction(async tx => {
    const page = Math.max(1, filter.page || 1);
    const limit = Math.min(100, Math.max(1, filter.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.GymInvoiceWhereInput = { AND: [await gymFinanceInvoiceReadScope(tx, workspaceId, actorUserId, "invoices.read", filter.unitId)] };
    if (filter.status) where.status = filter.status;
    if (filter.studentMemberId) where.studentMemberId = filter.studentMemberId;
    if (filter.enrollmentId) where.enrollmentId = filter.enrollmentId;
    if (filter.search) {
      where.OR = [
        { invoiceNumber: { contains: filter.search, mode: "insensitive" } },
        { title: { contains: filter.search, mode: "insensitive" } },
        { payerName: { contains: filter.search, mode: "insensitive" } }
      ];
    }

    const total = await tx.gymInvoice.count({ where });
    const items = await tx.gymInvoice.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip,
        take: limit,
        include: {
          items: true,
          allocations: {
            include: {
              payment: {
                select: {
                  id: true,
                  paymentNumber: true,
                  receiptNumber: true,
                  paymentMethod: true,
                  status: true
                }
              }
            }
          },
          studentMember: {
            select: {
              id: true,
              user: { select: { id: true, name: true, email: true, image: true } }
            }
          },
          enrollment: {
            select: {
              id: true,
              planVersion: { select: { name: true } }
            }
          }
        }
      });

    return {
      invoices: items.map((inv) => this.serializeInvoice(inv)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
    });
  }

  /**
   * Listagem de pagamentos físicos recebidos pelo caixa da recepção.
   */
  async listPayments(workspaceId: string, filter: ListGymPaymentsFilter = {}, actorUserId?: string) {
    if (!actorUserId) throw new WorkspaceAccessError(401, "UNAUTHORIZED", "Identifique o operador da consulta.");
    return serializableTransaction(async tx => {
    const page = Math.max(1, filter.page || 1);
    const limit = Math.min(100, Math.max(1, filter.limit || 20));
    const skip = (page - 1) * limit;

    const scope = await gymFinanceInvoiceReadScope(tx, workspaceId, actorUserId, "payments.read", filter.unitId);
    const where: Prisma.GymPaymentWhereInput = { workspaceId, allocations: { some: { invoice: scope }, every: { invoice: scope } } };
    if (filter.status) where.status = filter.status;
    if (filter.paymentMethod) where.paymentMethod = filter.paymentMethod;
    if (filter.receivedByUserId) where.receivedByUserId = filter.receivedByUserId;

    const total = await tx.gymPayment.count({ where });
    const items = await tx.gymPayment.findMany({
        where,
        orderBy: [{ paidAt: "desc" }, { id: "desc" }],
        skip,
        take: limit,
        include: {
          receivedByUser: { select: { id: true, name: true, email: true } },
          allocations: {
            include: {
              invoice: {
                select: {
                  id: true,
                  invoiceNumber: true,
                  title: true
                }
              }
            }
          }
        }
      });

    return {
      payments: items.map((p) => this.serializePayment(p)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
    });
  }

  private serializeInvoice(inv: InvoiceSerializationInput) {
    return {
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      title: inv.title,
      description: inv.description,
      status: inv.status,
      dueDate: inv.dueDate ? (typeof inv.dueDate === "string" ? inv.dueDate : inv.dueDate.toISOString()) : new Date().toISOString(),
      issueDate: inv.issueDate ? (typeof inv.issueDate === "string" ? inv.issueDate : inv.issueDate.toISOString()) : new Date().toISOString(),
      competenceMonth: inv.competenceMonth,
      subtotalInCents: safeCentsNumber(inv.subtotalInCents),
      discountInCents: safeCentsNumber(inv.discountInCents),
      totalInCents: safeCentsNumber(inv.totalInCents),
      paidAmountInCents: safeCentsNumber(inv.paidAmountInCents),
      balanceRemainingInCents: safeCentsNumber(inv.balanceRemainingInCents),
      discountPercentage: inv.discountPercentage,
      discountReason: inv.discountReason,
      payer: {
        type: inv.payerType,
        name: inv.payerName,
        cpfCnpjMasked: this.maskDoc(inv.payerCpfCnpj || ""),
        email: inv.payerEmail,
        phone: inv.payerPhone
      },
      student: inv.studentMember ? {
        memberId: inv.studentMember.id,
        name: inv.studentMember.user?.name || "Aluno",
        email: inv.studentMember.user?.email || "",
        image: inv.studentMember.user?.image || null
      } : null,
      enrollment: inv.enrollment ? {
        id: inv.enrollment.id,
        planName: inv.enrollment.planVersion?.name || "Plano"
      } : null,
      items: (inv.items || []).map((it) => ({
        id: it.id,
        itemType: it.itemType,
        description: it.description,
        quantity: it.quantity,
        unitPriceInCents: safeCentsNumber(it.unitPriceInCents),
        totalInCents: safeCentsNumber(it.totalInCents)
      })),
      allocations: (inv.allocations || []).map((a) => ({
        id: a.id,
        paymentId: a.paymentId,
        paymentNumber: a.payment?.paymentNumber,
        receiptNumber: a.payment?.receiptNumber,
        allocatedAmountInCents: safeCentsNumber(a.allocatedAmountInCents),
        status: a.status
      })),
      paidAt: inv.paidAt ? (typeof inv.paidAt === "string" ? inv.paidAt : inv.paidAt.toISOString()) : null,
      createdAt: inv.createdAt ? (typeof inv.createdAt === "string" ? inv.createdAt : inv.createdAt.toISOString()) : new Date().toISOString()
    };
  }

  private serializePayment(p: PaymentSerializationInput) {
    return {
      id: p.id,
      paymentNumber: p.paymentNumber,
      receiptNumber: p.receiptNumber,
      idempotencyKey: p.idempotencyKey,
      amountInCents: safeCentsNumber(p.amountInCents),
      paymentMethod: p.paymentMethod,
      status: p.status,
      paidAt: p.paidAt ? (typeof p.paidAt === "string" ? p.paidAt : p.paidAt.toISOString()) : new Date().toISOString(),
      payer: {
        name: p.payerName,
        cpfCnpjMasked: this.maskDoc(p.payerCpfCnpj || "")
      },
      receivedBy: p.receivedByUser ? {
        id: p.receivedByUser.id,
        name: p.receivedByUser.name || "Operador",
        email: p.receivedByUser.email || ""
      } : null,
      posCardBrand: p.posCardBrand,
      posAuthorizationCode: p.posAuthorizationCode,
      posNsu: p.posNsu,
      posTerminalId: p.posTerminalId,
      bankTransferProofUrl: p.bankTransferProofUrl,
      bankTransferTransactionId: p.bankTransferTransactionId,
      verificationDetails: {
        posCardBrand: p.posCardBrand,
        posAuthorizationCode: p.posAuthorizationCode,
        posNsu: p.posNsu,
        posTerminalId: p.posTerminalId,
        bankTransferProofUrl: p.bankTransferProofUrl,
        bankTransferTransactionId: p.bankTransferTransactionId
      },
      allocations: (p.allocations || []).map((a) => ({
        id: a.id,
        invoiceId: a.invoiceId,
        invoiceNumber: a.invoice?.invoiceNumber,
        title: a.invoice?.title,
        allocatedAmountInCents: safeCentsNumber(a.allocatedAmountInCents),
        status: a.status
      })),
      reversal: p.status === GymPaymentStatus.REVERSED ? {
        reversedAt: p.reversedAt ? (typeof p.reversedAt === "string" ? p.reversedAt : p.reversedAt.toISOString()) : null,
        reversalReason: p.reversalReason
      } : null,
      reversalReason: p.reversalReason || null,
      taxDisclaimer: p.taxDisclaimer,
      notes: p.notes
    };
  }
}

export const gymInvoiceService = new GymInvoiceService();
