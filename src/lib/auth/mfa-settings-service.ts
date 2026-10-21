import { z } from "zod";
import { serializableTransaction } from "@/modules/workspaces/application/transaction";
import { WorkspaceAccessError } from "@/modules/workspaces/domain/types";
import { generateBackupCodes, verifyTOTP } from "./totp";
import { consumeCredentialProof } from "./credential-proof";
import { resolveAuthenticationPolicy } from "./mfa-service";
import { mfaSettingsProofKey } from "./mfa-reauthentication";

const inputSchema = z.discriminatedUnion("operation", [
  z.object({ operation: z.literal("PAIR"), secret: z.string().regex(/^[A-Z2-7]{32}$/), token: z.string().regex(/^\d{6}$/), deviceName: z.string().trim().min(1).max(100).optional() }).strict(),
  z.object({ operation: z.literal("REMOVE"), deviceId: z.string().min(1).max(100) }).strict(),
  z.object({ operation: z.literal("DISABLE") }).strict(),
  z.object({ operation: z.literal("THREE_FACTOR"), enabled: z.boolean() }).strict(),
]);

type MfaSettingsResult = {
  success: true; reauthenticationRequired: true; message: string;
  device?: { id: string; deviceName: string; createdAt: Date; lastUsedAt: Date | null };
  backupCodes?: string[]; remainingCount?: number; threeFactorEnabled?: boolean; requiresSetup?: never;
} | { success: false; requiresSetup: true; message: string; reauthenticationRequired?: never };

/** Current account/version are checked again in the transaction; every change revokes old sessions. */
export async function mutateMfaSettings(userId: string, sessionVersion: number, input: unknown, reauthenticationProof?: string): Promise<MfaSettingsResult> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) throw new WorkspaceAccessError(400, "INVALID_REQUEST", "Dados de configuração MFA inválidos.");
  const values = parsed.data;
  if (values.operation === "PAIR" && !verifyTOTP(values.secret, values.token)) throw new WorkspaceAccessError(400, "INVALID_TOKEN", "Código do autenticador inválido.");
  return serializableTransaction(async (tx): Promise<MfaSettingsResult> => {
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`;
    const user = await tx.user.findUnique({ where: { id: userId }, select: { id: true, role: true, sessionVersion: true, twoFactorSecret: true, twoFactorBackupCodes: true, totpDevices: { select: { id: true, secret: true } } } });
    if (user?.role !== "SUPERADMIN" || user.sessionVersion !== sessionVersion) throw new WorkspaceAccessError(403, "UNAUTHORIZED", "Sessão revogada. Entre novamente.");
    const policy = await resolveAuthenticationPolicy(userId, tx);
    if (!policy || !await consumeCredentialProof(userId, policy.user.password || "", reauthenticationProof, mfaSettingsProofKey(policy), tx)) throw new WorkspaceAccessError(403, "UNAUTHORIZED", "Confirme novamente sua senha e os fatores atuais antes de alterar MFA.");
    let device: { id: string; deviceName: string; createdAt: Date; lastUsedAt: Date | null } | undefined;
    let backupCodes: string[] | undefined;
    let remainingCount: number | undefined;
    if (values.operation === "PAIR") {
      if (user.totpDevices.some(item => item.secret === values.secret)) throw new WorkspaceAccessError(409, "INVALID_REQUEST", "Este autenticador já está cadastrado.");
      backupCodes = user.twoFactorBackupCodes.length ? undefined : generateBackupCodes(8);
      device = await tx.userTotpDevice.create({ data: { userId, secret: values.secret, deviceName: values.deviceName ?? `Aparelho ${user.totpDevices.length + 1}` }, select: { id: true, deviceName: true, createdAt: true, lastUsedAt: true } });
      await tx.user.update({ where: { id: userId }, data: { twoFactorSecret: values.secret, twoFactorType: "AUTHENTICATOR", twoFactorEnabled: true, threeFactorEnabled: true, ...(backupCodes ? { twoFactorBackupCodes: backupCodes } : {}), sessionVersion: { increment: 1 } } });
    } else if (values.operation === "REMOVE") {
      if (!user.totpDevices.some(item => item.id === values.deviceId)) throw new WorkspaceAccessError(404, "RESOURCE_NOT_FOUND", "Aparelho não encontrado nesta conta.");
      await tx.userTotpDevice.delete({ where: { id: values.deviceId } });
      const remaining = user.totpDevices.filter(item => item.id !== values.deviceId);
      remainingCount = remaining.length;
      await tx.user.update({ where: { id: userId }, data: { twoFactorSecret: remaining[0]?.secret ?? null, ...(remaining.length ? {} : { threeFactorEnabled: false, twoFactorType: "EMAIL", twoFactorBackupCodes: [] }), sessionVersion: { increment: 1 } } });
    } else if (values.operation === "DISABLE") {
      await tx.userTotpDevice.deleteMany({ where: { userId } });
      await tx.user.update({ where: { id: userId }, data: { twoFactorSecret: null, twoFactorType: "EMAIL", twoFactorEnabled: false, threeFactorEnabled: false, twoFactorBackupCodes: [], sessionVersion: { increment: 1 } } });
    } else {
      if (values.enabled && !user.twoFactorSecret && !user.totpDevices.length) return { success: false, requiresSetup: true, message: "Configure um autenticador antes de ativar 3FA." };
      await tx.user.update({ where: { id: userId }, data: { threeFactorEnabled: values.enabled, ...(values.enabled ? { twoFactorType: "AUTHENTICATOR", twoFactorEnabled: true } : {}), sessionVersion: { increment: 1 } } });
    }
    await tx.auditLog.create({ data: { userId, action: `MFA_${values.operation}_REVOKE_SESSIONS`, entity: "USER", entityId: userId, severity: "warning" } });
    return { success: true, reauthenticationRequired: true, device, backupCodes, remainingCount, ...(values.operation === "THREE_FACTOR" ? { threeFactorEnabled: values.enabled } : {}), message: "Configuração salva. Entre novamente para aplicar a proteção." };
  });
}
