import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { isValidCPF, isValidCNPJ } from "@/lib/cpf-validator";
import crypto from "crypto";

export type WalletRateLimitAction =
  | "WALLET_ONBOARDING"
  | "WALLET_PAYOUT"
  | "WALLET_SYNC"
  | "WALLET_RESEND_ACTIVATION"
  | "WALLET_CREATE_BILLING"
  | "WALLET_ACCOUNT_READ"
  | "WALLET_TRANSACTIONS_READ"
  | "STUDENT_FINANCE_READ"
  | "WEBHOOK_INGRESS";

interface RateLimitConfig {
  limit: number;
  windowMs: number;
  errorMessage: string;
}

const WALLET_RATE_LIMIT_POLICIES: Record<WalletRateLimitAction, RateLimitConfig> = {
  WALLET_ONBOARDING: {
    limit: 3,
    windowMs: 10 * 60 * 1000, // 10 minutes
    errorMessage: "Limite de tentativas de abertura de conta financeira atingido. Aguarde alguns minutos."
  },
  WALLET_PAYOUT: {
    limit: 3,
    windowMs: 5 * 60 * 1000, // 5 minutes
    errorMessage: "Muitas solicitações de saque em sequência. Por segurança, aguarde alguns minutos antes de tentar novamente."
  },
  WALLET_SYNC: {
    limit: 5,
    windowMs: 60 * 1000, // 1 minute
    errorMessage: "Limite de sincronização de saldo atingido. Aguarde 1 minuto."
  },
  WALLET_RESEND_ACTIVATION: {
    limit: 2,
    windowMs: 5 * 60 * 1000, // 5 minutes
    errorMessage: "E-mail de ativação já solicitado recentemente. Aguarde alguns minutos antes de reenviar."
  },
  WALLET_CREATE_BILLING: {
    limit: 15,
    windowMs: 60 * 1000, // 1 minute
    errorMessage: "Muitas cobranças geradas em curto período. Aguarde 1 minuto."
  },
  WALLET_ACCOUNT_READ: {
    limit: 30,
    windowMs: 60 * 1000, // 1 minute
    errorMessage: "Muitas consultas à carteira. Tente novamente em instantes."
  },
  WALLET_TRANSACTIONS_READ: {
    limit: 60,
    windowMs: 60 * 1000, // 1 minute
    errorMessage: "Muitas consultas ao extrato. Tente novamente em instantes."
  },
  STUDENT_FINANCE_READ: {
    limit: 30,
    windowMs: 60 * 1000, // 1 minute
    errorMessage: "Muitas consultas financeiras. Tente novamente em instantes."
  },
  WEBHOOK_INGRESS: {
    limit: 300,
    windowMs: 60 * 1000, // 1 minute
    errorMessage: "Limite de taxa de processamento de webhooks excedido."
  }
};

export function extractClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const parts = forwarded.split(",");
    if (parts[0] && parts[0].trim()) {
      return parts[0].trim();
    }
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp && realIp.trim()) {
    return realIp.trim();
  }
  return "127.0.0.1";
}

/**
 * Enforces rate limiting on sensitive wallet operations.
 * Returns { allowed: true } or a standardized 429 response.
 */
export async function enforceWalletRateLimit(
  req: Request,
  action: WalletRateLimitAction,
  userId?: string
): Promise<{ allowed: true } | { allowed: false; response: NextResponse }> {
  const ip = extractClientIp(req);
  const policy = WALLET_RATE_LIMIT_POLICIES[action];
  const identifierKey = userId ? `wallet:${action}:${userId}:${ip}` : `wallet:${action}:${ip}`;

  const limiter = await rateLimit(identifierKey, policy.limit, policy.windowMs);

  if (!limiter.success) {
    const retryAfterSec = Math.max(1, Math.ceil((limiter.reset - Date.now()) / 1000));
    return {
      allowed: false,
      response: NextResponse.json(
        {
          success: false,
          error: policy.errorMessage,
          retryAfter: retryAfterSec
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(retryAfterSec),
            "X-RateLimit-Limit": String(limiter.limit),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(limiter.reset)
          }
        }
      )
    };
  }

  return { allowed: true };
}

/**
 * Constant-time comparison between two secret strings to prevent timing attacks.
 */
export function timingSafeEqualString(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const bufA = Buffer.from(a, "utf-8");
  const bufB = Buffer.from(b, "utf-8");
  if (bufA.length !== bufB.length) {
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Validates and sanitizes a Pix Key strictly according to its declared type.
 */
export function validatePixKey(
  keyType: string,
  rawKey: string
): { isValid: boolean; sanitizedKey: string; error?: string } {
  const cleanKey = (rawKey || "").trim();
  const upperType = (keyType || "").trim().toUpperCase();

  switch (upperType) {
    case "CPF": {
      const digits = cleanKey.replace(/\D/g, "");
      if (!isValidCPF(digits)) {
        return { isValid: false, sanitizedKey: cleanKey, error: "Chave Pix do tipo CPF inválida." };
      }
      return { isValid: true, sanitizedKey: digits };
    }
    case "CNPJ": {
      const digits = cleanKey.replace(/\D/g, "");
      if (!isValidCNPJ(digits)) {
        return { isValid: false, sanitizedKey: cleanKey, error: "Chave Pix do tipo CNPJ inválida." };
      }
      return { isValid: true, sanitizedKey: digits };
    }
    case "EMAIL": {
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(cleanKey) || cleanKey.length > 100) {
        return { isValid: false, sanitizedKey: cleanKey, error: "Chave Pix do tipo E-mail inválida." };
      }
      return { isValid: true, sanitizedKey: cleanKey.toLowerCase() };
    }
    case "PHONE": {
      const digits = cleanKey.replace(/\D/g, "");
      if (digits.length < 10 || digits.length > 13) {
        return { isValid: false, sanitizedKey: cleanKey, error: "Chave Pix do tipo Telefone deve conter DDD e número válido." };
      }
      const formatted = digits.startsWith("55") ? `+${digits}` : `+55${digits}`;
      return { isValid: true, sanitizedKey: formatted };
    }
    case "EVP":
    case "RANDOM": {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(cleanKey)) {
        return { isValid: false, sanitizedKey: cleanKey, error: "Chave Pix Aleatória (EVP) inválida." };
      }
      return { isValid: true, sanitizedKey: cleanKey.toLowerCase() };
    }
    default:
      return { isValid: false, sanitizedKey: cleanKey, error: "Tipo de chave Pix não suportado." };
  }
}

