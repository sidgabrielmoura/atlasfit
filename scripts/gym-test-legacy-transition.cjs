const fs = require('node:fs');
const { randomUUID, createHash } = require('node:crypto');
const { spawnSync } = require('node:child_process');
const assert = require('node:assert/strict');
const { Client } = require('pg');
const finalSchema = JSON.parse(fs.readFileSync('docs/audits/academias/estabilizacao/verificacoes-tenant-deploy.json','utf8'));
if (!finalSchema.success || !/^atlasfit_tenant_deploy_[a-f0-9]{32}$/.test(finalSchema.disposableDatabase)) throw Error('Verified disposable final schema required.');
const sourceUrl = 'postgresql://atlasfit_test@127.0.0.1:56432/' + finalSchema.disposableDatabase;
const targetName = 'atlasfit_gym_legacy_transition_' + randomUUID().replaceAll('-', '');
const targetUrl = `postgresql://atlasfit_test@127.0.0.1:56432/${targetName}`;
const source = new Client({ connectionString: sourceUrl });
const target = new Client({ connectionString: targetUrl });
const baseEnv = Object.fromEntries(['PATH', 'Path', 'SystemRoot', 'WINDIR', 'TEMP', 'TMP', 'COMSPEC', 'PATHEXT', 'USERPROFILE', 'LOCALAPPDATA', 'APPDATA'].filter(key => process.env[key]).map(key => [key, process.env[key]]));
function prisma(args) {
  const result = spawnSync(process.execPath, ['node_modules/prisma/build/index.js', ...args, '--config', 'prisma.baseline.config.ts'], { env: { ...baseEnv, DATABASE_URL: targetUrl }, encoding: 'utf8' });
  assert.equal(result.status, 0, (result.stdout + result.stderr).slice(0, 2000));
  return { exitCode: result.status, output: result.stdout + result.stderr };
}
(async () => {
  try {
    const draft = JSON.parse(fs.readFileSync('docs/audits/academias/estabilizacao/transicao-legado-preview.json'));
    assert.equal(draft.readOnlySource, true); assert.equal(draft.exitCode, 0); assert.equal(draft.schemaCopyExitCode, 0); assert.equal(draft.destructiveStatements.length, 0);
    for (const file of [draft.sql, draft.schemaOnly]) assert.equal(createHash('sha256').update(fs.readFileSync(file.file)).digest('hex'), file.sha256);
    await source.connect();
    const exists = await source.query('SELECT 1 FROM pg_database WHERE datname=$1', [targetName]);
    if (exists.rowCount) throw new Error('Disposable legacy copy already exists; preserve it. This rehearsal never resets a database.');
    await source.query(`CREATE DATABASE "${targetName}" OWNER atlasfit_test`);
    await target.connect();
    await target.query(fs.readFileSync(draft.schemaOnly.file, 'utf8'));
    const owner = randomUUID(), student = randomUUID(), account = randomUUID();
    await target.query(`INSERT INTO "User" (id,name,"updatedAt") VALUES ($1,'Titular sintético',now()),($2,'Aluno sintético',now())`, [owner, student]);
    await target.query(`INSERT INTO "PaymentProviderAccount" (id,"personalUserId",provider,environment,"providerAccountId","updatedAt") VALUES ($1,$2,'ASAAS','SANDBOX',$3,now())`, [account, owner, randomUUID()]);
    for (let index = 0; index < 7; index++) await target.query(`INSERT INTO "StudentBilling" (id,"providerAccountId","studentUserId","idempotencyKey","billingReference",title,"grossAmountInCents","personalNetEstimatedInCents","feeRuleVersionId","paymentMethod","dueDate","updatedAt") VALUES ($1,$2,$3,$4,$5,'Cobrança legada sintética',10000,9500,'synthetic','PIX',now(),now())`, [randomUUID(), account, student, randomUUID(), randomUUID()]);
    const before = await target.query(`SELECT id,"studentUserId","providerAccountId","grossAmountInCents"::text,"personalNetEstimatedInCents"::text,"workspaceId" FROM "StudentBilling" ORDER BY id`);
    await target.query('BEGIN');
    try {
      await target.query(fs.readFileSync(draft.sql.file, 'utf8'));
      const functions = await source.query(`SELECT p.proname AS name,pg_get_functiondef(p.oid) || ';' AS sql FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.prokind='f' AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.classid='pg_proc'::regclass AND d.objid=p.oid AND d.deptype='e') ORDER BY p.proname`);
      for (const row of functions.rows) await target.query(row.sql);
      const checks = await source.query(`SELECT c.conname AS name,t.relname AS table,format('ALTER TABLE %I.%I ADD CONSTRAINT %I %s;',n.nspname,t.relname,c.conname,pg_get_constraintdef(c.oid)) AS sql FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid JOIN pg_namespace n ON n.oid=t.relnamespace WHERE n.nspname='public' AND c.contype='c' ORDER BY t.relname,c.conname`);
      for (const row of checks.rows) {
        const found = await target.query(`SELECT 1 FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid WHERE c.conname=$1 AND t.relname=$2`, [row.name, row.table]);
        if (!found.rowCount) await target.query(row.sql);
      }
      const triggers = await source.query(`SELECT t.tgname AS name,c.relname AS table,pg_get_triggerdef(t.oid) || ';' AS sql FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND NOT t.tgisinternal ORDER BY c.relname,t.tgname`);
      for (const row of triggers.rows) {
        if (!(await target.query('SELECT 1 FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid WHERE t.tgname=$1 AND c.relname=$2 AND NOT t.tgisinternal', [row.name,row.table])).rowCount) await target.query(row.sql);
      }
      const indexes = await source.query(`SELECT c.relname AS name,pg_get_indexdef(i.indexrelid) || ';' AS sql FROM pg_index i JOIN pg_class c ON c.oid=i.indexrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND i.indpred IS NOT NULL ORDER BY c.relname`);
      for (const row of indexes.rows) {
        const existing = await target.query('SELECT pg_get_indexdef(oid) || \';\' AS sql FROM pg_class WHERE relname=$1 AND relkind=$2', [row.name, 'i']);
        if (existing.rowCount && existing.rows[0].sql !== row.sql) {
          // The schema-only Prisma export loses partial predicates. Rebuild only this disposable copy.
          await target.query(`DROP INDEX public."${row.name.replaceAll('"', '""')}"`);
        }
        if (!existing.rowCount || existing.rows[0].sql !== row.sql) await target.query(row.sql);
      }
      await target.query('COMMIT');
    } catch (error) { await target.query('ROLLBACK'); throw error; }
    const after = await target.query(`SELECT id,"studentUserId","providerAccountId","grossAmountInCents"::text,"personalNetEstimatedInCents"::text,"workspaceId" FROM "StudentBilling" ORDER BY id`);
    assert.deepEqual(after.rows, before.rows);
    assert.equal((await target.query('SELECT count(*)::text AS count FROM "StudentBilling" WHERE "workspacePaymentId" IS NULL')).rows[0].count, '7');
    const diff = prisma(['migrate', 'diff', '--from-config-datasource', '--to-schema', 'prisma/schema.prisma', '--exit-code']);
    const triggerQuery="SELECT c.relname AS table,t.tgname AS name,pg_get_triggerdef(t.oid) AS definition FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND NOT t.tgisinternal ORDER BY c.relname,t.tgname";
    const sourceTriggers=(await source.query(triggerQuery)).rows,targetTriggers=(await target.query(triggerQuery)).rows;
    assert.deepEqual(targetTriggers,sourceTriggers,'Final trigger inventory must match per table, including repeated trigger names.');
    const resolve=[];
    for(const name of finalSchema.appliedMigrations) resolve.push({name,...prisma(['migrate','resolve','--applied',name])});
    const history=JSON.parse(fs.readFileSync('docs/audits/academias/estabilizacao/inventario-financeiro-real.json','utf8')).migrationHistory;
    let copiedHistory=0;
    for(const row of history.filter(row=>row.finished&&!row.rolledBack)) {
      if (!(await target.query('SELECT 1 FROM "_prisma_migrations" WHERE migration_name=$1 AND finished_at IS NOT NULL',[row.name])).rowCount) {
        await target.query('INSERT INTO "_prisma_migrations" (id,checksum,finished_at,migration_name,started_at,applied_steps_count) VALUES ($1,$2,now(),$3,now(),1)',[randomUUID(),row.checksum,row.name]);copiedHistory++;
      }
    }
    const deploy = prisma(['migrate', 'deploy']);
    const status=prisma(['migrate','status']);

    const report = { completedAt: new Date().toISOString(), targetDisposableDatabase: targetName, configuredDatabaseChanged: false, sourceIncludedRealData: false, syntheticBillingsPreserved: 7, unresolvedLinksPreserved: 7, schemaDiff: diff, finalChainResolvedAfterSchemaAndTriggerMatch: resolve, deploy, status, copiedHistoricalMigrationNames: copiedHistory, finalTriggerCount: targetTriggers.length, finalTriggerDefinitionsMatch: true, limitations: ['No actual production data copied or migrated.', 'Historical migration names and checksums were copied without failure logs; this does not rehearse real data or unresolved historical failures.', 'Prisma schema-only export lost partial index predicates; those were restored in the disposable copy from verified definitions.'] };
    fs.writeFileSync('docs/audits/academias/estabilizacao/verificacoes-transicao-legado.json', JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify({ success: true, syntheticBillingsPreserved: 7, configuredDatabaseChanged: false }));
  } finally { await target.end(); await source.end(); }
})().catch(error => { console.error(JSON.stringify({ code: error.code || 'REHEARSAL_FAILED', message: error.message.slice(0, 1200) })); process.exitCode = 1; });
