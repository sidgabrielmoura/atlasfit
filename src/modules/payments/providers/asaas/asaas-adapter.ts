import {
  PaymentProviderAdapter,
  CreateAccountInput,
  AccountStatusResult,
  CreateCustomerInput,
  CustomerResult,
  CreateChargeInput,
  ChargeResult,
  GetBalanceResult,
  RequestPayoutInput,
  PayoutResult,
  NormalizedFinancialEvent
} from "../../domain/types";
import { FinancialAccountStatus, WalletKycStatus, WalletPaymentMethod } from "@prisma/client";
import crypto from "crypto";
import prisma from "@/lib/prisma";
import { decryptSubAccountApiKey } from "./subaccount-crypto";
import { calculatePlatformFee } from "../../domain/fee-calculator";
import { timingSafeEqualString } from "../../security/wallet-security";
import { z } from "zod";

export function asaasEnvironment(): "PRODUCTION" | "SANDBOX" {
  const value = process.env.ASAAS_ENVIRONMENT || "sandbox";
  if (value !== "sandbox" && value !== "production") throw new Error("ASAAS_ENVIRONMENT_INVALID");
  return value === "production" ? "PRODUCTION" : "SANDBOX";
}

export class AsaasAdapter implements PaymentProviderAdapter {
  constructor(private readonly resolveSubAccountKey = async (providerAccountId: string): Promise<string> => {
    const environment = asaasEnvironment();
    const account = await prisma.paymentProviderAccount.findUnique({
      where: { provider_environment_providerAccountId: { provider: "ASAAS", environment, providerAccountId } },
      select: { providerApiKeyEncrypted: true, providerApiKeyKeyVersion: true, deletedAt: true, closedAt: true },
    });
    if (!account?.providerApiKeyEncrypted || account.providerApiKeyKeyVersion !== "v1" || account.deletedAt || account.closedAt) throw new Error("ASAAS_SUBACCOUNT_CREDENTIAL_UNAVAILABLE");
    return decryptSubAccountApiKey(account.providerApiKeyEncrypted);
  }) {}
  private get baseUrl(): string {
    return asaasEnvironment() === "PRODUCTION"
      ? "https://api.asaas.com/v3"
      : "https://api-sandbox.asaas.com/v3";
  }

  private get masterApiKey(): string {
    const key = (process.env.ASAAS_API_KEY || "").trim();
    if (!key) throw new Error("ASAAS_MASTER_CREDENTIAL_UNAVAILABLE");
    return key;
  }

