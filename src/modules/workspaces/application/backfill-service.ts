import prisma from "@/lib/prisma";
import { WorkspaceRole } from "../domain/roles";
import { serializableTransaction } from "./transaction";
import { assertSuperadmin } from "./gym-provisioning";
import { GymFeatureFlagsService } from "./gym-feature-flags-service";
import { WorkspaceAccessError } from "../domain/types";
import { assertGymOperationalWorkspace } from "./gym-license";

/**
 * Service for safe, idempotent backfills of legacy workspaces and members to the GYM-020 model.
 */
export class BackfillService {
  /**
   * Backfills legacy WorkspaceMember roles into explicit WorkspaceRoleGrant records.
   * If workspaceId is omitted, processes all members without grants.
   */
  async backfillLegacyRoleGrants(workspaceId?: string, adminUserId?: string): Promise<{ backfilledCount: number }> {
    if (!adminUserId) throw new WorkspaceAccessError(401, "UNAUTHORIZED", "Administrador identificado obrigatório.");
    await assertSuperadmin(prisma, adminUserId);
    const membersWithoutGrants = await prisma.workspaceMember.findMany({
      where: {
        ...(workspaceId ? { workspaceId } : {}),
        roleGrants: { none: {} },
        workspace: { type: "GYM" },
      },
      select: {
        id: true,
        role: true,
        workspaceId: true,
        createdAt: true,
        unitId: true,
      },
    });

    let backfilledCount = 0;

    for (const member of membersWithoutGrants) {
      const changed = await serializableTransaction(async tx => {
      await assertSuperadmin(tx, adminUserId);
      const current = await tx.workspaceMember.findFirst({ where: { id: member.id, roleGrants: { none: {} }, workspace: { type: "GYM" } }, include: { workspace: { select: { ownerId: true } } } });
      if (!current) return false;
      const unitId = current.userId === current.workspace.ownerId ? null : current.unitId;
      if (unitId && !await tx.gymUnit.findFirst({ where: { id: unitId, workspaceId: member.workspaceId }, select: { id: true } })) throw new WorkspaceAccessError(409, "TENANT_MISMATCH", "A unidade histórica exige reconciliação.");
      await tx.workspaceRoleGrant.create({
        data: {
          memberId: member.id,
          role: current.userId === current.workspace.ownerId ? "OWNER" : current.role as WorkspaceRole,
          unitId,
          grantedBy: adminUserId,
          grantedAt: member.createdAt,
        },
      });
      await tx.auditLog.create({ data: { userId: adminUserId, action: `GYM_LEGACY_ROLE_MIGRATED:${current.role}:${unitId ?? "GLOBAL"}`, entity: "WORKSPACE_MEMBER", entityId: member.id } });
      return true;
      });
      if (changed) backfilledCount++;
    }

    return { backfilledCount };
  }

  /**
   * Ensures a GYM workspace has GymSettings and at least one default GymUnit.
   */
  async ensureGymSettingsAndDefaultUnit(
    workspaceId: string,
    defaultUnitName: string = "Unidade Principal", adminUserId?: string
  ) {
    if (!adminUserId) throw new WorkspaceAccessError(401, "UNAUTHORIZED", "Administrador identificado obrigatório.");
    return serializableTransaction(async tx => {
    await assertSuperadmin(tx, adminUserId);
    const defaults = await GymFeatureFlagsService.getGymGlobalConfigs(tx);
    const workspace = await tx.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        settings: true,
        units: { take: 1 },
      },
    });

    if (!workspace || workspace.type !== "GYM") {
      throw new Error(`Workspace ${workspaceId} não encontrado.`);
    }

    // 1. Ensure GymSettings
    let settings = workspace.settings;
    if (!settings) {
      settings = await tx.gymSettings.create({
        data: {
          workspaceId,
          timezone: "America/Sao_Paulo",
          billingGracePeriodDays: defaults.defaultBillingGraceDays,
          requireGuardianSignature: defaults.defaultRequireGuardianSignature,
          version: 1,
        },
      });
    }

    // 2. Ensure at least one default GymUnit
    let unit = workspace.units[0];
    if (!unit) {
      const current = await assertGymOperationalWorkspace(workspaceId, tx);
      if (current.subscription!.maxUnits < 1) throw new WorkspaceAccessError(409, "INVALID_STATUS", "Licença sem capacidade para a unidade inicial.");
      const slug = `${workspace.slug}-unidade-principal`;
      unit = await tx.gymUnit.create({
        data: {
          workspaceId,
          name: defaultUnitName,
          slug,
          code: "U01",
          timezone: "America/Sao_Paulo",
          isActive: true,
        },
      });
    }

    if (!workspace.settings || !workspace.units.length) await tx.auditLog.create({ data: { userId: adminUserId, action: "GYM_DEFAULT_CONFIGURATION_PREPARED", entity: "WORKSPACE", entityId: workspaceId } });
    return { settings, unit };
    });
  }

  static ensureGymSettingsAndDefaultUnit(workspaceId: string, defaultUnitName: string = "Unidade Principal", adminUserId?: string) {
    return new BackfillService().ensureGymSettingsAndDefaultUnit(workspaceId, defaultUnitName, adminUserId);
  }

  static backfillLegacyRoleGrants(workspaceId?: string, adminUserId?: string) {
    return new BackfillService().backfillLegacyRoleGrants(workspaceId, adminUserId);
  }
}

export const backfillService = new BackfillService();
