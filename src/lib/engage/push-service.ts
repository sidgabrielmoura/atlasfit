import { enqueueNotification } from "@/lib/notifications/delivery";
import { serializableTransaction } from "@/modules/workspaces/application/transaction";
import prisma from "@/lib/prisma";
import { NotificationService } from "@/lib/notifications/service";
import { NotificationCategory, NotificationPriority, NotificationType } from "@/lib/notifications/types";
import { type Prisma, PushTriggerType } from "@prisma/client";

export interface PushMetricsSummary {
  totalSent: number;
  totalDelivered: number;
  totalClicked: number;
  totalConverted: number;
  deliveryRate: number; // %
  ctr: number;          // Click-Through Rate %
  conversionRate: number; // Conversion Rate %
  activeAutomations: number;
  chartTimeline: Array<{
    date: string;
    sent: number;
    clicked: number;
    converted: number;
    ctr: number;
  }>;
  triggerDistribution: Array<{
    trigger: string;
    name: string;
    count: number;
    percentage: number;
  }>;
}

function chunkArray<T>(array: T[], size: number): T[][] {
  const results: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    results.push(array.slice(i, i + size));
  }
  return results;
}

export class EngagePushService {
  /** Bounded audience pages and three dispatches in flight fit the shared pg pool. */
  static async *targetUserBatches(where: Prisma.UserWhereInput, notificationId?: string, force = false) {
    let cursor: string | undefined;
    for (;;) {
      const users = await prisma.user.findMany({ where, select: { id: true, name: true, role: true, email: true }, take: 100, orderBy: { id: "asc" }, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}) });
      if (!users.length) return;
      const ids = users.map(user => user.id);
      const { startOfToday } = this.getBrasiliaTime();
      const daily = !force && notificationId ? await prisma.engagePushLog.groupBy({ by: ["userId"], where: { userId: { in: ids }, notificationId, sentAt: { gte: startOfToday } }, _count: { _all: true } }) : [];
      const fatigue = !force ? await prisma.engagePushLog.groupBy({ by: ["userId"], where: { userId: { in: ids }, sentAt: { gte: new Date(Date.now() - 86400000) } }, _count: { _all: true } }) : [];
      const sent = new Set(daily.map(row => row.userId));
      const counts = new Map(fatigue.map(row => [row.userId, row._count._all]));
      const page = users.map(user => ({ ...user, receivedToday: sent.has(user.id), pushesIn24Hours: counts.get(user.id) || 0 }));
      for (let i = 0; i < page.length; i += 3) yield page.slice(i, i + 3);
      cursor = users[users.length - 1].id;
      if (users.length < 100) return;
    }
  }

  /**
   * Helper to get current Brasília (America/Sao_Paulo) hour, minute, day of week and startOfToday
   */
  static getBrasiliaTime(): { hour: number; minute: number; dayOfWeek: number; startOfToday: Date } {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    const parts = formatter.formatToParts(now);
    const partMap: Record<string, string> = {};
    for (const p of parts) {
      partMap[p.type] = p.value;
    }

    const year = parseInt(partMap.year);
    const month = parseInt(partMap.month) - 1;
    const day = parseInt(partMap.day);
    const hour = parseInt(partMap.hour);
    const minute = parseInt(partMap.minute);

    const midDay = new Date(Date.UTC(year, month, day, 12, 0, 0));
    const dayOfWeek = midDay.getUTCDay();

    // Início do dia em Brasília (00:00:00 BRT = 03:00:00 UTC)
    const startOfToday = new Date(Date.UTC(year, month, day, 3, 0, 0, 0));

    return {
      hour,
      minute,
      dayOfWeek,
      startOfToday,
    };
  }

  /**
   * Replace template variables with dynamic user data (sanitizing special characters)
   */
  static interpolateTemplate(template: string, data: {
    name?: string | null;
    firstName?: string | null;
    streakDays?: number;
    inactivityDays?: number;
    trainerName?: string | null;
  }): string {
    const rawName = (data.name || "Atleta").replace(/[\r\n\t]/g, " ").trim();
    const firstName = (data.firstName || rawName.split(" ")[0] || "Atleta").replace(/[\r\n\t]/g, " ").trim();
    const streak = data.streakDays !== undefined ? String(data.streakDays) : "0";
    const inactivity = data.inactivityDays !== undefined ? String(data.inactivityDays) : "0";
    const trainer = (data.trainerName || "Seu Personal").replace(/[\r\n\t]/g, " ").trim();

    return template
      .replace(/{primeiro_nome}/gi, firstName)
      .replace(/{nome_usuario}/gi, rawName)
      .replace(/{nome}/gi, firstName)
      .replace(/{streak_dias}/gi, streak)
      .replace(/{dias_inativo}/gi, inactivity)
      .replace(/{nome_personal}/gi, trainer);
  }

  /**
   * Helper to verify if an aluno has a workout scheduled for today
   */
  static async hasUserWorkoutScheduledToday(userId: string): Promise<boolean> {
    const { dayOfWeek } = this.getBrasiliaTime();

    const workout = await prisma.workout.findFirst({
      where: {
        isActive: true,
        dayOfWeek,
        OR: [
          { studentId: userId },
          {
            studentId: null,
            workspace: {
              members: {
                some: {
                  userId,
                  role: "STUDENT",
                  isActive: true
                }
              }
            }
          }
        ]
      },
      select: { id: true }
    });

    return Boolean(workout);
  }

  /**
   * Helper to verify if an aluno already completed a workout today
   */
  static async hasUserTrainedToday(userId: string): Promise<boolean> {
    const { startOfToday } = this.getBrasiliaTime();

    const workoutCount = await prisma.workoutLog.count({
      where: {
        studentId: userId,
        completedAt: { gte: startOfToday }
      }
    });

    return workoutCount > 0;
  }

  /**
   * Helper to calculate a user's current workout streak (consecutive days)
   */
  static async calculateUserStreak(userId: string): Promise<number> {
    const logs = await prisma.workoutLog.findMany({
      where: { studentId: userId },
      orderBy: { completedAt: "desc" },
      select: { completedAt: true },
      take: 60
    });

    if (logs.length === 0) return 0;

    let streak = 0;
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    const uniqueDates = Array.from(
      new Set(logs.map(l => l.completedAt ? l.completedAt.toISOString().split("T")[0] : "").filter(Boolean))
    );

    if (uniqueDates.length === 0) return 0;

    // Streak must start either today or yesterday
    if (!uniqueDates.includes(todayStr) && !uniqueDates.includes(yesterdayStr)) {
      return 0;
    }

    let checkDate = new Date(uniqueDates.includes(todayStr) ? now : yesterday);

    for (let i = 0; i < 60; i++) {
      const dateString = checkDate.toISOString().split("T")[0];
      if (uniqueDates.includes(dateString)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    return streak;
  }

  /**
   * Check fatigue capping: Ensure user hasn't received more than maxPushesIn24h from automated campaigns
   */
  static async isUserUnderFatigueCap(userId: string, maxPushesIn24h = 2): Promise<boolean> {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const count = await prisma.engagePushLog.count({
      where: {
        userId,
        sentAt: { gte: twentyFourHoursAgo }
      }
    });

    return count < maxPushesIn24h;
  }

  /**
   * Check if user already received this specific notification today
   */
  static async hasUserReceivedNotificationToday(userId: string, notificationId: string): Promise<boolean> {
    const { startOfToday } = this.getBrasiliaTime();

    const count = await prisma.engagePushLog.count({
      where: {
        userId,
        notificationId,
        sentAt: { gte: startOfToday }
      }
    });

    return count > 0;
  }

  /**
   * Send push notification to a specific target user and record log (with optional A/B testing)
   */
  static async dispatchPushToUser(params: {
    notificationId: string;
    user: {
      id: string;
      name: string | null;
      role: string;
      email?: string | null;
    };
    titleTemplate: string;
    bodyTemplate: string;
    titleTemplateB?: string | null;
    bodyTemplateB?: string | null;
    imageUrl?: string | null;
    deepLink: string;
    category?: string;
    priority?: string;
    inactivityDays?: number;
    streakDays?: number;
    trainerName?: string | null;
  }): Promise<{ success: boolean; logId?: string; error?: string; queued?: boolean }> {
    const {
      notificationId,
      user,
      titleTemplate,
      bodyTemplate,
      titleTemplateB,
      bodyTemplateB,
      imageUrl,
      deepLink,
      category = "TRAINING",
      priority = "HIGH",
      inactivityDays,
      trainerName
    } = params;

    try {
      // 1. Determine A/B variant
      const hasVariantB = Boolean(titleTemplateB?.trim() && bodyTemplateB?.trim());
      const selectedVariant: "A" | "B" = hasVariantB && Math.random() < 0.5 ? "B" : "A";

      const activeTitleTemplate = selectedVariant === "B" && titleTemplateB ? titleTemplateB : titleTemplate;
      const activeBodyTemplate = selectedVariant === "B" && bodyTemplateB ? bodyTemplateB : bodyTemplate;

      // 2. Calculate variables and interpolate
      const streak = params.streakDays ?? (/{streak_dias}/i.test(activeTitleTemplate + activeBodyTemplate) ? await this.calculateUserStreak(user.id) : 0);
      const title = this.interpolateTemplate(activeTitleTemplate, {
        name: user.name,
        firstName: user.name?.split(" ")[0],
        streakDays: streak,
        inactivityDays,
        trainerName
      });
      const description = this.interpolateTemplate(activeBodyTemplate, {
        name: user.name,
        firstName: user.name?.split(" ")[0],
        streakDays: streak,
        inactivityDays,
        trainerName
      });

      const { startOfToday } = this.getBrasiliaTime();
      return await serializableTransaction(async tx => {
        const claim = notificationId + ":" + user.id + ":" + startOfToday.toISOString();
        await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtext('engage-daily'), hashtext(${claim}))`;
        const retained = await tx.engagePushLog.findFirst({ where: { notificationId, userId: user.id, sentAt: { gte: startOfToday }, errorReason: { startsWith: "dispatch:" } }, select: { id: true } });
        if(retained) return { success: true, logId: retained.id, queued: false };
        const log = await tx.engagePushLog.create({ data: { notificationId, userId: user.id, variant: selectedVariant, status: "QUEUED" } });
        const trackedLink = deepLink + (deepLink.includes("?") ? "&" : "?") + "engage_push_log=" + log.id;
        const receipt = await enqueueNotification(tx, { userId: user.id, requestKey: "engage:" + log.id, type: NotificationType.CAMPAIGN, category, title, description, image: imageUrl || undefined, priority, deepLink: trackedLink, source: "Atlas Engage Push", payload: { engagePushLogId: log.id, notificationId, variant: selectedVariant } });
        await tx.engagePushLog.update({ where: { id: log.id }, data: { status: receipt.deliveryStatus, errorReason: "dispatch:" + receipt.dispatchId } });
        await tx.engagePushNotification.update({ where: { id: notificationId }, data: selectedVariant === "B" ? { sentCountB: { increment: 1 } } : { sentCount: { increment: 1 } } });
        return { success: true, logId: log.id, queued: receipt.deliveryStatus === "QUEUED" };
      });
    } catch (err: any) {
      console.error(`[EngagePushService] Dispatch error for user ${user.id}:`, err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Run automated push cycle for scheduled & event triggers (invoked by Cron Job)
   */
  static async runAutomatedPushCycle(force = false): Promise<{
    processedCampaigns: number;
    dispatchedCount: number;
    failedCount: number;
    skippedCount: number;
    cleanedLogsCount?: number;
    details: any[];
  }> {
    const { hour: currentHour, minute: currentMinute, dayOfWeek: currentDayOfWeek } = this.getBrasiliaTime();

    // Janela de silêncio: não disparar entre 22h e 07h (a menos que seja forçado manualmente)
    if (!force && (currentHour >= 22 || currentHour < 7)) {
      return {
        processedCampaigns: 0,
        dispatchedCount: 0,
        failedCount: 0,
        skippedCount: 0,
        details: [{ message: "Quiet hours active (22:00 - 07:00 Brasilia Time). Automated pushes paused." }]
      };
    }

    const activeNotifications = await prisma.engagePushNotification.findMany({
      where: { isActive: true },
      include: {
        creator: { select: { name: true } }
      }
    });

    let dispatchedCount = 0;
    let failedCount = 0;
    async function accountForFailures<T>(tasks: Promise<T>[]) {
      const results = await Promise.allSettled(tasks);
      failedCount += results.filter(result => result.status === "rejected").length;
    }
    let skippedCount = 0;
    const details: any[] = [];

    for (const notification of activeNotifications) {
      try {
        if (notification.triggerType === "SCHEDULED") {
          // Check day of week
          if (notification.daysOfWeek) {
            const allowedDays = notification.daysOfWeek.split(",").map((d: string) => parseInt(d.trim()));
            if (!allowedDays.includes(currentDayOfWeek)) {
              continue;
            }
          }

          // Check schedule time matching current hour & minute window
          if (notification.scheduleTime && !force) {
            const [schedHour, schedMin = 0] = notification.scheduleTime.split(":").map(Number);
            const schedTotalMin = (schedHour || 0) * 60 + (schedMin || 0);
            const currentTotalMin = currentHour * 60 + currentMinute;

            // Se o horário agendado é posterior ao momento atual, ainda não chegou a hora de disparar
            if (currentTotalMin < schedTotalMin) {
              continue;
            }

            // Dispara na janela do horário agendado (na mesma hora a partir do minuto, ou até 50 minutos após)
            const isWithinWindow = (currentHour === schedHour && currentMinute >= schedMin) ||
              (currentTotalMin >= schedTotalMin && currentTotalMin <= schedTotalMin + 50);

            if (!isWithinWindow) {
              continue;
            }
          }

          // Target audience filter
          const roleFilter = notification.targetRole === "ALL" 
            ? {} 
            : { role: notification.targetRole as any };

          const userChunks = this.targetUserBatches({
              ...roleFilter,
              onboarded: true
            }, notification.id, force);

          // Process users in chunks of 50

          for await (const chunk of userChunks) {
            await accountForFailures(
              chunk.map(async (user) => {
                // Anti-duplication: check if already received this notification today
                if (!force) {
                  const alreadySent = user.receivedToday;
                  if (alreadySent) {
                    skippedCount++;
                    return;
                  }
                }

                // Se for aluno, aplicar regras de segmentação de treino no dia
                if (user.role === "STUDENT") {
                  const targetWith = notification.targetWithWorkout ?? true;
                  const targetWithout = notification.targetWithoutWorkout ?? true;

                  // Se a segmentação for exclusiva (apenas com treino ou apenas sem treino)
                  if (targetWith !== targetWithout) {
                    const hasWorkoutScheduled = await this.hasUserWorkoutScheduledToday(user.id);
                    if (targetWith && !hasWorkoutScheduled) {
                      // Exige ter treino hoje, mas o aluno não tem
                      skippedCount++;
                      return;
                    }
                    if (targetWithout && hasWorkoutScheduled) {
                      // Exige NÃO ter treino hoje, mas o aluno tem
                      skippedCount++;
                      return;
                    }
                  }

                  // Regra de execução: se configurado para enviar APENAS para quem ainda NÃO treinou hoje
                  if (notification.onlyNotTrainedToday) {
                    const alreadyTrained = await this.hasUserTrainedToday(user.id);
                    if (alreadyTrained) {
                      // Aluno já concluiu treino hoje -> não recebe
                      skippedCount++;
                      return;
                    }
                  }
                }

                // Fatigue capping
                const underCap = user.pushesIn24Hours < 2;
                if (!underCap && !force) {
                  skippedCount++;
                  return;
                }

                const res = await this.dispatchPushToUser({
                  notificationId: notification.id,
                  user,
                  titleTemplate: notification.title,
                  bodyTemplate: notification.body,
                  titleTemplateB: notification.titleB,
                  bodyTemplateB: notification.bodyB,
                  imageUrl: notification.imageUrl,
                  deepLink: notification.deepLink,
                  category: notification.category,
                  priority: notification.priority
                });

                if (res.success && res.queued) dispatchedCount++;
                else if (!res.success) failedCount++;
              })
            );
          }

          details.push({ id: notification.id, title: notification.title, type: "SCHEDULED", status: "executed" });
        } else if (notification.triggerType === "INACTIVITY") {
          const daysThreshold = notification.inactivityDays || 3;
          const cutoffDate = new Date();
          cutoffDate.setDate(cutoffDate.getDate() - daysThreshold);

          // Find students whose latest workout is older than cutoffDate or who never logged
          const studentChunks = this.targetUserBatches({
              role: "STUDENT",
              onboarded: true,
              OR: [
                {
                  workoutLogs: {
                    none: { completedAt: { gte: cutoffDate } }
                  }
                }
              ]
            }, notification.id, force);

          for await (const chunk of studentChunks) {
            await accountForFailures(
              chunk.map(async (student) => {
                if (!force) {
                  const alreadySent = student.receivedToday;
                  if (alreadySent) {
                    skippedCount++;
                    return;
                  }

                  const underCap = student.pushesIn24Hours < 1;
                  if (!underCap) {
                    skippedCount++;
                    return;
                  }
                }

                const res = await this.dispatchPushToUser({
                  notificationId: notification.id,
                  user: student,
                  titleTemplate: notification.title,
                  bodyTemplate: notification.body,
                  titleTemplateB: notification.titleB,
                  bodyTemplateB: notification.bodyB,
                  imageUrl: notification.imageUrl,
                  deepLink: notification.deepLink,
                  category: notification.category,
                  priority: notification.priority,
                  inactivityDays: daysThreshold
                });

                if (res.success && res.queued) dispatchedCount++;
                else if (!res.success) failedCount++;
              })
            );
          }

          details.push({ id: notification.id, title: notification.title, type: "INACTIVITY", status: "executed" });
        } else if (notification.triggerType === "STREAK_SAVER") {
          // Late afternoon/evening check in Brasilia Time (between 17h and 21h)
          if ((currentHour >= 17 && currentHour <= 21) || force) {
            const studentChunks = this.targetUserBatches({ role: "STUDENT", onboarded: true }, notification.id, force);

            for await (const chunk of studentChunks) {
              await accountForFailures(
                chunk.map(async (student) => {
                  const alreadyTrained = await this.hasUserTrainedToday(student.id);
                  if (alreadyTrained) return;

                  const streak = await this.calculateUserStreak(student.id);
                  if (streak >= 2) {
                    if (!force) {
                      const alreadySent = student.receivedToday;
                      if (alreadySent) return;

                      const underCap = student.pushesIn24Hours < 1;
                      if (!underCap) return;
                    }

                    const res = await this.dispatchPushToUser({
                      notificationId: notification.id,
                      user: student,
                      streakDays: streak,
                      titleTemplate: notification.title,
                      bodyTemplate: notification.body,
                      titleTemplateB: notification.titleB,
                      bodyTemplateB: notification.bodyB,
                      imageUrl: notification.imageUrl,
                      deepLink: notification.deepLink,
                      category: notification.category,
                      priority: notification.priority
                    });

                    if (res.success && res.queued) dispatchedCount++;
                else if (!res.success) failedCount++;
                  }
                })
              );
            }
            details.push({ id: notification.id, title: notification.title, type: "STREAK_SAVER" });
          }
        }
      } catch (err: any) {
        console.error(`[EngagePushService] Error processing campaign ${notification.id}:`, err);
        failedCount++;
        details.push({ id: notification.id, error: "CAMPAIGN_PROCESSING_FAILED" });
      }
    }

    // Auto-cleanup logs older than 90 days for LGPD compliance and DB performance
    let cleanedLogsCount = 0;
    try {
      // One bounded cleanup window a day instead of every active cron tick.
      if (currentHour === 7 && currentMinute < 15) cleanedLogsCount = await this.cleanupOldLogs(90);
    } catch (cleanErr) {
      console.warn("[EngagePushService] Cleanup warning:", cleanErr);
    }

    return {
      processedCampaigns: activeNotifications.length,
      dispatchedCount,
      failedCount,
      skippedCount,
      cleanedLogsCount,
      details
    };
  }

  /**
   * Dispatch instant broadcast push to target audience with batching
   */
  static async sendBroadcastPush(notificationId: string): Promise<{ success: boolean; sentCount: number; errors: number }> {
    const notification = await prisma.engagePushNotification.findUnique({
      where: { id: notificationId }
    });

    if (!notification) {
      throw new Error("Notificação não encontrada.");
    }

    const roleFilter = notification.targetRole === "ALL"
      ? {}
      : { role: notification.targetRole as any };

    const userChunks = this.targetUserBatches({
        ...roleFilter,
        onboarded: true
      }, undefined, true);

    let sent = 0;
    let errors = 0;

    for await (const chunk of userChunks) {
      const results = await Promise.allSettled(
        chunk.map((user) =>
          this.dispatchPushToUser({
            notificationId: notification.id,
            user,
            titleTemplate: notification.title,
            bodyTemplate: notification.body,
            titleTemplateB: notification.titleB,
            bodyTemplateB: notification.bodyB,
            imageUrl: notification.imageUrl,
            deepLink: notification.deepLink,
            category: notification.category,
            priority: notification.priority
          })
        )
      );

      results.forEach((res) => {
        if (res.status === "fulfilled" && res.value.success) {
          sent++;
        } else {
          errors++;
        }
      });
    }

    return { success: true, sentCount: sent, errors };
  }

  /**
   * Track user click from push notification
   */
  static async trackPushClick(logId: string): Promise<boolean> {
    try {
      const log = await prisma.engagePushLog.findUnique({
        where: { id: logId }
      });

      if (!log) return false;

      if (!log.clickedAt) {
        const incrementField = log.variant === "B"
          ? { clickCountB: { increment: 1 } }
          : { clickCount: { increment: 1 } };

        await prisma.$transaction([
          prisma.engagePushLog.update({
            where: { id: logId },
            data: {
              status: "CLICKED",
              clickedAt: new Date()
            }
          }),
          prisma.engagePushNotification.update({
            where: { id: log.notificationId },
            data: incrementField
          })
        ]);
      }

      return true;
    } catch (err) {
      console.error("[EngagePushService] Error tracking push click:", err);
      return false;
    }
  }

  /**
   * Track conversion (e.g. workout completed after push notification within 6 hours)
   */
  static async trackPushConversion(userId: string): Promise<boolean> {
    try {
      const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);

      const recentLog = await prisma.engagePushLog.findFirst({
        where: {
          userId,
          sentAt: { gte: sixHoursAgo },
          convertedAt: null
        },
        orderBy: { sentAt: "desc" }
      });

      if (recentLog) {
        const incrementField = recentLog.variant === "B"
          ? { conversionCountB: { increment: 1 } }
          : { conversionCount: { increment: 1 } };

        await prisma.$transaction([
          prisma.engagePushLog.update({
            where: { id: recentLog.id },
            data: {
              status: "CONVERTED",
              convertedAt: new Date()
            }
          }),
          prisma.engagePushNotification.update({
            where: { id: recentLog.notificationId },
            data: incrementField
          })
        ]);
        return true;
      }

      return false;
    } catch (err) {
      console.error("[EngagePushService] Error tracking conversion:", err);
      return false;
    }
  }

  /**
   * Cleanup old push logs older than retentionDays (LGPD compliance & performance)
   */
  static async cleanupOldLogs(retentionDays = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const rows = await prisma.engagePushLog.findMany({ where: { sentAt: { lt: cutoffDate }, status: { notIn: ["QUEUED", "PROCESSING", "RETRY"] } }, orderBy: [{ sentAt: "asc" }, { id: "asc" }], take: 500, select: { id: true } });
    if (!rows.length) return 0;
    const deleteResult = await prisma.engagePushLog.deleteMany({ where: { id: { in: rows.map(row => row.id) }, sentAt: { lt: cutoffDate } } });

    return deleteResult.count;
  }

  /**
   * Fetch consolidated dashboard metrics for SuperAdmin
   */
  static async getPushDashboardMetrics(): Promise<PushMetricsSummary> {
    const notifications = await prisma.engagePushNotification.findMany({
      select: {
        sentCount: true,
        sentCountB: true,
        deliveredCount: true,
        clickCount: true,
        clickCountB: true,
        conversionCount: true,
        conversionCountB: true,
        isActive: true,
        triggerType: true
      }
    });

    const totalSent = notifications.reduce((acc: number, n: any) => acc + (n.sentCount + (n.sentCountB || 0)), 0);
    const totalDelivered = notifications.reduce((acc: number, n: any) => acc + n.deliveredCount, 0);
    const totalClicked = notifications.reduce((acc: number, n: any) => acc + (n.clickCount + (n.clickCountB || 0)), 0);
    const totalConverted = notifications.reduce((acc: number, n: any) => acc + (n.conversionCount + (n.conversionCountB || 0)), 0);

    const deliveryRate = totalSent > 0 ? parseFloat(((totalDelivered / totalSent) * 100).toFixed(1)) : 100;
    const ctr = totalDelivered > 0 ? parseFloat(((totalClicked / totalDelivered) * 100).toFixed(1)) : 0;
    const conversionRate = totalClicked > 0 ? parseFloat(((totalConverted / totalClicked) * 100).toFixed(1)) : 0;
    const activeAutomations = notifications.filter((n: { isActive: boolean }) => n.isActive).length;

    // Timeline data for the last 14 days
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 13);
    fourteenDaysAgo.setHours(0, 0, 0, 0);

    const logs = await prisma.engagePushLog.findMany({
      where: { sentAt: { gte: fourteenDaysAgo } },
      select: { sentAt: true, clickedAt: true, convertedAt: true }
    });

    const timelineMap: Record<string, { sent: number; clicked: number; converted: number }> = {};

    for (let i = 0; i < 14; i++) {
      const d = new Date(fourteenDaysAgo);
      d.setDate(d.getDate() + i);
      const dateStr = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
      timelineMap[dateStr] = { sent: 0, clicked: 0, converted: 0 };
    }

    logs.forEach((log: { sentAt: Date; clickedAt: Date | null; convertedAt: Date | null }) => {
      const dateStr = new Date(log.sentAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
      if (timelineMap[dateStr]) {
        timelineMap[dateStr].sent++;
        if (log.clickedAt) timelineMap[dateStr].clicked++;
        if (log.convertedAt) timelineMap[dateStr].converted++;
      }
    });

    const chartTimeline = Object.entries(timelineMap).map(([date, counts]) => ({
      date,
      sent: counts.sent,
      clicked: counts.clicked,
      converted: counts.converted,
      ctr: counts.sent > 0 ? parseFloat(((counts.clicked / counts.sent) * 100).toFixed(1)) : 0
    }));

    // Trigger distribution
    const triggerNames: Record<string, string> = {
      SCHEDULED: "Lembretes Agendados",
      INACTIVITY: "Inatividade / Abandono",
      STREAK_SAVER: "Ofensiva & Sequência",
      WORKOUT_COMPLETED: "Treino Concluído",
      ASSESSMENT_DUE: "Avaliação Vencendo",
      BROADCAST: "Disparos Avulsos"
    };

    const triggerCounts: Record<string, number> = {};
    notifications.forEach((n: { triggerType: PushTriggerType; sentCount: number; sentCountB?: number }) => {
      const count = n.sentCount + (n.sentCountB || 0);
      triggerCounts[n.triggerType] = (triggerCounts[n.triggerType] || 0) + count;
    });

    const triggerDistribution = Object.entries(triggerCounts).map(([type, count]) => ({
      trigger: type,
      name: triggerNames[type] || type,
      count,
      percentage: totalSent > 0 ? parseFloat(((count / totalSent) * 100).toFixed(1)) : 0
    }));

    return {
      totalSent,
      totalDelivered,
      totalClicked,
      totalConverted,
      deliveryRate,
      ctr,
      conversionRate,
      activeAutomations,
      chartTimeline,
      triggerDistribution
    };
  }

  /**
   * Send a test push notification to a specific target user.
   * STRICTLY BYPASSES:
   * - Quiet Hours (22:00 - 07:00)
   * - Daily Anti-Duplication capping
   * - Fatigue limit (max 2 in 24h)
   */
  static async sendTestPush(params: {
    notificationId?: string;
    targetUserId: string;
    adminUserId?: string;
    variant?: "A" | "B";
    customPayload?: {
      title?: string;
      body?: string;
      imageUrl?: string | null;
      deepLink?: string;
      category?: string;
      priority?: string;
    };
  }): Promise<{
    success: boolean;
    logId?: string;
    user?: { id: string; name: string | null; email: string | null; role: string };
    devicesCount?: number;
    pushSent?: boolean;
    inAppDelivered?: boolean;
    dispatchId?: string;
    deliveryStatus?: "QUEUED" | "SKIPPED";
    error?: string;
  }> {
    const { notificationId, targetUserId, variant = "A", customPayload } = params;

    // 1. Fetch target user
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, name: true, email: true, role: true }
    });

    if (!targetUser) {
      return { success: false, error: "Usuário de teste não encontrado no sistema." };
    }

    // 2. Fetch notification template if notificationId is provided
    let titleTemplate = customPayload?.title || "Notificação de Teste";
    let bodyTemplate = customPayload?.body || "Esta é uma notificação de teste enviada pelo AtlasFit Engage.";
    let imageUrl = customPayload?.imageUrl || null;
    let deepLink = customPayload?.deepLink || "/student/workouts";
    let category = customPayload?.category || "TRAINING";
    let priority = customPayload?.priority || "HIGH";

    if (notificationId) {
      const notif = await prisma.engagePushNotification.findUnique({
        where: { id: notificationId }
      });
      if (notif) {
        if (variant === "B" && notif.titleB && notif.bodyB) {
          titleTemplate = notif.titleB;
          bodyTemplate = notif.bodyB;
        } else {
          titleTemplate = notif.title;
          bodyTemplate = notif.body;
        }
        imageUrl = notif.imageUrl || null;
        deepLink = notif.deepLink || "/student/workouts";
        category = notif.category || "TRAINING";
        priority = notif.priority || "HIGH";
      }
    }

    // 3. Dynamic variable interpolation
    const streak = await this.calculateUserStreak(targetUser.id);
    const title = this.interpolateTemplate(titleTemplate, {
      name: targetUser.name,
      firstName: targetUser.name?.split(" ")[0],
      streakDays: streak,
      inactivityDays: 0,
      trainerName: "AtlasFit Admin"
    });
    const description = this.interpolateTemplate(bodyTemplate, {
      name: targetUser.name,
      firstName: targetUser.name?.split(" ")[0],
      streakDays: streak,
      inactivityDays: 0,
      trainerName: "AtlasFit Admin"
    });

    return serializableTransaction(async tx => {
    // 4. Create EngagePushLog entry if linked to a notification campaign
    let logId: string | undefined;
    if (notificationId) {
      const log = await tx.engagePushLog.create({
        data: {
          notificationId,
          userId: targetUser.id,
          variant,
          status: "QUEUED",
        }
      });
      logId = log.id;
    }

    const separator = deepLink.includes("?") ? "&" : "?";
    const trackedLink = logId ? `${deepLink}${separator}engage_push_log=${logId}&is_test=true` : deepLink;

    // 5. Direct dispatch via NotificationService (Quiet hours & fatigue caps bypassed)
    const result = await enqueueNotification(tx, {
      userId: targetUser.id,
      type: NotificationType.CAMPAIGN,
      category: (category as NotificationCategory) || NotificationCategory.TRAINING,
      title: `[TESTE] ${title}`,
      description,
      image: imageUrl || undefined,
      priority: (priority as NotificationPriority) || NotificationPriority.HIGH,
      deepLink: trackedLink,
      source: "Atlas Engage Test Push",
      payload: {
        isTest: "true",
        variant,
        notificationId: notificationId || "test-dispatch",
        engagePushLogId: logId || "test-log"
      }
    });

    if (logId) {
      await tx.engagePushLog.update({
        where: { id: logId },
        data: { status: result.deliveryStatus, errorReason: "dispatch:" + result.dispatchId }
      });
    }

    return {
      success: true,
      logId,
      user: targetUser,
      devicesCount: result.devicesCount,
      pushSent: result.pushSent,
      inAppDelivered: !!result.notificationId,
      dispatchId: result.dispatchId,
      deliveryStatus: result.deliveryStatus
    };
    });
  }
}
