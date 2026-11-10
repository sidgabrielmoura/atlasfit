import { afterEach, describe, expect, it, vi } from "vitest";
import { decryptMfaSecret, encryptMfaSecret, hashMfaBackupCode, mfaSecretFingerprint } from "../auth/mfa-secrets";
import { generateTOTPToken } from "../auth/totp";
import { isGymMutationOriginAllowed } from "../http/gym-request-origin";
import { contractStateAt, type ReportContract } from "@/modules/workspaces/domain/gym-report-metrics";
import { gymTemplateEditorSchema } from "@/modules/workspaces/application/gym-template-editor";

afterEach(() => vi.unstubAllEnvs());
describe("Regressões de segurança e calendário da auditoria GYM", () => {
  it("segredo cifrado preserva o TOTP e detecta alteração do conteúdo", () => {
    vi.stubEnv("MFA_ENCRYPTION_KEY", "synthetic-key-for-mfa-encryption-tests-12345");
    const secret = "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP";
    const encrypted = encryptMfaSecret(secret);
    expect(encrypted).not.toContain(secret);
    expect(decryptMfaSecret(encrypted)).toBe(secret);
    expect(generateTOTPToken(encrypted)).toBe(generateTOTPToken(secret));
    expect(mfaSecretFingerprint(encrypted)).toBe(mfaSecretFingerprint(secret));
    const parts = encrypted.split(":"); parts[4] = Buffer.alloc(20).toString("base64url");
    expect(() => decryptMfaSecret(parts.join(":"))).toThrow();
    expect(hashMfaBackupCode("a", "ABC-123")).not.toBe(hashMfaBackupCode("b", "ABC-123"));
  });
  it("nega mutação cross-site e origem estrangeira sem impedir leitura ou chamada interna", () => {
    vi.stubEnv("AUTH_URL", "https://app.atlasfit.site");
    const request = (headers: Record<string, string>, method = "POST") => new Request("https://app.atlasfit.site/api/gym/students", { method, headers });
    expect(isGymMutationOriginAllowed(request({ origin: "https://attacker.invalid" }))).toBe(false);
    expect(isGymMutationOriginAllowed(request({ "sec-fetch-site": "cross-site" }))).toBe(false);
    expect(isGymMutationOriginAllowed(request({ origin: "https://app.atlasfit.site" }))).toBe(true);
    expect(isGymMutationOriginAllowed(request({}))).toBe(true);
    expect(isGymMutationOriginAllowed(request({ origin: "https://attacker.invalid" }, "GET"))).toBe(true);
  });
  it("renovação automática mantém contrato ativo após o prazo inicial; cancelamento continua prevalecendo", () => {
    const contract: ReportContract = { id: "contract", studentMemberId: "student", status: "ACTIVE", startDate: new Date("2026-01-01"), endDate: new Date("2026-02-01"), createdAt: new Date("2026-01-01"), activatedAt: new Date("2026-01-01"), cancelledAt: null, cancellationEffectiveDate: null, supersedesEnrollmentId: null, changeKind: null, events: [], autoRenew: true };
    expect(contractStateAt(contract, new Date("2026-04-01"))).toBe("ACTIVE");
    expect(contractStateAt({ ...contract, autoRenew: false }, new Date("2026-04-01"))).toBe("EXPIRED");
    expect(contractStateAt({ ...contract, cancellationEffectiveDate: new Date("2026-03-01") }, new Date("2026-04-01"))).toBe("CANCELLED");
  });
  it("editor existente aceita campos de apresentação, mas exige método válido e grupo completo", () => {
    const input = { workspaceId: "gym", name: "Modelo", goal: "Força", difficulty: "Iniciante", duration: "30 min", groups: [], exercises: [{ id: "row", exerciseId: "exercise", name: "Nome de apresentação", videoUrl: "https://example.invalid/video", sets: 3, reps: "10", rest: "60s", methodType: "DROPSET", methodConfig: { drops: 2, reduction: 20, legacyNote: "preservar" } }] };
    const valid = gymTemplateEditorSchema.safeParse(input);
    expect(valid.success).toBe(true);
    expect(gymTemplateEditorSchema.safeParse({ ...input, exercises: [{ ...input.exercises[0], methodConfig: { drops: 0, reduction: 999 } }] }).success).toBe(false);
    expect(gymTemplateEditorSchema.safeParse({ ...input, groups: [{ id: "group", type: "BISET", config: null }] }).success).toBe(false);
  });
});
