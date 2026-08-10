import {
  PaymentProvider,
  ProviderEnvironment,
  FinancialAccountStatus,
  WalletKycStatus,
  WalletPaymentMethod,
  StudentBillingStatus,
  WalletSubscriptionStatus,
  WalletPayoutStatus,
  LedgerEntryType,
  LedgerDirection
} from "@prisma/client";

export interface CreateAccountInput {
  personalUserId: string;
  name: string;
  email: string;
  cpfCnpj: string;
  mobilePhone: string;
  postalCode: string;
  address: string;
  addressNumber: string;
  province: string;
  companyType?: string;
  incomeValue?: number;
  birthDate?: string;
}

export interface AccountStatusResult {
  providerAccountId: string;
  status: FinancialAccountStatus;
  kycStatus: WalletKycStatus;
  providerStatus?: string;
  legalNameMasked?: string;
  documentLast4?: string;
  providerApiKey?: string;
}

export interface CreateCustomerInput {
  personalUserId: string;
  studentUserId: string;
  name: string;
  email: string;
  cpfCnpj?: string;
}

export interface CustomerResult {
  providerCustomerId: string;
  nameSnapshot: string;
  documentLast4?: string;
}

export interface CreateChargeInput {
  providerAccountId: string;
  providerCustomerId: string;
  billingReference: string;
  idempotencyKey: string;
  title: string;
  description?: string;
  amountInCents: bigint;
  paymentMethod: WalletPaymentMethod;
  dueDate: Date;
  platformFeePercent: number;
  platformFeeFixedInCents: bigint;
  masterWalletId?: string;
}

export interface ChargeResult {
  providerBillingId: string;
  providerStatus: string;
  grossAmountInCents: bigint;
  platformFeeEstimatedInCents: bigint;
  personalNetEstimatedInCents: bigint;
  hostedInvoiceUrl?: string;
  pixPayloadEncrypted?: string;
  pixExpirationAt?: Date;
}

export interface GetBalanceResult {
  availableAmountInCents: bigint;
  pendingAmountInCents: bigint;
  blockedAmountInCents: bigint;
  negativeAmountInCents: bigint;
}

export interface RequestPayoutInput {
  providerAccountId: string;
  requestedByUserId: string;
  idempotencyKey: string;
  amountInCents: bigint;
  pixKeyType: string;
  pixKey: string;
}

export interface PayoutResult {
  providerTransferId: string;
  providerStatus: string;
  destinationMasked: string;
}

export interface NormalizedFinancialEvent {
  providerEventId: string;
  eventType: string;
  resourceType: string;
  resourceId: string;
  occurredAt: Date;
  rawPayload: Record<string, unknown>;
}

export interface PaymentProviderAdapter {
  createFinancialAccount(input: CreateAccountInput): Promise<AccountStatusResult>;
  getFinancialAccountStatus(providerAccountId: string): Promise<AccountStatusResult>;
  resendAccountActivationEmail(subAccountId: string): Promise<boolean>;
  createOrGetCustomer(input: CreateCustomerInput, subAccountId: string): Promise<CustomerResult>;
  createOneTimeCharge(input: CreateChargeInput, subAccountId: string): Promise<ChargeResult>;
  getBalance(providerAccountId: string): Promise<GetBalanceResult>;
  requestPayout(input: RequestPayoutInput, subAccountId: string): Promise<PayoutResult>;
  verifyWebhook(headers: Record<string, string>, rawBody: string): Promise<boolean>;
  normalizeWebhook(rawBody: string): Promise<NormalizedFinancialEvent>;
}
