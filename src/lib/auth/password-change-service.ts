import bcrypt from "bcryptjs";
import { z } from "zod";
import { serializableTransaction } from "@/modules/workspaces/application/transaction";
import { WorkspaceAccessError } from "@/modules/workspaces/domain/types";
import { permitsOwnAccount } from "./account-eligibility";
import { rateLimit } from "@/lib/rate-limit";

const password = z.string().min(6).max(72).refine(value => Buffer.byteLength(value, "utf8") <= 72);
const schema = z.object({ action: z.literal("changePassword"), currentPassword: z.string().min(1).max(256), newPassword: password }).strict();
export async function changeOwnPassword(principal: { id: string; sessionVersion: number; isImpersonated?: boolean }, body: unknown) {
  if (principal.isImpersonated) throw new WorkspaceAccessError(403, "FORBIDDEN_RESOURCE", "Altere credenciais apenas na própria conta.");
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new WorkspaceAccessError(400, "INVALID_REQUEST", "Dados inválidos; a nova senha exige seis caracteres e no máximo 72 bytes.");
  if (!(await rateLimit(`password-change:${principal.id}`, 10, 60000)).success) throw new WorkspaceAccessError(429, "INVALID_REQUEST", "Muitas tentativas. Aguarde antes de tentar novamente.");
  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 10);
  return serializableTransaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${principal.id} FOR UPDATE`;
    const user = await tx.user.findUnique({ where: { id: principal.id }, select: { password: true, sessionVersion: true, email: true } });
    if (!user?.password || user.sessionVersion !== principal.sessionVersion || !await permitsOwnAccount(principal.id, tx)) throw new WorkspaceAccessError(403, "UNAUTHORIZED", "Entre novamente na própria conta.");
    if (!await bcrypt.compare(parsed.data.currentPassword, user.password)) throw new WorkspaceAccessError(400, "INVALID_REQUEST", "Senha atual incorreta.");
    await tx.user.update({ where: { id: principal.id }, data: { password: passwordHash, sessionVersion: { increment: 1 }, setupToken: null, setupTokenExpiresAt: null } });
    if (user.email) await tx.passwordResetToken.deleteMany({ where: { email: user.email } });
    await tx.auditLog.create({ data: { userId: principal.id, action: "PASSWORD_CHANGED_REVOKE_SESSIONS", entity: "USER", entityId: principal.id, severity: "success" } });
    return { success: true, message: "Senha alterada. Entre novamente com a nova senha." };
  });
}
