import bcrypt from "bcryptjs";
import { z } from "zod";
import { WorkspaceAccessError } from "@/modules/workspaces/domain/types";
import { EmailService } from "@/lib/emails/service";
import prisma from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { issueCredentialProof } from "./credential-proof";
import { authenticationPolicyKey, resolveAuthenticationPolicy, prepareEmailFactor, consumeEmailFactor, consumeAuthenticatorFactor } from "./mfa-service";

export const mfaReauthenticationSchema = z.object({ password: z.string().min(1).max(256), code: z.string().max(32).optional(), totpCode: z.string().max(32).optional(), forceNewCode: z.boolean().optional() }).strict();
export function mfaSettingsProofKey(policy: NonNullable<Awaited<ReturnType<typeof resolveAuthenticationPolicy>>>) { return `MFA_SETTINGS:${authenticationPolicyKey(policy)}`; }

/** A login proof cannot authorize a settings mutation; all current factors must be repeated. */
export async function reauthenticateMfaSettings(userId: string, sessionVersion: number, raw: unknown) {
  const parsed = mfaReauthenticationSchema.safeParse(raw);
  if (!parsed.success) throw new WorkspaceAccessError(400, "INVALID_REQUEST", "Dados de confirmação inválidos.");
  if (!(await rateLimit(`mfa-settings-reauth:${userId}`, 12, 600000)).success) throw new WorkspaceAccessError(429, "UNAUTHORIZED", "Muitas tentativas. Aguarde antes de confirmar novamente.");
  const policy = await resolveAuthenticationPolicy(userId);
  if (!policy || policy.user.role !== "SUPERADMIN" || policy.user.sessionVersion !== sessionVersion) throw new WorkspaceAccessError(403, "UNAUTHORIZED", "Entre novamente para confirmar a alteração.");
  if (!await bcrypt.compare(parsed.data.password, policy.user.password || "")) throw new WorkspaceAccessError(401, "UNAUTHORIZED", "Credenciais de confirmação inválidas.");
  const identifier = `MFA_SETTINGS:${policy.identifier}`;
  const { code, totpCode } = parsed.data;
  let complete = !policy.requiresMfa;
  if (policy.requiresTotp && (totpCode || (!policy.requiresEmail && code))) {
    complete = await consumeAuthenticatorFactor(userId, identifier, totpCode || code || "", policy.requiresEmail);
    if (!complete) throw new WorkspaceAccessError(401, "INVALID_TOKEN", "Código inválido, utilizado ou confirmação expirada.");
  } else if (policy.requiresEmail && code) {
    complete = await consumeEmailFactor(identifier, code, policy.requiresTotp);
    if (!complete) throw new WorkspaceAccessError(401, "INVALID_TOKEN", "Código inválido, utilizado ou expirado.");
    if (policy.requiresTotp) return { success: false as const, step: "TOTP" as const, message: "E-mail confirmado. Informe o código do autenticador atual." };
  } else if (policy.requiresTotp && !policy.requiresEmail) {
    return { success: false as const, step: "TOTP" as const, message: "Informe o código do autenticador atual." };
  } else if (policy.requiresEmail) {
    const prepared = await prepareEmailFactor(identifier, parsed.data.forceNewCode === true);
    if (prepared.code) {
      const sent = await EmailService.sendTwoFactorCode(policy.user.email || "", prepared.code);
      if (!sent.success) {
        await prisma.verificationToken.deleteMany({ where: { identifier } });
        throw new WorkspaceAccessError(503, "UNAUTHORIZED", "Não foi possível enviar o código de confirmação.");
      }
    }
    return { success: false as const, step: "EMAIL" as const, message: "Informe o código enviado ao seu e-mail." };
  }
  if (!complete) throw new WorkspaceAccessError(401, "UNAUTHORIZED", "Confirmação incompleta.");
  const current = await resolveAuthenticationPolicy(userId);
  if (!current || mfaSettingsProofKey(current) !== mfaSettingsProofKey(policy)) throw new WorkspaceAccessError(403, "UNAUTHORIZED", "A proteção da conta mudou. Reinicie a confirmação.");
  return { success: true as const, reauthenticationProof: await issueCredentialProof(userId, current.user.password || "", mfaSettingsProofKey(current)), expiresInSeconds: 60 };
}