  private get headers(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      "access_token": this.masterApiKey,
      "User-Agent": "AtlasFit/1.0"
    };
  }

  private async getSubAccountHeaders(subAccountId: string): Promise<Record<string, string>> {
    if (!subAccountId) throw new Error("ASAAS_SUBACCOUNT_REQUIRED");
    const key = await this.resolveSubAccountKey(subAccountId);
    if (!key.trim()) throw new Error("ASAAS_SUBACCOUNT_CREDENTIAL_UNAVAILABLE");
    return {
      "Content-Type": "application/json",
      "access_token": key,
      "User-Agent": "AtlasFit/1.0"
    };
  }

  private parseAsaasError(errorText: string): string {
    try {
      const parsed = JSON.parse(errorText);
      if (parsed.errors && Array.isArray(parsed.errors) && parsed.errors.length > 0) {
        const descs = parsed.errors
          .map((e: { code?: string; description?: string }) => {
            const desc = e.description || "";
            const lower = desc.toLowerCase();
            if (lower.includes("já pertence") || lower.includes("já cadastrado") || lower.includes("pertence a outra conta")) {
              return "Este CPF/CNPJ já está cadastrado no Asaas em outra conta. Por favor, utilize um documento diferente.";
            }
            if (lower.includes("inválido") && lower.includes("cpf")) {
              return "CPF/CNPJ informado é inválido. Por favor, verifique a digitação.";
            }
            return desc;
          })
          .filter(Boolean);
        if (descs.length > 0) {
          return descs.join("; ");
        }
      }
    } catch {}
    return errorText || "Erro de validação no processamento do cadastro Asaas.";
  }

  async findExistingSubAccountByEmailOrCpf(email: string, cleanCpfCnpj?: string): Promise<any | null> {
    // A shared email alone cannot authorize attaching a financial account.
    if (!cleanCpfCnpj) return null;
    const res = await fetch(`${this.baseUrl}/accounts?email=${encodeURIComponent(email)}&limit=100`, { method: "GET", headers: this.headers });
    if (!res.ok) throw new Error(`ASAAS_ACCOUNT_LOOKUP_FAILED:${res.status}`);
    const page = z.object({ hasMore: z.boolean(), data: z.array(z.object({ id: z.string().min(1), email: z.string(), cpfCnpj: z.string() }).passthrough()) }).parse(await res.json());
    const matched = page.data.filter(account => account.email.toLowerCase() === email.toLowerCase() && account.cpfCnpj.replace(/\D/g, "") === cleanCpfCnpj);
    if (page.hasMore || matched.length > 1 || (page.data.length && matched.length !== 1)) throw new Error("ASAAS_ACCOUNT_IDENTITY_REVIEW_REQUIRED");
    return matched.length ? matched[0] : null;
  }

  async createFinancialAccount(input: CreateAccountInput): Promise<AccountStatusResult> {
    const cleanCpfCnpj = input.cpfCnpj.replace(/\D/g, "");
    const cleanPhone = input.mobilePhone.replace(/\D/g, "");
    const cleanPostalCode = input.postalCode.replace(/\D/g, "");

    const payload: Record<string, unknown> = {
      name: input.name,
      email: input.email,
      cpfCnpj: cleanCpfCnpj,
      mobilePhone: cleanPhone,
      phone: cleanPhone,
      postalCode: cleanPostalCode,
      address: input.address,
      addressNumber: input.addressNumber,
      province: input.province,
      companyType: input.companyType || (cleanCpfCnpj.length > 11 ? "LIMITED" : "INDIVIDUAL"),
      incomeValue: input.incomeValue || 5000
    };

    if (input.birthDate) {
      payload.birthDate = input.birthDate;
    }

    const res = await fetch(`${this.baseUrl}/accounts`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errorText = await res.text();
      const lower = errorText.toLowerCase();
      const isAlreadyExists =
        lower.includes("já está em uso") ||
        lower.includes("já pertence") ||
        lower.includes("já cadastrado") ||
        lower.includes("pertence a outra conta");

      if (isAlreadyExists) {
        const existingSubAccount = await this.findExistingSubAccountByEmailOrCpf(input.email, cleanCpfCnpj);
        if (existingSubAccount) {
          const docLast4 = (existingSubAccount.cpfCnpj || cleanCpfCnpj).replace(/\D/g, "").slice(-4);
          const maskedName = (existingSubAccount.name || input.name).split(" ").map((n: string, i: number) => (i === 0 ? n : n[0] + ".")).join(" ");
          const isApproved = existingSubAccount.status === "APPROVED" || Boolean(existingSubAccount.walletId);

          return {
            providerAccountId: existingSubAccount.id,
            providerApiKey: existingSubAccount.apiKey ?? undefined,
            status: isApproved ? FinancialAccountStatus.APPROVED : FinancialAccountStatus.ONBOARDING,
            kycStatus: isApproved ? WalletKycStatus.APPROVED : WalletKycStatus.PENDING,
            providerStatus: existingSubAccount.status || (isApproved ? "APPROVED" : "AWAITING_APPROVAL"),
            legalNameMasked: maskedName,
            documentLast4: docLast4
          };
        }
      }

      throw new Error(this.parseAsaasError(errorText));
    }

    const data = await res.json();
    const docLast4 = input.cpfCnpj.replace(/\D/g, "").slice(-4);
    const maskedName = input.name.split(" ").map((n, i) => (i === 0 ? n : n[0] + ".")).join(" ");

    return {
      providerAccountId: data.id,
      providerApiKey: data.apiKey ?? undefined,
      status: FinancialAccountStatus.ONBOARDING,
      kycStatus: WalletKycStatus.PENDING,
      providerStatus: data.status || "AWAITING_APPROVAL",
      legalNameMasked: maskedName,
      documentLast4: docLast4
    };
  }

  async getFinancialAccountStatus(providerAccountId: string): Promise<AccountStatusResult> {
    const res = await fetch(`${this.baseUrl}/accounts/${providerAccountId}`, {
      method: "GET",
      headers: this.headers
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(this.parseAsaasError(errorText));
    }

    const data = await res.json();

    let status: FinancialAccountStatus = FinancialAccountStatus.ONBOARDING;
    let kycStatus: WalletKycStatus = WalletKycStatus.PENDING;

    if (data.status === "APPROVED" || data.walletId) {
      status = FinancialAccountStatus.APPROVED;
      kycStatus = WalletKycStatus.APPROVED;
    } else if (data.status === "REJECTED") {
      status = FinancialAccountStatus.REJECTED;
      kycStatus = WalletKycStatus.REJECTED;
    } else if (data.status === "AWAITING_APPROVAL") {
      status = FinancialAccountStatus.UNDER_REVIEW;
      kycStatus = WalletKycStatus.UNDER_REVIEW;
    }

    return {
      providerAccountId: data.id,
      status,
      kycStatus,
      providerStatus: data.status
    };
  }

  async resendAccountActivationEmail(subAccountId: string): Promise<boolean> {
    const res = await fetch(`${this.baseUrl}/accounts/${subAccountId}/resendActivationLink`, {
      method: "POST",
      headers: this.headers
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(this.parseAsaasError(errorText));
    }

    return true;
  }

  async createOrGetCustomer(input: CreateCustomerInput, subAccountId: string): Promise<CustomerResult> {
    const cleanCpfCnpj = input.cpfCnpj ? input.cpfCnpj.replace(/\D/g, "") : undefined;

    const searchRes = await fetch(`${this.baseUrl}/customers?email=${encodeURIComponent(input.email)}`, {
      method: "GET",
      headers: await this.getSubAccountHeaders(subAccountId)
    });

    if (searchRes.ok) {
      const searchData = await searchRes.json();
      if (searchData.data && searchData.data.length > 0) {
        const existing = searchData.data[0];
        const updatePayload: Record<string, unknown> = { notificationDisabled: true };
        if (cleanCpfCnpj && !existing.cpfCnpj) {
          updatePayload.cpfCnpj = cleanCpfCnpj;
        }
        await fetch(`${this.baseUrl}/customers/${existing.id}`, {
          method: "PUT",
          headers: await this.getSubAccountHeaders(subAccountId),
          body: JSON.stringify(updatePayload)
        }).catch(() => {});

        return {
          providerCustomerId: existing.id,
          nameSnapshot: existing.name,
          documentLast4: cleanCpfCnpj ? cleanCpfCnpj.slice(-4) : existing.cpfCnpj?.slice(-4)
        };
      }
    }

    const payload: Record<string, unknown> = {
      name: input.name,
      email: input.email,
      cpfCnpj: cleanCpfCnpj,
      externalReference: input.studentUserId || input.payerGuardianId || input.payerUserId || undefined,
      notificationDisabled: true
    };
    if (input.phone) {
      const cleanP = input.phone.replace(/\D/g, "");
      payload.mobilePhone = cleanP;
      payload.phone = cleanP;
    }

    const res = await fetch(`${this.baseUrl}/customers`, {
      method: "POST",
      headers: await this.getSubAccountHeaders(subAccountId),
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(this.parseAsaasError(errorText));
    }

    const data = await res.json();
    return {
      providerCustomerId: data.id,
      nameSnapshot: data.name,
      documentLast4: cleanCpfCnpj ? cleanCpfCnpj.slice(-4) : undefined
    };
  }

  async createOneTimeCharge(input: CreateChargeInput, subAccountId: string): Promise<ChargeResult> {
    if (input.amountInCents <= BigInt(0) || input.amountInCents > BigInt(Number.MAX_SAFE_INTEGER) || !Number.isFinite(input.platformFeePercent) || input.platformFeePercent < 0 || input.platformFeeFixedInCents < BigInt(0)) throw new Error("INVALID_CHARGE_AMOUNT_OR_FEE");
    const grossVal = Number((Number(input.amountInCents) / 100).toFixed(2));
    const fee = calculatePlatformFee({ grossAmountInCents: input.amountInCents, platformPercentage: input.platformFeePercent, platformFixedInCents: input.platformFeeFixedInCents });
    const platformFeeVal = Number(fee.platformFeeInCents) / 100;

    const masterWalletId = input.masterWalletId || process.env.ASAAS_MASTER_WALLET_ID;
    if (fee.platformFeeInCents > BigInt(0) && !masterWalletId) throw new Error("ASAAS_SPLIT_WALLET_REQUIRED");

    const payload: Record<string, unknown> = {
      customer: input.providerCustomerId,
      billingType: input.paymentMethod === WalletPaymentMethod.CREDIT_CARD ? "CREDIT_CARD" : "PIX",
      value: grossVal,
      dueDate: input.dueDate.toISOString().split("T")[0],
      description: input.title,
      externalReference: input.billingReference
    };

    if (masterWalletId && fee.platformFeeInCents > BigInt(0)) {
      payload.split = [
        {
          walletId: masterWalletId,
          fixedValue: platformFeeVal
        }
      ];
    }

    const res = await fetch(`${this.baseUrl}/payments`, {
      method: "POST",
      headers: await this.getSubAccountHeaders(subAccountId),
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(this.parseAsaasError(errorText));
    }

    const data = z.object({ id: z.string().min(1), status: z.string().min(1), invoiceUrl: z.string().nullable().optional(), bankSlipUrl: z.string().nullable().optional() }).passthrough().parse(await res.json());
    let pixPayload: string | undefined = undefined;
    let pixExpiration: Date | undefined = undefined;

    if (input.paymentMethod === WalletPaymentMethod.PIX) {
      const qrRes = await fetch(`${this.baseUrl}/payments/${data.id}/pixQrCode`, {
        method: "GET",
        headers: await this.getSubAccountHeaders(subAccountId)
      });
      if (qrRes.ok) {
        const qrData = await qrRes.json();
        pixPayload = qrData.payload;
        if (qrData.expirationDate) {
          pixExpiration = new Date(qrData.expirationDate);
        }
      }
    }

    const estimatedFeeCents = fee.platformFeeInCents;
    const netEstimatedCents = input.amountInCents - estimatedFeeCents;

    return {
      providerBillingId: data.id,
      providerStatus: data.status,
      grossAmountInCents: input.amountInCents,
      platformFeeEstimatedInCents: estimatedFeeCents,
      personalNetEstimatedInCents: netEstimatedCents,
      hostedInvoiceUrl: data.invoiceUrl || data.bankSlipUrl || undefined,
      pixPayloadEncrypted: pixPayload,
      pixExpirationAt: pixExpiration
    };
  }

  async getPayment(providerBillingId: string, subAccountId: string) {
      const res = await fetch(`${this.baseUrl}/payments/${providerBillingId}`, {
        method: "GET",
        headers: await this.getSubAccountHeaders(subAccountId)
      });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`ASAAS_PAYMENT_LOOKUP_FAILED:${res.status}`);
      return await res.json();
  }

  /** Read-only recovery after an uncertain POST; ambiguity never permits another charge. */
  async findPaymentByReference(reference: string, subAccountId: string) {
    const res = await fetch(`${this.baseUrl}/payments?externalReference=${encodeURIComponent(reference)}&limit=100`, { method: "GET", headers: await this.getSubAccountHeaders(subAccountId) });
    if (!res.ok) throw new Error(`ASAAS_PAYMENT_LOOKUP_FAILED:${res.status}`);
    const page = z.object({ hasMore: z.boolean(), data: z.array(z.object({
      id: z.string().min(1), externalReference: z.string(), customer: z.string().min(1),
      value: z.number().finite().positive(), status: z.string().min(1),
      invoiceUrl: z.string().optional().nullable(),
    }).passthrough()) }).parse(await res.json());
    if (page.hasMore || page.data.length > 1 || page.data.some(payment => payment.externalReference !== reference)) throw new Error("ASAAS_AMBIGUOUS_PAYMENT_REFERENCE");
    return page.data.length === 0 ? null : page.data[0];
  }

  async getMasterBalance(): Promise<GetBalanceResult> {
      const res = await fetch(`${this.baseUrl}/finance/balance`, {
        method: "GET",
        headers: this.headers
      });

      if (!res.ok) {
        throw new Error(`ASAAS_BALANCE_LOOKUP_FAILED:${res.status}`);
      }

      const data = await res.json();
      const availableCents = this.balanceCents(data);

      return {
        availableAmountInCents: availableCents,
        pendingAmountInCents: BigInt(0),
        blockedAmountInCents: BigInt(0),
        negativeAmountInCents: availableCents < BigInt(0) ? -availableCents : BigInt(0)
      };
  }

  async getBalance(providerAccountId: string): Promise<GetBalanceResult> {
    const res = await fetch(`${this.baseUrl}/finance/balance`, {
      method: "GET",
      headers: await this.getSubAccountHeaders(providerAccountId)
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(this.parseAsaasError(errorText));
    }

    const data = await res.json();
    const availableCents = this.balanceCents(data);

    return {
      availableAmountInCents: availableCents,
      pendingAmountInCents: BigInt(0),
      blockedAmountInCents: BigInt(0),
      negativeAmountInCents: availableCents < BigInt(0) ? -availableCents : BigInt(0)
    };
  }

  async requestPayout(input: RequestPayoutInput, subAccountId: string): Promise<PayoutResult> {
    const val = Number(input.amountInCents) / 100;
    const payload = {
      value: val,
      pixAddressKey: input.pixKey,
      pixAddressKeyType: input.pixKeyType,
      scheduleDate: new Date().toISOString().split("T")[0]
    };

    const res = await fetch(`${this.baseUrl}/transfers`, {
      method: "POST",
      headers: await this.getSubAccountHeaders(subAccountId),
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(this.parseAsaasError(errorText));
    }

    const data = await res.json();
    const masked = input.pixKey.length > 6
      ? input.pixKey.substring(0, 3) + "***" + input.pixKey.substring(input.pixKey.length - 3)
      : "***";

    return {
      providerTransferId: data.id,
      providerStatus: data.status || "PENDING",
      destinationMasked: masked
    };
  }

  async createSubscription(input: {
    customerId: string;
    billingType: "CREDIT_CARD" | "PIX" | "BOLETO" | "UNDEFINED";
    value: number;
    nextDueDate: string;
    cycle: "MONTHLY" | "WEEKLY" | "BIMONTHLY" | "QUARTERLY" | "SEMIANNUALLY" | "YEARLY";
    description: string;
    externalReference?: string;
    creditCard?: {
      holderName: string;
      number: string;
      expiryMonth: string;
      expiryYear: string;
      ccv: string;
    };
    creditCardHolderInfo?: {
      name: string;
      email: string;
      cpfCnpj: string;
      postalCode: string;
      addressNumber: string;
      phone: string;
    };
    creditCardToken?: string;
    split?: Array<{ walletId: string; fixedValue?: number; percentualValue?: number }>;
  }, subAccountId: string): Promise<any> {
    const payload: any = {
      customer: input.customerId,
      billingType: input.billingType,
      value: input.value,
      nextDueDate: input.nextDueDate,
      cycle: input.cycle,
      description: input.description,
      externalReference: input.externalReference
    };

    if (input.creditCardToken) {
      payload.creditCardToken = input.creditCardToken;
    } else if (input.creditCard) {
      payload.creditCard = input.creditCard;
      if (input.creditCardHolderInfo) {
        payload.creditCardHolderInfo = input.creditCardHolderInfo;
      }
    }

    if (input.split && input.split.length > 0) {
      payload.split = input.split;
    }

    const res = await fetch(`${this.baseUrl}/subscriptions`, {
      method: "POST",
      headers: await this.getSubAccountHeaders(subAccountId),
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(this.parseAsaasError(errorText));
    }

    return await res.json();
  }

  async getSubscription(subscriptionId: string, subAccountId: string): Promise<any | null> {
      const res = await fetch(`${this.baseUrl}/subscriptions/${subscriptionId}`, {
        method: "GET",
        headers: await this.getSubAccountHeaders(subAccountId)
      });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`ASAAS_SUBSCRIPTION_LOOKUP_FAILED:${res.status}`);
      return await res.json();
  }

  async updateSubscription(subscriptionId: string, updateData: any, subAccountId: string): Promise<any> {
    const res = await fetch(`${this.baseUrl}/subscriptions/${subscriptionId}`, {
      method: "PUT",
      headers: await this.getSubAccountHeaders(subAccountId),
      body: JSON.stringify(updateData)
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(this.parseAsaasError(errorText));
    }

    return await res.json();
  }

  async getSubscriptionPayments(subscriptionId: string, subAccountId: string): Promise<any[]> {
    const payments: any[] = [];
    const headers = await this.getSubAccountHeaders(subAccountId);
    for (let offset = 0; ; offset += 100) {
      const res = await fetch(`${this.baseUrl}/subscriptions/${subscriptionId}/payments?limit=100&offset=${offset}`, { method: "GET", headers });
      if (!res.ok) throw new Error(`ASAAS_SUBSCRIPTION_PAYMENTS_LOOKUP_FAILED:${res.status}`);
      const json = await res.json();
      if (!Array.isArray(json.data) || typeof json.hasMore !== "boolean") throw new Error("ASAAS_INVALID_PAYMENT_PAGE");
      payments.push(...json.data);
      if (!json.hasMore) return payments;
      if (!json.data.length || offset >= 99900) throw new Error("ASAAS_PAYMENT_PAGINATION_INCOMPLETE");
    }
  }

  async tokenizeCreditCard(input: {
    customer: string;
    creditCard: {
      holderName: string;
      number: string;
      expiryMonth: string;
      expiryYear: string;
      ccv: string;
    };
    creditCardHolderInfo: {
      name: string;
      email: string;
      cpfCnpj: string;
      postalCode: string;
      addressNumber: string;
      phone: string;
    };
  }, subAccountId: string): Promise<{ creditCardToken: string; creditCardBrand?: string; creditCardNumber?: string }> {
    const res = await fetch(`${this.baseUrl}/creditCard/tokenize`, {
      method: "POST",
      headers: await this.getSubAccountHeaders(subAccountId),
      body: JSON.stringify(input)
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(this.parseAsaasError(errorText));
    }

    return await res.json();
  }

  async cancelSubscription(subscriptionId: string, subAccountId: string): Promise<boolean> {
    const res = await fetch(`${this.baseUrl}/subscriptions/${subscriptionId}`, {
      method: "DELETE",
      headers: await this.getSubAccountHeaders(subAccountId)
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(this.parseAsaasError(errorText));
    }

    return true;
  }

  async verifyWebhook(headers: Record<string, string>, rawBody: string): Promise<boolean> {
    const token = headers["asaas-access-token"] || headers["Asaas-Access-Token"] || headers["ASAAS-ACCESS-TOKEN"];
    const secret = process.env.ASAAS_WEBHOOK_SECRET;
    if (!secret || !token) return false;
    return timingSafeEqualString(token, secret);
  }

  async normalizeWebhook(rawBody: string): Promise<NormalizedFinancialEvent> {
    const resource = z.object({ id: z.string().min(1).max(255) }).passthrough();
    const parsed = z.object({ id: z.string().min(1).max(255).optional(), event: z.string().min(1).max(100), dateCreated: z.string().optional(), payment: resource.optional(), transfer: resource.optional(), account: z.union([resource, z.string().min(1).max(255)]).optional() }).passthrough().parse(JSON.parse(rawBody));
    const occurredAt = parsed.dateCreated ? new Date(parsed.dateCreated) : new Date();
    if (!Number.isFinite(occurredAt.getTime())) throw new Error("Data do webhook inválida.");
    // Stable fallback retains retry identity even when an older provider event omitted its ID.
    const eventId = parsed.id || `BODY_SHA256_${crypto.createHash("sha256").update(rawBody).digest("hex")}`;
    return {
      providerEventId: eventId,
      eventType: parsed.event,
      resourceType: parsed.payment ? "PAYMENT" : parsed.transfer ? "TRANSFER" : "ACCOUNT",
      resourceId: parsed.payment?.id || parsed.transfer?.id || (typeof parsed.account === "string" ? parsed.account : parsed.account?.id) || "",
      occurredAt,
      rawPayload: parsed
    };
  }

  async transferToMaster(amountInCents: bigint, subAccountApiKey: string, externalReference?: string): Promise<{ providerTransferId: string; status: string }> {
    const val = Number((Number(amountInCents) / 100).toFixed(2));
    const masterWalletId = process.env.ASAAS_MASTER_WALLET_ID;

    if (!masterWalletId) {
      throw new Error("ASAAS_MASTER_WALLET_ID não configurado no ambiente");
    }

    const payload: Record<string, unknown> = {
      value: val,
      walletId: masterWalletId
    };

    if (externalReference) {
      payload.externalReference = externalReference;
    }

    const res = await fetch(`${this.baseUrl}/transfers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "access_token": subAccountApiKey,
        "User-Agent": "AtlasFit/1.0"
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const status = res.status;
      const errorText = await res.text();
      if (status === 401 || status === 403) {
        throw new Error(`${status} ${this.parseAsaasError(errorText)}`);
      }
      throw new Error(this.parseAsaasError(errorText));
    }

    const data = await res.json();
    return {
      providerTransferId: data.id,
      status: data.status || "PENDING"
    };
  }

  async getTransferStatus(
    providerTransferId: string | undefined,
    externalReference: string | undefined,
    subAccountApiKey: string
  ): Promise<{ id: string; status: string; externalReference?: string } | null> {
    if (providerTransferId) {
      const res = await fetch(`${this.baseUrl}/transfers/${providerTransferId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "access_token": subAccountApiKey,
          "User-Agent": "AtlasFit/1.0"
        }
      });

      if (res.ok) {
        const data = await res.json();
        return { id: data.id, status: data.status, externalReference: data.externalReference };
      }

      if (res.status === 404) {
        return null;
      }
    }

    if (externalReference) {
      const res = await fetch(`${this.baseUrl}/transfers?externalReference=${encodeURIComponent(externalReference)}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "access_token": subAccountApiKey,
          "User-Agent": "AtlasFit/1.0"
        }
      });

      if (res.ok) {
        const data = await res.json();
        if (data.data && data.data.length > 0) {
          const t = data.data[0];
          return { id: t.id, status: t.status, externalReference: t.externalReference };
        }
      }
    }

    return null;
  }

  async refundPayment(params: {
    providerBillingId: string;
    subAccountId: string;
    valueInCents?: bigint;
    description?: string;
  }): Promise<{ status: string; value: number }> {
    const payload: Record<string, unknown> = {};
    if (params.valueInCents !== undefined) {
      if (params.valueInCents <= BigInt(0) || params.valueInCents > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("INVALID_REFUND_AMOUNT");
      payload.value = Number(params.valueInCents) / 100;
    }
    if (params.description) {
      payload.description = params.description;
    }

    const res = await fetch(`${this.baseUrl}/payments/${params.providerBillingId}/refund`, {
      method: "POST",
      headers: await this.getSubAccountHeaders(params.subAccountId),
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(this.parseAsaasError(errorText));
    }

    const data = await res.json();
    return {
      status: z.string().min(1).parse(data.status),
      value: z.number().finite().nonnegative().parse(data.value)
    };
  }

  private balanceCents(data: unknown): bigint {
    const { balance } = z.object({ balance: z.number().finite() }).parse(data);
    const cents = Math.round(balance * 100);
    if (!Number.isSafeInteger(cents)) throw new Error("ASAAS_INVALID_BALANCE");
    return BigInt(cents);
  }
}
