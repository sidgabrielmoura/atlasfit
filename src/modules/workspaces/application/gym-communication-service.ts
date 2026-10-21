import { z } from "zod";
import { createHash } from "node:crypto";
import { WorkspaceAccessError } from "../domain/types";
import { idempotentSerializableTransaction } from "./transaction";
import { assertActorAuthority } from "./actor-authority";
import { resolveAccessRoles } from "../domain/access-roles";
import { resolveEffectiveCapabilities } from "../domain/roles";

export const gymNotificationSchema = z.object({
  requestKey: z.string().uuid(),
  workspaceId: z.string().min(1).max(100),
  title: z.string().trim().min(1).max(150),
  message: z.string().trim().min(1).max(2000),
  targetAudience: z.enum(["ALL_STUDENTS", "UNIT_STUDENTS", "LEGAL_GUARDIANS"]),
  targetFilter: z.object({ unitId: z.string().min(1).max(100).nullable().optional() }).strict().optional(),
  channel: z.literal("IN_APP").default("IN_APP"),
  customDeepLink: z.enum(["/student/dashboard", "/guardian/dependents"]).nullable().optional(),
}).strict();

export type TargetAudienceType = z.infer<typeof gymNotificationSchema>["targetAudience"];
export type SendTargetedNotificationInput = z.input<typeof gymNotificationSchema> & { senderUserId: string };

export class GymCommunicationService {
  async sendTargetedNotification(input: SendTargetedNotificationInput) {
    const { senderUserId, ...request } = input;
    const parsed = gymNotificationSchema.safeParse(request);
    if (!parsed.success) throw new WorkspaceAccessError(400, "INVALID_REQUEST", "Revise a mensagem e o segmento. Somente notificações internas são suportadas.");
    const data = parsed.data;
    const unitId = data.targetFilter?.unitId || undefined;
    const fingerprint = createHash("sha256").update(JSON.stringify([senderUserId, data.title, data.message, data.targetAudience, unitId || null, data.channel, data.customDeepLink || null])).digest("hex");
    if (data.targetAudience === "UNIT_STUDENTS" && !unitId) throw new WorkspaceAccessError(400, "UNIT_REQUIRED", "Selecione a unidade.");
    return idempotentSerializableTransaction(async tx => {
      await assertActorAuthority(tx, data.workspaceId, senderUserId, "communication.manage", unitId);
      const previous = await tx.gymCommunicationDispatch.findUnique({ where: { workspaceId_requestKey: { workspaceId: data.workspaceId, requestKey: data.requestKey } } });
      if (previous) {
        if (previous.fingerprint !== fingerprint || previous.senderUserId !== senderUserId) throw new WorkspaceAccessError(409, "IDEMPOTENCY_CONFLICT", "Esta tentativa já foi usada para outra mensagem.");
        return { success: true, status: "PERSISTED" as const, channel: "IN_APP" as const, dispatchId: previous.id, recipientsCount: previous.recipientsCount, targetAudience: previous.targetAudience, deepLinkUsed: previous.deepLinkUsed };
      }
      const actor = await tx.workspaceMember.findUnique({ where: { userId_workspaceId: { workspaceId: data.workspaceId, userId: senderUserId } }, include: { roleGrants: true } });
      const workspace = await tx.workspace.findUniqueOrThrow({ where: { id: data.workspaceId }, select: { ownerId: true } });
      const user = await tx.user.findUniqueOrThrow({ where: { id: senderUserId }, select: { role: true } });
      const managesStudents = user.role === "SUPERADMIN" || workspace.ownerId === senderUserId || (actor !== null && resolveEffectiveCapabilities(resolveAccessRoles(actor.role, actor.roleGrants, unitId)).has("students.manage"));
      const members = await tx.workspaceMember.findMany({
        where: { workspaceId: data.workspaceId, isActive: true, ...(unitId ? { unitId } : {}), ...(!managesStudents ? { assignedStaffId: actor?.id || "__no_member__" } : {}), studentProfile: { status: "ACTIVE" } },
        select: { id: true, userId: true },
      });
      const guardians = data.targetAudience === "LEGAL_GUARDIANS" ? await tx.gymGuardian.findMany({
        where: { workspaceId: data.workspaceId, studentMemberId: { in: members.map(member => member.id) }, isLegalRepresentative: true, revokedAt: null, verifiedAt: { not: null } },
        select: { guardianUserId: true },
      }) : [];
      const recipients = [...new Set(data.targetAudience === "LEGAL_GUARDIANS" ? guardians.flatMap(guardian => guardian.guardianUserId ? [guardian.guardianUserId] : []) : members.map(member => member.userId))];
      const deepLinkUsed = data.targetAudience === "LEGAL_GUARDIANS" ? "/guardian/dependents" : "/student/dashboard";
      if (data.customDeepLink && data.customDeepLink !== deepLinkUsed) throw new WorkspaceAccessError(400, "INVALID_REQUEST", "Destino incompatível com o segmento.");
      const dispatch = await tx.gymCommunicationDispatch.create({ data: { workspaceId: data.workspaceId, senderUserId, requestKey: data.requestKey, fingerprint, recipientsCount: recipients.length, targetAudience: data.targetAudience, deepLinkUsed } });
      if (recipients.length) await tx.notification.createMany({ data: recipients.map(userId => ({ userId, workspaceId: data.workspaceId, dispatchId: dispatch.id, title: data.title, description: data.message, type: "SYSTEM", category: "COMMUNICATION", deepLink: deepLinkUsed })) });
      await tx.auditLog.create({ data: { userId: senderUserId, action: `GYM_NOTIFICATION_PERSISTED: channel=IN_APP; recipients=${recipients.length}; audience=${data.targetAudience}; unit=${unitId || "all"}`, entity: "WORKSPACE", entityId: data.workspaceId, severity: "info" } });
      return { success: true, status: "PERSISTED" as const, channel: "IN_APP" as const, dispatchId: dispatch.id, recipientsCount: recipients.length, targetAudience: data.targetAudience, deepLinkUsed };
    });
  }
}

export const gymCommunicationService = new GymCommunicationService();
