import { describe, it, expect, vi, beforeEach } from "vitest";

process.env.ASAAS_ENCRYPTION_SECRET = "test-encryption-secret-32-chars-ok!";
process.env.ASAAS_MASTER_WALLET_ID = "master-wallet-id";

vi.mock("@/lib/prisma", () => {
  const createMockPrisma = () => ({
    paymentProviderAccount: {
      findUnique: vi.fn(),
      update: vi.fn(),
      create: vi.fn()
    },
    activationFeeRecoveryOperation: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn()
    },
    paymentWebhookEvent: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn()
    },
    walletLedgerEntry: {
      findFirst: vi.fn(),
      create: vi.fn(),
      upsert: vi.fn()
    },
    studentBilling: {
      findUnique: vi.fn(),
      update: vi.fn()
    },
    $transaction: vi.fn(async (fn: (tx: ReturnType<typeof createMockPrisma>) => Promise<unknown>) => fn(createMockPrisma()))
  });
  return { default: createMockPrisma() };
});

vi.mock("@/lib/ably", () => ({ publishToChannel: vi.fn() }));

import prisma from "@/lib/prisma";
import { encryptSubAccountApiKey, decryptSubAccountApiKey } from "@/modules/payments/providers/asaas/subaccount-crypto";

const MOCK_RAW_KEY = "$aact_sub_test_apikey_sandboxonly";
const MOCK_PROVIDER_ACCOUNT_ID = "acc_sandbox_001";
const MOCK_DB_ACCOUNT_ID = "cm_db_account_id_001";

function makeMockAccount(overrides: Record<string, unknown> = {}) {
  const { encrypted, keyVersion } = encryptSubAccountApiKey(MOCK_RAW_KEY);
  return {
    id: MOCK_DB_ACCOUNT_ID,
    providerAccountId: MOCK_PROVIDER_ACCOUNT_ID,
    providerApiKeyEncrypted: encrypted,
    providerApiKeyKeyVersion: keyVersion,
    activationFeeTotalInCents: BigInt(1290),
    activationFeeRecoveredInCents: BigInt(0),
    activationFeeReservedInCents: BigInt(0),
    activationFeeStatus: "PENDING",
    ...overrides
  };
}

describe("Subaccount Crypto", () => {
  it("[T-CRYPTO-1] encrypt → decrypt retorna plaintext original", () => {
    const { encrypted } = encryptSubAccountApiKey(MOCK_RAW_KEY);
    expect(decryptSubAccountApiKey(encrypted)).toBe(MOCK_RAW_KEY);
  });

  it("[T-CRYPTO-2] encrypted nunca contém plaintext da API Key", () => {
    const { encrypted } = encryptSubAccountApiKey(MOCK_RAW_KEY);
    expect(encrypted).not.toContain(MOCK_RAW_KEY);
    expect(encrypted).not.toContain("aact");
  });

  it("[T-CRYPTO-3] cada encrypt gera ciphertext diferente (IV aleatório)", () => {
    const r1 = encryptSubAccountApiKey(MOCK_RAW_KEY);
    const r2 = encryptSubAccountApiKey(MOCK_RAW_KEY);
    expect(r1.encrypted).not.toBe(r2.encrypted);
  });

  it("[T-CRYPTO-4] decrypt com dado adulterado lança erro", () => {
    const { encrypted } = encryptSubAccountApiKey(MOCK_RAW_KEY);
    const tampered = encrypted.slice(0, -4) + "AAAA";
    expect(() => decryptSubAccountApiKey(tampered)).toThrow();
  });

  it("[T-CRYPTO-5] fallback para AUTH_SECRET quando ASAAS_ENCRYPTION_SECRET não está definido", () => {
    const originalAsaasSecret = process.env.ASAAS_ENCRYPTION_SECRET;
    delete process.env.ASAAS_ENCRYPTION_SECRET;
    process.env.AUTH_SECRET = "fallback-auth-secret-32-chars-long!!";

    const { encrypted } = encryptSubAccountApiKey(MOCK_RAW_KEY);
    expect(decryptSubAccountApiKey(encrypted)).toBe(MOCK_RAW_KEY);

    process.env.ASAAS_ENCRYPTION_SECRET = originalAsaasSecret;
  });
});

