import { jobRetryAt } from "@/lib/job-retry";
import prisma from "@/lib/prisma";
import { DataSubjectRequestType, Prisma } from "@prisma/client";
import { z } from "zod";
import { serializableTransaction, type GymTransactionClient } from "./transaction";
import { assertActorAuthority } from "./actor-authority";
import { authorizeGymStudent } from "./student-authority";
import { storageService } from "@/lib/storage.service";
import { validateStorageKey } from "@/lib/storage-access";
import { gymAttachmentKeys } from "./gym-storage";
import { WorkspaceAccessError } from "../domain/types";
import { assertGymPrivacyAuthority } from "./gym-privacy-authority";
import { permitsOwnAccount } from "@/lib/auth/account-eligibility";
import { assertGuardianPrivacyAuthority, assertPrivacyRequestRepresentation } from "./guardian-privacy";

const id = z.string().trim().min(1).max(100);
const reason = z.string().trim().min(10).max(2000);
const retained = z.object({ action: z.literal("RETAIN"), reason, reviewAt: z.iso.datetime().refine(v => new Date(v) > new Date(), "Revisão futura obrigatória.") }).strict();
const erasable = z.union([retained, z.object({ action: z.literal("DELETE"), reason }).strict()]);
export const deletionDecisionSchema = z.object({ health: erasable, training: erasable, files: erasable, membership: retained, contractsAndFinance: retained, legalAndAudit: retained, communications: retained, globalIdentityAndOtherControllers: retained }).strict();
const commandSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("START_REVIEW") }).strict(),
  z.object({ action: z.literal("VERIFY_IDENTITY"), evidenceReference: reason }).strict(),
  z.object({ action: z.literal("REJECT"), response: reason }).strict(),
  z.object({ action: z.literal("RESOLVE"), response: reason, outcome: z.enum(["COMPLETED", "PARTIALLY_COMPLETED"]), resumeTreatment: z.object({ purpose: reason, legalBasis: reason, evidenceReference: reason }).strict().optional() }).strict(),
  z.object({ action: z.literal("DECIDE_DELETION"), response: reason, decision: deletionDecisionSchema }).strict(),
  z.object({ action: z.literal("RETRY_DELETION") }).strict(),
]);
type Meta = { identityRepresentationGuardianId?: string | null; version?: number; purpose?: string; identityVerifiedAt?: string; identityVerifiedBy?: string; identityEvidenceReference?: string; response?: string; decision?: z.infer<typeof deletionDecisionSchema>; deletion?: { keys: string[]; deletedKeys: string[]; completedAt?: string }; events?: { action: string; at: string; actorUserId: string }[] };
const metadata = (value: Prisma.JsonValue | null): Meta => value && typeof value === "object" && !Array.isArray(value) ? value as Meta : {};
const terminal = ["COMPLETED", "PARTIALLY_COMPLETED", "REJECTED"];
async function target(tx: GymTransactionClient, workspaceId: string, targetUserId: string, actorUserId: string) {
  const member = await tx.workspaceMember.findUnique({ where: { userId_workspaceId: { userId: targetUserId, workspaceId } }, select: { id: true, unitId: true } });
  if (!member) throw new WorkspaceAccessError(404, "NOT_A_MEMBER", "Titular indisponível nesta academia.");
  await assertGymPrivacyAuthority(tx, workspaceId, actorUserId, member.unitId);
  return member;
}
export async function submitGymPrivacyRequest(input: { workspaceId: string; targetUserId: string; actorUserId: string; type: DataSubjectRequestType; notes?: string; guardianId?: string }) {
  if (!Object.values(DataSubjectRequestType).includes(input.type) || (input.notes && input.notes.length > 2000)) throw new WorkspaceAccessError(400, "INVALID_REQUEST", "Solicitação inválida.");
  return serializableTransaction(async tx => {
    if (input.guardianId) {
      const guardian = await assertGuardianPrivacyAuthority(tx, input.workspaceId, input.guardianId, input.actorUserId);
      if (guardian.studentMember.userId !== input.targetUserId) throw new WorkspaceAccessError(403, "GUARDIAN_NOT_AUTHORIZED", "Representação não corresponde ao titular.");
    } else if (input.actorUserId === input.targetUserId) {
      const member = await tx.workspaceMember.findUnique({ where: { userId_workspaceId: { userId: input.targetUserId, workspaceId: input.workspaceId } }, select: { id: true } });
      if (!member) throw new WorkspaceAccessError(404, "NOT_A_MEMBER", "Vínculo não encontrado.");
      if (!await permitsOwnAccount(input.actorUserId, tx) || (await tx.workspace.findUnique({ where: { id: input.workspaceId }, select: { type: true } }))?.type !== "GYM") throw new WorkspaceAccessError(403, "FORBIDDEN_RESOURCE", "Identidade do titular ou controlador inválida.");
    } else await target(tx, input.workspaceId, input.targetUserId, input.actorUserId);
    const existing = await tx.dataSubjectRequest.findFirst({ where: { workspaceId: input.workspaceId, requesterUserId: input.targetUserId, type: input.type, status: { in: ["PENDING", "IN_REVIEW", "IDENTITY_VERIFICATION", "PROCESSING"] }, NOT: { metadata: { path: ["purpose"], equals: "GYM_IDENTITY_LINK" } } } });
    if (existing) return { id: existing.id, status: existing.status, alreadyRequested: true };
    const self = input.actorUserId === input.targetUserId || Boolean(input.guardianId);
    const request = await tx.dataSubjectRequest.create({ data: { workspaceId: input.workspaceId, requesterUserId: input.targetUserId, type: input.type, notes: input.notes?.trim() || null, metadata: { version: 1, purpose: "GYM_DSR", ...(self ? { identityVerifiedAt: new Date().toISOString(), identityVerifiedBy: input.actorUserId, identityEvidenceReference: input.guardianId ? "AUTHENTICATED_LEGAL_REPRESENTATIVE" : "AUTHENTICATED_SUBJECT", ...(input.guardianId ? { identityRepresentationGuardianId: input.guardianId } : {}) } : {}), events: [{ action: "SUBMITTED", at: new Date().toISOString(), actorUserId: input.actorUserId }] } } });
    await tx.auditLog.create({ data: { userId: input.actorUserId, action: "GYM_PRIVACY_REQUEST_SUBMITTED", entity: "DATA_SUBJECT_REQUEST", entityId: request.id } });
    return { id: request.id, status: request.status, alreadyRequested: false };
  });
}
export async function listGymPrivacyRequests(workspaceId: string, actorUserId: string, page = 1) {
  if (!Number.isInteger(page) || page < 1 || page > 10000) throw new WorkspaceAccessError(400, "INVALID_REQUEST", "Página inválida.");
  return serializableTransaction(async tx => {
    await assertGymPrivacyAuthority(tx, workspaceId, actorUserId);
    const where = { workspaceId, OR: [{ metadata: { equals: Prisma.DbNull } }, { NOT: { metadata: { path: ["purpose"], equals: "GYM_IDENTITY_LINK" } } }] };
    const [rows, total] = await Promise.all([tx.dataSubjectRequest.findMany({ where, orderBy: [{ requestedAt: "desc" }, { id: "desc" }], skip: (page - 1) * 30, take: 30, select: { id: true, requesterUserId: true, requester: { select: { name: true } }, type: true, status: true, requestedAt: true, completedAt: true, rejectionReason: true, notes: true, metadata: true } }), tx.dataSubjectRequest.count({ where })]);
    return { requests: await Promise.all(rows.map(async row => { const m = metadata(row.metadata); let identityCurrent = Boolean(m.identityVerifiedAt); if (identityCurrent) try { await assertPrivacyRequestRepresentation(tx, workspaceId, m); } catch { identityCurrent = false; } return { ...row, metadata: undefined, subjectName: row.requester.name || "Titular", requester: undefined, identityVerified: identityCurrent, response: m.response ?? null, decision: m.decision ?? null, pendingFiles: m.deletion ? m.deletion.keys.length - m.deletion.deletedKeys.length : 0 }; })), page, total, hasMore: page * 30 < total };
  });
}
export async function processGymPrivacyRequest(workspaceId: string, requestId: string, actorUserId: string, raw: unknown) {
  const parsed = commandSchema.safeParse(raw);
  if (!parsed.success) throw new WorkspaceAccessError(400, "INVALID_REQUEST", "Informe ação, resposta e justificativas de retenção válidas.");
  const command = parsed.data;
  const result = await serializableTransaction(async tx => {
    const request = await tx.dataSubjectRequest.findFirst({ where: { id: requestId, workspaceId } });
    if (!request || metadata(request.metadata).purpose === "GYM_IDENTITY_LINK") throw new WorkspaceAccessError(404, "RESOURCE_NOT_FOUND", "Solicitação indisponível nesta academia.");
    const member = await target(tx, workspaceId, request.requesterUserId, actorUserId);
    const m = metadata(request.metadata);
    if (terminal.includes(request.status)) {
      if (command.action === "RETRY_DELETION" && m.deletion?.completedAt) return { id: request.id, status: request.status, completed: true };
      throw new WorkspaceAccessError(409, "INVALID_TRANSITION", "Solicitação encerrada; registre um novo pedido.");
    }
    if (request.type === "DELETION" && request.status === "PROCESSING" && !["RETRY_DELETION", "VERIFY_IDENTITY"].includes(command.action)) throw new WorkspaceAccessError(409, "INVALID_TRANSITION", "A decisão de exclusão está em execução e não pode ser substituída.");
    const events = [...(m.events ?? []), { action: command.action, at: new Date().toISOString(), actorUserId }];
    let status = request.status;
    let next: Meta = { ...m, version: 1, purpose: "GYM_DSR", events };
    if (command.action === "START_REVIEW") status = m.identityVerifiedAt ? "IN_REVIEW" : "IDENTITY_VERIFICATION";
    else if (command.action === "VERIFY_IDENTITY") { status = request.type === "DELETION" && request.status === "PROCESSING" ? "PROCESSING" : "IN_REVIEW"; next = { ...next, identityVerifiedAt: new Date().toISOString(), identityVerifiedBy: actorUserId, identityEvidenceReference: command.evidenceReference, identityRepresentationGuardianId: null }; }
    else if (command.action === "REJECT") { status = "REJECTED"; next.response = command.response; }
    else {
      if (!m.identityVerifiedAt) throw new WorkspaceAccessError(409, "INVALID_STATUS", "Verifique a identidade e a representação antes do processamento.");
      await assertPrivacyRequestRepresentation(tx, workspaceId, m);
      if (command.action === "RESOLVE") {
        if (["DELETION", "ACCESS", "PORTABILITY"].includes(request.type)) throw new WorkspaceAccessError(409, "INVALID_TRANSITION", "Use a exclusão revisada ou a exportação efetivamente gerada para este pedido.");
        if (command.resumeTreatment) {
          if (request.type !== "OTHER" || command.outcome !== "COMPLETED" || request.status !== "IN_REVIEW") throw new WorkspaceAccessError(409, "INVALID_TRANSITION", "Retomada exige novo pedido específico, identidade conferida e revisão em andamento.");
          if (await tx.dataSubjectRequest.count({ where: { workspaceId, requesterUserId: request.requesterUserId, type: "DELETION", status: "PROCESSING" } })) throw new WorkspaceAccessError(409, "INVALID_STATUS", "Conclua a exclusão em andamento antes de revisar uma nova finalidade.");
          await tx.gymStudentProfile.updateMany({ where: { memberId: member.id, privacyRestrictedAt: { not: null } }, data: { privacyRestrictedAt: null } });
          await tx.auditLog.create({ data: { userId: actorUserId, action: "GYM_PRIVACY_TREATMENT_RESUMED", entity: "WORKSPACE_MEMBER", entityId: member.id, metadata: { requestId } } });
          next = { ...next, ...{ resumption: command.resumeTreatment } };
        }
        status = command.outcome; next.response = command.response;
      } else if (command.action === "DECIDE_DELETION") {
        if (request.type !== "DELETION") throw new WorkspaceAccessError(409, "INVALID_TRANSITION", "Decisão de exclusão exige pedido de exclusão.");
        const scoped = { workspaceId, studentId: request.requesterUserId };
        const files = command.decision.files.action === "DELETE" ? await tx.studentFile.findMany({ where: scoped, select: { objectKey: true, url: true, type: true } }) : [];
        const photos = command.decision.health.action === "DELETE" ? await tx.studentProgressPhoto.findMany({ where: scoped, select: { objectKey: true, photoUrl: true } }) : [];
        const evaluations = command.decision.health.action === "DELETE" ? await tx.physicalEvaluation.findMany({ where: scoped }) : [];
        const keys = new Set<string>();
        for (const file of files) if (file.type === "file") { const key = file.objectKey || gymAttachmentKeys(file.url)[0]; if (!key) throw new WorkspaceAccessError(409, "STORAGE_RECONCILIATION_REQUIRED", "Reconcilie o arquivo legado antes de confirmar a exclusão."); keys.add(key); }
        for (const photo of photos) { const key = photo.objectKey || gymAttachmentKeys(photo.photoUrl)[0]; if (!key) throw new WorkspaceAccessError(409, "STORAGE_RECONCILIATION_REQUIRED", "Reconcilie a foto legada antes de confirmar a exclusão."); keys.add(key); }
        for (const evaluation of evaluations) for (const key of gymAttachmentKeys(evaluation)) {
          if (!keys.has(key)) throw new WorkspaceAccessError(409, "STORAGE_RECONCILIATION_REQUIRED", "Anexo da avaliação deve estar vinculado a um arquivo ou foto incluído nesta decisão de exclusão.");
        }
        for (const key of keys) { validateStorageKey(key); if (!key.startsWith(`workspace/${workspaceId}/`)) throw new WorkspaceAccessError(409, "TENANT_MISMATCH", "Objeto vinculado fora desta academia.");
          if (!key.startsWith(`workspace/${workspaceId}/files/`) && !key.startsWith(`workspace/${workspaceId}/students/${request.requesterUserId}/progress/`)) throw new WorkspaceAccessError(409, "STORAGE_RECONCILIATION_REQUIRED", "Objeto fora dos caminhos privados do titular. Reconcilie antes de excluir.");
          const urls = [`/api/storage/file?key=${encodeURIComponent(key)}`, `/api/storage/file?key=${key}`];
          const other = await tx.studentFile.count({ where: { OR: [{ objectKey: key }, { url: { in: urls } }], NOT: scoped } }) + await tx.studentProgressPhoto.count({ where: { OR: [{ objectKey: key }, { photoUrl: { in: urls } }], NOT: scoped } });
          if (other) throw new WorkspaceAccessError(409, "GYM_DATA_RETENTION_REQUIRED", "Objeto compartilhado exige separação antes da exclusão.");
          const encoded = encodeURIComponent(key);
          const shared = await tx.$queryRaw<{ shared: boolean }[]>(Prisma.sql`SELECT EXISTS (
            SELECT 1 FROM "PhysicalEvaluation" e WHERE e."workspaceId" = ${workspaceId} AND e."studentId" <> ${request.requesterUserId} AND (position(${key} in row_to_json(e)::text) > 0 OR position(${encoded} in row_to_json(e)::text) > 0)
            UNION ALL
            SELECT 1 FROM "Message" m JOIN "Conversation" c ON c.id = m."conversationId" WHERE c."workspaceId" = ${workspaceId} AND (position(${key} in m.attachment::text) > 0 OR position(${encoded} in m.attachment::text) > 0)
          ) AS shared`);
          if (shared[0]?.shared) throw new WorkspaceAccessError(409, "GYM_DATA_RETENTION_REQUIRED", "Anexo referenciado por registros conservados exige separação antes da exclusão.");
        }
        await tx.gymStudentProfile.upsert({ where: { memberId: member.id }, create: { memberId: member.id, workspaceId, privacyRestrictedAt: new Date() }, update: { privacyRestrictedAt: new Date() } });
        status = "PROCESSING"; next = { ...next, response: command.response, decision: command.decision, deletion: { keys: [...keys], deletedKeys: [] } };
      } else if (!m.decision || !m.deletion || request.status !== "PROCESSING") throw new WorkspaceAccessError(409, "INVALID_TRANSITION", "Não há exclusão em execução.");
    }
    await tx.dataSubjectRequest.update({ where: { id: requestId }, data: { status, handledBy: actorUserId, metadata: next as Prisma.InputJsonValue, ...(terminal.includes(status) ? { completedAt: status === "REJECTED" ? null : new Date(), rejectedAt: status === "REJECTED" ? new Date() : null, rejectionReason: status === "REJECTED" ? next.response : null } : {}) } });
    await tx.auditLog.create({ data: { userId: actorUserId, action: `GYM_PRIVACY_${command.action}`, entity: "DATA_SUBJECT_REQUEST", entityId: requestId, metadata: { fromStatus: request.status, toStatus: status } } });
    return { id: requestId, status, completed: false };
  });
  if (result.status !== "PROCESSING") return result;
  return continueDeletion(workspaceId, requestId, actorUserId);
}
async function continueDeletion(workspaceId: string, requestId: string, actorUserId: string) {
  const request = await prisma.dataSubjectRequest.findFirstOrThrow({ where: { id: requestId, workspaceId } });
  const snapshot = metadata(request.metadata); if (!snapshot.deletion) throw new Error("Missing deletion decision.");
  for (const key of snapshot.deletion.keys) {
    if (snapshot.deletion.deletedKeys.includes(key)) continue;
    // Authority is checked again before each external side effect; failure preserves the job and quota.
    await serializableTransaction(tx => target(tx, workspaceId, request.requesterUserId, actorUserId));
    await storageService.deleteObject(key);
    await serializableTransaction(async tx => {
      await target(tx, workspaceId, request.requesterUserId, actorUserId);
      const current = await tx.dataSubjectRequest.findUniqueOrThrow({ where: { id: requestId } }); const m = metadata(current.metadata);
      if (current.status !== "PROCESSING" || !m.deletion) return;
      m.deletion.deletedKeys = [...new Set([...m.deletion.deletedKeys, key])];
      await tx.dataSubjectRequest.update({ where: { id: requestId }, data: { metadata: m as Prisma.InputJsonValue } });
      await tx.auditLog.create({ data: { userId: actorUserId, action: "GYM_PRIVACY_OBJECT_DELETED", entity: "DATA_SUBJECT_REQUEST", entityId: requestId, metadata: { phase: "EXTERNAL_CONFIRMED" } } });
    });
  }
  return serializableTransaction(async tx => {
    const current = await tx.dataSubjectRequest.findUniqueOrThrow({ where: { id: requestId } }); const m = metadata(current.metadata);
    const member = await target(tx, workspaceId, current.requesterUserId, actorUserId);
    if (terminal.includes(current.status)) return { id: requestId, status: current.status, completed: true };
    if (!m.deletion || !m.decision || m.deletion.keys.some(key => !m.deletion!.deletedKeys.includes(key))) throw new WorkspaceAccessError(409, "INVALID_STATUS", "Exclusão externa ainda não confirmada.");
    const scoped = { workspaceId, studentId: current.requesterUserId }; const counts: Record<string, number> = {};
    if (m.decision.health.action === "DELETE") {
      counts.evaluations = (await tx.physicalEvaluation.deleteMany({ where: scoped })).count;
      counts.progress = (await tx.studentProgress.deleteMany({ where: scoped })).count;
      counts.photos = (await tx.studentProgressPhoto.deleteMany({ where: scoped })).count;
      await tx.gymStudentProfile.update({ where: { memberId: member.id }, data: { healthData: Prisma.DbNull, onboardedAt: null, medicalClearance: false, medicalClearanceExpiresAt: null, notes: null } });
    }
    if (m.decision.training.action === "DELETE") {
      counts.logs = (await tx.workoutLog.deleteMany({ where: scoped })).count;
      counts.feedback = (await tx.dailyFeedback.deleteMany({ where: scoped })).count;
      counts.workouts = (await tx.workout.deleteMany({ where: scoped })).count;
    }
    if (m.decision.files.action === "DELETE") counts.files = (await tx.studentFile.deleteMany({ where: scoped })).count;
    await tx.gymStorageObject.deleteMany({ where: { workspaceId, objectKey: { in: m.deletion.deletedKeys } } });
    m.deletion.completedAt = new Date().toISOString();
    // Retained contract/identity/audit records are disclosed, never falsely called a complete erasure.
    await tx.dataSubjectRequest.update({ where: { id: requestId }, data: { status: "PARTIALLY_COMPLETED", completedAt: new Date(), metadata: m as Prisma.InputJsonValue } });
    await tx.auditLog.create({ data: { userId: actorUserId, action: "GYM_PRIVACY_DELETION_FINISHED", entity: "DATA_SUBJECT_REQUEST", entityId: requestId, metadata: { counts, retainedGroups: Object.entries(m.decision).filter(([, v]) => v.action === "RETAIN").map(([k]) => k) } } });
    return { id: requestId, status: "PARTIALLY_COMPLETED", completed: true, counts };
  });
}
export async function retryPendingGymPrivacyDeletions() {
  const requests = await prisma.dataSubjectRequest.findMany({ where: { workspaceId: { not: null }, type: "DELETION", status: "PROCESSING", metadata: { path: ["purpose"], equals: "GYM_DSR" }, OR: [{ processingRetryAt: null }, { processingRetryAt: { lte: new Date() } }], handledBy: { not: null } }, orderBy: [{ updatedAt: "asc" }, { id: "asc" }], take: 20, select: { id: true, workspaceId: true, handledBy: true, processingFailures: true } });
  let completed = 0; const failures: { requestId: string; code: string }[] = [];
  for (const request of requests) try { await processGymPrivacyRequest(request.workspaceId!, request.id, request.handledBy!, { action: "RETRY_DELETION" }); if (request.processingFailures) await prisma.dataSubjectRequest.update({ where: { id: request.id }, data: { processingRetryAt: null, processingFailures: 0 } }); completed++; }
  catch (e) { await prisma.dataSubjectRequest.update({ where: { id: request.id }, data: { processingRetryAt: jobRetryAt(request.processingFailures), processingFailures: { increment: 1 } } }); failures.push({ requestId: request.id, code: e instanceof WorkspaceAccessError ? e.code : "EXTERNAL_DELETION_FAILED" }); }
  return { completed, failures };
}
