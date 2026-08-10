import prisma from "@/lib/prisma";
import { AsaasAdapter } from "../providers/asaas/asaas-adapter";
import {
  PaymentProvider,
  ProviderEnvironment,
  FinancialAccountStatus,
  WalletKycStatus,
  WalletPaymentMethod,
  StudentBillingStatus,
  WalletPayoutStatus,
  LedgerEntryType,
  LedgerDirection
} from "@prisma/client";
import { calculatePlatformFee } from "../domain/fee-calculator";
import { CreateAccountInput } from "../domain/types";
import crypto from "crypto";
import { publishToChannel } from "@/lib/ably";

export class PaymentService {
  private adapter = new AsaasAdapter();

  async getAccountByUserId(personalUserId: string) {
    return prisma.paymentProviderAccount.findUnique({
      where: { personalUserId },
      include: {
        balanceSnapshots: {
          orderBy: { capturedAt: "desc" },
          take: 1
        }
      }
    });
  }

  async onboardPersonalAccount(input: CreateAccountInput) {
    const existing = await prisma.paymentProviderAccount.findUnique({
      where: { personalUserId: input.personalUserId }
    });

    if (existing && (existing.status === FinancialAccountStatus.APPROVED || existing.kycStatus === WalletKycStatus.APPROVED)) {
      return existing;
    }

    const providerEnv = (process.env.ASAAS_ENVIRONMENT || "sandbox") === "production"
      ? ProviderEnvironment.PRODUCTION
      : ProviderEnvironment.SANDBOX;

    try {
      const result = await this.adapter.createFinancialAccount(input);

      if (existing) {
        return await prisma.paymentProviderAccount.update({
          where: { id: existing.id },
          data: {
            providerAccountId: result.providerAccountId,
            status: result.status,
            kycStatus: result.kycStatus,
            providerStatus: result.providerStatus,
            legalNameMasked: result.legalNameMasked,
            documentLast4: result.documentLast4,
            updatedAt: new Date()
          }
        });
      }

      return await prisma.paymentProviderAccount.create({
        data: {
          personalUserId: input.personalUserId,
          provider: PaymentProvider.ASAAS,
          environment: providerEnv,
          providerAccountId: result.providerAccountId,
          status: result.status,
          kycStatus: result.kycStatus,
          providerStatus: result.providerStatus,
          legalNameMasked: result.legalNameMasked,
          documentLast4: result.documentLast4
        }
      });
    } catch (err) {
      if (existing && existing.status !== FinancialAccountStatus.APPROVED) {
        await prisma.paymentProviderAccount.update({
          where: { id: existing.id },
          data: {
            status: FinancialAccountStatus.REJECTED,
            kycStatus: WalletKycStatus.REJECTED,
            updatedAt: new Date()
          }
        }).catch(() => {});
      }
      throw err;
    }
  }

