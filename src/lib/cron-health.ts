import prisma from "@/lib/prisma";
import type { GymTransactionClient } from "@/modules/workspaces/application/transaction";

export const scheduledJobs = { "gym-recurrence": 30, "process-recurrence": 120, deliveries: 10, "engage-push": 30, "gym-purge": 15 } as const;
export async function recordCronResult(job: keyof typeof scheduledJobs, success: boolean, durationMs: number) {
  const now = new Date();
  await prisma.scheduledJobState.upsert({ where: { id: job }, create: { id: job, success, durationMs, lastRunAt: now, lastSuccessAt: success ? now : null, consecutiveFailures: success ? 0 : 1 }, update: { success, durationMs, lastRunAt: now, ...(success ? { lastSuccessAt: now, consecutiveFailures: 0 } : { consecutiveFailures: { increment: 1 } }) } });
}
export async function recordCronFailure(job: keyof typeof scheduledJobs) {
  try { await recordCronResult(job, false, 0); }
  catch { console.error("[CRON_MONITORING]", { job, code: "RECEIPT_UNAVAILABLE" }); }
}

export async function getDeliveryHealth(tx: GymTransactionClient, now = new Date()) {
  const jobs = [];
  const states = await tx.scheduledJobState.findMany();
  for (const [id, minutes] of Object.entries(scheduledJobs)) {
    const latest = states.find(state => state.id === id);
    jobs.push({ id, lastRunAt: latest?.lastRunAt.toISOString() || null, status: !latest ? "NEVER_OBSERVED" : !latest.success ? "FAILED" : now.getTime() - latest.lastRunAt.getTime() > minutes * 60000 ? "STALE" : "HEALTHY" });
  }
  const backlog = await tx.deliveryOutbox.groupBy({ by: ["channel", "status"], where: { channel: { not: "NOTIFICATION" }, status: { in: ["QUEUED", "RETRY", "PROCESSING", "REVIEW_REQUIRED"] } }, _count: true, _min: { createdAt: true } });
  const ready = await tx.deliveryOutbox.count({ where: { status: { in: ["QUEUED", "RETRY", "PROCESSING"] }, nextAttemptAt: { lte: now }, OR: [{ leaseExpiresAt: null }, { leaseExpiresAt: { lte: now } }] } });
  return { asOf: now.toISOString(), jobs, ready, backlog: backlog.map(row => ({ channel: row.channel, status: row.status, count: row._count, oldestAt: row._min.createdAt?.toISOString() || null })), healthy: jobs.every(job => job.status === "HEALTHY") && !backlog.some(row => row.status === "REVIEW_REQUIRED") };
}
