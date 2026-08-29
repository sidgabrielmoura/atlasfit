import { describe, it, expect } from "vitest";
import { isValidCPF, isValidCNPJ, isValidCpfCnpj } from "@/lib/cpf-validator";
import {
  validatePixKey,
  sanitizeWalletAccount,
  sanitizePayout,
  sanitizeBilling,
  timingSafeEqualString,
  enforceWalletRateLimit
} from "../security/wallet-security";

describe("Atlas Pay Wallet Security Suite", () => {
  describe("1. Document Validation (CPF & CNPJ)", () => {
    it("deve validar corretamente CPFs válidos e rejeitar inválidos", () => {
      // Known valid CPF format algorithm test
      expect(isValidCPF("52998224725")).toBe(true);
      expect(isValidCPF("111.444.777-35")).toBe(true);

      // Invalid CPFs
      expect(isValidCPF("11111111111")).toBe(false);
      expect(isValidCPF("12345678900")).toBe(false);
      expect(isValidCPF("")).toBe(false);
      expect(isValidCPF(null)).toBe(false);
    });

    it("deve validar corretamente CNPJs válidos e rejeitar inválidos", () => {
      // Known valid test CNPJ
      expect(isValidCNPJ("11.222.333/0001-81")).toBe(true);
      expect(isValidCNPJ("11222333000181")).toBe(true);

      // Invalid CNPJs
      expect(isValidCNPJ("00000000000000")).toBe(false);
      expect(isValidCNPJ("11222333000199")).toBe(false);
      expect(isValidCNPJ("123")).toBe(false);
      expect(isValidCNPJ(null)).toBe(false);
    });

    it("deve validar CPF e CNPJ através de isValidCpfCnpj", () => {
      expect(isValidCpfCnpj("52998224725")).toBe(true);
      expect(isValidCpfCnpj("11222333000181")).toBe(true);
      expect(isValidCpfCnpj("123456789012345")).toBe(false);
      expect(isValidCpfCnpj("abc")).toBe(false);
    });
  });

  describe("2. Pix Key Validation", () => {
    it("deve validar chaves Pix do tipo CPF", () => {
      const validRes = validatePixKey("CPF", "52998224725");
      expect(validRes.isValid).toBe(true);
      expect(validRes.sanitizedKey).toBe("52998224725");

      const invalidRes = validatePixKey("CPF", "11111111111");
      expect(invalidRes.isValid).toBe(false);
      expect(invalidRes.error).toBeDefined();
    });

    it("deve validar chaves Pix do tipo E-mail", () => {
      const validEmail = validatePixKey("EMAIL", "personal@atlasfit.app");
      expect(validEmail.isValid).toBe(true);
      expect(validEmail.sanitizedKey).toBe("personal@atlasfit.app");

      const invalidEmail = validatePixKey("EMAIL", "not-an-email");
      expect(invalidEmail.isValid).toBe(false);
    });

    it("deve validar e normalizar chaves Pix do tipo Telefone com código de país", () => {
      const validPhone = validatePixKey("PHONE", "11987654321");
      expect(validPhone.isValid).toBe(true);
      expect(validPhone.sanitizedKey).toBe("+5511987654321");

      const validWithCountry = validatePixKey("PHONE", "5511987654321");
      expect(validWithCountry.isValid).toBe(true);
      expect(validWithCountry.sanitizedKey).toBe("+5511987654321");

      const invalidPhone = validatePixKey("PHONE", "123");
      expect(invalidPhone.isValid).toBe(false);
    });

    it("deve validar chaves Pix Aleatórias (EVP)", () => {
      const validEVP = validatePixKey("EVP", "123e4567-e89b-12d3-a456-426614174000");
      expect(validEVP.isValid).toBe(true);

      const invalidEVP = validatePixKey("EVP", "invalid-uuid-key");
      expect(invalidEVP.isValid).toBe(false);
    });
  });

  describe("3. Data Minimization & DTO Sanitization", () => {
    it("deve eliminar credenciais sensíveis e chaves de API criptografadas do DTO da conta", () => {
      const mockRawAccount = {
        id: "acc_internal_123",
        personalUserId: "user_456",
        provider: "ASAAS",
        environment: "PRODUCTION",
        providerAccountId: "cus_asaas_subaccount_secret_id",
        providerWalletId: "wal_secret_id_999",
        providerCredentialSecretId: "sec_999_secret_token",
        providerApiKeyEncrypted: "S3CR3T_ENCRYPTED_API_KEY_BASE64==",
        providerApiKeyKeyVersion: "v1",
        status: "APPROVED",
        kycStatus: "APPROVED",
        providerStatus: "APPROVED",
        legalNameMasked: "João S.",
        documentLast4: "7255",
        payoutDestinationMasked: "***.***.725-**",
        activationFeeStatus: "COMPLETED",
        approvedAt: new Date("2026-08-01"),
        createdAt: new Date("2026-08-01"),
        updatedAt: new Date("2026-08-01"),
        balanceSnapshots: [
          {
            availableAmountInCents: BigInt(50000),
            pendingAmountInCents: BigInt(10000),
            blockedAmountInCents: BigInt(0),
            capturedAt: new Date("2026-08-20")
          }
        ]
      };

      const sanitized = sanitizeWalletAccount(mockRawAccount);

      // Verificação de ausência de segredos
      expect((sanitized as any).providerApiKeyEncrypted).toBeUndefined();
      expect((sanitized as any).providerApiKeyKeyVersion).toBeUndefined();
      expect((sanitized as any).providerCredentialSecretId).toBeUndefined();
      expect((sanitized as any).providerAccountId).toBeUndefined();
      expect((sanitized as any).providerWalletId).toBeUndefined();

      // Verificação de preservação de campos públicos
      expect(sanitized.id).toBe("acc_internal_123");
      expect(sanitized.status).toBe("APPROVED");
      expect(sanitized.legalNameMasked).toBe("João S.");
      expect(sanitized.documentLast4).toBe("7255");
      expect(sanitized.balanceSnapshots[0].availableAmountInCents).toBe("50000");
    });

    it("deve sanitizar o retorno de Payout ocultando fingerprints e IDs internos", () => {
      const mockRawPayout = {
        id: "pay_123",
        destinationFingerprint: "sha256_super_secret_fingerprint",
        providerTransferId: "tr_asaas_internal_id",
        amountInCents: BigInt(15000),
        destinationMasked: "joao@email.com",
        status: "PROCESSING",
        requestedAt: new Date(),
        submittedAt: new Date()
      };

      const sanitized = sanitizePayout(mockRawPayout);
      expect((sanitized as any).destinationFingerprint).toBeUndefined();
      expect((sanitized as any).providerTransferId).toBeUndefined();
      expect(sanitized.id).toBe("pay_123");
      expect(sanitized.amountInCents).toBe("15000");
      expect(sanitized.destinationMasked).toBe("joao@email.com");
    });
  });

  describe("4. Timing Attack Prevention", () => {
    it("deve comparar tokens em tempo constante de forma resiliente", () => {
      expect(timingSafeEqualString("webhook_secret_123", "webhook_secret_123")).toBe(true);
      expect(timingSafeEqualString("webhook_secret_123", "webhook_secret_456")).toBe(false);
      expect(timingSafeEqualString("short", "much_longer_secret")).toBe(false);
      expect(timingSafeEqualString("", "not_empty")).toBe(false);
    });
  });

  describe("5. Rate Limiting Protection", () => {
    it("deve bloquear requisições consecutivas quando o limite for excedido", async () => {
      const req = new Request("http://localhost/api/personal/wallet/resend-activation", {
        headers: { "x-forwarded-for": "203.0.113.195" }
      });
      const userId = "test_user_rate_limit";

      // Limite para WALLET_RESEND_ACTIVATION é 2 requisições
      const r1 = await enforceWalletRateLimit(req, "WALLET_RESEND_ACTIVATION", userId);
      expect(r1.allowed).toBe(true);

      const r2 = await enforceWalletRateLimit(req, "WALLET_RESEND_ACTIVATION", userId);
      expect(r2.allowed).toBe(true);

      // 3ª requisição deve ser barrada com status 429
      const r3 = await enforceWalletRateLimit(req, "WALLET_RESEND_ACTIVATION", userId);
      expect(r3.allowed).toBe(false);
      if (!r3.allowed) {
        expect(r3.response.status).toBe(429);
        expect(r3.response.headers.get("Retry-After")).toBeDefined();
      }
    });
  });
});
