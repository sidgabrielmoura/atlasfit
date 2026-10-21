import { jobRetryAt } from "@/lib/job-retry";
import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { storageService, StorageConfigurationError } from "@/lib/storage.service";
import { decryptSubAccountApiKey } from "@/modules/payments/providers/asaas/subaccount-crypto";
import { serializableTransaction, type GymTransactionClient } from "./transaction";
import { assertSuperadmin } from "./gym-provisioning";
import { gymAttachmentKeys } from "./gym-storage";
import { WorkspaceAccessError } from "../domain/types";

export const gymPurgeSchema = z.object({ requestKey: z.string().uuid(), confirmationSlug: z.string().trim().min(1).max(100) }).strict();
const fingerprint = (workspaceId: string, input: z.infer<typeof gymPurgeSchema>) => createHash("sha256").update(JSON.stringify([workspaceId,input])).digest("hex");
const leaseMs = 120_000;

async function closedGym(tx: GymTransactionClient, workspaceId: string) {
  const workspace = await tx.workspace.findUnique({ where: { id: workspaceId }, select: { id: true, type: true, slug: true, closedAt: true, purgeAfter: true, isActive: true } });
  if (!workspace || workspace.type !== "GYM") throw new WorkspaceAccessError(404, "WORKSPACE_NOT_FOUND", "Academia não encontrada.");
  if (!workspace.closedAt || workspace.isActive) throw new WorkspaceAccessError(409, "GYM_CLOSURE_REQUIRED", "Encerre a academia antes de purgar seus dados. Suspensão não é encerramento.");
  return workspace;
}

export function previewGymPurge(workspaceId: string, adminUserId: string) {
  return serializableTransaction(async tx => {
    await assertSuperadmin(tx, adminUserId);
    const workspace = await tx.workspace.findUnique({ where: { id: workspaceId }, select: { type: true, slug: true, closedAt: true, purgeAfter: true, isActive: true } });
    if (!workspace || workspace.type !== "GYM") throw new WorkspaceAccessError(404, "WORKSPACE_NOT_FOUND", "Academia não encontrada.");
    const job = await tx.gymPurgeJob.findUnique({ where: { workspaceId }, select: { status: true, mode: true, attempts: true, nextAttemptAt: true, lastErrorCode: true } });
    return { canPurge: Boolean(workspace.closedAt && !workspace.isActive), confirmationSlug: workspace.slug, closedAt: workspace.closedAt, purgeAfter: workspace.purgeAfter, job };
  });
}

/** Authorization and confirmation are checked before queuing any irreversible work. */
export async function requestGymPurge(workspaceId: string, raw: unknown, adminUserId: string) {
  const parsed = gymPurgeSchema.safeParse(raw);
  if (!parsed.success) throw new WorkspaceAccessError(400, "INVALID_REQUEST", "Confirme o identificador da academia e a chave da solicitação.");
  const input = parsed.data, digest = fingerprint(workspaceId,input);
  return serializableTransaction(async tx => {
    await assertSuperadmin(tx, adminUserId);
    const receipt = await tx.gymPurgeReceipt.findUnique({ where: { requestKey: input.requestKey } });
    if (receipt) {
      if (receipt.fingerprint !== digest) throw new WorkspaceAccessError(409,"IDEMPOTENCY_CONFLICT","Solicitação já usada para outra purga.");
      return { status: "COMPLETED" as const, receipt };
    }
    await tx.$queryRaw`SELECT id FROM "Workspace" WHERE id=${workspaceId} FOR UPDATE`;
    const workspace = await closedGym(tx, workspaceId);
    if (workspace.slug !== input.confirmationSlug) throw new WorkspaceAccessError(409, "CONFIGURATION_CONFLICT", "Confirme o identificador atual da academia.");
    const job = await tx.gymPurgeJob.findUnique({ where: { workspaceId } });
    if (!job) throw new WorkspaceAccessError(409, "PURGE_SCHEDULE_MISSING", "Agenda de purga ausente. Confira a implantação da política.");
    if (job.mode === "IMMEDIATE") {
      if (job.requestKey !== input.requestKey || job.fingerprint !== digest) throw new WorkspaceAccessError(409, "IDEMPOTENCY_CONFLICT", "Purga já solicitada; acompanhe a tentativa registrada.");
      return { status: "QUEUED" as const, requestKey: job.requestKey };
    }
    await tx.gymPurgeJob.update({ where: { workspaceId }, data: { mode: "IMMEDIATE", requestKey: input.requestKey, fingerprint: digest, nextAttemptAt: new Date(), lastErrorCode: null } });
    return { status: "QUEUED" as const, requestKey: input.requestKey };
  });
}

function payloadWorkspace(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const p = payload as { workspaceId?: unknown; guard?: { workspaceId?: unknown }; data?: { workspaceId?: unknown }; channelName?: unknown };
  const candidate = p.workspaceId ?? p.guard?.workspaceId ?? p.data?.workspaceId;
  if (typeof candidate === "string") return candidate;
  return typeof p.channelName === "string" && p.channelName.startsWith("workspace:") ? p.channelName.slice(10) : null;
}

