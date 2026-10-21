import { createHash } from "node:crypto";
import { z } from "zod";
import { WorkspaceAccessError } from "../domain/types";
import { serializableTransaction, type GymTransactionClient } from "./transaction";
import { gymRetentionPolicy, gymPurgeDeadline, gymPurgeStartsAt } from "../domain/gym-retention-policy";

export const gymClosureSchema = z.object({
  workspaceId: z.string().trim().min(1).max(100),
  requestKey: z.string().uuid(),
  confirmationSlug: z.string().trim().min(1).max(100),
  reason: z.string().trim().min(10).max(2000),
}).strict();
export const gymClosureAction = "GYM_WORKSPACE_CLOSED";

async function ownerWorkspace(tx: GymTransactionClient, workspaceId: string, actorUserId: string) {
  const workspace = await tx.workspace.findUnique({ where: { id: workspaceId }, select: { id: true, type: true, ownerId: true, slug: true, isActive: true, closedAt: true, purgeAfter: true } });
  if (!workspace || workspace.type !== "GYM") throw new WorkspaceAccessError(404, "WORKSPACE_NOT_FOUND", "Academia não encontrada.");
  if (workspace.ownerId !== actorUserId || !await tx.user.findUnique({ where: { id: actorUserId }, select: { id: true } })) throw new WorkspaceAccessError(403, "INSUFFICIENT_PERMISSIONS", "Somente o titular atual pode encerrar a academia.");
  return workspace;
}

async function inventory(tx: GymTransactionClient, workspaceId: string) {
  const [license, externalEnrollments, externalMembers, providerAccount, externalBillings, openCashDrawers, runningImports, members, enrollments, contracts, invoices, files, objects] = await Promise.all([
    tx.workspaceSubscription.findUnique({ where: { workspaceId }, select: { externalSubscriptionId: true } }),
    tx.gymEnrollment.count({ where: { workspaceId, providerSubscriptionId: { not: null } } }),
    tx.workspaceMember.count({ where: { workspaceId, asaasSubscriptionId: { not: null } } }),
    tx.paymentProviderAccount.count({ where: { workspaceId } }),
    tx.studentBilling.count({ where: { workspaceId, providerBillingId: { not: null }, status: { notIn: ["CANCELLED", "REFUNDED", "SETTLED"] } } }),
    tx.gymCashDrawerSession.count({ where: { workspaceId, status: "OPEN" } }),
    tx.importJob.count({ where: { workspaceId, status: { in: ["PROCESSING", "IMPORTING"] } } }),
    tx.workspaceMember.count({ where: { workspaceId } }),
    tx.gymEnrollment.count({ where: { workspaceId, status: { notIn: ["CANCELLED", "EXPIRED"] } } }),
    tx.gymContractAcceptance.count({ where: { workspaceId } }),
    tx.gymInvoice.count({ where: { workspaceId } }),
    tx.studentFile.count({ where: { workspaceId } }),
    tx.gymStorageObject.count({ where: { workspaceId } }),
  ]);
  const blockers = { externalLicense: Boolean(license?.externalSubscriptionId), externalEnrollments, externalMembers, providerAccount, externalBillings, openCashDrawers, runningImports };
  return { blockers, retained: { members, contracts, invoices, files, objects }, enrollmentsToCancel: enrollments, canClose: !Object.values(blockers).some(Boolean) };
}

export function previewGymClosure(workspaceId: string, actorUserId: string) {
  return serializableTransaction(async tx => {
    const workspace = await ownerWorkspace(tx, workspaceId, actorUserId);
    const closed = await tx.auditLog.findFirst({ where: { entity: "WORKSPACE", entityId: workspaceId, action: gymClosureAction }, select: { id: true, createdAt: true } });
    return { workspaceId, confirmationSlug: workspace.slug, alreadyClosed: Boolean(closed), closedAt: workspace.closedAt ?? closed?.createdAt ?? null, purgeAfter: workspace.purgeAfter ?? (closed ? gymPurgeDeadline(closed.createdAt) : null), ...await inventory(tx, workspaceId), retention: gymRetentionPolicy.mode, retentionPolicy: gymRetentionPolicy };
  });
}