  async syncAccountBalance(personalUserId: string) {
    const account = await prisma.paymentProviderAccount.findUnique({
      where: { personalUserId }
    });

    if (!account) {
      throw new Error("Conta financeira não encontrada para este usuário");
    }

    const pendingBillings = await prisma.studentBilling.findMany({
      where: {
        providerAccountId: account.id,
        status: StudentBillingStatus.PENDING
      }
    });

    for (const billing of pendingBillings) {
      if (!billing.providerBillingId) continue;
      const remotePayment = await this.adapter.getPayment(
        billing.providerBillingId,
        account.providerAccountId
      );

      if (
        remotePayment &&
        ["RECEIVED", "CONFIRMED", "DUNNING_RECEIVED", "RECEIVED_IN_CASH"].includes(remotePayment.status)
      ) {
        const isSettled = remotePayment.status === "RECEIVED" || remotePayment.status === "DUNNING_RECEIVED" || remotePayment.status === "RECEIVED_IN_CASH";
        const newStatus = isSettled ? StudentBillingStatus.SETTLED : StudentBillingStatus.CONFIRMED;

        await prisma.$transaction(async (tx) => {
          await tx.studentBilling.update({
            where: { id: billing.id },
            data: {
              status: newStatus,
              confirmedAt: billing.confirmedAt || new Date(),
              settledAt: isSettled ? new Date() : billing.settledAt,
              paidAt: billing.paidAt || new Date()
            }
          });

          await tx.walletLedgerEntry.upsert({
            where: { idempotencyKey: `LEDGER_CONFIRM_${billing.id}_SYNC` },
            create: {
              providerAccountId: account.id,
              billingId: billing.id,
              idempotencyKey: `LEDGER_CONFIRM_${billing.id}_SYNC`,
              type: isSettled ? LedgerEntryType.PAYMENT_SETTLED : LedgerEntryType.PAYMENT_CONFIRMED,
              direction: LedgerDirection.CREDIT,
              amountInCents: billing.personalNetEstimatedInCents,
              occurredAt: new Date(),
              description: `Pagamento sincronizado para ${billing.title}`
            },
            update: {}
          });
        });

        const studentMember = await prisma.workspaceMember.findFirst({
          where: { userId: billing.studentUserId, role: "STUDENT" }
        });

        if (studentMember) {
          await prisma.workspacePayment.updateMany({
            where: {
              workspaceId: studentMember.workspaceId,
              status: "pendente"
            },
            data: { status: "pago" }
          });

          await publishToChannel(`workspace:${studentMember.workspaceId}`, "financial:updated", {
            type: "FINANCIAL_PAYMENT_UPDATED",
            workspaceId: studentMember.workspaceId,
            billingId: billing.id,
            timestamp: new Date().toISOString()
          });
        }

        await publishToChannel(`user:${personalUserId}`, "wallet:updated", {
          type: "BALANCE_UPDATED",
          billingId: billing.id,
          timestamp: new Date().toISOString()
        });

        if (billing.studentUserId) {
          await publishToChannel(`user:${billing.studentUserId}`, "wallet:updated", {
            type: "BALANCE_UPDATED",
            billingId: billing.id,
            timestamp: new Date().toISOString()
          });
        }
      }
    }

    const balanceResult = await this.adapter.getBalance(account.providerAccountId);

    const snapshot = await prisma.walletBalanceSnapshot.create({
      data: {
        providerAccountId: account.id,
        availableAmountInCents: balanceResult.availableAmountInCents,
        pendingAmountInCents: balanceResult.pendingAmountInCents,
        blockedAmountInCents: balanceResult.blockedAmountInCents,
        negativeAmountInCents: balanceResult.negativeAmountInCents,
        currency: "BRL",
        capturedAt: new Date()
      }
    });

    await prisma.paymentProviderAccount.update({
      where: { id: account.id },
      data: { lastProviderSyncAt: new Date() }
    });

    return snapshot;
  }

  async resendAccountActivationEmail(personalUserId: string): Promise<boolean> {
    const account = await prisma.paymentProviderAccount.findUnique({
      where: { personalUserId }
    });

    if (!account) {
      throw new Error("Conta financeira não encontrada para este usuário.");
    }

    return this.adapter.resendAccountActivationEmail(account.providerAccountId);
  }

