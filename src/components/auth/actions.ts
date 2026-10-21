"use server";
import { getPasswordSetupInfo, completePasswordSetup } from "@/lib/auth/password-setup-service";

import { completePasswordReset, type PasswordResetResult } from "@/lib/auth/password-reset-service";

import { signIn, auth } from "@/auth";
import { AuthError } from "next-auth";
import prisma from "@/lib/prisma";
import bcryptjs from "bcryptjs";
import { redirect } from "next/navigation";

import { headers } from "next/headers";
import { rateLimit } from "@/lib/rate-limit";
import crypto from "crypto";
import { EmailService } from "@/lib/emails/service";
import { getAppBaseUrl } from "@/lib/emails/templates/base-layout";
import { verifyTOTP } from "@/lib/auth/totp";
import { issueCredentialProof } from "@/lib/auth/credential-proof";
import { resolveAuthenticationPolicyByEmail, authenticationPolicyKey, prepareEmailFactor, consumeEmailFactor, consumeAuthenticatorFactor } from "@/lib/auth/mfa-service";
import type { LoginResult } from "@/lib/auth/login-contract";
import { permitsOwnAccount } from "@/lib/auth/account-eligibility";

const TWO_FACTOR_EXPIRATION_MS = 10 * 60 * 1000;

export async function login(formData: {
  email: string;
  password: string;
  redirectTo: string;
  code?: string;
  totpCode?: string;
  forceNewCode?: boolean;
}): Promise<LoginResult> {
  const email = formData.email.trim().toLowerCase();
  if (!email || email.length > 254 || typeof formData.password !== "string") return { error: "Credenciais inválidas." };
  const ipHeaders = await headers();
  const ip = ipHeaders.get("x-forwarded-for")?.split(",")[0]?.trim().slice(0, 80) || "unknown";
  if (!(await rateLimit(`login-ip:${ip}`, 30, 600000)).success || !(await rateLimit(`login-account:${email}`, 20, 600000)).success) return { error: "Muitas tentativas. Aguarde antes de tentar novamente." };
  const policy = await resolveAuthenticationPolicyByEmail(email);
  if (!policy || !await bcryptjs.compare(formData.password, policy.user.password || "")) return { error: "Credenciais inválidas. Tente novamente." };
  const maintenance = await prisma.systemSetting.findUnique({ where: { key: "maintenance_mode" } });
  if (maintenance?.value === "true" && policy.user.role !== "SUPERADMIN") return { error: "O sistema está em manutenção." };
  try {
    const complete = async (): Promise<Extract<LoginResult, { success: true }>> => {
      const proof = await issueCredentialProof(policy.user.id, policy.user.password || "", authenticationPolicyKey(policy));
      await signIn("credentials", { email, password: formData.password, authenticationProof: proof, redirect: false });
      return { success: true, role: policy.user.role };
    };
    if (!policy.requiresMfa) return await complete();
    const challenge: Extract<LoginResult, { requires2FA: true }> = { requires2FA: true, requires3FA: policy.threeFactor, email };
    if (policy.requiresTotp && (formData.totpCode || (!policy.requiresEmail && formData.code))) {
      const valid = await consumeAuthenticatorFactor(policy.user.id, policy.identifier, formData.totpCode || formData.code || "", policy.requiresEmail);
      if (!valid) return { error: "Código inválido, utilizado ou confirmação por e-mail expirada." };
      return await complete();
    }
    if (policy.requiresEmail && formData.code) {
      if (!await consumeEmailFactor(policy.identifier, formData.code, policy.requiresTotp)) return { error: "Código inválido, expirado ou já utilizado." };
      if (policy.requiresTotp) return { ...challenge, currentStep: "TOTP_OTP", twoFactorType: "AUTHENTICATOR", message: "E-mail confirmado. Informe o código do autenticador." };
      return await complete();
    }
    if (policy.requiresTotp && !policy.requiresEmail) return { ...challenge, currentStep: "TOTP_OTP", twoFactorType: "AUTHENTICATOR" };
    const prepared = await prepareEmailFactor(policy.identifier, formData.forceNewCode === true);
    if (prepared.code) {
      const sent = await EmailService.sendTwoFactorCode(email, prepared.code);
      if (!sent.success) {
        await prisma.verificationToken.deleteMany({ where: { identifier: policy.identifier } });
        return { error: "Não foi possível enviar a verificação. Tente novamente ou procure o suporte." };
      }
    }
    return { ...challenge, currentStep: "EMAIL_OTP", twoFactorType: "EMAIL", isExistingCodeActive: prepared.existing, isNewCodeGenerated: !prepared.existing };
  } catch (error) {
    if (error instanceof AuthError) return { error: "Não foi possível autenticar. Reinicie o login." };
    throw error;
  }
}