/** Backfill retained legacy encrypted payloads in bounded pages before claiming erasure. */
async function scanLegacyDeliveries(tx: GymTransactionClient, workspaceId: string, token: string) {
  const job = await tx.gymPurgeJob.findUniqueOrThrow({ where: { workspaceId } });
  if (job.leaseToken !== token || job.status !== "PROCESSING") return false;
  if (job.legacyScanComplete) return true;
  await tx.$queryRaw`SELECT set_config('atlasfit.gym_purge_scope',${workspaceId},TRUE)`;
  const rows = await tx.deliveryOutbox.findMany({ where: { workspaceId: null, payloadEncrypted: { not: null }, ...(job.legacyScanCursor ? { id: { gt: job.legacyScanCursor } } : {}) }, orderBy: { id: "asc" }, take: 100, select: { id: true, payloadEncrypted: true } });
  for (const row of rows) {
    const payload = JSON.parse(decryptSubAccountApiKey(row.payloadEncrypted!)) as { guard?: { kind?: string; tokenHash?: string } };
    let scope = payloadWorkspace(payload);
    if (!scope && payload.guard?.kind === "GYM_STUDENT_INVITE" && payload.guard.tokenHash) scope = (await tx.verificationToken.findUnique({ where: { token: payload.guard.tokenHash }, select: { workspaceId: true } }))?.workspaceId ?? null;
    if (scope === workspaceId) await tx.deliveryOutbox.update({ where: { id: row.id }, data: { workspaceId, status: "SKIPPED", payloadEncrypted: null, leaseToken: null, leaseExpiresAt: null } });
  }
  await tx.gymPurgeJob.update({ where: { workspaceId }, data: { legacyScanCursor: rows.at(-1)?.id ?? job.legacyScanCursor, legacyScanComplete: rows.length < 100 } });
  return rows.length < 100;
}

async function validateStorageReferences(workspaceId: string) {
  const rows=await prisma.$queryRaw<{key:string|null;url:string|null}[]>`SELECT "objectKey" AS key,url FROM "StudentFile" WHERE "workspaceId"=${workspaceId} AND type='file'
    UNION ALL SELECT "objectKey","photoUrl" FROM "StudentProgressPhoto" WHERE "workspaceId"=${workspaceId}
    UNION ALL SELECT "storageKey","videoUrl" FROM "TrainerVideo" WHERE "workspaceId"=${workspaceId} AND ("sourceType"='UPLOAD' OR "storageKey" IS NOT NULL)
    UNION ALL SELECT f."objectKey",f.url FROM "LeadFile" f JOIN "Lead" l ON l.id=f."leadId" WHERE l."workspaceId"=${workspaceId}
    UNION ALL SELECT "logoKey","logoUrl" FROM "Workspace" WHERE id=${workspaceId}
    UNION ALL SELECT "watermarkKey","watermarkUrl" FROM "Workspace" WHERE id=${workspaceId}
    UNION ALL SELECT "workoutCoverKey","workoutCoverUrl" FROM "Workspace" WHERE id=${workspaceId}
    UNION ALL SELECT s."storageKey",NULL FROM "ImportSource" s JOIN "ImportJob" j ON j.id=s."importJobId" WHERE j."workspaceId"=${workspaceId}`;
  const prefix=`workspace/${workspaceId}/`;
  for(const row of rows) {
    const keys=[...(row.key?[row.key]:[]),...gymAttachmentKeys(row.url)];
    if(keys.some(key=>!key.startsWith(prefix)))throw new WorkspaceAccessError(409,"TENANT_MISMATCH","Há arquivos históricos fora do prefixo da academia; confira o vínculo antes de purgar.");
    if(!keys.length&&row.url&&!row.url.startsWith("data:"))throw new WorkspaceAccessError(409,"STORAGE_RECONCILIATION_REQUIRED","Arquivo histórico sem chave de armazenamento conferida.");
  }
  const messages=await prisma.message.findMany({where:{conversation:{workspaceId}},select:{attachment:true}});
  if(messages.some(row=>gymAttachmentKeys(row.attachment).some(key=>!key.startsWith(prefix))))throw new WorkspaceAccessError(409,"TENANT_MISMATCH","Anexo histórico vinculado fora do prefixo da academia.");
}

