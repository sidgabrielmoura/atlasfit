import { afterAll, describe, expect, it } from "vitest";
import prisma from "@/lib/prisma";
import { NotificationService } from "@/lib/notifications/service";
import { DEFAULT_PREFERENCES } from "@/lib/notifications/types";

const database = new URL(process.env.DATABASE_URL || "http://invalid");
if (database.hostname !== "127.0.0.1" || database.port !== "56432" || database.pathname !== "/atlasfit_gym_stabilization_20261001") throw new Error("Exige PostgreSQL descartável específico.");
afterAll(async () => prisma.$disconnect());
describe("Inicialização concorrente de preferências", () => {
  it("32 primeiras leituras simultâneas retornam uma única preferência", async () => {
    const user = await prisma.user.create({ data: {} });
    try {
      const results = await Promise.all(Array.from({ length: 32 }, () => NotificationService.getUserPreferences(user.id)));
      for (const result of results) expect(result).toEqual(DEFAULT_PREFERENCES);
      expect(await prisma.notificationPreference.count({ where: { userId: user.id } })).toBe(1);
    } finally { await prisma.user.delete({ where: { id: user.id } }); }
  });
  it("leituras não sobrescrevem escolhas existentes nem mudam updatedAt", async () => {
    const user = await prisma.user.create({ data: {} });
    const settings = Object.fromEntries(Object.keys(DEFAULT_PREFERENCES).map(key => [key, { push: false, inApp: false, email: false }]));
    try {
      const stored = await prisma.notificationPreference.create({ data: { userId: user.id, settings } });
      const results = await Promise.all(Array.from({ length: 16 }, () => NotificationService.getUserPreferences(user.id)));
      for (const result of results) expect(result).toEqual(settings);
      expect(await prisma.notificationPreference.findUniqueOrThrow({ where: { userId: user.id } })).toMatchObject({ id: stored.id, settings, updatedAt: stored.updatedAt });
    } finally { await prisma.user.delete({ where: { id: user.id } }); }
  });
  it("edições concorrentes preservam categorias e flags diferentes da mesma categoria", async () => {
    const user = await prisma.user.create({ data: {} });
    try {
      await Promise.all([
        NotificationService.updatePreferences(user.id, { TRAINING: { push: false } }),
        NotificationService.updatePreferences(user.id, { TRAINING: { email: false } }),
        NotificationService.updatePreferences(user.id, { FINANCE: { inApp: false } }),
        NotificationService.getUserPreferences(user.id),
      ]);
      expect(await NotificationService.getUserPreferences(user.id)).toEqual({ ...DEFAULT_PREFERENCES, TRAINING: { push: false, inApp: true, email: false }, FINANCE: { push: true, inApp: false, email: true } });
    } finally { await prisma.user.delete({ where: { id: user.id } }); }
  });
  it("payload inválido não altera preferências e registros incompletos recebem defaults sem gravação", async () => {
    const user = await prisma.user.create({ data: {} });
    try {
      const stored = await prisma.notificationPreference.create({ data: { userId: user.id, settings: { TRAINING: { push: false } } } });
      await expect(NotificationService.updatePreferences(user.id, { TRAINING: { push: "false" } } as never)).rejects.toThrow();
      await expect(NotificationService.updatePreferences(user.id, { UNKNOWN: {} } as never)).rejects.toThrow();
      expect((await NotificationService.getUserPreferences(user.id)).TRAINING).toEqual({ ...DEFAULT_PREFERENCES.TRAINING, push: false });
      expect(await prisma.notificationPreference.findUnique({ where: { userId: user.id } })).toMatchObject({ settings: stored.settings, updatedAt: stored.updatedAt });
    } finally { await prisma.user.delete({ where: { id: user.id } }); }
  });
});
