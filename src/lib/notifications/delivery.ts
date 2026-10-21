import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { enqueueDelivery, DeliveryError } from "@/lib/delivery/outbox";
import { serializableTransaction, type GymTransactionClient } from "@/modules/workspaces/application/transaction";
import { normalizeNotificationPreferences } from "./preferences";
import { getAppBaseUrl, renderBaseEmailLayout } from "@/lib/emails/templates/base-layout";
import { getFromEmail } from "@/lib/emails/service";

const inputSchema = z.object({ userId: z.string().min(1), type: z.string().min(1).max(100), category: z.string().min(1).max(100), title: z.string().min(1).max(200), description: z.string().max(4000), image: z.string().url().optional(), icon: z.string().optional(), priority: z.string().default("NORMAL"), payload: z.record(z.string(), z.unknown()).optional(), deepLink: z.string().optional(), source: z.string().optional(), workspaceId: z.string().optional(), requestKey: z.string().min(1).max(200).optional() }).strict();
export type NotificationInput = z.input<typeof inputSchema>;
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]!));

/** All links stay on the application origin. */
export function notificationLink(value?: string) {
  if (!value) return undefined;
  const origin = getAppBaseUrl();
  const url = new URL(value, `${origin}/`);
  if (url.origin !== origin || !["http:", "https:"].includes(url.protocol)) throw new DeliveryError("INVALID_NOTIFICATION_LINK", true);
  return `${url.pathname}${url.search}${url.hash}`;
}

/** Persist the message and each requested delivery in the business transaction. */
export async function enqueueNotification(tx: GymTransactionClient, raw: NotificationInput) {
  const { requestKey, ...input } = inputSchema.parse(raw);
  input.deepLink = notificationLink(input.deepLink);
  const user = await tx.user.findUniqueOrThrow({ where: { id: input.userId }, select: { email: true } });
  if (input.workspaceId) {
    const workspace = await tx.workspace.findFirst({ where: { id: input.workspaceId, isActive: true, OR: [{ ownerId: input.userId }, { members: { some: { userId: input.userId, isActive: true } } }] }, select: { id: true } });
    if (!workspace) throw new DeliveryError("NOTIFICATION_RECIPIENT_UNAVAILABLE", true);
  }
  const intent = await enqueueDelivery(tx, { workspaceId: input.workspaceId, requestKey: `notification:${input.userId}:${createHash("sha256").update(requestKey || randomUUID()).digest("hex")}`, channel: "NOTIFICATION", payload: input });
  const prefix = `notification-delivery:${intent.id}:`;
  // A completed internal receipt means the fan-out was committed, never provider delivery.
  if (intent.status === "QUEUED") {
    const preferences = normalizeNotificationPreferences((await tx.notificationPreference.findUnique({ where: { userId: input.userId } }))?.settings);
    const pref = preferences[input.category as keyof typeof preferences] || preferences.SYSTEM;
    const guard = { kind: "NOTIFICATION" as const, userId: input.userId, category: input.category, workspaceId: input.workspaceId };
    if (pref.inApp) {
      const created = await tx.notification.create({ data: { ...input, id: intent.id, payload: input.payload as Prisma.InputJsonValue | undefined } });
      await enqueueDelivery(tx, { workspaceId: input.workspaceId, requestKey: `${prefix}ably`, channel: "ABLY", payload: { channelName: `user:${input.userId}:notifications`, eventName: "notification:new", data: JSON.parse(JSON.stringify(created)), guard } });
    }
    if (pref.email && user.email) {
      const link = input.deepLink ? `${getAppBaseUrl()}${input.deepLink}` : undefined;
      const html = renderBaseEmailLayout({ title: escapeHtml(input.title), badgeText: escapeHtml(input.category), previewText: escapeHtml(input.description.slice(0, 100)), recipientEmail: escapeHtml(user.email), contentHtml: `<p>${escapeHtml(input.description).replace(/\n/g, "<br>")}</p>`, ctaButton: link ? { text: "Acessar no aplicativo", url: escapeHtml(link) } : undefined });
      await enqueueDelivery(tx, { workspaceId: input.workspaceId, requestKey: `${prefix}email`, channel: "EMAIL", payload: { from: getFromEmail(), to: user.email, subject: `${input.title} - AtlasFit`, html, text: `${input.title}\n\n${input.description}${link ? `\n\n${link}` : ""}`, guard } });
    }
    if (pref.push) {
      let cursor: string | undefined;
      for (;;) {
        const devices = await tx.notificationDevice.findMany({ where: { userId: input.userId, status: "ACTIVE" }, orderBy: { id: "asc" }, take: 100, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}), select: { id: true, firebaseToken: true } });
        for (const device of devices) await enqueueDelivery(tx, { workspaceId: input.workspaceId, requestKey: `${prefix}push:${device.id}`, channel: "PUSH", payload: { userId: input.userId, deviceId: device.id, token: device.firebaseToken, notificationId: pref.inApp ? intent.id : undefined, title: input.title, body: input.description, image: input.image, deepLink: input.deepLink, priority: input.priority, tag: intent.id, guard } });
        if (devices.length < 100) break;
        cursor = devices.at(-1)!.id;
      }
    }
    await tx.deliveryOutbox.update({ where: { id: intent.id }, data: { status: "SKIPPED", completedAt: new Date(), providerReceiptId: null } });
  }
  const notification = await tx.notification.findUnique({ where: { id: intent.id }, select: { id: true } });
  const devicesCount = await tx.deliveryOutbox.count({ where: { requestKey: { startsWith: `${prefix}push:` } } });
  const channelCount = await tx.deliveryOutbox.count({ where: { requestKey: { startsWith: prefix } } });
  return { dispatchId: intent.id, notificationId: notification?.id, pushSent: false, devicesCount, successCount: 0, deliveryStatus: channelCount ? "QUEUED" as const : "SKIPPED" as const };
}

export function sendDurableNotification(input: NotificationInput) {
  return serializableTransaction(tx => enqueueNotification(tx, input));
}

export async function notificationDeliveryStatus(tx: GymTransactionClient, userId: string, id: string) {
  const intent = await tx.deliveryOutbox.findFirst({ where: { id, channel: "NOTIFICATION", requestKey: { startsWith: `notification:${userId}:` } }, select: { id: true } });
  if (!intent) return null;
  const channels = await tx.deliveryOutbox.groupBy({ by: ["channel", "status"], where: { requestKey: { startsWith: `notification-delivery:${id}:` } }, _count: true });
  return { dispatchId: id, channels: channels.map(row => ({ channel: row.channel, status: row.status, count: row._count })) };
}