/**
 * Sanitizes PaymentProviderAccount output DTO.
 * Explicitly removes internal API keys, encrypted secrets, and raw BaaS IDs.
 */
export function sanitizeWalletAccount(account: any): any {
  if (!account) return null;

  const balanceSnapshots = Array.isArray(account.balanceSnapshots)
    ? account.balanceSnapshots.map((snap: any) => ({
        availableAmountInCents: snap.availableAmountInCents?.toString() || "0",
        pendingAmountInCents: snap.pendingAmountInCents?.toString() || "0",
        blockedAmountInCents: snap.blockedAmountInCents?.toString() || "0",
        capturedAt: snap.capturedAt instanceof Date ? snap.capturedAt.toISOString() : snap.capturedAt
      }))
    : [];

  const billings = Array.isArray(account.billings)
    ? account.billings.map((b: any) => ({
        id: b.id,
        title: b.title,
        grossAmountInCents: b.grossAmountInCents?.toString() || "0",
        personalNetEstimatedInCents: b.personalNetEstimatedInCents?.toString() || "0",
        status: b.status,
        paymentMethod: b.paymentMethod,
        dueDate: b.dueDate instanceof Date ? b.dueDate.toISOString() : b.dueDate,
        createdAt: b.createdAt instanceof Date ? b.createdAt.toISOString() : b.createdAt,
        hostedInvoiceUrl: b.hostedInvoiceUrl || undefined,
        billingReference: b.billingReference || undefined
      }))
    : [];

  const payouts = Array.isArray(account.payouts)
    ? account.payouts.map((p: any) => ({
        id: p.id,
        amountInCents: p.amountInCents?.toString() || "0",
        destinationMasked: p.destinationMasked || "Chave Pix",
        status: p.status,
        requestedAt: p.requestedAt instanceof Date ? p.requestedAt.toISOString() : p.requestedAt,
        completedAt: p.completedAt instanceof Date ? p.completedAt.toISOString() : p.completedAt
      }))
    : [];

  const ledgerEntries = Array.isArray(account.ledgerEntries)
    ? account.ledgerEntries.map((l: any) => ({
        id: l.id,
        type: l.type,
        direction: l.direction,
        amountInCents: l.amountInCents?.toString() || "0",
        occurredAt: l.occurredAt instanceof Date ? l.occurredAt.toISOString() : l.occurredAt,
        description: l.description
      }))
    : [];

  return {
    id: account.id,
    status: account.status,
    kycStatus: account.kycStatus,
    providerStatus: account.providerStatus,
    legalNameMasked: account.legalNameMasked,
    documentLast4: account.documentLast4,
    payoutDestinationMasked: account.payoutDestinationMasked,
    activationFeeStatus: account.activationFeeStatus,
    approvedAt: account.approvedAt instanceof Date ? account.approvedAt.toISOString() : account.approvedAt,
    createdAt: account.createdAt instanceof Date ? account.createdAt.toISOString() : account.createdAt,
    updatedAt: account.updatedAt instanceof Date ? account.updatedAt.toISOString() : account.updatedAt,
    balanceSnapshots,
    billings,
    payouts,
    ledgerEntries
  };
}

/**
 * Sanitizes Payout request result DTO.
 * Explicitly removes destinationFingerprint and internal transfer references.
 */
export function sanitizePayout(payout: any): any {
  if (!payout) return null;
  return {
    id: payout.id,
    amountInCents: payout.amountInCents?.toString() || "0",
    destinationMasked: payout.destinationMasked || "Chave Pix",
    status: payout.status,
    requestedAt: payout.requestedAt instanceof Date ? payout.requestedAt.toISOString() : payout.requestedAt,
    submittedAt: payout.submittedAt instanceof Date ? payout.submittedAt.toISOString() : payout.submittedAt,
    completedAt: payout.completedAt instanceof Date ? payout.completedAt.toISOString() : payout.completedAt
  };
}

/**
 * Sanitizes Billing creation result DTO.
 */
export function sanitizeBilling(billing: any): any {
  if (!billing) return null;
  return {
    id: billing.id,
    title: billing.title,
    description: billing.description,
    grossAmountInCents: billing.grossAmountInCents?.toString() || "0",
    personalNetEstimatedInCents: billing.personalNetEstimatedInCents?.toString() || "0",
    paymentMethod: billing.paymentMethod,
    status: billing.status,
    dueDate: billing.dueDate instanceof Date ? billing.dueDate.toISOString() : billing.dueDate,
    createdAt: billing.createdAt instanceof Date ? billing.createdAt.toISOString() : billing.createdAt,
    hostedInvoiceUrl: billing.hostedInvoiceUrl || undefined,
    pixCopyPaste: billing.pixPayloadEncrypted || undefined,
    pixExpirationAt: billing.pixExpirationAt instanceof Date ? billing.pixExpirationAt.toISOString() : billing.pixExpirationAt,
    billingReference: billing.billingReference || undefined
  };
}