/** Closure is local and atomic. No provider cancellation or irreversible purge is inferred. */
export async function closeGymWorkspace(raw: unknown, actorUserId: string) {
  const parsed = gymClosureSchema.safeParse(raw);
  if (!parsed.success) throw new WorkspaceAccessError(400, "INVALID_REQUEST", parsed.error.issues[0]?.message || "Dados de encerramento inválidos.");
  const input = parsed.data;
  const fingerprint = createHash("sha256").update(JSON.stringify({ ...input, actorUserId })).digest("hex");
  return serializableTransaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "Workspace" WHERE id = ${input.workspaceId} FOR UPDATE`;
    const workspace = await ownerWorkspace(tx, input.workspaceId, actorUserId);
    const prior = await tx.auditLog.findFirst({ where: { entity: "WORKSPACE", entityId: workspace.id, action: gymClosureAction }, select: { id: true, createdAt: true, metadata: true } });
    if (prior) {
      const metadata = prior.metadata as { requestKey?: string; fingerprint?: string } | null;
      if (metadata?.requestKey !== input.requestKey || metadata.fingerprint !== fingerprint) throw new WorkspaceAccessError(409, "IDEMPOTENCY_CONFLICT", "A academia já foi encerrada por outra solicitação.");
      return { workspaceId: workspace.id, receiptId: prior.id, closedAt: workspace.closedAt ?? prior.createdAt, purgeAfter: workspace.purgeAfter ?? gymPurgeDeadline(prior.createdAt), alreadyClosed: true, retention: gymRetentionPolicy.mode, retentionPolicy: gymRetentionPolicy };
    }
    if (input.confirmationSlug !== workspace.slug) throw new WorkspaceAccessError(409, "CONFIGURATION_CONFLICT", "Confirme o identificador atual da academia.");
    const snapshot = await inventory(tx, workspace.id);
    if (!snapshot.canClose) throw new WorkspaceAccessError(409, "REVIEW_REQUIRED", "Regularize assinaturas e cobranças externas, feche os caixas e aguarde importações em andamento antes do encerramento. Nenhuma alteração foi realizada.");
    const now = new Date();
    await tx.$executeRaw`WITH previous AS MATERIALIZED (
      SELECT id,status FROM "GymEnrollment" WHERE "workspaceId"=${workspace.id} AND status NOT IN ('CANCELLED','EXPIRED') FOR UPDATE
    ), changed AS (
      UPDATE "GymEnrollment" e SET status='CANCELLED',"cancelledAt"=${now},"cancellationEffectiveDate"=${now},"cancellationReason"=${input.reason},"autoRenew"=FALSE,"accessGranted"=FALSE,"subscriptionStatus"='INACTIVE',"nextDueDate"=NULL,"nextCycleBillingDate"=NULL,"scheduledPlanVersionId"=NULL,"updatedAt"=${now}
      FROM previous p WHERE e.id=p.id RETURNING e.id,p.status
    ) INSERT INTO "GymEnrollmentEvent" (id,"workspaceId","enrollmentId","fromStatus","toStatus","effectiveDate",reason,"actorId","createdAt")
      SELECT 'closure_' || ${input.requestKey} || '_' || c.id,${workspace.id},c.id,c.status,'CANCELLED',${now},${input.reason},${actorUserId},${now} FROM changed c`;
    await tx.gymStudentProfile.updateMany({ where: { member: { workspaceId: workspace.id } }, data: { status: "CANCELLED" } });
    await tx.workspaceRoleGrant.updateMany({ where: { member: { workspaceId: workspace.id }, revokedAt: null }, data: { revokedAt: now, revokedBy: actorUserId } });
    await tx.workspaceMember.updateMany({ where: { workspaceId: workspace.id }, data: { isActive: false, billingIsActive: false } });
    await tx.workspaceInvitation.updateMany({ where: { workspaceId: workspace.id, status: "PENDING" }, data: { status: "REVOKED" } });
    await tx.importJob.updateMany({ where: { workspaceId: workspace.id, status: { in: ["UPLOADED", "REVIEW", "READY"] } }, data: { status: "CANCELLED" } });
    await tx.gymUnit.updateMany({ where: { workspaceId: workspace.id }, data: { isActive: false } });
    await tx.workspaceSubscription.updateMany({ where: { workspaceId: workspace.id }, data: { status: "CANCELED", endDate: now } });
    await tx.deliveryOutbox.updateMany({ where: { workspaceId: workspace.id, status: { in: ["QUEUED","RETRY","PROCESSING"] } }, data: { status: "SKIPPED", payloadEncrypted: null, completedAt: now, leaseToken: null, leaseExpiresAt: null } });
    const purgeAfter = gymPurgeDeadline(now);
    await tx.workspace.update({ where: { id: workspace.id }, data: { isActive: false, closedAt: now, purgeAfter } });
    await tx.gymPurgeJob.create({ data: { workspaceId: workspace.id, requestKey: input.requestKey, fingerprint, nextAttemptAt: gymPurgeStartsAt(purgeAfter), createdAt: now } });
    const receipt = await tx.auditLog.create({ data: { userId: actorUserId, action: gymClosureAction, entity: "WORKSPACE", entityId: workspace.id, severity: "high", metadata: { requestKey: input.requestKey, fingerprint, reason: input.reason, cancelledEnrollments: snapshot.enrollmentsToCancel, retained: snapshot.retained, retention: gymRetentionPolicy.mode, retentionPolicy: gymRetentionPolicy } } });
    return { workspaceId: workspace.id, receiptId: receipt.id, closedAt: now, purgeAfter, alreadyClosed: false, retention: gymRetentionPolicy.mode, retentionPolicy: gymRetentionPolicy };
  });
}
