"use server";

import { signIn } from "@/auth";
import { AuthError } from "next-auth";
import prisma from "@/lib/prisma";
import bcryptjs from "bcryptjs";
import { redirect } from "next/navigation";

import { headers } from "next/headers";
import { rateLimit } from "@/lib/rate-limit";
import crypto from "crypto";
import { resend } from "@/lib/resend";
import { 
  getResetPasswordEmailHtml, 
  getResetPasswordEmailText,
  getTwoFactorEmailHtml,
  getTwoFactorEmailText
} from "@/lib/email-templates";

export async function login(formData: {
  email: string;
  password: string;
  redirectTo: string;
  code?: string;
}) {
  try {
    const ipHeaders = await headers();
    const ip = ipHeaders.get("x-forwarded-for") || ipHeaders.get("x-real-ip") || "127.0.0.1";
    const limiter = await rateLimit(`login:${ip}`, 10, 60000); // Expanded rate limit to allow OTP attempts

    if (!limiter.success) {
      return { error: "Muitas tentativas de login. Tente novamente mais tarde." };
    }
    const user = await prisma.user.findUnique({
      where: { email: formData.email }
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

    // If a 2FA OTP code is submitted
    if (formData.code) {
      const identifier = `2FA:${formData.email}`;
      const dbToken = await prisma.verificationToken.findFirst({
        where: {
          identifier,
          token: formData.code,
          expires: { gt: new Date() }
        }
      });

      if (!dbToken) {
        return { error: "Código de verificação inválido ou expirado." };
      }

      // Delete the verified token
      await prisma.verificationToken.delete({
        where: { token: dbToken.token }
      });

      await signIn("credentials", {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });
      return { success: true, role: user.role };
    }

    // Verify Password first
    const isPasswordValid = user.password ? await bcryptjs.compare(formData.password, user.password) : false;
    if (!isPasswordValid) {
      return { error: "Credenciais inválidas. Tente novamente." };
    }

    // Check if global 2FA is active
    const global2FA = await prisma.systemSetting.findUnique({
      where: { key: "two_factor_auth_enabled" }
    });
    const isGlobal2FA = global2FA?.value === "true";
    
    // User-specific configuration overrides global setting if explicitly set (not null)
    const is2FAEnabled = user.twoFactorEnabled !== null 
      ? user.twoFactorEnabled 
      : isGlobal2FA;

    // If 2FA is NOT enabled (taking override logic into account), bypass and log in immediately
    if (!is2FAEnabled) {
      await signIn("credentials", {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });
      return { success: true, role: user.role };
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const identifier = `2FA:${formData.email}`;

    // Clean up old active 2FA codes for this email
    await prisma.verificationToken.deleteMany({
      where: { identifier }
    });

    // Save token
    await prisma.verificationToken.create({
      data: {
        identifier,
        token: code,
        expires: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes validity
      }
    });

    // Send email using Resend integration
    const fromEmail = process.env.EMAIL_FROM || "AtlasFit <noreply@atlasfit.site>";
    await resend.emails.send({
      from: fromEmail,
      to: formData.email,
      subject: `${code} é seu código de segurança do AtlasFit`,
      html: getTwoFactorEmailHtml(code),
      text: getTwoFactorEmailText(code),
    });

    return { requires2FA: true, email: formData.email };
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

export async function setupPassword(token: string, passwordStr: string) {
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

    const hashedPassword = await bcryptjs.hash(passwordStr, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        setupToken: null,
      }
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

    const deleted = await prisma.passwordResetToken.deleteMany({
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

    const fromEmail = process.env.EMAIL_FROM || "AtlasFit <noreply@resend.dev>";

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: normalizedEmail,
      subject: "Redefinição de Senha - AtlasFit",
      html: getResetPasswordEmailHtml(resetLink),
      text: getResetPasswordEmailText(resetLink),
    });

    if (error) {
      throw new Error(`Resend email dispatch failed: ${error.message}`);
    }

    return { success: true, message: "Se o e-mail estiver cadastrado, você receberá um link de recuperação." };
  } catch (error) {
    return { error: "Ocorreu um erro interno ao enviar o link de redefinição." };
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
