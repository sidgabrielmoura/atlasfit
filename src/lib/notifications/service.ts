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
  }): Promise<{ notificationId?: string; pushSent: boolean; devicesCount: number; successCount: number }> {
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
    let pushSent = false;
    let devicesCount = 0;
    let successCount = 0;

    // 1. In-App Notification Record & Realtime Ably Broadcast
    if (catPref.inApp) {
      try {
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
          console.warn("[NotificationService] Ably publish warning:", ablyErr);
        }
      } catch (inAppErr) {
        console.error("[NotificationService] In-app notification creation error:", inAppErr);
      }
    }

    // 2. Firebase Cloud Messaging (FCM) Push Delivery
    if (catPref.push) {
      try {
        // Find active devices ordered by most recent activity
        const devices = await prisma.notificationDevice.findMany({
          where: { userId, status: "ACTIVE" },
          orderBy: { lastSeen: "desc" }
        });

        // Smart token deduplication per platform/browser to prevent multiple pushes to the same device
        const uniqueTokens: string[] = [];
        const seenPlatforms = new Set<string>();

        for (const dev of devices) {
          const platformKey = `${dev.platform || "WEB"}_${dev.browser || "BROWSER"}`;
          if (!seenPlatforms.has(platformKey) && dev.firebaseToken) {
            seenPlatforms.add(platformKey);
            uniqueTokens.push(dev.firebaseToken);
          }
        }

        const tokens = Array.from(new Set(uniqueTokens));
        devicesCount = tokens.length;

        if (tokens.length > 0) {
          const deduplicationTag =
            (payload?.engagePushLogId as string) ||
            (payload?.notificationId as string) ||
            notificationId ||
            `atlasfit-${Date.now()}`;

          const payloadData: Record<string, string> = {
            type: String(type),
            category: String(category),
            title: String(title),
            body: String(description),
            url: deepLink || "/",
            deepLink: deepLink || "/",
            notificationId: notificationId || "",
            tag: deduplicationTag
          };

          if (image) {
            payloadData.image = image;
            payloadData.imageUrl = image;
          }

          if (payload) {
            Object.entries(payload).forEach(([k, v]) => {
              payloadData[k] = typeof v === "string" ? v : JSON.stringify(v);
            });
          }

          const adminMessaging = getAdminMessaging();
          if (!adminMessaging) {
            console.warn("[NotificationService] Firebase Admin Messaging is not initialized. Skipping push dispatch.");
          } else {
            const isHighPriority =
              priority === NotificationPriority.CRITICAL || priority === NotificationPriority.HIGH;

            const response = await adminMessaging.sendEachForMulticast({
              tokens,
              notification: {
                title,
                body: description,
                imageUrl: image || undefined
              },
              data: payloadData,
              webpush: {
                fcmOptions: {
                  link: deepLink || "/"
                },
                notification: {
                  title,
                  body: description,
                  icon: "/logos_atlasfit/atlasfit_black.png",
                  badge: "/logos_atlasfit/atlasfit (4).png",
                  image: image || undefined,
                  requireInteraction: isHighPriority,
                  tag: deduplicationTag
                },
                headers: {
                  Urgency: isHighPriority ? "high" : "normal"
                }
              },
              android: {
                priority: "high",
                notification: {
                  title,
                  body: description,
                  imageUrl: image || undefined,
                  sound: "default",
                  channelId: "atlasfit_reminders",
                  tag: deduplicationTag
                }
              },
              apns: {
                payload: {
                  aps: {
                    alert: {
                      title,
                      body: description
                    },
                    sound: "default",
                    badge: 1,
                    contentAvailable: true
                  }
                },
                fcmOptions: {
                  imageUrl: image || undefined
                }
              }
            });

            successCount = response.successCount;
            if (response.successCount > 0) {
              pushSent = true;
              if (notificationId) {
                await prisma.notification.update({
                  where: { id: notificationId },
                  data: { delivered: true }
                });
              }
            }

            // Prune dead / invalid tokens automatically
            if (response.failureCount > 0) {
              const badTokens: string[] = [];
              response.responses.forEach((resp: any, idx: number) => {
                if (!resp.success) {
                  const err = resp.error;
                  if (
                    err &&
                    (err.code === "messaging/invalid-registration-token" ||
                      err.code === "messaging/registration-token-not-registered" ||
                      err.code === "messaging/mismatched-credential")
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
          }
        }
      } catch (pushErr) {
        console.error("[NotificationService] FCM push dispatch error:", pushErr);
      }
    }

    // 3. Email dispatch integration
    if (catPref.email) {
      try {
        const targetUser = await prisma.user.findUnique({
          where: { id: userId },
          select: { email: true, name: true }
        });

        if (targetUser?.email) {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "https://app.atlasfit.site";
          const fullLink = deepLink
            ? deepLink.startsWith("http")
              ? deepLink
              : `${appUrl.replace(/\/$/, "")}${deepLink.startsWith("/") ? deepLink : `/${deepLink}`}`
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

    return {
      notificationId,
      pushSent,
      devicesCount,
      successCount
    };
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

    // Inactivate any older duplicate tokens for the same user on the same platform and browser
    if (platform && browser) {
      await prisma.notificationDevice.updateMany({
        where: {
          userId,
          platform,
          browser,
          firebaseToken: { not: firebaseToken },
          status: "ACTIVE"
        },
        data: { status: "INACTIVE" }
      });
    }

    return device;
  }

  static async unregisterDevice(firebaseToken: string) {
    return prisma.notificationDevice.deleteMany({
      where: { firebaseToken }
    });
  }
}