  async createStudentBilling(params: {
    personalUserId: string;
    studentUserId: string;
    studentCpfCnpj?: string;
    title: string;
    description?: string;
    amountInCents: bigint;
    paymentMethod: WalletPaymentMethod;
    dueDate: Date;
    idempotencyKey: string;
  }) {
    const account = await prisma.paymentProviderAccount.findUnique({
      where: { personalUserId: params.personalUserId }
    });

    if (!account) {
      throw new Error("Você precisa ativar sua conta financeira antes de criar cobranças");
    }

    const existingBilling = await prisma.studentBilling.findUnique({
      where: { idempotencyKey: params.idempotencyKey }
    });

    if (existingBilling) {
      return existingBilling;
    }

    const student = await prisma.user.findUnique({
      where: { id: params.studentUserId }
    });

    if (!student) {
      throw new Error("Aluno não encontrado");
    }

    const studentCpfCnpj = params.studentCpfCnpj || student.cpfCnpj || undefined;

    const customerResult = await this.adapter.createOrGetCustomer(
      {
        personalUserId: params.personalUserId,
        studentUserId: params.studentUserId,
        name: student.name || "Aluno AtlasFit",
        email: student.email || `aluno_${student.id}@atlasfit.app`,
        cpfCnpj: studentCpfCnpj
      },
      account.providerAccountId
    );

    const providerEnv = (process.env.ASAAS_ENVIRONMENT || "sandbox") === "production"
      ? ProviderEnvironment.PRODUCTION
      : ProviderEnvironment.SANDBOX;

    await prisma.gatewayCustomer.upsert({
      where: {
        provider_environment_personalUserId_studentUserId: {
          provider: PaymentProvider.ASAAS,
          environment: providerEnv,
          personalUserId: params.personalUserId,
          studentUserId: params.studentUserId
        }
      },
      create: {
        provider: PaymentProvider.ASAAS,
        environment: providerEnv,
        personalUserId: params.personalUserId,
        studentUserId: params.studentUserId,
        providerCustomerId: customerResult.providerCustomerId,
        nameSnapshot: customerResult.nameSnapshot,
        documentLast4: customerResult.documentLast4
      },
      update: {
        providerCustomerId: customerResult.providerCustomerId,
        nameSnapshot: customerResult.nameSnapshot,
        documentLast4: customerResult.documentLast4
      }
    });

    const feePercent = parseFloat(process.env.ATLASFIT_FEE_PERCENTAGE || "3.5");
    const feeFixedCents = BigInt(Math.round(parseFloat(process.env.ATLASFIT_FEE_FIXED || "1.00") * 100));

    const feeCalc = calculatePlatformFee({
      grossAmountInCents: params.amountInCents,
      platformPercentage: feePercent,
      platformFixedInCents: feeFixedCents
    });

    const billingRef = `BILL_${crypto.randomBytes(8).toString("hex").toUpperCase()}`;

    const chargeResult = await this.adapter.createOneTimeCharge(
      {
        providerAccountId: account.providerAccountId,
        providerCustomerId: customerResult.providerCustomerId,
        billingReference: billingRef,
        idempotencyKey: params.idempotencyKey,
        title: params.title,
        description: params.description,
        amountInCents: params.amountInCents,
        paymentMethod: params.paymentMethod,
        dueDate: params.dueDate,
        platformFeePercent: feePercent,
        platformFeeFixedInCents: feeFixedCents
      },
      account.providerAccountId
    );

    const billing = await prisma.studentBilling.create({
      data: {
        providerAccountId: account.id,
        studentUserId: params.studentUserId,
        gatewayCustomerId: customerResult.providerCustomerId,
        providerBillingId: chargeResult.providerBillingId,
        providerStatus: chargeResult.providerStatus,
        idempotencyKey: params.idempotencyKey,
        billingReference: billingRef,
        title: params.title,
        description: params.description,
        grossAmountInCents: params.amountInCents,
        platformFeeEstimatedInCents: feeCalc.platformFeeInCents,
        personalNetEstimatedInCents: feeCalc.personalNetInCents,
        feeRuleVersionId: "v1.0",
        paymentMethod: params.paymentMethod,
        status: StudentBillingStatus.PENDING,
        dueDate: params.dueDate,
        hostedInvoiceUrl: chargeResult.hostedInvoiceUrl,
        pixPayloadEncrypted: chargeResult.pixPayloadEncrypted,
        pixExpirationAt: chargeResult.pixExpirationAt
      }
    });

    await prisma.paymentSplit.create({
      data: {
        billingId: billing.id,
        receiverType: "PLATFORM",
        splitType: "PERCENTAGE_PLUS_FIXED",
        configuredValue: feePercent,
        estimatedAmountInCents: feeCalc.platformFeeInCents,
        providerStatus: "PENDING"
      }
    });

    const studentMember = await prisma.workspaceMember.findFirst({
      where: { userId: params.studentUserId, role: "STUDENT" }
    });

    if (studentMember) {
      await prisma.workspacePayment.create({
        data: {
          workspaceId: studentMember.workspaceId,
          studentName: student.name || "Aluno",
          planName: params.title || "Mensalidade Atlas Pay",
          amount: Number(params.amountInCents) / 100,
          status: "pendente",
          method: params.paymentMethod === WalletPaymentMethod.CREDIT_CARD ? "CREDIT_CARD" : "PIX",
          billingOrigin: "AUTOMATIC"
        }
      });
    }

    return billing;
  }