export async function getSetupInfo(token: string) {
  const requestHeaders = await headers();
  const ip = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim().slice(0, 80) || "unknown";
  if (!(await rateLimit(`setup-info-ip:${ip}`, 60, 600000)).success) return { error: "Muitas tentativas. Aguarde antes de validar o convite." };
  if (typeof token === "string" && token.startsWith("gym_")) {
    try { return await (await import("@/modules/workspaces/application/gym-student-ingress")).getStudentInvitationInfo(token); }
    catch { return { error: "Convite indisponível, expirado ou utilizado. Solicite um novo convite à academia." }; }
  }
  return getPasswordSetupInfo(token);
}

export async function setupPassword(
  token: string,
  passwordStr: string,
  cpfCnpjStr?: string,
  birthDateStr?: string,
  acceptedTerms?: boolean,
  acceptedPrivacy?: boolean,
  termsDocumentId?: string,
  privacyDocumentId?: string,
  emailStr?: string,
  termsDocumentHash?: string,
  privacyDocumentHash?: string
) {
  const requestHeaders = await headers();
  const ip = requestHeaders.get('x-forwarded-for')?.split(',')[0]?.trim().slice(0, 80) || "unknown";
  if (!(await rateLimit(`setup-password-ip:${ip}`, 12, 600000)).success) return { error: "Muitas tentativas. Aguarde antes de ativar a conta." };
  if (typeof token === "string" && token.startsWith("gym_")) {
    try {
      const session = await auth();
      return await (await import("@/modules/workspaces/application/gym-student-ingress")).completeStudentInvitation({ token, password: passwordStr, cpfCnpj: cpfCnpjStr || undefined, birthDate: birthDateStr || undefined, email: emailStr || undefined, acceptedTerms, acceptedPrivacy, termsDocumentId, privacyDocumentId, termsDocumentHash, privacyDocumentHash, ip, userAgent: requestHeaders.get("user-agent")?.slice(0, 500) || undefined }, session?.user?.id);
    } catch (error) {
      if (error instanceof Error && "statusCode" in error) return { error: error.message };
      return { error: "Não foi possível concluir a ativação. Tente novamente." };
    }
  }
  try { return await completePasswordSetup({ token, password: passwordStr, cpfCnpj: cpfCnpjStr, birthDate: birthDateStr, acceptedTerms, acceptedPrivacy, termsDocumentId, privacyDocumentId, termsDocumentHash, privacyDocumentHash, ip: requestHeaders.get('x-forwarded-for')?.split(',')[0]?.trim() || undefined, userAgent: requestHeaders.get('user-agent') || undefined }); }
  catch (error) { console.error('[PASSWORD_SETUP_FAILED]', { errorType: error instanceof Error ? error.name : 'unknown' }); return { error: 'Não foi possível concluir a ativação. Tente novamente.' }; }
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
    if (!await permitsOwnAccount(user.id)) return { success: true, message: "Se o e-mail estiver cadastrado, você receberá um link de recuperação." };

    const origin = getAppBaseUrl();
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
    const resetUrl = new URL("/auth/reset-password", origin);
    resetUrl.searchParams.set("token", token);
    const resetLink = resetUrl.toString();

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

export async function resetPassword(token: string, passwordStr: string): Promise<PasswordResetResult> {
  const ipHeaders = await headers();
  const ip = ipHeaders.get("x-forwarded-for")?.split(",")[0]?.trim().slice(0, 80) || "unknown";
  if (!(await rateLimit(`reset-execute-ip:${ip}`, 5, 600000)).success) return { error: "Muitas tentativas de redefinição. Tente novamente mais tarde." };
  try { return await completePasswordReset({ token, password: passwordStr, ip }); }
  catch { return { error: "Erro interno ao redefinir a senha. Tente novamente." }; }
}
