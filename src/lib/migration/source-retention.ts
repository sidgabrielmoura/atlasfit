import prisma from "@/lib/prisma";
import { storageService } from "@/lib/storage.service";

/** Disabled until the business retention period is configured. Only terminal raw inputs. */
export async function retainImportSourcePayloads(now = new Date()) {
  const configured = process.env.IMPORT_SOURCE_RETENTION_DAYS;
  if (!configured) return { enabled: false, minimized: 0 };
  const days = Number(configured);
  if (!Number.isInteger(days) || days < 30 || days > 3650) throw new Error("Invalid IMPORT_SOURCE_RETENTION_DAYS");
  const cutoff = new Date(now.getTime() - days * 86400000);
  const minimized = await prisma.$executeRaw`
    WITH candidates AS (
      SELECT s.id FROM "ImportSource" s JOIN "ImportJob" j ON j.id=s."importJobId"
      JOIN "Workspace" w ON w.id=j."workspaceId"
      WHERE j.status IN ('CANCELLED','COMPLETED') AND j."updatedAt"<${cutoff}
        AND w.type='PERSONAL' AND s."textContent" IS NOT NULL
      ORDER BY j."updatedAt",s.id LIMIT 25 FOR UPDATE OF s,j SKIP LOCKED
    ) UPDATE "ImportSource" s SET "textContent"=NULL FROM candidates c WHERE s.id=c.id
  `;
  const objects = await prisma.importSource.findMany({ where: { storageKey: { not: null }, importJob: { status: { in: ["CANCELLED", "COMPLETED"] }, updatedAt: { lt: cutoff }, workspace: { type: "PERSONAL" } } }, take: 25, orderBy: { id: "asc" }, select: { id: true, importJobId: true, storageKey: true, importJob: { select: { workspaceId: true } } } });
  let deletedObjects = 0, failures = 0;
  for (const source of objects) {
    try {
      if (!source.storageKey?.startsWith(`workspace/${source.importJob.workspaceId}/imports/${source.importJobId}/`) || source.storageKey.includes("..")) throw new Error("SOURCE_SCOPE_MISMATCH");
      // Terminal jobs cannot re-enter processing. Keep the pointer until deletion is confirmed.
      await storageService.deleteObject(source.storageKey);
      const updated = await prisma.importSource.updateMany({ where: { id: source.id, storageKey: source.storageKey, importJob: { status: { in: ["CANCELLED", "COMPLETED"] }, updatedAt: { lt: cutoff } } }, data: { storageKey: null } });
      deletedObjects += updated.count;
    } catch { failures++; }
  }
  // Hashes, source metadata, commit results, AI usage and financial audit remain.
  return { enabled: true, minimized, deletedObjects, failures };
}
