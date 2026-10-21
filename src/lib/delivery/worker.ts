import { z } from "zod";
import prisma from "@/lib/prisma";
import { ablyRest } from "@/lib/ably";
import { resend } from "@/lib/resend";
import { paymentService } from "@/modules/payments/application/payment-service";
import { DeliveryError, type DeliveryHandler } from "./outbox";
import { currentStudentInvitation } from "@/modules/workspaces/application/gym-student-ingress";
import { WorkspaceAccessError } from "@/modules/workspaces/domain/types";
import { normalizeNotificationPreferences } from "@/lib/notifications/preferences";
import { getAdminMessaging } from "@/lib/firebase-admin";
import { getAppBaseUrl } from "@/lib/emails/templates/base-layout";

const notificationGuard = z.object({ kind: z.literal("NOTIFICATION"), userId: z.string(), category: z.string(), workspaceId: z.string().optional() }).strict();
const emailPayload = z.object({ from: z.string().min(1), to: z.string().email(), subject: z.string().min(1), html: z.string().min(1), text: z.string().min(1), guard: z.union([z.object({ kind: z.literal("GYM_STUDENT_INVITE"), tokenHash: z.string().regex(/^[a-f0-9]{64}$/) }).strict(), notificationGuard]).optional() }).strict();
const ablyPayload = z.object({ channelName: z.string().regex(/^(user:[^:]+(?::notifications)?|workspace:[^:]+)$/), eventName: z.enum(["wallet:updated", "financial:updated", "notification:new"]), data: z.record(z.string(), z.unknown()), guard: notificationGuard.optional() }).strict();
const pushPayload = z.object({ userId: z.string(), deviceId: z.string(), token: z.string(), notificationId: z.string().optional(), title: z.string(), body: z.string(), image: z.string().url().optional(), deepLink: z.string().optional(), priority: z.string(), tag: z.string(), guard: notificationGuard }).strict();
const activationPayload = z.object({ providerAccountId: z.string(), billingId: z.string(), availableNetCents: z.string().regex(/^\d+$/), environment: z.enum(["SANDBOX", "PRODUCTION"]) }).strict();

async function notificationAllowed(guard: z.infer<typeof notificationGuard>, channel: "email" | "push" | "inApp") {
  const user = await prisma.user.findUnique({ where: { id: guard.userId }, select: { id: true } });
  if (!user) return false;
  if (guard.workspaceId && !await prisma.workspace.findFirst({ where: { id: guard.workspaceId, isActive: true, OR: [{ ownerId: guard.userId }, { members: { some: { userId: guard.userId, isActive: true } } }] }, select: { id: true } })) return false;
  const prefs = normalizeNotificationPreferences((await prisma.notificationPreference.findUnique({ where: { userId: guard.userId } }))?.settings);
  return (prefs[guard.category as keyof typeof prefs] || prefs.SYSTEM)[channel] === true;
}

