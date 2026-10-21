import { resolveGymPayer } from "./payer-service";
import { rejectActiveGymGateway } from "../domain/gateway-policy";
import prisma from "@/lib/prisma";
import crypto from "crypto";
import {
  PaymentProvider,
  ProviderEnvironment,
  FinancialAccountStatus,
  WalletKycStatus,
  WalletPaymentMethod,
  StudentBillingStatus,
  FinancialProfileType
} from "@prisma/client";



import { WorkspaceAccessError } from "../domain/types";
import { publishToChannel } from "@/lib/ably";

export interface OnboardGymAccountInput {
  workspaceId: string;
  actorUserId: string;
  name: string; // Razão Social
  tradingName?: string; // Nome Fantasia
  cnpj: string;
  email: string;
  phone: string;
  postalCode: string;
  address: string;
  addressNumber: string;
  province: string;
  companyType?: string; // "LIMITED" | "INDIVIDUAL"
  incomeValue?: number;
}

export interface GymFinancialProfileResult {
  workspaceId: string;
  isConfigured: boolean;
  profileType?: FinancialProfileType;
  status: FinancialAccountStatus;
  kycStatus: WalletKycStatus;
  providerStatus?: string | null;
  legalNameMasked?: string | null;
  documentLast4?: string | null;
  providerAccountId?: string | null;
  balance: {
    availableInCents: number;
    pendingInCents: number;
    blockedInCents: number;
    negativeInCents: number;
    lastSyncedAt?: string | null;
  };
  canIssueInvoices: boolean;
}

export interface EffectivePayer {
  payerType: "STUDENT" | "GUARDIAN" | "CUSTOM";
  name: string;
  cpfCnpj?: string;
  email: string;
  phone?: string;
  payerUserId?: string;
  payerGuardianId?: string;
  studentUserId: string;
  studentMemberId?: string;
}

export interface ResolvePayerParams {
  studentUserId: string;
  studentMemberId?: string;
  enrollmentId?: string;
  guardianId?: string;
  customPayer?: {
    name: string;
    cpfCnpj: string;
    email: string;
    phone?: string;
  };
  preferredPayerType?: "STUDENT" | "GUARDIAN" | "CUSTOM";
}

export interface CreateGymBillingInput {
  workspaceId: string;
  actorUserId: string;
  studentUserId: string;
  studentMemberId?: string;
  enrollmentId?: string;
  title: string;
  description?: string;
  amountInCents: bigint | number;
  paymentMethod: WalletPaymentMethod;
  dueDate: Date;
  idempotencyKey?: string;
  guardianId?: string;
  customPayer?: {
    name: string;
    cpfCnpj: string;
    email: string;
    phone?: string;
  };
  preferredPayerType?: "STUDENT" | "GUARDIAN" | "CUSTOM";
}

export interface ListGymBillingsFilter {
  page?: number;
  limit?: number;
  status?: StudentBillingStatus;
  enrollmentId?: string;
  studentUserId?: string;
  payerCpfCnpj?: string;
}

export class GymFinancialService {
  

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

  private maskLegalName(name: string): string {
    if (!name) return "";
    return name
      .split(" ")
      .map((part, index) => (index === 0 ? part : `${part[0] || ""}.`))
      .join(" ");
  }

