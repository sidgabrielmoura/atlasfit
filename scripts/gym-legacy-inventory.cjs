const fs = require('node:fs');
const { createHash } = require('node:crypto');
const { Client } = require('pg');
const configured = require('dotenv').parse(fs.readFileSync('.env'));
const folder = 'docs/audits/academias/estabilizacao';
const url = new URL(configured.DATABASE_URL);
const result = { startedAt: new Date().toISOString(), authorization: 'Usuário autorizou serviços reais em 07/10/2026.', readOnly: true, targetFingerprint: createHash('sha256').update(url.hostname + url.port + url.pathname).digest('hex'), localHost: ['localhost', '127.0.0.1'].includes(url.hostname), asaasEnvironment: configured.ASAAS_ENVIRONMENT === 'production' ? 'PRODUCTION' : 'SANDBOX', metadata: {}, inventory: {}, limitations: ['Somente contagens agregadas; não escolhe contratos, não altera dados e não confere documentos externos.'] };
const client = new Client({ connectionString: configured.DATABASE_URL, connectionTimeoutMillis: 10_000, query_timeout: 15_000 });
const counts = {
  duplicateLiveEnrollments: ['GymEnrollment', `SELECT count(*)::text AS count FROM (SELECT 1 FROM "GymEnrollment" WHERE status IN ('ACTIVE','PAUSED') GROUP BY "workspaceId","studentMemberId" HAVING count(*) > 1) AS groups`],
  legacyExternalEnrollments: ['GymEnrollment', `SELECT count(*)::text AS count FROM "GymEnrollment" WHERE "providerSubscriptionId" IS NOT NULL`],
  gymInvoices: ['GymInvoice', `SELECT count(*)::text AS count FROM "GymInvoice"`],
  billingMissingObligationLinks: ['StudentBilling', `SELECT count(*)::text AS count FROM "StudentBilling" WHERE "workspacePaymentId" IS NULL`],
  billingWithoutWorkspace: ['StudentBilling', `SELECT count(*)::text AS count FROM "StudentBilling" WHERE "workspaceId" IS NULL`],
  gymProviderAccounts: ['PaymentProviderAccount', `SELECT count(*)::text AS count FROM "PaymentProviderAccount" AS a JOIN "Workspace" AS w ON w.id=a."workspaceId" WHERE w.type='GYM'`],
  stalledWebhooks: ['PaymentWebhookEvent', `SELECT count(*)::text AS count FROM "PaymentWebhookEvent" WHERE "processingStatus"='PROCESSING'`],
  webhookReviewBacklog: ['PaymentWebhookEvent', `SELECT count(*)::text AS count FROM "PaymentWebhookEvent" WHERE "processingStatus"='REVIEW_REQUIRED'`],
};
(async () => {
  try {
    await client.connect(); await client.query('BEGIN READ ONLY'); await client.query("SET LOCAL statement_timeout = '10s'");
    const tables = await client.query(`SELECT table_name,column_name FROM information_schema.columns WHERE table_schema='public'`);
    const columns = new Map();
    for (const row of tables.rows) { if (!columns.has(row.table_name)) columns.set(row.table_name, new Set()); columns.get(row.table_name).add(row.column_name); }
    result.metadata.tables = columns.size;
    result.metadata.hasMigrationHistory = columns.has('_prisma_migrations');
    result.metadata.hasOutbox = columns.has('DeliveryOutbox');
    for (const [name, [table, sql]] of Object.entries(counts)) {
      if (!columns.has(table) || name === 'billingMissingObligationLinks' && !columns.get(table).has('workspacePaymentId')) { result.inventory[name] = { status: 'SCHEMA_NOT_AVAILABLE' }; continue; }
      try { await client.query('SAVEPOINT inventory_item'); const query = await client.query(sql); result.inventory[name] = { status: 'READ', count: query.rows[0].count }; await client.query('RELEASE SAVEPOINT inventory_item'); }
      catch (error) { await client.query('ROLLBACK TO SAVEPOINT inventory_item'); result.inventory[name] = { status: 'QUERY_UNAVAILABLE', code: /^[A-Z0-9]{5}$/.test(error.code || '') ? error.code : 'QUERY_FAILED' }; }
    }
    await client.query('ROLLBACK'); result.success = true;
  } catch (error) { result.success = false; result.errorCode = /^[A-Z0-9_]+$/.test(error.code || '') ? error.code : 'INVENTORY_UNAVAILABLE'; process.exitCode = 1; }
  finally { await client.end(); result.finishedAt = new Date().toISOString(); fs.writeFileSync(`${folder}/inventario-legado-real.json`, JSON.stringify(result, null, 2) + '\n'); console.log(JSON.stringify(result)); }
})();
