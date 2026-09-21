"use server";

import { signIn } from "@/auth";
import { AuthError } from "next-auth";
import prisma from "@/lib/prisma";
import bcryptjs from "bcryptjs";
import { redirect } from "next/navigation";

import { headers } from "next/headers";
import { rateLimit } from "@/lib/rate-limit";
import crypto from "crypto";
import { EmailService } from "@/lib/emails/service";
import { isValidCPF } from "@/lib/cpf-validator";
import { validateAgeEligibility } from "@/lib/privacy/age-validator";
import { LegalAcceptanceService } from "@/lib/privacy/legal-acceptance.service";
import { LegalDocumentType, LegalAcceptanceType } from "@prisma/client";
import { verifyTOTP } from "@/lib/auth/totp";

const TWO_FACTOR_EXPIRATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias em ms

export async function login(formData: {
  email: string;
  password: string;
  redirectTo: string;
  code?: string;
  totpCode?: string;
  forceNewCode?: boolean;
}) {
  try {
    const ipHeaders = await headers();
    const ip = ipHeaders.get("x-forwarded-for") || ipHeaders.get("x-real-ip") || "127.0.0.1";
    const limiter = await rateLimit(`login:${ip}`, 10, 60000);

    if (!limiter.success) {
      return { error: "Muitas tentativas de login. Tente novamente mais tarde." };
    }
    const user = await prisma.user.findUnique({
      where: { email: formData.email },
      include: {
        totpDevices: true,
      },
    });
    if (!user) {
      return { error: "Credenciais inválidas. Tente novamente." };
    }

    const maintenanceSetting = await prisma.systemSetting.findUnique({
      where: { key: "maintenance_mode" }
    });

    if (maintenanceSetting?.value === "true" && user.role !== "SUPERADMIN") {
      redirect("/maintenance");
    }

    const isPasswordValid = user.password ? await bcryptjs.compare(formData.password, user.password) : false;
    if (!isPasswordValid) {
      return { error: "Credenciais inválidas. Tente novamente." };
    }

    const hasAnyTotpDevice =
      Boolean(user.twoFactorSecret) || (user.totpDevices && user.totpDevices.length > 0);

    const is3FAUser =
      user.role === "SUPERADMIN" &&
      Boolean(user.threeFactorEnabled) &&
      hasAnyTotpDevice;

    const isTotpUser =
      !is3FAUser &&
      user.role === "SUPERADMIN" &&
      Boolean(user.twoFactorEnabled) &&
      user.twoFactorType === "AUTHENTICATOR" &&
      hasAnyTotpDevice;

    const verifyCodeAgainstUserDevices = async (codeToVerify: string): Promise<boolean> => {
      if (user.totpDevices && user.totpDevices.length > 0) {
        for (const device of user.totpDevices) {
          if (verifyTOTP(device.secret, codeToVerify)) {
            prisma.userTotpDevice.update({
              where: { id: device.id },
              data: { lastUsedAt: new Date() },
            }).catch(() => {});
            return true;
          }
        }
      }

      if (user.twoFactorSecret && verifyTOTP(user.twoFactorSecret, codeToVerify)) {
        return true;
      }

      return false;
    };

    // ETAPA 3 / TOTP: Código do Google Authenticator enviado
    if (formData.totpCode) {
      if (is3FAUser) {
        // Verifica se a confirmação por e-mail (Etapa 2) foi realizada com sucesso
        const verifiedToken = await prisma.verificationToken.findFirst({
          where: {
            identifier: `3FA_EMAIL_VERIFIED:${formData.email}`,
            token: "VERIFIED",
            expires: { gt: new Date() },
          },
        });

        if (!verifiedToken) {
          return {
            error: "Confirmação por e-mail expirada ou não encontrada. Por favor, reinicie o login.",
          };
        }

        const isTotpValid = await verifyCodeAgainstUserDevices(formData.totpCode);
        let isBackupValid = false;

        if (!isTotpValid && user.twoFactorBackupCodes && user.twoFactorBackupCodes.length > 0) {
          const formattedCode = formData.totpCode.trim().toUpperCase();
          if (user.twoFactorBackupCodes.includes(formattedCode)) {
            isBackupValid = true;
            await prisma.user.update({
              where: { id: user.id },
              data: {
                twoFactorBackupCodes: user.twoFactorBackupCodes.filter((c) => c !== formattedCode),
              },
            });
          }
        }

        if (!isTotpValid && !isBackupValid) {
          return {
            error: "Código do Google Authenticator inválido. Verifique o horário do celular ou utilize um código de backup.",
          };
        }

        // Limpa o token temporário de 3FA
        await prisma.verificationToken.deleteMany({
          where: { identifier: `3FA_EMAIL_VERIFIED:${formData.email}` },
        });

        await signIn("credentials", {
          email: formData.email,
          password: formData.password,
          redirect: false,
        });
        return { success: true, role: user.role };
      }

      if (isTotpUser) {
        const isTotpValid = await verifyCodeAgainstUserDevices(formData.totpCode);
        let isBackupValid = false;

        if (!isTotpValid && user.twoFactorBackupCodes && user.twoFactorBackupCodes.length > 0) {
          const formattedCode = formData.totpCode.trim().toUpperCase();
          if (user.twoFactorBackupCodes.includes(formattedCode)) {
            isBackupValid = true;
            await prisma.user.update({
              where: { id: user.id },
              data: {
                twoFactorBackupCodes: user.twoFactorBackupCodes.filter((c) => c !== formattedCode),
              },
            });
          }
        }

        if (!isTotpValid && !isBackupValid) {
          return {
            error: "Código do Google Authenticator inválido. Verifique o horário do celular ou utilize um código de backup.",
          };
        }

        await signIn("credentials", {
          email: formData.email,
          password: formData.password,
          redirect: false,
        });
        return { success: true, role: user.role };
      }
    }

    // ETAPA 2: Código de 6 dígitos enviado
    if (formData.code) {
      if (is3FAUser) {
        // Valida o código enviado para o e-mail
        const identifier = `2FA:${formData.email}`;
        const dbToken = await prisma.verificationToken.findFirst({
          where: {
            identifier,
            token: formData.code,
            expires: { gt: new Date() },
          },
        });

        if (!dbToken) {
          return {
            error: "Código de verificação de e-mail inválido ou expirado. Clique em 'Enviar outro código' para receber um novo.",
          };
        }

        // E-mail validado com sucesso! Salva token de aprovação da etapa 2 por 10 minutos
        const authIdentifier = `3FA_EMAIL_VERIFIED:${formData.email}`;
        await prisma.verificationToken.deleteMany({ where: { identifier: authIdentifier } });
        await prisma.verificationToken.create({
          data: {
            identifier: authIdentifier,
            token: "VERIFIED",
            expires: new Date(Date.now() + 10 * 60 * 1000),
          },
        });

        // NÃO FAZ SIGNIN: Transiciona para o 3º Fator (Google Authenticator)
        return {
          requires2FA: true,
          requires3FA: true,
          currentStep: "TOTP_OTP",
          twoFactorType: "AUTHENTICATOR",
          email: formData.email,
          message: "E-mail confirmado com sucesso! Agora insira o código do seu Google Authenticator.",
        };
      }

      if (isTotpUser) {
        const isTotpValid = await verifyCodeAgainstUserDevices(formData.code);
        let isBackupValid = false;

        if (!isTotpValid && user.twoFactorBackupCodes && user.twoFactorBackupCodes.length > 0) {
          const formattedCode = formData.code.trim().toUpperCase();
          if (user.twoFactorBackupCodes.includes(formattedCode)) {
            isBackupValid = true;
            await prisma.user.update({
              where: { id: user.id },
              data: {
                twoFactorBackupCodes: user.twoFactorBackupCodes.filter((c) => c !== formattedCode),
              },
            });
          }
        }

        if (!isTotpValid && !isBackupValid) {
          return {
            error: "Código do Google Authenticator inválido. Verifique o horário do celular ou utilize um código de backup.",
          };
        }

        await signIn("credentials", {
          email: formData.email,
          password: formData.password,
          redirect: false,
        });
        return { success: true, role: user.role };
      }

      const identifier = `2FA:${formData.email}`;
      const dbToken = await prisma.verificationToken.findFirst({
        where: {
          identifier,
          token: formData.code,
          expires: { gt: new Date() },
        },
      });

      if (!dbToken) {
        return {
          error: "Código de verificação inválido ou expirado. Clique em 'Enviar outro código' para receber um novo.",
        };
      }

      await signIn("credentials", {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });
      return { success: true, role: user.role };
    }

    // PRIMEIRA SUBMISSÃO (Email e Senha verificados acima)
    if (is3FAUser) {
      // SuperAdmin com 3FA ativado: Exige primeiro validação por e-mail (Etapa 2 de 3)
      const identifier = `2FA:${formData.email}`;
      const existingToken = await prisma.verificationToken.findFirst({
        where: {
          identifier,
          expires: { gt: new Date() },
        },
      });

      if (existingToken && !formData.forceNewCode) {
        return {
          requires2FA: true,
          requires3FA: true,
          currentStep: "EMAIL_OTP",
          twoFactorType: "EMAIL",
          email: formData.email,
          isExistingCodeActive: true,
        };
      }

      const code = Math.floor(100000 + Math.random() * 900000).toString();

      await prisma.verificationToken.deleteMany({
        where: { identifier },
      });

      await prisma.verificationToken.create({
        data: {
          identifier,
          token: code,
          expires: new Date(Date.now() + TWO_FACTOR_EXPIRATION_MS),
        },
      });

      const emailResult = await EmailService.sendTwoFactorCode(formData.email, code);

      if (!emailResult.success) {
        console.error("3FA_EMAIL_DISPATCH_FAILED:", emailResult.error);
        return {
          error: `Erro ao enviar o e-mail de verificação: ${
            emailResult.error || "Domínio de e-mail não verificado ou chave API inválida"
          }`,
        };
      }

      return {
        requires2FA: true,
        requires3FA: true,
        currentStep: "EMAIL_OTP",
        twoFactorType: "EMAIL",
        email: formData.email,
        isNewCodeGenerated: true,
      };
    }

    const global2FA = await prisma.systemSetting.findUnique({
      where: { key: "two_factor_auth_enabled" },
    });
    const isGlobal2FA = global2FA?.value === "true";

    const is2FAEnabled =
      user.twoFactorEnabled !== null ? user.twoFactorEnabled : isGlobal2FA;

    if (!is2FAEnabled) {
      await signIn("credentials", {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });
      return { success: true, role: user.role };
    }

    if (isTotpUser) {
      return {
        requires2FA: true,
        twoFactorType: "AUTHENTICATOR",
        email: formData.email,
      };
    }

    const identifier = `2FA:${formData.email}`;
    const existingToken = await prisma.verificationToken.findFirst({
      where: {
        identifier,
        expires: { gt: new Date() },
      },
    });

    if (existingToken && !formData.forceNewCode) {
      return {
        requires2FA: true,
        twoFactorType: "EMAIL",
        email: formData.email,
        isExistingCodeActive: true,
      };
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();

    await prisma.verificationToken.deleteMany({
      where: { identifier },
    });

    await prisma.verificationToken.create({
      data: {
        identifier,
        token: code,
        expires: new Date(Date.now() + TWO_FACTOR_EXPIRATION_MS),
      },
    });

    const emailResult = await EmailService.sendTwoFactorCode(formData.email, code);

    if (!emailResult.success) {
      console.error("2FA_EMAIL_DISPATCH_FAILED:", emailResult.error);
      return {
        error: `Erro ao enviar o e-mail de verificação: ${
          emailResult.error || "Domínio de e-mail não verificado ou chave API inválida"
        }`,
      };
    }

    return { requires2FA: true, email: formData.email, isNewCodeGenerated: true };
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { error: "Credenciais inválidas. Tente novamente." };
        default:
          return { error: "Ocorreu um erro ao entrar. Tente novamente." };
      }
    }
    throw error;
  }
}

