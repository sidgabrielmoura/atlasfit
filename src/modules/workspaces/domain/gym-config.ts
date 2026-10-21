import { z } from "zod";

const count = z.number().int().min(0).max(1_000_000);
export const gymGlobalConfigSchema = z.object({ assistedImportEnabled: z.boolean(),
  defaultBillingGraceDays: z.number().int().min(0).max(365), defaultRequireGuardianSignature: z.boolean(),
  defaultMaxReceptionistDiscountPercent: z.number().min(0).max(100), defaultMaxReceptionistDiscountCents: count,
  defaultMaxStudents: count, defaultMaxStaff: count, defaultMaxUnits: count, defaultStorageLimitMb: count,
}).strict();
export const gymSettingsSchema = z.object({
  timezone: z.string().max(80).refine(value => { try { new Intl.DateTimeFormat("en", { timeZone: value }); return true; } catch { return false; } }, "Timezone inválido."),
  operatingHours: z.record(z.string(), z.object({ open: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), close: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), closed: z.boolean().optional() }).strict()).nullable().optional(),
  billingGracePeriodDays: z.number().int().min(0).max(365), capacityLimit: count.nullable(), requireGuardianSignature: z.boolean(),
}).partial().strict();
export const gymLicenseSchema = z.object({
  status: z.enum(["TRIAL", "ACTIVE", "PAST_DUE", "CANCELED", "EXPIRED", "INCOMPLETE"]), planId: z.string().min(1).nullable(),
  maxStudents: count, maxStaff: count, maxUnits: count, storageLimitMb: count,
  trialEndsAt: z.union([z.date(), z.iso.datetime().transform(value => new Date(value))]).nullable(),
}).partial().strict();
export const gymConfigurationSchema = z.object({ settings: gymSettingsSchema.optional(), subscription: gymLicenseSchema.optional(), reason: z.string().trim().max(2000).optional() }).strict().refine(value => (value.settings && Object.keys(value.settings).length) || (value.subscription && Object.keys(value.subscription).length), "Informe uma alteração de configuração ou licença.");
export const gymUnitSchema = z.object({ name: z.string().trim().min(2).max(100), slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(120).optional(), code: z.string().trim().max(30).optional(), address: z.string().trim().max(300).optional(), city: z.string().trim().max(100).optional(), state: z.string().trim().max(40).optional(), postalCode: z.string().trim().max(20).optional(), phone: z.string().trim().max(30).optional(), email: z.email().optional() }).strict();
export const provisionWorkspaceSchema = z.object({ name: z.string().trim().min(2).max(100), slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).min(3).max(80), ownerId: z.string().min(1), type: z.enum(["PERSONAL", "GYM"]).default("PERSONAL"), initialUnitName: z.string().trim().min(2).max(100).optional(), maxStudents: count.optional(), maxStaff: count.optional(), maxUnits: count.min(1).optional()}).strict();

export function serializeGymData(value: unknown): unknown {
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(serializeGymData);
  if (value !== null && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, serializeGymData(child)]));
  return value;
}
