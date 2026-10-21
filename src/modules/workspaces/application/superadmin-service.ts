import { Prisma, type WorkspaceType } from "@prisma/client";
import { z } from "zod";
import { gymConfigurationSchema, gymSettingsSchema, gymLicenseSchema } from "../domain/gym-config";
import { WorkspaceAccessError } from "../domain/types";
import { GymFeatureFlagsService } from "./gym-feature-flags-service";
import { provisionGymWorkspace, addGymUnit, assertSuperadmin } from "./gym-provisioning";
import { serializableTransaction } from "./transaction";
import { gymClosureAction } from "./gym-closure";

export interface ProvisionGymWorkspaceInput {
  name: string; slug: string; ownerId: string; type?: WorkspaceType; initialUnitName?: string;
  maxStudents?: number; maxStaff?: number; maxUnits?: number;
}
export interface UpdateGymConfigInput {
  workspaceId: string; adminUserId: string; reason?: string;
  settings?: z.infer<typeof gymSettingsSchema>;
  subscription?: z.infer<typeof gymLicenseSchema>;
}

export class SuperAdminGymService {
  static provisionWorkspace(input: ProvisionGymWorkspaceInput, adminUserId: string) { return provisionGymWorkspace(input, adminUserId); }

  static async updateGymConfig(input: UpdateGymConfigInput) {
    const parsed = gymConfigurationSchema.safeParse({ settings: input.settings, subscription: input.subscription, reason: input.reason });
    if (!parsed.success) throw new WorkspaceAccessError(400, "INVALID_REQUEST", parsed.error.issues[0].message);
    return serializableTransaction(async tx => {
      await assertSuperadmin(tx, input.adminUserId);
      const defaults = await GymFeatureFlagsService.getGymGlobalConfigs(tx);
      const workspace = await tx.workspace.findUnique({ where: { id: input.workspaceId }, select: { type: true } });
      if (workspace?.type !== "GYM") throw new WorkspaceAccessError(404, "WORKSPACE_NOT_FOUND", "Academia não encontrada.");
      if (parsed.data.subscription?.status && parsed.data.subscription.status !== "CANCELED" && await tx.auditLog.findFirst({ where: { entity: "WORKSPACE", entityId: input.workspaceId, action: gymClosureAction }, select: { id: true } })) throw new WorkspaceAccessError(409, "GYM_DATA_RETENTION_REQUIRED", "Academia encerrada. Revise o encerramento antes de reativar a licença.");
      const before = await tx.workspaceSubscription.findUnique({ where: { workspaceId: input.workspaceId }, select: { status: true, maxStudents: true, maxStaff: true, maxUnits: true, storageLimitMb: true, trialEndsAt: true, endDate: true } });
      const { settings, subscription } = parsed.data;
      if (settings) {
        const { operatingHours, ...scalar } = settings;
        const hours = operatingHours === null ? Prisma.DbNull : operatingHours;
        await tx.gymSettings.upsert({ where: { workspaceId: input.workspaceId }, create: { workspaceId: input.workspaceId, billingGracePeriodDays: defaults.defaultBillingGraceDays, requireGuardianSignature: defaults.defaultRequireGuardianSignature, ...scalar, operatingHours: hours }, update: { ...scalar, operatingHours: hours, version: { increment: 1 } } });
      }
      if (subscription) {
        if (subscription.planId && !await tx.plan.findUnique({ where: { id: subscription.planId }, select: { id: true } })) throw new WorkspaceAccessError(404, "PLAN_NOT_FOUND", "Plano de licença não encontrado.");
        await tx.workspaceSubscription.upsert({ where: { workspaceId: input.workspaceId }, create: { workspaceId: input.workspaceId, status: "TRIAL", trialEndsAt: new Date(Date.now() + 30 * 86400000), maxStudents: defaults.defaultMaxStudents, maxStaff: defaults.defaultMaxStaff, maxUnits: defaults.defaultMaxUnits, storageLimitMb: defaults.defaultStorageLimitMb, ...subscription }, update: subscription });
      }
      const after = await tx.workspaceSubscription.findUnique({ where: { workspaceId: input.workspaceId }, select: { status: true, maxStudents: true, maxStaff: true, maxUnits: true, storageLimitMb: true, trialEndsAt: true, endDate: true } });
      await tx.auditLog.create({ data: { userId: input.adminUserId, action: `SUPERADMIN_GYM_CONFIG_UPDATE:${parsed.data.reason ?? "Configuração administrativa"}`, entity: "WORKSPACE", entityId: input.workspaceId, severity: "warning", metadata: JSON.parse(JSON.stringify({ before, after, settingsFields: Object.keys(settings ?? {}) })) } });
      return tx.workspace.findUnique({ where: { id: input.workspaceId }, include: { settings: true, subscription: true, units: true } });
    });
  }

  static addGymUnit(workspaceId: string, data: { name: string; slug?: string; code?: string; address?: string; city?: string; state?: string; postalCode?: string; phone?: string; email?: string }, adminUserId: string) { return addGymUnit(workspaceId, data, adminUserId); }
}
