import { GlobalRole, Prisma } from "@prisma/client";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { isValidCpfCnpj } from "@/lib/cpf-validator";
import { serializableTransaction } from "@/modules/workspaces/application/transaction";
import { WorkspaceAccessError } from "@/modules/workspaces/domain/types";

export const adminUserSelect = {
  id: true, name: true, email: true, image: true, role: true, onboarded: true,
  createdAt: true, updatedAt: true, whatsapp: true, cpfCnpj: true, birthDate: true,
  gender: true, twoFactorEnabled: true, threeFactorEnabled: true, twoFactorType: true,
  isTestAccount: true, isBlocked: true,
} satisfies Prisma.UserSelect;

const nullableText = (length: number) => z.string().trim().max(length).nullable();
const birthDate = z.string().refine(value => {
  if (!/^\d{4}-\d{2}-\d{2}(T.*)?$/.test(value)) return false;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value.slice(0, 10) && date <= new Date();
}, "Data de nascimento inválida.").nullable();
export const createAdminUserSchema = z.object({
  name: z.string().trim().min(1).max(120), email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(6).max(72), role: z.enum(GlobalRole),
}).strict();
const updateSchema = createAdminUserSchema.partial().extend({
  name: nullableText(120).optional(), whatsapp: nullableText(30).optional(),
  cpfCnpj: nullableText(24).refine(value => !value || isValidCpfCnpj(value), "CPF/CNPJ inválido.").optional(),
  birthDate: birthDate.optional(), gender: nullableText(40).optional(),
  twoFactorEnabled: z.boolean().nullable().optional(), isTestAccount: z.boolean().optional(),
  isBlocked: z.boolean().optional(),
}).strict().refine(value => Object.keys(value).length > 0, "Nenhuma alteração informada.");

export async function updateAdminUser(userId: string, actorUserId: string, body: unknown) {
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) throw new WorkspaceAccessError(400, "INVALID_REQUEST", parsed.error.issues[0].message);
  const values = parsed.data;
  const passwordHash = values.password === undefined ? undefined : await bcrypt.hash(values.password, 10);

  let suspendedWorkspaceIds: string[] = [];

  const user = await serializableTransaction(async tx => {
    const actor = await tx.user.findUnique({ where: { id: actorUserId }, select: { role: true } });
    if (actor?.role !== "SUPERADMIN") throw new WorkspaceAccessError(403, "INSUFFICIENT_PERMISSIONS", "Somente superadmin pode editar esta conta.");
    const previous = await tx.user.findUnique({ where: { id: userId }, select: { id: true, email: true, role: true, twoFactorEnabled: true, isBlocked: true } });
    if (!previous) throw new WorkspaceAccessError(404, "USER_NOT_FOUND", "Usuário não encontrado.");
    if (values.role !== undefined && values.role !== "SUPERADMIN" && previous.role === "SUPERADMIN" && await tx.user.count({ where: { role: "SUPERADMIN" } }) <= 1) throw new WorkspaceAccessError(409, "INVALID_STATUS", "Mantenha pelo menos um superadmin para recuperação administrativa.");
    if (values.isBlocked === true && previous.role === "SUPERADMIN" && await tx.user.count({ where: { role: "SUPERADMIN", isBlocked: false } }) <= 1) {
      throw new WorkspaceAccessError(409, "INVALID_STATUS", "Não é permitido bloquear o único superadmin ativo.");
    }

    const isBlocking = values.isBlocked === true && !previous.isBlocked;
    const isUnblocking = values.isBlocked === false && previous.isBlocked;

    if (isBlocking) {
      const owned = await tx.workspace.findMany({
        where: { ownerId: userId, isActive: true },
        select: { id: true, name: true }
      });
      if (owned.length > 0) {
        await tx.workspace.updateMany({
          where: { ownerId: userId, isActive: true },
          data: { isActive: false }
        });
        for (const ws of owned) {
          await tx.auditLog.create({
            data: {
              userId: actorUserId,
              action: "WORKSPACE_SUSPENDED_BY_USER_BLOCK",
              entity: "WORKSPACE",
              entityId: ws.id,
              severity: "warning",
              metadata: { ownerId: userId }
            }
          });
        }
        suspendedWorkspaceIds = owned.map(w => w.id);
      }
    }

    const revoke = passwordHash !== undefined || (values.role !== undefined && values.role !== previous.role) || (values.email !== undefined && values.email !== previous.email) || (values.twoFactorEnabled !== undefined && values.twoFactorEnabled !== previous.twoFactorEnabled) || isBlocking;
    const data: Prisma.UserUpdateInput = {
      name: values.name, email: values.email, password: passwordHash, role: values.role,
      whatsapp: values.whatsapp || (values.whatsapp === undefined ? undefined : null),
      cpfCnpj: values.cpfCnpj?.replace(/\D/g, "") || (values.cpfCnpj === undefined ? undefined : null),
      birthDate: values.birthDate === undefined ? undefined : values.birthDate ? new Date(values.birthDate) : null,
      gender: values.gender, twoFactorEnabled: values.twoFactorEnabled, isTestAccount: values.isTestAccount,
      isBlocked: values.isBlocked,
      ...(revoke ? { sessionVersion: { increment: 1 } } : {}),
      ...(passwordHash !== undefined ? { setupToken: null, setupTokenExpiresAt: null } : {}),
    };
    const updated = await tx.user.update({ where: { id: userId }, data, select: adminUserSelect });
    const auditAction = isBlocking ? "BLOCK_USER" : isUnblocking ? "UNBLOCK_USER" : revoke ? "UPDATE_USER_REVOKE_SESSIONS" : "UPDATE_USER";
    await tx.auditLog.create({ data: { userId: actorUserId, action: auditAction, entity: "USER", entityId: userId, severity: isBlocking ? "warning" : "info" } });
    return updated;
  });

  if (values.isBlocked === true) {
    try {
      const { publishToChannel } = await import("@/lib/ably");
      await publishToChannel(`user:${userId}`, "user:blocked", { userId });
      for (const wsId of suspendedWorkspaceIds) {
        await publishToChannel(`workspace:${wsId}`, "workspace:suspended", { workspaceId: wsId });
      }
    } catch (e) {
      console.warn("Could not publish disconnect events to Ably:", e);
    }
  }

  return user;
}
