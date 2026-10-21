const fs = require('node:fs');
const assert = require('node:assert/strict');
const { randomUUID, createHash } = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { Client } = require('pg');

const database = `atlasfit_tenant_deploy_${randomUUID().replaceAll('-', '')}`;
const url = `postgresql://atlasfit_test@127.0.0.1:56432/${database}`;
const admin = new Client({ connectionString: 'postgresql://atlasfit_test@127.0.0.1:56432/postgres' });
const client = new Client({ connectionString: url });
const allowed = ['PATH', 'Path', 'SystemRoot', 'WINDIR', 'TEMP', 'TMP', 'COMSPEC', 'PATHEXT', 'USERPROFILE', 'LOCALAPPDATA', 'APPDATA'];
const env = Object.fromEntries(allowed.filter(key => process.env[key]).map(key => [key, process.env[key]]));
env.DATABASE_URL = url;
const report = { startedAt: new Date().toISOString(), disposableDatabase: database, configuredDatabaseChanged: false, checks: [] };
const migrationFile = 'prisma/baseline-migrations/20261009000000_gym_tenant_relations/migration.sql';
report.migration = { file: migrationFile, sha256: createHash('sha256').update(fs.readFileSync(migrationFile)).digest('hex') };

(async () => {
 try {
  await admin.connect(); await admin.query(`CREATE DATABASE "${database}" OWNER atlasfit_test`);
  for (const [label, args] of [
   ['fresh', ['migrate', 'deploy']],
   ['repeat', ['migrate', 'deploy']],
   ['status', ['migrate', 'status']],
   ['schema', ['migrate', 'diff', '--from-config-datasource', '--to-schema', 'prisma/schema.prisma', '--exit-code']],
  ]) {
   const result = spawnSync(process.execPath, ['node_modules/prisma/build/index.js', ...args, '--config', 'prisma.baseline.config.ts'], { env, encoding: 'utf8', windowsHide: true });
   report.checks.push({ label, exitCode: result.status, output: result.stdout + result.stderr });
   assert.equal(result.status, 0, `${label} failed`);
  }
  await client.connect();
  const applied = await client.query('SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL ORDER BY migration_name');
  report.appliedMigrations = applied.rows.map(row => row.migration_name);
  assert.deepEqual(report.appliedMigrations, ['0_atlasfit_20261007', '20261009000000_gym_tenant_relations', '20261009100000_notification_delivery', '20261009200000_gym_reference_identity', '20261009210000_bounded_queries', '20261009220000_gym_retention_hold', '20261009230000_gym_scheduled_purge', '20261012170000_affiliated_personal_agenda']);
  for (const [kind, query, count] of [
   ['relationTriggers', "SELECT count(*)::int AS count FROM pg_trigger WHERE tgname LIKE 'gym_scope_%' AND NOT tgisinternal", 35],
   ['immutableTenantTriggers', "SELECT count(*)::int AS count FROM pg_trigger WHERE tgname='gym_workspace_immutable' AND NOT tgisinternal", 48],
   ['inheritedTenantTriggers', "SELECT count(*)::int AS count FROM pg_trigger WHERE tgname='gym_parent_scope_immutable' AND NOT tgisinternal", 3],
   ['identityTriggers', "SELECT count(*)::int AS count FROM pg_trigger WHERE tgname='gym_identity' AND NOT tgisinternal", 3],
   ['invoiceItemScopeTriggers', "SELECT count(*)::int AS count FROM pg_trigger WHERE tgname='gym_invoice_item_scope' AND NOT tgisinternal", 1],
   ['historicalReferenceTriggers', "SELECT count(*)::int AS count FROM pg_trigger WHERE tgname='gym_reference_parent_immutable' AND NOT tgisinternal", 7],
   ['memberIdentityTriggers', "SELECT count(*)::int AS count FROM pg_trigger WHERE tgname='gym_member_identity_immutable' AND NOT tgisinternal", 1],
   ['deletionGuards', "SELECT count(*)::int AS count FROM pg_trigger WHERE tgname='gym_workspace_delete_guard' AND NOT tgisinternal", 1],
   ['closureWriteGuards', "SELECT count(*)::int AS count FROM pg_trigger WHERE tgname='gym_closed_write_guard' AND NOT tgisinternal", 94],
   ['closureImmutability', "SELECT count(*)::int AS count FROM pg_trigger WHERE tgname='gym_closure_immutable' AND NOT tgisinternal", 1],
   ['boundedQueryIndexes', "SELECT count(*)::int AS count FROM pg_class WHERE relkind='i' AND relname IN ('GymEnrollmentEvent_state_history_idx','GymPlan_catalog_idx','GymEnrollment_contract_history_idx','PaymentWebhookEvent_retention_idx')", 4],
  ]) {
   report[kind] = (await client.query(query)).rows[0].count; assert.equal(report[kind], count);
  }
  report.success = true;
 } finally { await client.end(); await admin.end(); }
})().catch(error => { report.success = false; report.failure = error.message; process.exitCode = 1; }).finally(() => {
 report.finishedAt = new Date().toISOString();
 fs.writeFileSync('docs/audits/academias/estabilizacao/verificacoes-tenant-deploy.json', JSON.stringify(report, null, 2) + '\n');
 console.log(JSON.stringify({ success: report.success, checks: report.checks.map(({ label, exitCode }) => ({ label, exitCode })), failure: report.failure }));
});
