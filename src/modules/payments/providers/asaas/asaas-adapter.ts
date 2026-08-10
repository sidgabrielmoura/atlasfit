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
import fs from "fs";
import path from "path";

export class AsaasAdapter implements PaymentProviderAdapter {
  private get baseUrl(): string {
    const env = process.env.ASAAS_ENVIRONMENT || "sandbox";
    return env === "production"
      ? "https://www.asaas.com/api/v3"
      : "https://sandbox.asaas.com/api/v3";
  }

  private get masterApiKey(): string {
    let key = (process.env.ASAAS_API_KEY || "").trim();
    if (!key || key.length < 50 || !key.startsWith("$aact_")) {
      try {
        const envPath = path.join(process.cwd(), ".env");
        if (fs.existsSync(envPath)) {
          const content = fs.readFileSync(envPath, "utf-8");
          for (const line of content.split("\n")) {
            const trimmed = line.trim();
            if (trimmed.startsWith("ASAAS_API_KEY=")) {
              key = trimmed.substring("ASAAS_API_KEY=".length).trim();
              break;
            }
          }
        }
      } catch {}
    }

    key = key.replace(/^['"]+|['"]+$/g, "").trim();
    if (key.includes("#")) {
      key = key.split("#")[0].trim();
    }
    return key;
  }

  private get headers(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      "access_token": this.masterApiKey,
      "User-Agent": "AtlasFit/1.0"
    };
  }

  private getSubAccountHeaders(subAccountId: string): Record<string, string> {
    return {
      "Content-Type": "application/json",
      "access_token": this.masterApiKey,
      "asaas-account": subAccountId,
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
      throw new Error(this.parseAsaasError(errorText));
    }

    const data = await res.json();
    const docLast4 = input.cpfCnpj.replace(/\D/g, "").slice(-4);
    const maskedName = input.name.split(" ").map((n, i) => (i === 0 ? n : n[0] + ".")).join(" ");

    return {
      providerAccountId: data.id,
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
      headers: this.getSubAccountHeaders(subAccountId)
    });

    if (searchRes.ok) {
      const searchData = await searchRes.json();
      if (searchData.data && searchData.data.length > 0) {
        const existing = searchData.data[0];
        if (cleanCpfCnpj && !existing.cpfCnpj) {
          await fetch(`${this.baseUrl}/customers/${existing.id}`, {
            method: "POST",
            headers: this.getSubAccountHeaders(subAccountId),
            body: JSON.stringify({ cpfCnpj: cleanCpfCnpj })
          });
        }
        return {
          providerCustomerId: existing.id,
          nameSnapshot: existing.name,
          documentLast4: cleanCpfCnpj ? cleanCpfCnpj.slice(-4) : existing.cpfCnpj?.slice(-4)
        };
      }
    }

    const payload = {
      name: input.name,
      email: input.email,
      cpfCnpj: cleanCpfCnpj,
      externalReference: input.studentUserId
    };

    const res = await fetch(`${this.baseUrl}/customers`, {
      method: "POST",
      headers: this.getSubAccountHeaders(subAccountId),
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
    const grossVal = Number((Number(input.amountInCents) / 100).toFixed(2));
    const rawFee = Number(input.platformFeeFixedInCents) / 100 + (grossVal * (input.platformFeePercent / 100));
    const platformFeeVal = Number(rawFee.toFixed(2));

    const masterWalletId = input.masterWalletId || process.env.ASAAS_MASTER_WALLET_ID;

    const payload: Record<string, unknown> = {
      customer: input.providerCustomerId,
      billingType: input.paymentMethod === WalletPaymentMethod.CREDIT_CARD ? "CREDIT_CARD" : "PIX",
      value: grossVal,
      dueDate: input.dueDate.toISOString().split("T")[0],
      description: input.title,
      externalReference: input.billingReference
    };

    if (masterWalletId && masterWalletId !== subAccountId) {
      payload.split = [
        {
          walletId: masterWalletId,
          fixedValue: platformFeeVal
        }
      ];
    }

    let res = await fetch(`${this.baseUrl}/payments`, {
      method: "POST",
      headers: this.getSubAccountHeaders(subAccountId),
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errorText = await res.text();
      const parsedError = this.parseAsaasError(errorText);

      if (payload.split && (parsedError.includes("split para sua própria carteira") || parsedError.toLowerCase().includes("split"))) {
        delete payload.split;
        res = await fetch(`${this.baseUrl}/payments`, {
          method: "POST",
          headers: this.getSubAccountHeaders(subAccountId),
          body: JSON.stringify(payload)
        });
        if (!res.ok) {
          const retryErrorText = await res.text();
          throw new Error(this.parseAsaasError(retryErrorText));
        }
      } else {
        throw new Error(parsedError);
      }
    }

    const data = await res.json();
    let pixPayload: string | undefined = undefined;
    let pixExpiration: Date | undefined = undefined;

    if (input.paymentMethod === WalletPaymentMethod.PIX) {
      const qrRes = await fetch(`${this.baseUrl}/payments/${data.id}/pixQrCode`, {
        method: "GET",
        headers: this.getSubAccountHeaders(subAccountId)
      });
      if (qrRes.ok) {
        const qrData = await qrRes.json();
        pixPayload = qrData.payload;
        if (qrData.expirationDate) {
          pixExpiration = new Date(qrData.expirationDate);
        }
      }
    }

    const estimatedFeeCents = BigInt(Math.round(platformFeeVal * 100));
    const netEstimatedCents = input.amountInCents - estimatedFeeCents;

    return {
      providerBillingId: data.id,
      providerStatus: data.status,
      grossAmountInCents: input.amountInCents,
      platformFeeEstimatedInCents: estimatedFeeCents,
      personalNetEstimatedInCents: netEstimatedCents,
      hostedInvoiceUrl: data.invoiceUrl || data.bankSlipUrl,
      pixPayloadEncrypted: pixPayload,
      pixExpirationAt: pixExpiration
    };
  }

  async getPayment(providerBillingId: string, subAccountId: string) {
    try {
      const res = await fetch(`${this.baseUrl}/payments/${providerBillingId}`, {
        method: "GET",
        headers: this.getSubAccountHeaders(subAccountId)
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  async getMasterBalance(): Promise<GetBalanceResult> {
    try {
      const res = await fetch(`${this.baseUrl}/finance/balance`, {
        method: "GET",
        headers: this.headers
      });

      if (!res.ok) {
        return {
          availableAmountInCents: BigInt(0),
          pendingAmountInCents: BigInt(0),
          blockedAmountInCents: BigInt(0),
          negativeAmountInCents: BigInt(0)
        };
      }

      const data = await res.json();
      const availableCents = BigInt(Math.round((data.balance || 0) * 100));

      return {
        availableAmountInCents: availableCents,
        pendingAmountInCents: BigInt(0),
        blockedAmountInCents: BigInt(0),
        negativeAmountInCents: availableCents < BigInt(0) ? -availableCents : BigInt(0)
      };
    } catch {
      return {
        availableAmountInCents: BigInt(0),
        pendingAmountInCents: BigInt(0),
        blockedAmountInCents: BigInt(0),
        negativeAmountInCents: BigInt(0)
      };
    }
  }

  async getBalance(providerAccountId: string): Promise<GetBalanceResult> {
    const res = await fetch(`${this.baseUrl}/finance/balance`, {
      method: "GET",
      headers: this.getSubAccountHeaders(providerAccountId)
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(this.parseAsaasError(errorText));
    }

    const data = await res.json();
    const availableCents = BigInt(Math.round((data.balance || 0) * 100));

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
      headers: this.getSubAccountHeaders(subAccountId),
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

  async cancelSubscription(subscriptionId: string, subAccountId: string): Promise<boolean> {
    const res = await fetch(`${this.baseUrl}/subscriptions/${subscriptionId}`, {
      method: "DELETE",
      headers: this.getSubAccountHeaders(subAccountId)
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(this.parseAsaasError(errorText));
    }

    return true;
  }

  async verifyWebhook(headers: Record<string, string>, rawBody: string): Promise<boolean> {
    const token = headers["asaas-access-token"] || headers["Asaas-Access-Token"];
    const secret = process.env.ASAAS_WEBHOOK_SECRET;
    if (!secret || !token) return false;
    return token === secret;
  }

  async normalizeWebhook(rawBody: string): Promise<NormalizedFinancialEvent> {
    const parsed = JSON.parse(rawBody);
    const eventId = parsed.id || parsed.event + "_" + (parsed.payment?.id || parsed.transfer?.id || Date.now());

    return {
      providerEventId: eventId,
      eventType: parsed.event || "UNKNOWN",
      resourceType: parsed.payment ? "PAYMENT" : parsed.transfer ? "TRANSFER" : "ACCOUNT",
      resourceId: parsed.payment?.id || parsed.transfer?.id || parsed.account?.id || "",
      occurredAt: parsed.dateCreated ? new Date(parsed.dateCreated) : new Date(),
      rawPayload: parsed
    };
  }
}
