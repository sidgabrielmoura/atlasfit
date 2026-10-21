import { describe, it, expect, vi, beforeEach } from "vitest";

// Hoisted mocks
const { mockPrisma, mockAsaasAdapter } = vi.hoisted(() => {
  const prismaMock: any = {
    $transaction: vi.fn(async (cb) => cb(prismaMock)),
    workspace: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    paymentProviderAccount: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    walletBalanceSnapshot: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    gatewayCustomer: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    studentBilling: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
    },
    paymentSplit: {
      create: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    gymGuardian: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    gymEnrollment: {
      findFirst: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  };

  const asaasMock = {
    createFinancialAccount: vi.fn(),
    createOrGetCustomer: vi.fn(),
    createOneTimeCharge: vi.fn(),
    getBalance: vi.fn(),
  };

  return { mockPrisma: prismaMock, mockAsaasAdapter: asaasMock };
});

vi.mock("@/lib/prisma", () => ({
  default: mockPrisma,
}));

vi.mock("@/lib/ably", () => ({
  publishToChannel: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/modules/payments/providers/asaas/asaas-adapter", () => {
  return {
    AsaasAdapter: class {
      createFinancialAccount = mockAsaasAdapter.createFinancialAccount;
      createOrGetCustomer = mockAsaasAdapter.createOrGetCustomer;
      createOneTimeCharge = mockAsaasAdapter.createOneTimeCharge;
      getBalance = mockAsaasAdapter.getBalance;
    },
  };
});

vi.mock("@/modules/payments/providers/asaas/subaccount-crypto", () => ({
  encryptSubAccountApiKey: vi.fn().mockReturnValue({
    encrypted: "enc_subaccount_api_key",
    keyVersion: "v1",
  }),
}));

import { GymFinancialService } from "../application/gym-financial-service";
import { PaymentService } from "@/modules/payments/application/payment-service";
import {
  FinancialProfileType,
  FinancialAccountStatus,
  WalletKycStatus,
  WalletPaymentMethod,
  StudentBillingStatus,
} from "@prisma/client";

describe("GYM-040: Perfil Recebedor e Pagador (Segregação Multiunidade & Responsável Financeiro)", () => {
  let gymFinancialService: GymFinancialService;
  let paymentService: PaymentService;

  beforeEach(() => {
    vi.clearAllMocks();
    gymFinancialService = new GymFinancialService();
    paymentService = new PaymentService();
  });

  describe("1. Segregação de Conta Recebedora Multiunidade (WORKSPACE vs USER)", () => {
    it("deve retornar status NOT_STARTED quando academia ainda não configurou conta recebedora", async () => {
      mockPrisma.workspace.findUnique.mockResolvedValueOnce({
        id: "gym-branch-alpha",
        name: "AtlasFit Unidade Centro",
        paymentProviderAccount: null,
      });

      const profile = await gymFinancialService.getGymFinancialProfile("gym-branch-alpha");

      expect(profile.isConfigured).toBe(false);
      expect(profile.status).toBe(FinancialAccountStatus.NOT_STARTED);
      expect(profile.canIssueInvoices).toBe(false);
      expect(profile.balance.availableInCents).toBe(0);
    });

    it("deve isolar as contas recebedoras de duas filiais da mesma rede", async () => {
      // Filial Alpha
      const alphaAccount = {
        id: "acc-gym-alpha",
        profileType: FinancialProfileType.WORKSPACE,
        workspaceId: "gym-branch-alpha",
        personalUserId: null,
        providerAccountId: "subacc_asaas_alpha_123",
        status: FinancialAccountStatus.APPROVED,
        kycStatus: WalletKycStatus.APPROVED,
        legalNameMasked: "Academia Alpha Ltda",
        documentLast4: "0001",
        balanceSnapshots: [
          {
            availableAmountInCents: BigInt(500000), // R$ 5.000,00
            pendingAmountInCents: BigInt(120000),
            blockedAmountInCents: BigInt(0),
            negativeAmountInCents: BigInt(0),
            capturedAt: new Date("2026-09-25T10:00:00Z"),
          },
        ],
      };

      // Filial Beta
      const betaAccount = {
        id: "acc-gym-beta",
        profileType: FinancialProfileType.WORKSPACE,
        workspaceId: "gym-branch-beta",
        personalUserId: null,
        providerAccountId: "subacc_asaas_beta_999",
        status: FinancialAccountStatus.APPROVED,
        kycStatus: WalletKycStatus.APPROVED,
        legalNameMasked: "Academia Beta Ltda",
        documentLast4: "0002",
        balanceSnapshots: [
          {
            availableAmountInCents: BigInt(150000), // R$ 1.500,00
            pendingAmountInCents: BigInt(30000),
            blockedAmountInCents: BigInt(0),
            negativeAmountInCents: BigInt(0),
            capturedAt: new Date("2026-09-25T10:00:00Z"),
          },
        ],
      };

      mockPrisma.workspace.findUnique
        .mockResolvedValueOnce({ id: "gym-branch-alpha", paymentProviderAccount: alphaAccount })
        .mockResolvedValueOnce({ id: "gym-branch-beta", paymentProviderAccount: betaAccount });

      const profileAlpha = await gymFinancialService.getGymFinancialProfile("gym-branch-alpha");
      const profileBeta = await gymFinancialService.getGymFinancialProfile("gym-branch-beta");

      expect(profileAlpha.providerAccountId).toBe("subacc_asaas_alpha_123");
      expect(profileAlpha.balance.availableInCents).toBe(500000);
      expect(profileAlpha.documentLast4).toBe("0001");

      expect(profileBeta.providerAccountId).toBe("subacc_asaas_beta_999");
      expect(profileBeta.balance.availableInCents).toBe(150000);
      expect(profileBeta.documentLast4).toBe("0002");

      // Verificação de não vazamento cruzado
      expect(profileAlpha.providerAccountId).not.toBe(profileBeta.providerAccountId);
    });

    it("caminho onboardGymAccount retirado: não chama gateway nem altera histórico", async () => { await expect(gymFinancialService.onboardGymAccount({ workspaceId: "gym", actorUserId: "operator", name: "Empresa", cnpj: "00000000000000", email: "test@example.invalid", phone: "00000000000", postalCode: "00000000", address: "Teste", addressNumber: "1", province: "Teste" })).rejects.toMatchObject({ statusCode: 410, code: "GYM_GATEWAY_RETIRED" }); for (const operation of Object.values(mockAsaasAdapter)) expect(operation).not.toHaveBeenCalled(); expect(mockPrisma.auditLog.create).not.toHaveBeenCalled(); });

    it("caminho syncGymBalance retirado: não chama gateway nem altera histórico", async () => { await expect(gymFinancialService.syncGymBalance("gym")).rejects.toMatchObject({ statusCode: 410, code: "GYM_GATEWAY_RETIRED" }); for (const operation of Object.values(mockAsaasAdapter)) expect(operation).not.toHaveBeenCalled(); expect(mockPrisma.auditLog.create).not.toHaveBeenCalled(); });
  });

  describe("2. Cobrança pela Recepção / Staff vinculada à Conta da Academia", () => {
    it("caminho createGymBilling retirado: não chama gateway nem altera histórico", async () => { await expect(gymFinancialService.createGymBilling({ workspaceId: "gym", actorUserId: "operator", studentUserId: "student", title: "Teste", amountInCents: BigInt(100), paymentMethod: WalletPaymentMethod.PIX, dueDate: new Date() })).rejects.toMatchObject({ statusCode: 410, code: "GYM_GATEWAY_RETIRED" }); for (const operation of Object.values(mockAsaasAdapter)) expect(operation).not.toHaveBeenCalled(); expect(mockPrisma.auditLog.create).not.toHaveBeenCalled(); });
  });

  describe("3. Segregação de Pagador (Responsável Legal vs Aluno vs Terceiro Conveniado)", () => {
    it("caminho createGymBilling retirado: não chama gateway nem altera histórico", async () => { await expect(gymFinancialService.createGymBilling({ workspaceId: "gym", actorUserId: "operator", studentUserId: "student", title: "Teste", amountInCents: BigInt(100), paymentMethod: WalletPaymentMethod.PIX, dueDate: new Date() })).rejects.toMatchObject({ statusCode: 410, code: "GYM_GATEWAY_RETIRED" }); for (const operation of Object.values(mockAsaasAdapter)) expect(operation).not.toHaveBeenCalled(); expect(mockPrisma.auditLog.create).not.toHaveBeenCalled(); });

    it("caminho createGymBilling retirado: não chama gateway nem altera histórico", async () => { await expect(gymFinancialService.createGymBilling({ workspaceId: "gym", actorUserId: "operator", studentUserId: "student", title: "Teste", amountInCents: BigInt(100), paymentMethod: WalletPaymentMethod.PIX, dueDate: new Date() })).rejects.toMatchObject({ statusCode: 410, code: "GYM_GATEWAY_RETIRED" }); for (const operation of Object.values(mockAsaasAdapter)) expect(operation).not.toHaveBeenCalled(); expect(mockPrisma.auditLog.create).not.toHaveBeenCalled(); });
  });

  describe("4. Compatibilidade Regressiva com Personal Trainer SaaS (USER Profile)", () => {
    it("deve manter busca e operação de contas USER de personal trainer totalmente intactas", async () => {
      mockPrisma.paymentProviderAccount.findUnique.mockResolvedValueOnce({
        id: "acc-personal-1",
        profileType: FinancialProfileType.USER,
        personalUserId: "trainer-user-1",
        workspaceId: null,
        providerAccountId: "subacc_asaas_personal_1",
        status: FinancialAccountStatus.APPROVED,
        balanceSnapshots: [
          {
            availableAmountInCents: BigInt(98000),
            pendingAmountInCents: BigInt(0),
          },
        ],
      });

      const personalAccount = await paymentService.getAccountByUserId("trainer-user-1");

      expect(personalAccount).not.toBeNull();
      expect(personalAccount?.profileType).toBe(FinancialProfileType.USER);
      expect(personalAccount?.personalUserId).toBe("trainer-user-1");
      expect(personalAccount?.workspaceId).toBeNull();
      expect(mockPrisma.paymentProviderAccount.findUnique).toHaveBeenCalledWith({
        where: { personalUserId: "trainer-user-1" },
        include: expect.any(Object),
      });
    });
  });
});
