import { Prisma } from "@prisma/client";
import { serializableTransaction } from "@/modules/workspaces/application/transaction";

/** No policy configured means no deletion. Receipts, hashes and financial facts stay. */
export async function retainWebhookReceipts(now = new Date(), policy = process.env.WEBHOOK_PAYLOAD_RETENTION_DAYS) {
  if (!policy) return { enabled: false, purgedPayloads: 0, hasMore: false };
  if (!/^\d+$/.test(policy) || Number(policy) < 30 || Number(policy) > 3650) throw new Error("INVALID_WEBHOOK_RETENTION_POLICY");
  const cutoff = new Date(now.getTime() - Number(policy) * 86400000);
  return serializableTransaction(async tx => {
    const rows = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT e.id FROM "PaymentWebhookEvent" e
      WHERE e."processingStatus"='PROCESSED' AND e."processedAt"<${cutoff}
        AND e."gymWorkspaceId" IS NULL AND e."payloadEncrypted" IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM "DeliveryOutbox" d WHERE d."webhookId"=e.id AND d.status NOT IN ('SENT','SKIPPED'))
      ORDER BY e."processedAt",e.id LIMIT 100 FOR UPDATE OF e SKIP LOCKED
    `);
    if (rows.length) {
      await tx.paymentWebhookEvent.updateMany({ where: { id: { in: rows.map(row => row.id) } }, data: { payloadEncrypted: null } });
      await tx.auditLog.create({ data: { action: "WEBHOOK_PAYLOAD_RETENTION_APPLIED", entity: "SYSTEM_JOB", entityId: "webhook-retention", metadata: { retainedDays: Number(policy), purgedPayloads: rows.length, cutoff: cutoff.toISOString(), receiptsPreserved: true } } });
    }
    return { enabled: true, purgedPayloads: rows.length, hasMore: rows.length === 100 };
  });
}
