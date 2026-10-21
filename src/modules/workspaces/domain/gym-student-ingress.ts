import { z } from "zod";
export const gymStudentInvitationSchema = z.object({ workspaceId: z.string().min(1).max(100), requestKey: z.uuid(), confirmed: z.literal(true), delivery: z.enum(["MANUAL_LINK", "EMAIL"]) }).strict();
export const gymStudentInvitationIssuedSchema = z.discriminatedUnion("delivery", [
  z.object({ delivery: z.literal("LOGIN_OWN"), loginPath: z.literal("/auth/student"), message: z.string() }),
  z.object({ delivery: z.literal("MANUAL_LINK"), invitationPath: z.string().regex(/^\/auth\/setup-password\?token=gym_[a-f0-9]{64}$/), expiresAt: z.iso.datetime() }),
  z.object({ delivery: z.literal("EMAIL"), deliveryId: z.string(), status: z.string(), expiresAt: z.iso.datetime() }),
]);