export async function getSetupInfo(token: string) {
  if (!token) return { error: "Token de acesso inválido ou expirado." };
  try {
    const user = await prisma.user.findUnique({
      where: { setupToken: token },
      select: { id: true, name: true, email: true, cpfCnpj: true, birthDate: true }
    });
    if (!user) return { error: "Link de ativação inválido ou já utilizado." };
    return {
      success: true,
      needsCpf: !user.cpfCnpj,
      needsBirthDate: !user.birthDate,
      user,
    };
  } catch (err) {
    return { error: "Erro ao verificar token de acesso." };
  }
}

export async function setupPassword(
  token: string,
  passwordStr: string,
  cpfCnpjStr?: string,
  birthDateStr?: string,
  acceptedTerms?: boolean,
  acceptedPrivacy?: boolean
) {
  if (!token) {
    return { error: "Token de acesso inválido ou expirado." };
  }
  if (!passwordStr || passwordStr.length < 6) {
    return { error: "A senha deve conter pelo menos 6 caracteres." };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { setupToken: token }
    });

    if (!user) {
      return { error: "Link de ativação inválido ou já utilizado." };
    }

    let cleanCpf: string | undefined = undefined;
    if (!user.cpfCnpj) {
      if (!cpfCnpjStr) {
        return { error: "O CPF é obrigatório para ativar sua conta de aluno." };
      }
      if (!isValidCPF(cpfCnpjStr)) {
        return { error: "O CPF informado é inválido. Digite um CPF válido." };
      }
      cleanCpf = cpfCnpjStr.replace(/\D/g, "");
    }

    let validatedBirthDate: Date | undefined = undefined;
    if (!user.birthDate) {
      if (!birthDateStr) {
        return { error: "A data de nascimento é obrigatória para verificação de elegibilidade (18+)." };
      }
      const ageCheck = validateAgeEligibility(birthDateStr, 18);
      if (!ageCheck.isValid || !ageCheck.birthDate) {
        return { error: ageCheck.error || "Data de nascimento inválida ou menor de 18 anos." };
      }
      validatedBirthDate = ageCheck.birthDate;
    }

    const ipHeaders = await headers();
    const ip = ipHeaders.get("x-forwarded-for") || ipHeaders.get("x-real-ip") || "127.0.0.1";
    const userAgent = ipHeaders.get("user-agent") || "Web Client";

    const hashedPassword = await bcryptjs.hash(passwordStr, 10);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          setupToken: null,
          ...(cleanCpf ? { cpfCnpj: cleanCpf } : {}),
          ...(validatedBirthDate ? { birthDate: validatedBirthDate } : {}),
        }
      });

      // Record Terms and Privacy Acceptances
      const activeTerms = await LegalAcceptanceService.getActiveDocument(LegalDocumentType.TERMS);
      const activePrivacy = await LegalAcceptanceService.getActiveDocument(LegalDocumentType.PRIVACY);

      if (activeTerms) {
        await tx.legalAcceptance.create({
          data: {
            userId: user.id,
            documentId: activeTerms.id,
            documentType: LegalDocumentType.TERMS,
            documentVersion: activeTerms.version,
            documentHash: activeTerms.contentHash,
            acceptanceType: LegalAcceptanceType.TERMS_ACCEPTED,
            ipAddress: ip,
            userAgent,
            source: "SETUP_PASSWORD",
          }
        });
      }

      if (activePrivacy) {
        await tx.legalAcceptance.create({
          data: {
            userId: user.id,
            documentId: activePrivacy.id,
            documentType: LegalDocumentType.PRIVACY,
            documentVersion: activePrivacy.version,
            documentHash: activePrivacy.contentHash,
            acceptanceType: LegalAcceptanceType.PRIVACY_ACKNOWLEDGED,
            ipAddress: ip,
            userAgent,
            source: "SETUP_PASSWORD",
          }
        });
      }

      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "PASSWORD_SETUP_WITH_LEGAL_ACCEPTANCE",
          entity: "USER",
          entityId: user.id,
          severity: "success",
          ip,
        }
      });
    });

    return { success: true };
  } catch (error) {
    console.error("Setup password error:", error);
    return { error: "Erro interno ao definir a senha. Tente novamente." };
  }
}

