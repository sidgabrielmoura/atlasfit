import { serializableTransaction, type GymTransactionClient } from "./transaction";
import { GymFeatureFlagsService } from "./gym-feature-flags-service";
import { provisionWorkspaceSchema, gymUnitSchema } from "../domain/gym-config";
import { WorkspaceAccessError } from "../domain/types";
import type { ProvisionGymWorkspaceInput } from "./superadmin-service";
import { provisionExpenseCategories } from "./gym-expense-catalog";
import { assertGymOperationalWorkspace } from "./gym-license";

export async function assertSuperadmin(tx: GymTransactionClient, userId: string) {
  if ((await tx.user.findUnique({ where: { id: userId }, select: { role: true } }))?.role !== "SUPERADMIN") throw new WorkspaceAccessError(403, "INSUFFICIENT_PERMISSIONS", "Operação restrita ao superadmin.");
}

export async function provisionGymWorkspace(raw: ProvisionGymWorkspaceInput, adminUserId: string) {
  const parsed = provisionWorkspaceSchema.safeParse(raw);
  if (!parsed.success) throw new WorkspaceAccessError(400, "INVALID_REQUEST", parsed.error.issues[0].message);
  const input = parsed.data;
  return serializableTransaction(async tx => {
    await assertSuperadmin(tx, adminUserId);
    const defaults = await GymFeatureFlagsService.getGymGlobalConfigs(tx);
    if (!await tx.user.findUnique({ where: { id: input.ownerId }, select: { id: true } })) throw new WorkspaceAccessError(404, "USER_NOT_FOUND", "Titular não encontrado.");
    if (await tx.workspace.findUnique({ where: { slug: input.slug }, select: { id: true } })) throw new WorkspaceAccessError(409, "INVALID_REQUEST", "Slug já utilizado.");
    const workspace = await tx.workspace.create({ data: { name: input.name, slug: input.slug, ownerId: input.ownerId, type: input.type } });
    await tx.workspaceMember.create({ data: { workspaceId: workspace.id, userId: input.ownerId, role: "OWNER", roleGrants: { create: { role: "OWNER", grantedBy: adminUserId } } } });
    if (workspace.type === "GYM") {
      if ((input.maxStaff ?? defaults.defaultMaxStaff) < 1) throw new WorkspaceAccessError(400, "INVALID_REQUEST", "O provisionamento precisa de capacidade para o titular da academia.");
      if ((input.maxUnits ?? defaults.defaultMaxUnits) < 1) throw new WorkspaceAccessError(400, "INVALID_REQUEST", "O provisionamento precisa de licença para uma unidade.");
      await tx.gymSettings.create({ data: { workspaceId: workspace.id, billingGracePeriodDays: defaults.defaultBillingGraceDays, requireGuardianSignature: defaults.defaultRequireGuardianSignature, maxReceptionistDiscountPercentage: defaults.defaultMaxReceptionistDiscountPercent, maxReceptionistDiscountInCents: BigInt(defaults.defaultMaxReceptionistDiscountCents) } });
      await tx.gymUnit.create({ data: { workspaceId: workspace.id, name: input.initialUnitName ?? "Unidade Principal", slug: `${input.slug}-principal`, code: "U01" } });
      await provisionExpenseCategories(tx, workspace.id);
      await tx.workspaceSubscription.create({ data: { workspaceId: workspace.id, status: "TRIAL", trialEndsAt: new Date(Date.now() + 30 * 86400000), maxStudents: input.maxStudents ?? defaults.defaultMaxStudents, maxStaff: input.maxStaff ?? defaults.defaultMaxStaff, maxUnits: input.maxUnits ?? defaults.defaultMaxUnits, storageLimitMb: defaults.defaultStorageLimitMb } });
    }
    await tx.auditLog.create({ data: { userId: adminUserId, action: "SUPERADMIN_CREATE_WORKSPACE", entity: "WORKSPACE", entityId: workspace.id, severity: "success" } });
    return workspace;
  });
}

export async function addGymUnit(workspaceId: string, raw: unknown, adminUserId: string) {
  const parsed = gymUnitSchema.safeParse(raw);
  if (!parsed.success) throw new WorkspaceAccessError(400, "INVALID_REQUEST", parsed.error.issues[0].message);
  return serializableTransaction(async tx => {
    await assertSuperadmin(tx, adminUserId);
    const workspace = await assertGymOperationalWorkspace(workspaceId, tx);
    if (workspace?.type !== "GYM") throw new WorkspaceAccessError(404, "WORKSPACE_NOT_FOUND", "Academia não encontrada.");
    if (await tx.gymUnit.count({ where: { workspaceId, isActive: true } }) >= (workspace.subscription?.maxUnits ?? 0)) throw new WorkspaceAccessError(409, "INVALID_REQUEST", "Limite de unidades da licença atingido.");
    const unit = await tx.gymUnit.create({ data: { ...parsed.data, workspaceId } });
    await tx.auditLog.create({ data: { userId: adminUserId, action: "SUPERADMIN_ADD_GYM_UNIT", entity: "GYM_UNIT", entityId: unit.id } });
    return unit;
  });
}
