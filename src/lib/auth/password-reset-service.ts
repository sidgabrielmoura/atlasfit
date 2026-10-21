import bcrypt from "bcryptjs";
import { z } from "zod";
import { serializableTransaction } from "@/modules/workspaces/application/transaction";
import type { GlobalRole } from "@prisma/client";
import { permitsOwnAccount } from "./account-eligibility";

export type PasswordResetResult = { success: true; role: GlobalRole; error?: never } | { error: string; success?: never; role?: never };

/** The one-time reset token, password change and revocation commit together. */
export async function completePasswordReset(input: { token: string; password: string; ip?: string }): Promise<PasswordResetResult> {
  const values = z.object({ token: z.string().min(16).max(256), password: z.string().min(6).max(72).refine(value => Buffer.byteLength(value, "utf8") <= 72) }).safeParse(input);
  if (!values.success) return { error: "Token inválido ou senha fora do limite de seis caracteres e 72 bytes." };
  const passwordHash = await bcrypt.hash(values.data.password, 10);
  return serializableTransaction(async tx => {
    const reset = await tx.passwordResetToken.findUnique({ where: { token: values.data.token }, select: { id: true, email: true, expires: true } });
    if (!reset || reset.expires <= new Date()) return { error: "Token inválido, expirado ou já utilizado." };
    const user = await tx.user.findUnique({ where: { email: reset.email }, select: { id: true, role: true } });
    if (!user) return { error: "Token inválido, expirado ou já utilizado." };
    if (!await permitsOwnAccount(user.id, tx)) return { error: "O acesso do menor deve ocorrer pela conta do responsável. Procure a academia." };
    const claim = await tx.passwordResetToken.deleteMany({ where: { id: reset.id, token: values.data.token, expires: { gt: new Date() } } });
    if (claim.count !== 1) return { error: "Token inválido, expirado ou já utilizado." };
    await tx.user.update({ where: { id: user.id }, data: { password: passwordHash, setupTokenExpiresAt: null, setupToken: null, sessionVersion: { increment: 1 } } });
    // Other reset links and in-flight MFA proofs must not outlive the credential change.
    await tx.passwordResetToken.deleteMany({ where: { email: reset.email } });
    await tx.auditLog.create({ data: { userId: user.id, action: "PASSWORD_RESET", entity: "USER", entityId: user.id, severity: "success", ip: input.ip?.slice(0, 80) } });
    return { success: true, role: user.role };
  });
}