export async function requestPasswordReset(email: string) {
  if (!email || !email.includes("@")) {
    return { error: "E-mail inválido." };
  }

  try {
    const ipHeaders = await headers();
    const ip = ipHeaders.get("x-forwarded-for") || ipHeaders.get("x-real-ip") || "127.0.0.1";

    const ipLimiter = await rateLimit(`reset-request-ip:${ip}`, 5, 600000);
    if (!ipLimiter.success) {
      return { error: "Muitas solicitações a partir deste endereço IP. Tente novamente mais tarde." };
    }

    const normalizedEmail = email.trim().toLowerCase();
    const emailLimiter = await rateLimit(`reset-request-email:${normalizedEmail}`, 3, 600000);
    if (!emailLimiter.success) {
      return { error: "Muitas solicitações para este e-mail. Aguarde alguns minutos antes de tentar novamente." };
    }

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });
    if (!user) {
      return { success: true, message: "Se o e-mail estiver cadastrado, você receberá um link de recuperação." };
    }

    await prisma.passwordResetToken.deleteMany({
      where: { email: normalizedEmail }
    });

    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 3600000);

    await prisma.passwordResetToken.create({
      data: {
        email: normalizedEmail,
        token,
        expires
      }
    });
    const host = ipHeaders.get("host") || "localhost:3000";
    const protocol = host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https";
    const resetLink = `${protocol}://${host}/auth/reset-password?token=${token}`;

    const emailResult = await EmailService.sendPasswordReset(normalizedEmail, resetLink);

    if (!emailResult.success) {
      console.error("RESET_PASSWORD_EMAIL_FAILED:", emailResult.error);
      throw new Error(`Falha ao enviar e-mail de redefinição: ${emailResult.error || "Erro no serviço de e-mail"}`);
    }

    return { success: true, message: "Se o e-mail estiver cadastrado, você receberá um link de recuperação." };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Ocorreu um erro interno ao enviar o link de redefinição.";
    return { error: msg };
  }
}

