import { z } from "zod";
import { WorkspaceAccessError } from "../domain/types";
import { idempotentSerializableTransaction } from "./transaction";
import { assertSuperadmin } from "./gym-provisioning";
import { transferWorkspaceOwnerInTransaction } from "./team-lifecycle";
import { gymClosureAction } from "./gym-closure";

export const workspaceAdministrationSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).min(3).max(80).optional(),
  ownerId: z.string().trim().min(1).max(100).optional(),
  type: z.enum(["PERSONAL", "GYM"]).optional(),
  isActive: z.boolean().optional(), expectedIsActive: z.boolean().optional(),
}).strict().refine(data => Object.keys(data).some(key => key !== "expectedIsActive"), "Informe a alteração.")
  .refine(data => data.isActive === undefined || data.expectedIsActive !== undefined, "Recarregue o estado atual antes de suspender ou reativar.");

/** Administrative recovery remains possible on suspended workspaces. */
export async function updateWorkspaceAdministration(workspaceId: string, raw: unknown, actorUserId: string, effectiveUserId = actorUserId) {
  const parsed = workspaceAdministrationSchema.safeParse(raw);
  if (!parsed.success) throw new WorkspaceAccessError(400, "INVALID_REQUEST", parsed.error.issues[0].message);
  const input = parsed.data;
  const result = await idempotentSerializableTransaction(async tx => {
    await assertSuperadmin(tx, actorUserId);
    const before = await tx.workspace.findUnique({ where: { id: workspaceId }, select: { id: true, ownerId: true, type: true, isActive: true } });
    if (!before) throw new WorkspaceAccessError(404, "WORKSPACE_NOT_FOUND", "Workspace não encontrado.");
    if ((input.isActive === true || (input.ownerId && input.ownerId !== before.ownerId)) && await tx.auditLog.findFirst({ where: { entity: "WORKSPACE", entityId: workspaceId, action: gymClosureAction }, select: { id: true } })) throw new WorkspaceAccessError(409, "GYM_DATA_RETENTION_REQUIRED", "Academia encerrada. A reabertura exige revisão própria de contratos, licença e retenção.");
    if (input.type !== undefined && input.type !== before.type) throw new WorkspaceAccessError(409, "INVALID_TYPE", "O tipo é definido no provisionamento e não pode ser convertido nesta edição.");
    if (input.isActive !== undefined && input.expectedIsActive !== before.isActive) throw new WorkspaceAccessError(409, "INVALID_REQUEST", "O estado mudou. Recarregue antes de suspender ou reativar.");
    if (input.slug) {
      const duplicate = await tx.workspace.findUnique({ where: { slug: input.slug }, select: { id: true } });
      if (duplicate && duplicate.id !== workspaceId) throw new WorkspaceAccessError(409, "INVALID_REQUEST", "Slug já utilizado.");
    }
    if (input.ownerId && input.ownerId !== before.ownerId) await transferWorkspaceOwnerInTransaction(tx, { workspaceId, currentOwnerUserId: before.ownerId, targetUserId: input.ownerId, auditActorId: actorUserId });
    const updated = await tx.workspace.update({ where: { id: workspaceId }, data: { name: input.name, slug: input.slug, isActive: input.isActive }, include: { settings: true, units: true, subscription: true } });
    await tx.auditLog.create({ data: {
      userId: actorUserId, action: `SUPERADMIN_WORKSPACE_UPDATE:${JSON.stringify({ effectiveUserId, before, applied: { ownerId: updated.ownerId, type: updated.type, isActive: updated.isActive, name: updated.name, slug: updated.slug } })}`,
      entity: "WORKSPACE", entityId: workspaceId, severity: input.isActive === false ? "warning" : "success",
      metadata: { before: { ownerId: before.ownerId, isActive: before.isActive, type: before.type }, after: { ownerId: updated.ownerId, isActive: updated.isActive, type: updated.type }, changedFields: Object.keys(input).filter(key => key !== "expectedIsActive") },
    } });
    return updated;
  });

  if (input.isActive === false) {
    try {
      const { publishToChannel } = await import("@/lib/ably");
      await publishToChannel(`workspace:${workspaceId}`, "workspace:suspended", { workspaceId });
    } catch (e) {
      console.warn("Could not publish workspace:suspended event to Ably:", e);
    }
  }

  return result;
}
