import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const { account } = vi.hoisted(() => ({ account: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ default: { paymentProviderAccount: { findUnique: account } } }));
import { AsaasAdapter } from "../providers/asaas/asaas-adapter";
import { encryptSubAccountApiKey } from "../providers/asaas/subaccount-crypto";

describe("Asaas: credencial da conta, split e fatos de conciliação", () => {
  const request = vi.fn();
  const charge = { providerAccountId: "sub-1", providerCustomerId: "cus-1", billingReference: "BILL_1", idempotencyKey: "key-1", title: "Mensalidade", amountInCents: BigInt(10000), paymentMethod: "CREDIT_CARD" as const, dueDate: new Date("2026-10-20"), platformFeePercent: 3.5, platformFeeFixedInCents: BigInt(100) };
  const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
  beforeEach(() => {
    vi.resetAllMocks(); vi.stubGlobal("fetch", request);
    vi.stubEnv("ASAAS_ENVIRONMENT", "sandbox"); vi.stubEnv("ASAAS_API_KEY", "master-test-key");
    vi.stubEnv("ASAAS_ENCRYPTION_SECRET", "test-encryption-secret-32-chars-ok!"); vi.stubEnv("ASAAS_MASTER_WALLET_ID", "platform-wallet");
    const key = encryptSubAccountApiKey("subaccount-test-key");
    account.mockResolvedValue({ providerApiKeyEncrypted: key.encrypted, providerApiKeyKeyVersion: key.keyVersion, closedAt: null, deletedAt: null });
  });
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
  it("envia a credencial da subconta e consulta somente o ambiente correspondente", async () => {
    request.mockResolvedValue(response({ id: "pay-1", status: "PENDING" }));
    await new AsaasAdapter().getPayment("pay-1", "sub-1");
    expect(account).toHaveBeenCalledWith(expect.objectContaining({ where: { provider_environment_providerAccountId: { provider: "ASAAS", environment: "SANDBOX", providerAccountId: "sub-1" } } }));
    expect(request).toHaveBeenCalledWith("https://api-sandbox.asaas.com/v3/payments/pay-1", { method: "GET", headers: { "Content-Type": "application/json", "access_token": "subaccount-test-key", "User-Agent": "AtlasFit/1.0" } });
  });
  it("produção usa origem e credencial do ambiente de produção", async () => {
    vi.stubEnv("ASAAS_ENVIRONMENT", "production"); request.mockResolvedValue(response({ balance: 1 }));
    await new AsaasAdapter().getBalance("sub-1");
    expect(request.mock.calls[0][0]).toBe("https://api.asaas.com/v3/finance/balance");
    expect(account.mock.calls[0][0].where.provider_environment_providerAccountId.environment).toBe("PRODUCTION");
  });
  it.each([null, { providerApiKeyEncrypted: null }, { providerApiKeyEncrypted: "bad", providerApiKeyKeyVersion: "v2" }, { providerApiKeyEncrypted: "bad", providerApiKeyKeyVersion: "v1", closedAt: new Date() }])("ausência ou indisponibilidade da credencial não usa chave master", async value => {
    account.mockResolvedValue(value);
    await expect(new AsaasAdapter().getBalance("sub-1")).rejects.toThrow("ASAAS_SUBACCOUNT_CREDENTIAL_UNAVAILABLE"); expect(request).not.toHaveBeenCalled();
  });
  it("cria split com centavos iguais ao cálculo local", async () => {
    request.mockResolvedValue(response({ id: "pay-1", status: "PENDING" }));
    const result = await new AsaasAdapter().createOneTimeCharge(charge, "sub-1");
    expect(JSON.parse(request.mock.calls[0][1].body)).toMatchObject({ value: 100, externalReference: "BILL_1", split: [{ walletId: "platform-wallet", fixedValue: 4.5 }] });
    expect(result).toMatchObject({ platformFeeEstimatedInCents: BigInt(450), personalNetEstimatedInCents: BigInt(9550) });
  });
  it("erro de split não repete cobrança nem remove taxa", async () => {
    request.mockResolvedValue(response({ errors: [{ description: "split inválido" }] }, 400));
    await expect(new AsaasAdapter().createOneTimeCharge(charge, "sub-1")).rejects.toThrow("split inválido"); expect(request).toHaveBeenCalledTimes(1);
  });
  it("taxa sem carteira de destino recusa antes de enviar cobrança", async () => {
    vi.stubEnv("ASAAS_MASTER_WALLET_ID", "");
    await expect(new AsaasAdapter().createOneTimeCharge(charge, "sub-1")).rejects.toThrow("ASAAS_SPLIT_WALLET_REQUIRED"); expect(request).not.toHaveBeenCalled();
  });
  it("404 é ausência; falha autenticada ou rede mantém resultado incerto", async () => {
    const adapter = new AsaasAdapter(); request.mockResolvedValueOnce(response({}, 404)); expect(await adapter.getPayment("pay-1", "sub-1")).toBeNull();
    request.mockResolvedValueOnce(response({}, 401)); await expect(adapter.getPayment("pay-1", "sub-1")).rejects.toThrow("ASAAS_PAYMENT_LOOKUP_FAILED:401");
    request.mockRejectedValueOnce(new Error("timeout")); await expect(adapter.getPayment("pay-1", "sub-1")).rejects.toThrow("timeout");
  });
  it("saldo indisponível não vira snapshot zero", async () => {
    request.mockResolvedValueOnce(response({}, 503)); await expect(new AsaasAdapter().getMasterBalance()).rejects.toThrow("ASAAS_BALANCE_LOOKUP_FAILED:503");
    request.mockResolvedValueOnce(response({})); await expect(new AsaasAdapter().getBalance("sub-1")).rejects.toThrow();
  });
  it("saldo negativo preserva débito em centavos", async () => {
    request.mockResolvedValue(response({ balance: -12.34 })); expect(await new AsaasAdapter().getBalance("sub-1")).toMatchObject({ availableAmountInCents: -BigInt(1234), negativeAmountInCents: BigInt(1234) });
  });
  it("paginação de pagamentos não omite segunda página", async () => {
    request.mockResolvedValueOnce(response({ data: [{ id: "one" }], hasMore: true })).mockResolvedValueOnce(response({ data: [{ id: "two" }], hasMore: false }));
    expect(await new AsaasAdapter().getSubscriptionPayments("subscription-1", "sub-1")).toEqual([{ id: "one" }, { id: "two" }]);
    expect(request.mock.calls[1][0]).toContain("offset=100");
  });
  it("paginação vazia com hasMore recusa inventário incompleto", async () => {
    request.mockResolvedValue(response({ data: [], hasMore: true })); await expect(new AsaasAdapter().getSubscriptionPayments("subscription-1", "sub-1")).rejects.toThrow("ASAAS_PAYMENT_PAGINATION_INCOMPLETE");
  });
  it("referência ambígua ou divergente recusa recuperação", async () => {
    const payment = { id: "pay-1", externalReference: "BILL_1", customer: "cus-1", value: 100, status: "PENDING" };
    request.mockResolvedValueOnce(response({ data: [payment, { ...payment, id: "pay-2" }], hasMore: false }));
    await expect(new AsaasAdapter().findPaymentByReference("BILL_1", "sub-1")).rejects.toThrow("ASAAS_AMBIGUOUS_PAYMENT_REFERENCE");
    request.mockResolvedValueOnce(response({ data: [{ ...payment, externalReference: "other" }], hasMore: false }));
    await expect(new AsaasAdapter().findPaymentByReference("BILL_1", "sub-1")).rejects.toThrow("ASAAS_AMBIGUOUS_PAYMENT_REFERENCE");
  });
  it("referência única retorna fato sem enviar novo POST", async () => {
    request.mockResolvedValue(response({ data: [{ id: "pay-1", externalReference: "BILL_1", customer: "cus-1", value: 100, status: "PENDING" }], hasMore: false }));
    expect(await new AsaasAdapter().findPaymentByReference("BILL_1", "sub-1")).toMatchObject({ id: "pay-1" }); expect(request.mock.calls[0][1].method).toBe("GET");
  });
  it.each([BigInt(0), -BigInt(1)])("estorno de %s não vira estorno total", async valueInCents => {
    await expect(new AsaasAdapter().refundPayment({ providerBillingId: "pay-1", subAccountId: "sub-1", valueInCents })).rejects.toThrow("INVALID_REFUND_AMOUNT"); expect(request).not.toHaveBeenCalled();
  });
  it("resposta incompleta não inventa confirmação de estorno", async () => {
    request.mockResolvedValue(response({})); await expect(new AsaasAdapter().refundPayment({ providerBillingId: "pay-1", subAccountId: "sub-1", valueInCents: BigInt(100) })).rejects.toThrow();
  });
  it("master ausente não lê .env implicitamente", async () => {
    vi.stubEnv("ASAAS_API_KEY", ""); await expect(new AsaasAdapter().getMasterBalance()).rejects.toThrow("ASAAS_MASTER_CREDENTIAL_UNAVAILABLE"); expect(request).not.toHaveBeenCalled();
  });
  it("ambiente escrito incorretamente não escolhe sandbox silenciosamente", async () => {
    vi.stubEnv("ASAAS_ENVIRONMENT", "prodution");
    await expect(new AsaasAdapter().getBalance("sub-1")).rejects.toThrow("ASAAS_ENVIRONMENT_INVALID");
    expect(request).not.toHaveBeenCalled();
  });
  it("e-mail igual com CPF divergente não vincula conta financeira", async () => {
    request.mockResolvedValue(response({ hasMore: false, data: [{ id: "foreign-account", email: "trainer@example.invalid", cpfCnpj: "11144477735" }] }));
    await expect(new AsaasAdapter().findExistingSubAccountByEmailOrCpf("trainer@example.invalid", "52998224725")).rejects.toThrow("ASAAS_ACCOUNT_IDENTITY_REVIEW_REQUIRED");
  });
  it("busca exige identidade completa e única, mantendo falha de autenticação", async () => {
    const adapter = new AsaasAdapter();
    expect(await adapter.findExistingSubAccountByEmailOrCpf("trainer@example.invalid")).toBeNull();
    expect(request).not.toHaveBeenCalled();
    request.mockResolvedValueOnce(response({}, 401));
    await expect(adapter.findExistingSubAccountByEmailOrCpf("trainer@example.invalid", "52998224725")).rejects.toThrow("ASAAS_ACCOUNT_LOOKUP_FAILED:401");
    const identity = { id: "sub-1", email: "trainer@example.invalid", cpfCnpj: "529.982.247-25" };
    request.mockResolvedValueOnce(response({ hasMore: false, data: [identity, { ...identity, id: "sub-2" }] }));
    await expect(adapter.findExistingSubAccountByEmailOrCpf(identity.email, "52998224725")).rejects.toThrow("ASAAS_ACCOUNT_IDENTITY_REVIEW_REQUIRED");
    request.mockResolvedValueOnce(response({ hasMore: false, data: [identity] }));
    expect(await adapter.findExistingSubAccountByEmailOrCpf(identity.email, "52998224725")).toMatchObject({ id: "sub-1" });
  });
});
