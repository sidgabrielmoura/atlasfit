import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { personalStorageQuerySchema, type PersonalStoragePagination, type PersonalStorageSummary } from "@/modules/workspaces/domain/personal-storage";
import type { PersonalStorageMetric } from "./storage-quota.service";

type Result = { personalsMetrics: PersonalStorageMetric[]; summary: PersonalStorageSummary; pagination: PersonalStoragePagination };

export function personalStorageDashboardQuery(input: unknown) {
  const query = personalStorageQuerySchema.parse(input);
  // Every interpolated value is bound by Prisma. Search uses literal substring
  // matching, so percent/underscore and quotes never become SQL operators.
  return Prisma.sql`
    WITH eligible AS (
      SELECT u.id AS "userId", COALESCE(NULLIF(u.name, ''), 'Personal Trainer') AS name,
        COALESCE(NULLIF(u.email, ''), 'Sem e-mail') AS email, u."isTestAccount",
        COALESCE(ft."isActive", false) AS "isFreeTrial",
        COALESCE(NULLIF(p.name, ''), CASE WHEN ft."isActive" THEN 'Período de Teste (Trial)' WHEN u."isTestAccount" THEN 'Conta Teste' ELSE 'Sem Plano' END) AS "planName",
        COALESCE(p."storageLimitMb", 1024) AS "storageLimitMb"
      FROM "User" u LEFT JOIN "Subscription" s ON s."userId" = u.id
      LEFT JOIN "Plan" p ON p.id = s."planId" LEFT JOIN "FreeTrial" ft ON ft."userId" = u.id
      WHERE u.role <> 'STUDENT' AND (u.role IN ('TRAINER', 'USER') OR u."isTestAccount" OR EXISTS (SELECT 1 FROM "WorkspaceMember" wm WHERE wm."userId" = u.id))
    ), workspace_usage AS (
      SELECT "workspaceId", SUM(bytes) AS bytes, SUM(files) AS files FROM (
        SELECT f."workspaceId", COALESCE(SUM(f.size), 0) AS bytes, COUNT(*) AS files FROM "StudentFile" f
        JOIN "Workspace" w ON w.id = f."workspaceId" AND w.type = 'PERSONAL' GROUP BY f."workspaceId"
        UNION ALL
        SELECT f."workspaceId", COALESCE(SUM(f.size), 0) AS bytes, COUNT(*) AS files FROM "StudentProgressPhoto" f
        JOIN "Workspace" w ON w.id = f."workspaceId" AND w.type = 'PERSONAL' GROUP BY f."workspaceId"
      ) usage GROUP BY "workspaceId"
    ), user_usage AS (
      SELECT wm."userId", COUNT(*) AS workspaces, COALESCE(SUM(wu.bytes), 0) AS bytes, COALESCE(SUM(wu.files), 0) AS files
      FROM "WorkspaceMember" wm JOIN "Workspace" w ON w.id = wm."workspaceId" AND w.type = 'PERSONAL'
      LEFT JOIN workspace_usage wu ON wu."workspaceId" = w.id GROUP BY wm."userId"
    ), quantities AS (
      SELECT e.*, e."storageLimitMb" = 0 AS "isUnlimited", COALESCE(u.bytes, 0) AS "totalUsedBytes",
        COALESCE(u.files, 0) AS "totalFiles", COALESCE(u.workspaces, 0) AS "workspacesCount",
        ROUND(COALESCE(u.bytes, 0) / 1048576.0, 2) AS "totalUsedMb"
      FROM eligible e LEFT JOIN user_usage u ON u."userId" = e."userId"
    ), percentages AS (
      SELECT q.*, ROUND(q."totalUsedMb" / 1024.0, 3) AS "totalUsedGb",
        CASE WHEN q."storageLimitMb" > 0 THEN ROUND(q."totalUsedMb" / q."storageLimitMb" * 100, 1) ELSE 0 END AS "percentageUsed" FROM quantities q
    ), metrics AS (
      SELECT p.*, CASE WHEN p."isUnlimited" THEN 'NORMAL' WHEN p."percentageUsed" >= 100 THEN 'EXCEEDED' WHEN p."percentageUsed" >= 80 THEN 'WARNING' ELSE 'NORMAL' END AS status FROM percentages p
    ), filtered AS (
      SELECT * FROM metrics WHERE (${query.search} = '' OR STRPOS(LOWER(name), LOWER(${query.search})) > 0 OR STRPOS(LOWER(email), LOWER(${query.search})) > 0 OR STRPOS(LOWER("planName"), LOWER(${query.search})) > 0)
        AND (${query.status} = 'ALL' OR (${query.status} = 'TEST' AND ("isTestAccount" OR "isFreeTrial")) OR status = ${query.status})
    ), page AS (
      SELECT * FROM filtered ORDER BY LOWER(name), "userId" LIMIT ${query.pageSize} OFFSET ${(query.page - 1) * query.pageSize}
    ) SELECT JSONB_BUILD_OBJECT(
      'personalsMetrics', COALESCE((SELECT JSONB_AGG(TO_JSONB(page) ORDER BY LOWER(name), "userId") FROM page), '[]'::jsonb),
      'summary', (SELECT JSONB_BUILD_OBJECT('totalPersonals', COUNT(*), 'warningCount', COUNT(*) FILTER (WHERE status = 'WARNING'), 'exceededCount', COUNT(*) FILTER (WHERE status = 'EXCEEDED'), 'normalCount', COUNT(*) FILTER (WHERE status = 'NORMAL'), 'testCount', COUNT(*) FILTER (WHERE "isTestAccount" OR "isFreeTrial"), 'totalPersonalStorageMb', COALESCE(SUM("totalUsedMb"), 0)) FROM metrics),
      'pagination', JSONB_BUILD_OBJECT('page', ${query.page}::integer, 'pageSize', ${query.pageSize}::integer, 'total', (SELECT COUNT(*) FROM filtered), 'totalPages', GREATEST(1, CEIL((SELECT COUNT(*) FROM filtered) / ${query.pageSize}::numeric)))) AS result
  `;
}

export async function getPersonalStorageDashboard(input: unknown): Promise<Result> {
  const [row] = await prisma.$queryRaw<Array<{ result: Result }>>(personalStorageDashboardQuery(input));
  if (!row) throw new Error("Métricas de armazenamento indisponíveis.");
  const result = row.result;
  for (const metric of result.personalsMetrics) {
    for (const value of [metric.totalUsedBytes, metric.totalFiles, metric.workspacesCount, metric.storageLimitMb]) {
      if (!Number.isSafeInteger(value) || value < 0) throw new Error("Métrica de armazenamento fora do intervalo seguro.");
    }
  }
  if (Object.values(result.summary).some(value => !Number.isFinite(value) || value < 0) || !Number.isSafeInteger(result.pagination.total)) throw new Error("Resumo de armazenamento fora do intervalo seguro.");
  return result;
}
