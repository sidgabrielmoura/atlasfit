const fs = require('node:fs');
const { Client } = require('pg');
const { createHash } = require('node:crypto');
const configured = require('dotenv').parse(fs.readFileSync('.env'));
const db = new Client({ connectionString: configured.DATABASE_URL, connectionTimeoutMillis: 10000, query_timeout: 15000 });
const report = { startedAt: new Date().toISOString(), readOnly: true, configuredDatabaseChanged: false, externalCommands: 0, targetFingerprint: createHash('sha256').update(new URL(configured.DATABASE_URL).host + new URL(configured.DATABASE_URL).pathname).digest('hex'), checks: [] };
const queries = [
  ['gym-workspaces', `SELECT count(*)::text AS count FROM "Workspace" WHERE type='GYM'`],
  ['gym-enrollments', `SELECT e.status,count(*)::text AS count,sum(e."priceInCents")::text AS "priceInCents" FROM "GymEnrollment" e JOIN "Workspace" w ON w.id=e."workspaceId" WHERE w.type='GYM' GROUP BY e.status`],
  ['gym-invoices', `SELECT i.status,count(*)::text AS count,sum(i."totalInCents")::text AS "totalInCents",sum(i."paidAmountInCents")::text AS "paidInCents",sum(i."balanceRemainingInCents")::text AS "balanceInCents" FROM "GymInvoice" i JOIN "Workspace" w ON w.id=i."workspaceId" WHERE w.type='GYM' GROUP BY i.status`],
  ['gym-payments', `SELECT p.status,count(*)::text AS count,sum(p."amountInCents")::text AS "amountInCents" FROM "GymPayment" p JOIN "Workspace" w ON w.id=p."workspaceId" WHERE w.type='GYM' GROUP BY p.status`],
  ['gym-payments-without-account', `SELECT count(*)::text AS count FROM "GymPayment" p JOIN "Workspace" w ON w.id=p."workspaceId" WHERE w.type='GYM' AND p."financialAccountId" IS NULL`],
  ['gym-payments-without-allocation', `SELECT count(*)::text AS count FROM "GymPayment" p JOIN "Workspace" w ON w.id=p."workspaceId" WHERE w.type='GYM' AND NOT EXISTS(SELECT 1 FROM "GymPaymentAllocation" a WHERE a."paymentId"=p.id)`],
  ['gym-financial-accounts', `SELECT count(*)::text AS count,sum(a."balanceInCents")::text AS "balanceInCents" FROM "GymFinancialAccount" a JOIN "Workspace" w ON w.id=a."workspaceId" WHERE w.type='GYM'`],
  ['gym-expenses', `SELECT e.status,count(*)::text AS count,sum(e."amountInCents")::text AS "amountInCents" FROM "GymExpense" e JOIN "Workspace" w ON w.id=e."workspaceId" WHERE w.type='GYM' GROUP BY e.status`],
  ['gym-paid-expenses-without-payments', `SELECT count(*)::text AS count FROM "GymExpense" e JOIN "Workspace" w ON w.id=e."workspaceId" WHERE w.type='GYM' AND e.status='PAID' AND NOT EXISTS(SELECT 1 FROM "GymExpensePayment" p WHERE p."expenseId"=e.id)`],
  ['gym-external-enrollment-references', `SELECT count(*)::text AS count FROM "GymEnrollment" e JOIN "Workspace" w ON w.id=e."workspaceId" WHERE w.type='GYM' AND e."providerSubscriptionId" IS NOT NULL`],
  ['provider-account-credential-coverage', `SELECT provider,environment,count(*)::text AS count,count(*) FILTER(WHERE "providerApiKeyEncrypted" IS NOT NULL)::text AS "storedCredentials" FROM "PaymentProviderAccount" GROUP BY provider,environment`],
  ['billing-workspace-coverage', `SELECT status,CASE WHEN "workspaceId" IS NULL THEN 'UNRESOLVED' ELSE 'LINKED' END AS scope,count(*)::text AS count,sum("grossAmountInCents")::text AS "grossInCents" FROM "StudentBilling" GROUP BY status,scope`],
  ['subscription-coverage', `SELECT status,count(*)::text AS count,sum("amountInCentsSnapshot")::text AS "amountInCents" FROM "StudentSubscription" GROUP BY status`],
];
(async () => {
  try {
    await db.connect(); await db.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY'); await db.query("SET LOCAL statement_timeout='10s'");
    for (const [name, sql] of queries) {
      await db.query('SAVEPOINT inventory_check');
      try { report.checks.push({ name, status: 'READ', rows: (await db.query(sql)).rows }); }
      catch (error) { await db.query('ROLLBACK TO SAVEPOINT inventory_check'); report.checks.push({ name, status: 'SCHEMA_UNAVAILABLE', code: /^[A-Z0-9]{5}$/.test(error.code || '') ? error.code : 'QUERY_UNAVAILABLE' }); }
      await db.query('RELEASE SAVEPOINT inventory_check');
    }
    const exists = await db.query(`SELECT to_regclass('public._prisma_migrations') IS NOT NULL AS present`);
    report.migrationHistory = exists.rows[0].present ? (await db.query(`SELECT migration_name AS name,checksum,finished_at IS NOT NULL AS finished,rolled_back_at IS NOT NULL AS "rolledBack",logs IS NOT NULL AS "hasFailureLog" FROM "_prisma_migrations" ORDER BY migration_name`)).rows : [];
    for (const row of report.migrationHistory) {
      const file = `prisma/migrations/${row.name}/migration.sql`;
      row.localFilePresent = fs.existsSync(file);
      row.localChecksumMatches = row.localFilePresent ? createHash('sha256').update(fs.readFileSync(file)).digest('hex') === row.checksum : null;
    }
    await db.query('ROLLBACK'); report.success = true;
  } finally { await db.end(); }
})().catch(error => { report.success = false; report.errorCode = /^[A-Z0-9_]+$/.test(error.code || '') ? error.code : 'INVENTORY_FAILED'; process.exitCode = 1; }).finally(() => {
  report.finishedAt = new Date().toISOString();
  report.limitations = ['Inventário interno não comprova liquidação externa nem representação ou titularidade documental.', 'Schema indisponível não significa ausência de registros.', 'Não consulta Asaas nem altera vínculos, valores ou histórico de migrations.'];
  const file = 'docs/audits/academias/estabilizacao/inventario-financeiro-real.json';
  fs.writeFileSync(file, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ file, success: report.success, read: report.checks.filter(row => row.status === 'READ').length, unavailable: report.checks.filter(row => row.status !== 'READ').length, historicalMigrations: report.migrationHistory?.length }));
});