  /**
   * Obtém o perfil financeiro configurado para a academia (Workspace).
   * Garante isolamento estrito: cada academia possui sua própria conta recebedora.
   */
  async getGymFinancialProfile(workspaceId: string): Promise<GymFinancialProfileResult> {
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        paymentProviderAccount: {
          include: {
            balanceSnapshots: {
              orderBy: { capturedAt: "desc" },
              take: 1
            }
          }
        }
      }
    });

    if (!workspace) {
      throw new WorkspaceAccessError(404, "WORKSPACE_NOT_FOUND", "Academia não encontrada.");
    }

    const account = workspace.paymentProviderAccount;

    if (!account) {
      return {
        workspaceId,
        isConfigured: false,
        status: FinancialAccountStatus.NOT_STARTED,
        kycStatus: WalletKycStatus.NOT_STARTED,
        balance: {
          availableInCents: 0,
          pendingInCents: 0,
          blockedInCents: 0,
          negativeInCents: 0,
          lastSyncedAt: null
        },
        canIssueInvoices: false
      };
    }

    const latestSnapshot = account.balanceSnapshots[0];
    const canIssue =
      account.status === FinancialAccountStatus.APPROVED ||
      account.status === FinancialAccountStatus.ONBOARDING ||
      account.status === FinancialAccountStatus.UNDER_REVIEW;

    return {
      workspaceId,
      isConfigured: true,
      profileType: account.profileType,
      status: account.status,
      kycStatus: account.kycStatus,
      providerStatus: account.providerStatus,
      legalNameMasked: account.legalNameMasked,
      documentLast4: account.documentLast4,
      providerAccountId: account.providerAccountId,
      balance: {
        availableInCents: latestSnapshot ? Number(latestSnapshot.availableAmountInCents) : 0,
        pendingInCents: latestSnapshot ? Number(latestSnapshot.pendingAmountInCents) : 0,
        blockedInCents: latestSnapshot ? Number(latestSnapshot.blockedAmountInCents) : 0,
        negativeInCents: latestSnapshot ? Number(latestSnapshot.negativeAmountInCents) : 0,
        lastSyncedAt: latestSnapshot ? latestSnapshot.capturedAt.toISOString() : null
      },
      canIssueInvoices: canIssue
    };
  }

  /**
   * Onboarding enterprise da conta recebedora da academia (CNPJ/Razão Social).
   * Cria subconta dedicada no Asaas e vincula ao `workspaceId`.
   */
  async onboardGymAccount(input: OnboardGymAccountInput): Promise<GymFinancialProfileResult> {
    rejectActiveGymGateway();
  }

  /**
   * Resolve o pagador efetivo para a cobrança (Aluno adulto vs Responsável legal/financeiro vs Pagador customizado).
   */
  async resolveEffectivePayer(
    workspaceId: string,
    params: ResolvePayerParams
  ): Promise<EffectivePayer> { return resolveGymPayer(workspaceId, params); }

  /**
   * Garante que o pagador possua um GatewayCustomer na subconta da academia no Asaas.
   * Evita duplicação cruzada através da chave [workspaceId, payerCpfCnpj].
   */
  async getOrCreatePayerGatewayCustomer(
    workspaceId: string,
    payer: EffectivePayer,
    subAccountId: string
  ) {
    rejectActiveGymGateway();
  }

  /**
   * Cria uma cobrança pontual vinculada à conta bancária/subconta da ACADEMIA.
   * Não mistura recebíveis da academia com a conta pessoal de instrutores ou recepcionistas.
   */
  async createGymBilling(input: CreateGymBillingInput) {
    rejectActiveGymGateway();
  }

  /**
   * Listagem de cobranças da academia com paginação, filtros e detalhes do pagador.
   */
  async listGymBillings(workspaceId: string, filter: ListGymBillingsFilter = {}) {
    const page = Math.max(1, filter.page || 1);
    const limit = Math.min(100, Math.max(1, filter.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = { workspaceId };
    if (filter.status) where.status = filter.status;
    if (filter.enrollmentId) where.enrollmentId = filter.enrollmentId;
    if (filter.studentUserId) where.studentUserId = filter.studentUserId;
    if (filter.payerCpfCnpj) where.payerCpfCnpj = this.cleanDoc(filter.payerCpfCnpj);

    const [total, items] = await Promise.all([
      prisma.studentBilling.count({ where }),
      prisma.studentBilling.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          enrollment: {
            select: {
              id: true,
              planVersion: { select: { name: true } }
            }
          }
        }
      })
    ]);

    // Resolução de nomes dos alunos
    const studentUserIds = Array.from(new Set(items.map((i) => i.studentUserId)));
    const studentUsers = await prisma.user.findMany({
      where: { id: { in: studentUserIds } },
      select: { id: true, name: true, email: true, image: true }
    });
    const userMap = new Map(studentUsers.map((u) => [u.id, u]));

    const billings = items.map((b) => {
      const student = userMap.get(b.studentUserId);
      return {
        id: b.id,
        billingReference: b.billingReference,
        title: b.title,
        description: b.description,
        grossAmountInCents: Number(b.grossAmountInCents),
        gymNetInCents: Number(b.personalNetEstimatedInCents),
        platformFeeInCents: Number(b.platformFeeEstimatedInCents),
        paymentMethod: b.paymentMethod,
        status: b.status,
        dueDate: b.dueDate.toISOString(),
        paidAt: b.paidAt?.toISOString() || null,
        confirmedAt: b.confirmedAt?.toISOString() || null,
        hostedInvoiceUrl: b.hostedInvoiceUrl,
        student: {
          id: b.studentUserId,
          name: student?.name || "Aluno",
          email: student?.email || "",
          image: student?.image || null
        },
        payer: {
          name: b.payerName || student?.name || "Titular",
          cpfCnpjMasked: this.maskDoc(b.payerCpfCnpj || ""),
          isGuardian: Boolean(b.payerGuardianId),
          isThirdParty: Boolean(b.payerUserId && b.payerUserId !== b.studentUserId)
        },
        enrollment: b.enrollment
          ? {
              id: b.enrollment.id,
              planName: b.enrollment.planVersion?.name || "Plano"
            }
          : null,
        createdAt: b.createdAt.toISOString()
      };
    });

    return {
      billings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Sincroniza saldo ao vivo da academia consultando a subconta do Asaas.
   */
  async syncGymBalance(workspaceId: string) {
    rejectActiveGymGateway();
  }
}

export const gymFinancialService = new GymFinancialService();
