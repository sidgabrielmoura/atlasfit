import type { GlobalRole } from "@prisma/client";

type FactorMetadata = { requires3FA?: boolean; email?: string; currentStep?: "EMAIL_OTP" | "TOTP_OTP"; twoFactorType?: "EMAIL" | "AUTHENTICATOR"; message?: string; isExistingCodeActive?: boolean; isNewCodeGenerated?: boolean };
export type LoginResult =
  | ({ success: true; role: GlobalRole; error?: never; requires2FA?: never } & FactorMetadata)
  | ({ error: string; success?: never; role?: never; requires2FA?: never } & FactorMetadata)
  | ({ requires2FA: true; success?: never; role?: never; error?: never } & FactorMetadata);
