import prisma from "@/lib/prisma";
import { sendDurableNotification, type NotificationInput } from "./delivery";
import { normalizeNotificationPreferences, updateNotificationPreferences, type NotificationPreferencesPatch } from "./preferences";
import {
  NotificationType,
  NotificationCategory,
  NotificationPriority,
  DEFAULT_PREFERENCES,
  UserPreferencesSettings
} from "./types";

export class NotificationService {
  static async getUserPreferences(userId: string): Promise<UserPreferencesSettings> {
    const pref = await prisma.notificationPreference.findUnique({
      where: { userId }
    });

    if (!pref) {
      await prisma.notificationPreference.createMany({
        data: [{
          userId,
          settings: DEFAULT_PREFERENCES as any
        }],
        skipDuplicates: true,
      });
      const created = await prisma.notificationPreference.findUniqueOrThrow({ where: { userId } });
      return normalizeNotificationPreferences(created.settings);
    }

    return normalizeNotificationPreferences(pref.settings);
  }

  static async updatePreferences(userId: string, settings: NotificationPreferencesPatch): Promise<UserPreferencesSettings> {
    return updateNotificationPreferences(userId, settings);
  }

  static async sendToSuperAdmins(params: {
    type: NotificationType | string;
    category: NotificationCategory | string;
    title: string;
    description: string;
    image?: string;
    icon?: string;
    priority?: NotificationPriority | string;
    payload?: Record<string, any>;
    deepLink?: string;
    source?: string;
    workspaceId?: string;
  }) {
    const receipts = [];
    let cursor: string | undefined;
    for (;;) {
      const admins = await prisma.user.findMany({ where: { role: "SUPERADMIN" }, select: { id: true }, orderBy: { id: "asc" }, take: 100, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}) });
      for (const admin of admins) receipts.push(await this.sendNotification({ ...params, workspaceId: undefined, userId: admin.id }));
      if (admins.length < 100) break;
      cursor = admins.at(-1)!.id;
    }
    return receipts;
  }

  static async sendNotification(params: NotificationInput) {
    return sendDurableNotification(params);
  }

  static async registerDevice(params: {
    userId: string;
    firebaseToken: string;
    platform?: string;
    browser?: string;
  }) {
    const { userId, firebaseToken, platform, browser } = params;

    const device = await prisma.notificationDevice.upsert({
      where: { firebaseToken },
      create: {
        userId,
        firebaseToken,
        platform: platform || null,
        browser: browser || null,
        status: "ACTIVE",
        lastSeen: new Date()
      },
      update: {
        userId,
        platform: platform || null,
        browser: browser || null,
        status: "ACTIVE",
        lastSeen: new Date()
      }
    });

    return device;
  }

  static async unregisterDevice(firebaseToken: string, userId: string) {
    return prisma.notificationDevice.deleteMany({
      where: { firebaseToken, userId }
    });
  }
}