export async function resetPassword(token: string, passwordStr: string) {
  if (!token) {
    return { error: "Token inválido ou expirado." };
  }
  if (!passwordStr || passwordStr.length < 6) {
    return { error: "A nova senha deve ter pelo menos 6 caracteres." };
  }

  try {
    const ipHeaders = await headers();
    const ip = ipHeaders.get("x-forwarded-for") || ipHeaders.get("x-real-ip") || "127.0.0.1";
    const limiter = await rateLimit(`reset-execute-ip:${ip}`, 5, 600000);
    if (!limiter.success) {
      return { error: "Muitas tentativas de redefinição. Tente novamente mais tarde." };
    }

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token }
    });

    if (!resetToken || resetToken.expires < new Date()) {
      return { error: "Token inválido, expirado ou já utilizado." };
    }

    const user = await prisma.user.findUnique({
      where: { email: resetToken.email }
    });

    if (!user) {
      return { error: "Usuário não encontrado." };
    }

    const hashedPassword = await bcryptjs.hash(passwordStr, 10);
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          setupToken: null
        }
      });

      await tx.passwordResetToken.delete({
        where: { id: resetToken.id }
      });

      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "PASSWORD_RESET",
          entity: "USER",
          entityId: user.id,
          severity: "success",
          ip
        }
      });
    });

    return { success: true, role: user.role };
  } catch (error) {
    return { error: "Erro interno ao redefinir a senha. Tente novamente." };
  }
}
