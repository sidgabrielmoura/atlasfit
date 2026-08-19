import prisma from "@/lib/prisma";
import { getAdminMessaging } from "@/lib/firebase-admin";
import { publishToChannel } from "@/lib/ably";
import { EmailService } from "@/lib/emails/service";
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
      const created = await prisma.notificationPreference.create({
        data: {
          userId,
          settings: DEFAULT_PREFERENCES as any
        }
      });
      return created.settings as unknown as UserPreferencesSettings;
    }

    return pref.settings as unknown as UserPreferencesSettings;
  }

  static async updatePreferences(userId: string, settings: Partial<UserPreferencesSettings>): Promise<UserPreferencesSettings> {
    const current = await this.getUserPreferences(userId);
    const updatedSettings = { ...current, ...settings };

    const pref = await prisma.notificationPreference.upsert({
      where: { userId },
      create: {
        userId,
        settings: updatedSettings as any
      },
      update: {
        settings: updatedSettings as any
      }
    });

    return pref.settings as unknown as UserPreferencesSettings;
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
    try {
      const superadmins = await prisma.user.findMany({
        where: { role: "SUPERADMIN" },
        select: { id: true }
      });

      for (const admin of superadmins) {
        await this.sendNotification({
          ...params,
          userId: admin.id
        });
      }
    } catch (err) {
      console.error("Error in sendToSuperAdmins:", err);
    }
  }

  static async sendNotification(params: {
    userId: string;
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
    const {
      userId,
      type,
      category,
      title,
      description,
      image,
      icon,
      priority = NotificationPriority.NORMAL,
      payload,
      deepLink,
      source,
      workspaceId
    } = params;

    const prefs = await this.getUserPreferences(userId);
    const catPref = prefs[category as keyof UserPreferencesSettings] || { push: true, inApp: true, email: true };

    let notificationId: string | undefined;

    if (catPref.inApp) {
      const created = await prisma.notification.create({
        data: {
          userId,
          type,
          category,
          title,
          description,
          image: image || null,
          icon: icon || null,
          priority,
          payload: (payload as any) || null,
          deepLink: deepLink || null,
          source: source || null,
          isRead: false,
          delivered: false,
          workspaceId: workspaceId || null
        }
      });
      notificationId = created.id;

      try {
        await publishToChannel(`user:${userId}:notifications`, "notification:new", created);
      } catch (ablyErr) {
        console.warn("Failed to publish notification via Ably:", ablyErr);
      }
    }

    if (catPref.push) {
      const devices = await prisma.notificationDevice.findMany({
        where: { userId, status: "ACTIVE" }
      });

      const tokens = devices.map((d) => d.firebaseToken);

      if (tokens.length > 0) {
        try {
          const payloadData: Record<string, string> = {
            type,
            category,
            url: deepLink || "/"
          };

          if (payload) {
            Object.entries(payload).forEach(([k, v]) => {
              payloadData[k] = typeof v === "string" ? v : JSON.stringify(v);
            });
          }

          const adminMessaging = getAdminMessaging();
          if (!adminMessaging) {
            console.warn("Skipping FCM push notification dispatch: Firebase Admin Messaging is not initialized.");
          } else {
            const response = await adminMessaging.sendEachForMulticast({
              tokens,
              notification: {
                title,
                body: description,
                imageUrl: image || undefined
              },
              data: payloadData
            });

            if (response.failureCount > 0) {
              const badTokens: string[] = [];
              response.responses.forEach((resp: any, idx: number) => {
                if (!resp.success) {
                  const err = resp.error;
                  if (
                    err &&
                    (err.code === "messaging/invalid-registration-token" ||
                      err.code === "messaging/registration-token-not-registered")
                  ) {
                    badTokens.push(tokens[idx]);
                  }
                }
              });

              if (badTokens.length > 0) {
                await prisma.notificationDevice.deleteMany({
                  where: { firebaseToken: { in: badTokens } }
                });
              }
            }

            if (response.successCount > 0 && notificationId) {
              await prisma.notification.update({
                where: { id: notificationId },
                data: { delivered: true }
              });
            }
          }
        } catch (err) {
          console.error("FCM dispatch error:", err);
        }
      }
    }

    // Email dispatch integration
    if (catPref.email) {
      try {
        const targetUser = await prisma.user.findUnique({
          where: { id: userId },
          select: { email: true, name: true }
        });

        if (targetUser?.email) {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "https://app.atlasfit.site";
          const fullLink = deepLink 
            ? (deepLink.startsWith("http") ? deepLink : `${appUrl.replace(/\/$/, "")}${deepLink.startsWith("/") ? deepLink : `/${deepLink}`}`)
            : undefined;

          EmailService.sendGenericNotification({
            to: targetUser.email,
            title,
            description,
            badgeText: category,
            ctaButton: fullLink ? { text: "Acessar no Aplicativo", url: fullLink } : undefined
          }).catch((e) => console.warn("[NotificationService] Email notification error:", e));
        }
      } catch (emailErr) {
        console.warn("[NotificationService] Error querying user for email dispatch:", emailErr);
      }
    }
  }

  static async registerDevice(params: {
    userId: string;
    firebaseToken: string;
    platform?: string;
    browser?: string;
  }) {
    const { userId, firebaseToken, platform, browser } = params;

    return prisma.notificationDevice.upsert({
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
  }

  static async unregisterDevice(firebaseToken: string) {
    return prisma.notificationDevice.deleteMany({
      where: { firebaseToken }
    });
  }
}