export const deliveryHandler: DeliveryHandler = async job => {
  if (job.channel === "EMAIL") {
    const parsed = emailPayload.safeParse(job.payload);
    if (!parsed.success) throw new DeliveryError("INVALID_EMAIL_PAYLOAD", true);
    const { guard, ...message } = parsed.data;
    if (guard?.kind === "GYM_STUDENT_INVITE") {
      try { const invitation = await currentStudentInvitation(guard.tokenHash); if (invitation.data.email !== message.to) throw new DeliveryError("INVITATION_RECIPIENT_MISMATCH", true); }
      catch (error) { if (error instanceof WorkspaceAccessError) return { skipped: true }; throw error; }
    }
    if (guard?.kind === "NOTIFICATION") {
      if (!await notificationAllowed(guard, "email")) return { skipped: true };
      if ((await prisma.user.findUnique({ where: { id: guard.userId }, select: { email: true } }))?.email !== message.to) return { skipped: true };
    }
    if (!process.env.RESEND_API_KEY) throw new DeliveryError("EMAIL_NOT_CONFIGURED");
    // Resend keeps idempotency keys for 24h. Preserve the exact encrypted rendering on retries.
    if (job.attempts > 1 && job.now.getTime() - job.firstAttemptAt.getTime() >= 23 * 3_600_000) throw new DeliveryError("EMAIL_IDEMPOTENCY_WINDOW_EXPIRED", true);
    const { data, error } = await resend.emails.send(message, { idempotencyKey: `outbox/${job.id}` });
    if (error) {
      const retryable = ["rate_limit_exceeded", "application_error", "internal_server_error"].includes(error.name);
      throw new DeliveryError(retryable ? "EMAIL_PROVIDER_UNAVAILABLE" : "EMAIL_PROVIDER_REJECTED", !retryable);
    }
    if (!data?.id) throw new DeliveryError("EMAIL_ACKNOWLEDGEMENT_MISSING");
    return { receiptId: data.id };
  }
  if (job.channel === "ABLY") {
    const parsed = ablyPayload.safeParse(job.payload);
    if (!parsed.success) throw new DeliveryError("INVALID_ABLY_PAYLOAD", true);
    if (parsed.data.eventName === "notification:new" && (!parsed.data.guard || parsed.data.channelName !== `user:${parsed.data.guard.userId}:notifications`)) throw new DeliveryError("INVALID_NOTIFICATION_CHANNEL", true);
    if (parsed.data.guard && !await notificationAllowed(parsed.data.guard, "inApp")) return { skipped: true };
    if (!ablyRest) throw new DeliveryError("ABLY_NOT_CONFIGURED");
    if (job.attempts > 1 && job.previousErrorCode !== "ABLY_NOT_CONFIGURED" && job.now.getTime() - job.firstAttemptAt.getTime() >= 110_000) throw new DeliveryError("ABLY_IDEMPOTENCY_WINDOW_EXPIRED", true);
    const { channelName, eventName, data } = parsed.data;
    if (channelName.startsWith("workspace:")) {
      const workspace = await prisma.workspace.findUnique({ where: { id: channelName.slice(10) }, select: { type: true, isActive: true } });
      if (!workspace?.isActive || workspace.type !== "PERSONAL") throw new DeliveryError("ABLY_WORKSPACE_UNAVAILABLE", true);
    }
    await ablyRest.channels.get(channelName).publish({ id: `${job.id}:0`, name: eventName, data: { ...data, deliveryId: job.id } });
    return { receiptId: `${job.id}:0` };
  }
  if (job.channel === "PUSH") {
    const parsed = pushPayload.safeParse(job.payload);
    if (!parsed.success) throw new DeliveryError("INVALID_PUSH_PAYLOAD", true);
    const input = parsed.data;
    if (input.guard.userId !== input.userId) throw new DeliveryError("INVALID_PUSH_RECIPIENT", true);
    if (!await notificationAllowed(input.guard, "push")) return { skipped: true };
    const device = await prisma.notificationDevice.findFirst({ where: { id: input.deviceId, userId: input.userId, firebaseToken: input.token, status: "ACTIVE" }, select: { id: true } });
    if (!device) return { skipped: true };
    const messaging = getAdminMessaging();
    if (!messaging) throw new DeliveryError("PUSH_NOT_CONFIGURED");
    // FCM has no server idempotency key: a recovered lease cannot safely resend.
    if (job.attempts > 1 && job.previousErrorCode !== "PUSH_NOT_CONFIGURED") throw new DeliveryError("PUSH_RESULT_REVIEW_REQUIRED", true);
    const data = { title: input.title, body: input.body, url: input.deepLink || "/", deepLink: input.deepLink || "/", notificationId: input.notificationId || "", tag: input.tag };
    if (Buffer.byteLength(JSON.stringify(data)) > 3500) throw new DeliveryError("PUSH_PAYLOAD_TOO_LARGE", true);
    let receiptId: string;
    try {
      receiptId = await messaging.send({ token: input.token, notification: { title: input.title, body: input.body, imageUrl: input.image }, data, webpush: { fcmOptions: { link: `${getAppBaseUrl()}${input.deepLink || "/"}` }, notification: { tag: input.tag }, headers: { Urgency: ["HIGH", "CRITICAL"].includes(input.priority) ? "high" : "normal" } }, android: { notification: { tag: input.tag } } });
    } catch (error) {
      const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
      if (["messaging/invalid-registration-token", "messaging/registration-token-not-registered"].includes(code)) {
        await prisma.notificationDevice.deleteMany({ where: { id: input.deviceId, userId: input.userId, firebaseToken: input.token } });
        return { skipped: true };
      }
      throw new DeliveryError("PUSH_RESULT_REVIEW_REQUIRED", true);
    }
    // Provider acceptance does not prove display on the device.
    return { receiptId };
  }
  if (job.channel === "ACTIVATION_FEE") {
    const parsed = activationPayload.safeParse(job.payload);
    if (!parsed.success) throw new DeliveryError("INVALID_ACTIVATION_PAYLOAD", true);
    const input = parsed.data;
    const account = await prisma.paymentProviderAccount.findUnique({ where: { id: input.providerAccountId }, include: { workspace: { select: { type: true } } } });
    if (!account || account.workspace?.type === "GYM" || !account.personalUserId || account.environment !== input.environment) throw new DeliveryError("ACTIVATION_ACCOUNT_REVIEW_REQUIRED", true);
    const configuredEnvironment = process.env.ASAAS_ENVIRONMENT === "production" ? "PRODUCTION" : "SANDBOX";
    if (configuredEnvironment !== account.environment) throw new DeliveryError("ACTIVATION_ENVIRONMENT_MISMATCH", true);
    const existing = await prisma.activationFeeRecoveryOperation.findFirst({ where: { billingId: input.billingId, status: { notIn: ["FAILED", "CANCELLED"] } } });
    if (existing) {
      if (["SUBMITTED", "COMPLETED"].includes(existing.status) && existing.providerTransferId) return { receiptId: existing.providerTransferId };
      throw new DeliveryError("ACTIVATION_TRANSFER_RECONCILIATION_REQUIRED", true);
    }
    if (["COMPLETED", "NOT_APPLICABLE"].includes(account.activationFeeStatus) || account.activationFeeTotalInCents <= account.activationFeeRecoveredInCents + account.activationFeeReservedInCents) return { skipped: true };
    if (!account.providerApiKeyEncrypted || !process.env.ASAAS_MASTER_WALLET_ID) throw new DeliveryError("ACTIVATION_NOT_CONFIGURED");
    // A reserved/uncertain transfer is reconciled, never blindly requested again.
    const result = await paymentService.processActivationFeeRecovery(account.id, BigInt(input.availableNetCents), input.billingId);
    if (result?.providerTransferId) return { receiptId: result.providerTransferId };
    throw new DeliveryError("ACTIVATION_TRANSFER_RECONCILIATION_REQUIRED", true);
  }
  throw new DeliveryError("DELIVERY_CHANNEL_UNSUPPORTED", true);
};