export async function processGymPurge(workspaceId: string, now = new Date()) {
  const token = randomUUID();
  const job = await serializableTransaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "Workspace" WHERE id=${workspaceId} FOR UPDATE`;
    const row = await tx.gymPurgeJob.findUnique({ where: { workspaceId } });
    if (!row || row.nextAttemptAt > now || (row.status === "PROCESSING" && row.leaseExpiresAt && row.leaseExpiresAt > now)) return null;
    const workspace = await closedGym(tx, workspaceId);
    // Presigned GYM PUTs live 10 minutes. Wait out reservations before removing the prefix.
    // @updatedAt is written by Prisma in UTC, including older installations whose
    // database-default createdAt was recorded in the server's local timezone.
    const latestUpload = await tx.gymStorageObject.findFirst({ where: { workspaceId }, orderBy: { updatedAt: "desc" }, select: { createdAt: true, updatedAt: true } });
    const safeAfter = latestUpload ? new Date(Math.max(latestUpload.createdAt.getTime(), latestUpload.updatedAt.getTime()) + 15 * 60_000) : now;
    if (safeAfter > now) {
      await tx.gymPurgeJob.update({ where: { workspaceId }, data: { nextAttemptAt: safeAfter, lastErrorCode: "UPLOAD_EXPIRY_PENDING" } });
      return null;
    }
    return tx.gymPurgeJob.update({ where: { workspaceId }, data: { status: "PROCESSING", leaseToken: token, leaseExpiresAt: new Date(Date.now() + leaseMs), attempts: { increment: 1 }, lastErrorCode: null } });
  });
  if (!job) return { status: "NOT_CLAIMED" as const };
  try {
    const scanned = await serializableTransaction(tx => scanLegacyDeliveries(tx,workspaceId,token));
    if (!scanned) {
      await release(workspaceId,token,now,"QUEUED","LEGACY_SCAN_PENDING");
      return { status: "PENDING" as const };
    }
    await validateStorageReferences(workspaceId);
    const page = await storageService.listWorkspaceObjects(workspaceId);
    const prefix = `workspace/${workspaceId}/`;
    if (page.keys.some(key=>!key.startsWith(prefix)||key.split("/").some(part=>!part||part==="."||part==="..")||/[\\\x00-\x1f%?#]/.test(key))) throw new WorkspaceAccessError(409,"TENANT_MISMATCH","Armazenamento retornou objeto fora do escopo da academia.");
    for (const key of page.keys) await storageService.deleteObject(key);
    // Listing must actually confirm absence; DB deletion alone cannot purge files.
    const remaining = await storageService.listWorkspaceObjects(workspaceId);
    if (remaining.keys.length || remaining.hasMore || page.hasMore) {
      await release(workspaceId,token,now,"QUEUED","STORAGE_BATCH_PENDING");
      return { status: "PENDING" as const };
    }
    return serializableTransaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "Workspace" WHERE id=${workspaceId} FOR UPDATE`;
      const current = await tx.gymPurgeJob.findUnique({ where: { workspaceId } });
      if (!current || current.leaseToken !== token || current.leaseExpiresAt! <= new Date()) return { status: "LEASE_REPLACED" as const };
      await tx.gymPurgeJob.update({ where: { workspaceId }, data: { storageCompletedAt: new Date() } });
      const result = await tx.$queryRaw<{ deleted_rows: number; deleted_exclusive_users: number }[]>`SELECT * FROM atlasfit_purge_gym_records(${workspaceId},${token})`;
      const receipt = await tx.gymPurgeReceipt.create({ data: { requestKey: current.requestKey, fingerprint: current.fingerprint, deletedRows: result[0].deleted_rows, deletedExclusiveUsers: result[0].deleted_exclusive_users, completedAt:new Date() } });
      return { status: "COMPLETED" as const, receipt };
    });
  } catch (error) {
    const code = error instanceof StorageConfigurationError ? "STORAGE_NOT_CONFIGURED" : error instanceof WorkspaceAccessError ? error.code : "PURGE_RETRY_REQUIRED";
    await release(workspaceId,token,now,"RETRY",code,job.attempts);
    return { status: "RETRY" as const, code };
  }
}

async function release(workspaceId: string, token: string, now: Date, status: string, code: string, attempts = 0) {
  await prisma.gymPurgeJob.updateMany({ where: { workspaceId, leaseToken: token }, data: { status, lastErrorCode: code, nextAttemptAt: status === "RETRY" ? jobRetryAt(attempts, now, 5 * 60_000) : new Date(now.getTime()+60_000), leaseToken: null, leaseExpiresAt: null } });
}

export async function processGymPurgeBatch(now = new Date(), limit = 10) {
  if (!Number.isInteger(limit)||limit<1||limit>50) throw new Error("Invalid purge batch limit");
  const jobs = await prisma.gymPurgeJob.findMany({ where: { status: { in: ["QUEUED", "RETRY", "PROCESSING"] }, nextAttemptAt: { lte: now }, OR: [{ leaseExpiresAt: null }, { leaseExpiresAt: { lte: now } }] }, orderBy: [{ nextAttemptAt: "asc" },{ workspaceId: "asc" }], take: limit, select: { workspaceId: true } });
  const results = [];
  for (const job of jobs) results.push(await processGymPurge(job.workspaceId,now));
  const overdue = await prisma.gymPurgeJob.count({ where: { workspace: { purgeAfter: { lte: now } } } });
  return { results, hasMore: jobs.length===limit, overdue, success: !overdue&&!results.some(row=>row.status==="RETRY") };
}