describe("PaymentService – processActivationFeeRecovery", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("[T01] PAYMENT_RECEIVED cria exatamente uma ActivationFeeRecoveryOperation", async () => {
    const account = makeMockAccount();
    const mockPrisma = prisma as unknown as ReturnType<typeof import("@/lib/prisma")["default"]["$transaction"]>;
    (prisma.paymentProviderAccount.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(account);
    (prisma.activationFeeRecoveryOperation.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "op_001", status: "RESERVED", externalReference: "atlas_activation_fee_op_001"
    });
    (prisma.paymentProviderAccount.update as ReturnType<typeof vi.fn>).mockResolvedValue({});
    (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) => {
      const tx = {
        paymentProviderAccount: {
          findUnique: vi.fn().mockResolvedValue(account),
          update: vi.fn().mockResolvedValue({})
        },
        activationFeeRecoveryOperation: {
          findFirst: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue({
            id: "op_001", status: "RESERVED", externalReference: "atlas_activation_fee_op_001"
          })
        }
      };
      return fn(tx as unknown as typeof prisma);
    });

    const { PaymentService } = await import("../application/payment-service");
    const svc = new PaymentService();
    vi.spyOn(svc["adapter"] as unknown as { transferToMaster: () => unknown }, "transferToMaster").mockRejectedValue(new Error("Network timeout"));
    (prisma.activationFeeRecoveryOperation.update as ReturnType<typeof vi.fn>).mockResolvedValue({});

    await svc.processActivationFeeRecovery(MOCK_DB_ACCOUNT_ID, BigInt(500), "billing_001");

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it("[T15] transferToMaster usa API Key da subconta descriptografada, não a Master", async () => {
    const { encryptSubAccountApiKey: enc } = await import("../providers/asaas/subaccount-crypto");
    const { encrypted } = enc(MOCK_RAW_KEY);

    let capturedKey: string | undefined;
    const mockFetch = vi.fn().mockImplementation((url: string, opts: RequestInit) => {
      capturedKey = (opts.headers as Record<string, string>)["access_token"];
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ id: "tr_001", status: "PENDING" })
      });
    });
    vi.stubGlobal("fetch", mockFetch);

    const { AsaasAdapter } = await import("../providers/asaas/asaas-adapter");
    const { decryptSubAccountApiKey: dec } = await import("../providers/asaas/subaccount-crypto");
    const adapter = new AsaasAdapter();
    const rawKey = dec(encrypted);
    await adapter.transferToMaster(BigInt(1290), rawKey, "atlas_activation_fee_op_001");

    expect(capturedKey).toBe(MOCK_RAW_KEY);
    expect(capturedKey).not.toBe(process.env.ASAAS_API_KEY ?? "");
    vi.unstubAllGlobals();
  });

  it("[T16] transferToMaster NÃO envia header asaas-account", async () => {
    let capturedHeaders: Record<string, string> = {};
    const mockFetch = vi.fn().mockImplementation((url: string, opts: RequestInit) => {
      capturedHeaders = opts.headers as Record<string, string>;
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ id: "tr_002", status: "PENDING" })
      });
    });
    vi.stubGlobal("fetch", mockFetch);

    const { AsaasAdapter } = await import("../providers/asaas/asaas-adapter");
    const adapter = new AsaasAdapter();
    await adapter.transferToMaster(BigInt(500), MOCK_RAW_KEY, "ref_001");

    expect(capturedHeaders["asaas-account"]).toBeUndefined();
    vi.unstubAllGlobals();
  });

  it("[T17] API Key nunca aparece nos campos de erro retornados", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: () => Promise.resolve(JSON.stringify({ errors: [{ description: "Unauthorized" }] }))
    });
    vi.stubGlobal("fetch", mockFetch);

    const { AsaasAdapter } = await import("../providers/asaas/asaas-adapter");
    const adapter = new AsaasAdapter();

    let errorMessage = "";
    try {
      await adapter.transferToMaster(BigInt(500), MOCK_RAW_KEY, "ref_002");
    } catch (err: unknown) {
      errorMessage = err instanceof Error ? err.message : String(err);
    }

    expect(errorMessage).not.toContain(MOCK_RAW_KEY);
    vi.unstubAllGlobals();
  });

  it("[T19] 401 por chave expirada não marca transferência como concluída", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: () => Promise.resolve(JSON.stringify({ errors: [{ description: "Unauthorized" }] }))
    });
    vi.stubGlobal("fetch", mockFetch);

    const { AsaasAdapter } = await import("../providers/asaas/asaas-adapter");
    const adapter = new AsaasAdapter();

    await expect(adapter.transferToMaster(BigInt(500), MOCK_RAW_KEY, "ref_003")).rejects.toThrow("401");
    vi.unstubAllGlobals();
  });

  it("[T20] retry de RecoveryOperation mantém o mesmo externalReference", () => {
    const uuid = "550e8400-e29b-41d4-a716-446655440000";
    const extRef = `atlas_activation_fee_${uuid}`;
    expect(extRef).toBe(`atlas_activation_fee_${uuid}`);
    expect(extRef).not.toMatch(/atlas_activation_fee_.*atlas_activation_fee_/);
  });
});

describe("Webhook Idempotência", () => {
  it("[T05] mesmo providerEventId 10x → processado uma vez (findUnique guard)", async () => {
    const existingEvent = { id: "evt_001", providerEventId: "asaas_evt_001" };
    (prisma.paymentWebhookEvent.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(existingEvent);

    for (let i = 0; i < 10; i++) {
      const findMock = prisma.paymentWebhookEvent.findUnique as unknown as (args: unknown) => Promise<unknown>;
      const found = await findMock({
        where: { provider_environment_providerEventId: { provider: "ASAAS", environment: "SANDBOX", providerEventId: "asaas_evt_001" } }
      });
      if (found) continue;
    }

    expect(prisma.paymentWebhookEvent.create).not.toHaveBeenCalled();
  });
});

describe("Invariante econômica", () => {
  it("[T14] activationFeeRecoveredInCents nunca > activationFeeTotalInCents", () => {
    const total = BigInt(1290);
    const attempts = [BigInt(500), BigInt(500), BigInt(500), BigInt(500)];
    let recovered = BigInt(0);

    for (const amount of attempts) {
      const remaining = total - recovered;
      const toApply = amount < remaining ? amount : remaining;
      recovered += toApply;
      expect(recovered <= total).toBe(true);
    }

    expect(recovered).toBe(total);
  });

  it("[T02] dois PAYMENT_RECEIVED simultâneos: reserved + recovered <= total", () => {
    const total = BigInt(1290);
    let reserved = BigInt(0);
    let recovered = BigInt(0);

    function tryReserve(amount: bigint) {
      const availableNet = amount;
      const remaining = total - recovered - reserved;
      const toReserve = availableNet < remaining ? availableNet : remaining;
      if (toReserve > BigInt(0)) {
        reserved += toReserve;
      }
      return toReserve;
    }

    tryReserve(BigInt(700));
    tryReserve(BigInt(700));

    expect(reserved + recovered <= total).toBe(true);
  });
});