  async requestPayout(params: {
    personalUserId: string;
    amountInCents: bigint;
    pixKeyType: string;
    pixKey: string;
    idempotencyKey: string;
  }) {
    const account = await prisma.paymentProviderAccount.findUnique({
      where: { personalUserId: params.personalUserId }
    });

    if (!account) {
      throw new Error("Conta financeira não encontrada");
    }

    const minPayout = BigInt(process.env.PAYMENT_MIN_PAYOUT_IN_CENTS || "1000");
    if (params.amountInCents < minPayout) {
      throw new Error(`O valor mínimo para saque é R$ ${(Number(minPayout) / 100).toFixed(2)}`);
    }

    const latestSnapshot = await prisma.walletBalanceSnapshot.findFirst({
      where: { providerAccountId: account.id },
      orderBy: { capturedAt: "desc" }
    });

    if (!latestSnapshot || latestSnapshot.availableAmountInCents < params.amountInCents) {
      const freshSnapshot = await this.syncAccountBalance(params.personalUserId);
      if (freshSnapshot.availableAmountInCents < params.amountInCents) {
        throw new Error("Saldo disponível insuficiente para realizar o saque");
      }
    }

    const payoutResult = await this.adapter.requestPayout(
      {
        providerAccountId: account.providerAccountId,
        requestedByUserId: params.personalUserId,
        idempotencyKey: params.idempotencyKey,
        amountInCents: params.amountInCents,
        pixKeyType: params.pixKeyType,
        pixKey: params.pixKey
      },
      account.providerAccountId
    );

    const pixFingerprint = crypto.createHash("sha256").update(params.pixKey).digest("hex");

    return prisma.$transaction(async (tx) => {
      const payout = await tx.walletPayoutRequest.create({
        data: {
          providerAccountId: account.id,
          requestedByUserId: params.personalUserId,
          idempotencyKey: params.idempotencyKey,
          amountInCents: params.amountInCents,
          destinationMasked: payoutResult.destinationMasked,
          destinationFingerprint: pixFingerprint,
          providerTransferId: payoutResult.providerTransferId,
          providerStatus: payoutResult.providerStatus,
          status: WalletPayoutStatus.PROCESSING,
          submittedAt: new Date()
        }
      });

      await tx.walletLedgerEntry.create({
        data: {
          providerAccountId: account.id,
          payoutId: payout.id,
          idempotencyKey: `LEDGER_PAYOUT_${payout.id}`,
          type: LedgerEntryType.PAYOUT_RESERVED,
          direction: LedgerDirection.DEBIT,
          amountInCents: params.amountInCents,
          occurredAt: new Date(),
          description: `Saque solicitado para chave Pix ${payoutResult.destinationMasked}`
        }
      });

      return payout;
    });
  }

  async getWalletOverview(personalUserId: string) {
    let account = await prisma.paymentProviderAccount.findUnique({
      where: { personalUserId },
      include: {
        balanceSnapshots: {
          orderBy: { capturedAt: "desc" },
          take: 1
        },
        billings: {
          orderBy: { createdAt: "desc" },
          take: 20
        },
        payouts: {
          orderBy: { requestedAt: "desc" },
          take: 10
        },
        ledgerEntries: {
          orderBy: { occurredAt: "desc" },
          take: 30
        }
      }
    });

    if (!account) {
      return null;
    }

    if (account.providerAccountId && account.status !== FinancialAccountStatus.APPROVED && account.status !== FinancialAccountStatus.REJECTED) {
      try {
        const remoteStatus = await this.adapter.getFinancialAccountStatus(account.providerAccountId);
        if (remoteStatus.status !== account.status) {
          account = await prisma.paymentProviderAccount.update({
            where: { id: account.id },
            data: {
              status: remoteStatus.status,
              kycStatus: remoteStatus.kycStatus,
              providerStatus: remoteStatus.providerStatus,
              updatedAt: new Date()
            },
            include: {
              balanceSnapshots: { orderBy: { capturedAt: "desc" }, take: 1 },
              billings: { orderBy: { createdAt: "desc" }, take: 20 },
              payouts: { orderBy: { requestedAt: "desc" }, take: 10 },
              ledgerEntries: { orderBy: { occurredAt: "desc" }, take: 30 }
            }
          });
        }
      } catch {}
    }

    return account;
  }

  async cancelStudentSubscription(studentUserId: string, workspaceId: string) {
    const member = await prisma.workspaceMember.findFirst({
      where: { userId: studentUserId, workspaceId, role: "STUDENT" },
      include: {
        workspace: {
          select: { ownerId: true }
        }
      }
    });

    if (!member) {
      throw new Error("Aluno não encontrado no workspace");
    }

    if ((member as any).asaasSubscriptionId && member.workspace.ownerId) {
      const personalAccount = await prisma.paymentProviderAccount.findUnique({
        where: { personalUserId: member.workspace.ownerId }
      });

      if (personalAccount?.providerAccountId) {
        try {
          await this.adapter.cancelSubscription((member as any).asaasSubscriptionId, personalAccount.providerAccountId);
        } catch (err) {
          console.error("ASAAS_CANCEL_SUBSCRIPTION_ERROR", err);
        }
      }
    }

    await prisma.workspaceMember.update({
      where: { id: member.id },
      data: {
        billingIsActive: false,
        billingControlType: "MANUAL",
        billingSource: "MANUAL",
        asaasSubscriptionId: null
      }
    });

    await publishToChannel(`user:${member.workspace.ownerId}`, "wallet:updated", {
      type: "STUDENT_RECURRENCE_CANCELLED",
      studentUserId,
      workspaceId
    });

    await publishToChannel(`workspace:${workspaceId}`, "financial:updated", {
      type: "STUDENT_RECURRENCE_CANCELLED",
      studentUserId,
      workspaceId
    });

    return true;
  }
}

export const paymentService = new PaymentService();
