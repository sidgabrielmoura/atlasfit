import prisma from "@/lib/prisma";
import { gymGlobalConfigSchema } from "../domain/gym-config";
import { WorkspaceAccessError } from "../domain/types";
import type { z } from "zod";
import { serializableTransaction, type GymTransactionClient } from "./transaction";

export type GymGlobalConfigs = z.infer<typeof gymGlobalConfigSchema>;
export const GYM_CONFIG_KEYS = {
  ASSISTED_IMPORT_ENABLED: "gym_module_assisted_import_enabled",
  BILLING_GRACE_DAYS: "gym_default_billing_grace_days",
  GUARDIAN_SIGNATURE: "gym_default_require_guardian_signature",
  MAX_RECEPTIONIST_DISCOUNT_PERCENT: "gym_default_max_receptionist_discount_percent",
  MAX_RECEPTIONIST_DISCOUNT_CENTS: "gym_default_max_receptionist_discount_cents",
  DEFAULT_MAX_STUDENTS: "gym_default_max_students",
  DEFAULT_MAX_STAFF: "gym_default_max_staff",
  DEFAULT_MAX_UNITS: "gym_default_max_units",
  DEFAULT_STORAGE_MB: "gym_default_storage_mb",
} as const;
const fields = [
  ["assistedImportEnabled", GYM_CONFIG_KEYS.ASSISTED_IMPORT_ENABLED],
  ["defaultBillingGraceDays", GYM_CONFIG_KEYS.BILLING_GRACE_DAYS],
  ["defaultRequireGuardianSignature", GYM_CONFIG_KEYS.GUARDIAN_SIGNATURE],
  ["defaultMaxReceptionistDiscountPercent", GYM_CONFIG_KEYS.MAX_RECEPTIONIST_DISCOUNT_PERCENT],
  ["defaultMaxReceptionistDiscountCents", GYM_CONFIG_KEYS.MAX_RECEPTIONIST_DISCOUNT_CENTS],
  ["defaultMaxStudents", GYM_CONFIG_KEYS.DEFAULT_MAX_STUDENTS],
  ["defaultMaxStaff", GYM_CONFIG_KEYS.DEFAULT_MAX_STAFF],
  ["defaultMaxUnits", GYM_CONFIG_KEYS.DEFAULT_MAX_UNITS],
  ["defaultStorageLimitMb", GYM_CONFIG_KEYS.DEFAULT_STORAGE_MB],
] satisfies [keyof GymGlobalConfigs, string][];
function numeric(value: string | undefined, fallback: number, maximum = 1_000_000, fraction = false) {
  if (!value?.trim()) return fallback;
  const result = Number(value);
  return Number.isFinite(result) && (fraction || Number.isInteger(result)) && result >= 0 && result <= maximum ? result : fallback;
}

export class GymFeatureFlagsService {
  /** Reads current operational keys only; historical settings remain untouched. */
  static async getGymGlobalConfigs(database: Pick<GymTransactionClient, "systemSetting"> = prisma): Promise<GymGlobalConfigs> {
    const rows = await database.systemSetting.findMany({ where: { key: { in: Object.values(GYM_CONFIG_KEYS) } } });
    const values = new Map(rows.map(row => [row.key, row.value]));
    return {
      assistedImportEnabled: values.get(GYM_CONFIG_KEYS.ASSISTED_IMPORT_ENABLED) !== "false",
      defaultBillingGraceDays: numeric(values.get(GYM_CONFIG_KEYS.BILLING_GRACE_DAYS), 5, 365),
      defaultRequireGuardianSignature: values.get(GYM_CONFIG_KEYS.GUARDIAN_SIGNATURE) !== "false",
      defaultMaxReceptionistDiscountPercent: numeric(values.get(GYM_CONFIG_KEYS.MAX_RECEPTIONIST_DISCOUNT_PERCENT), 10, 100, true),
      defaultMaxReceptionistDiscountCents: numeric(values.get(GYM_CONFIG_KEYS.MAX_RECEPTIONIST_DISCOUNT_CENTS), 2000),
      defaultMaxStudents: numeric(values.get(GYM_CONFIG_KEYS.DEFAULT_MAX_STUDENTS), 500),
      defaultMaxStaff: numeric(values.get(GYM_CONFIG_KEYS.DEFAULT_MAX_STAFF), 30),
      defaultMaxUnits: numeric(values.get(GYM_CONFIG_KEYS.DEFAULT_MAX_UNITS), 3),
      defaultStorageLimitMb: numeric(values.get(GYM_CONFIG_KEYS.DEFAULT_STORAGE_MB), 5120),
    };
  }

  static async updateGymGlobalConfigs(configs: Partial<GymGlobalConfigs>, adminUserId: string, reason?: string, baseline?: Partial<GymGlobalConfigs>): Promise<void> {
    const parsed = gymGlobalConfigSchema.partial().safeParse(configs);
    if (!parsed.success) throw new WorkspaceAccessError(400, "INVALID_REQUEST", parsed.error.issues[0].message);
    const expected = baseline === undefined ? undefined : gymGlobalConfigSchema.partial().safeParse(baseline);
    if (expected && (!expected.success || Object.keys(expected.data).sort().join("|") !== Object.keys(parsed.data).sort().join("|"))) throw new WorkspaceAccessError(400, "INVALID_REQUEST", "A referência deve conter os mesmos campos alterados.");
    if (reason !== undefined && (typeof reason !== "string" || reason.trim().length > 2000)) throw new WorkspaceAccessError(400, "INVALID_REQUEST", "Observação de auditoria inválida.");
    await serializableTransaction(async tx => {
      if ((await tx.user.findUnique({ where: { id: adminUserId }, select: { role: true } }))?.role !== "SUPERADMIN") throw new WorkspaceAccessError(403, "INSUFFICIENT_PERMISSIONS", "Configuração restrita ao superadmin.");
      if (!Object.keys(parsed.data).length) return;
      if (expected?.success) {
        const current = await this.getGymGlobalConfigs(tx);
        if (fields.some(([field]) => field in expected.data && expected.data[field] !== current[field])) throw new WorkspaceAccessError(409, "CONFIGURATION_CONFLICT", "Os valores foram alterados por outra operação. Recarregue antes de salvar.");
      }
      const changedKeys: string[] = [];
      for (const [field, key] of fields) {
        const value = parsed.data[field];
        if (value === undefined) continue;
        await tx.systemSetting.upsert({ where: { key }, update: { value: String(value) }, create: { key, value: String(value), description: field } });
        changedKeys.push(key);
      }
      await tx.auditLog.create({ data: { userId: adminUserId, action: `SUPERADMIN_UPDATE_GYM_CONFIGS:${changedKeys.join(",")}:${reason?.trim() || "Atualização administrativa"}`, entity: "SystemSetting", severity: "warning" } });
    });
  }
}
