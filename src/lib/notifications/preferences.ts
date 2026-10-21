import { z } from "zod";
import { serializableTransaction } from "@/modules/workspaces/application/transaction";
import { DEFAULT_PREFERENCES, type CategoryPreference, type UserPreferencesSettings } from "./types";

const categoryPatch = z.object({ push: z.boolean().optional(), inApp: z.boolean().optional(), email: z.boolean().optional(), whatsapp: z.boolean().optional(), sms: z.boolean().optional() }).strict().refine(value => Object.keys(value).length > 0);
export const notificationPreferencesPatchSchema = z.object(Object.fromEntries(Object.keys(DEFAULT_PREFERENCES).map(key => [key, categoryPatch.optional()]))).strict().refine(value => Object.keys(value).length > 0);
export type NotificationPreferencesPatch = Partial<Record<keyof UserPreferencesSettings, Partial<CategoryPreference>>>;

export function normalizeNotificationPreferences(value: unknown): UserPreferencesSettings {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  return Object.fromEntries(Object.entries(DEFAULT_PREFERENCES).map(([category, defaults]) => {
    const stored = source[category];
    const flags = stored && typeof stored === "object" && !Array.isArray(stored) ? Object.entries(stored).filter(([key, flag]) => ["push", "inApp", "email", "whatsapp", "sms"].includes(key) && typeof flag === "boolean") : [];
    return [category, { ...defaults, ...Object.fromEntries(flags) }];
  })) as unknown as UserPreferencesSettings;
}

export async function updateNotificationPreferences(userId: string, patch: NotificationPreferencesPatch) {
  const parsed = notificationPreferencesPatchSchema.parse(patch) as NotificationPreferencesPatch;
  return serializableTransaction(async tx => {
    // The user exists before the preference, so first-time writes can lock the same row.
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR NO KEY UPDATE`;
    const previous = await tx.notificationPreference.findUnique({ where: { userId } });
    const settings = normalizeNotificationPreferences(previous?.settings);
    for (const category of Object.keys(parsed) as (keyof UserPreferencesSettings)[]) settings[category] = { ...settings[category], ...parsed[category] };
    await tx.notificationPreference.upsert({ where: { userId }, create: { userId, settings: settings as never }, update: { settings: settings as never } });
    return settings;
  });
}
