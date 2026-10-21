const fs = require('node:fs');
const { spawnSync } = require('node:child_process');
const { Client } = require('pg');
const { createHash } = require('node:crypto');
const folder = 'prisma/baseline-migrations/0_atlasfit_20261007';
const sourceUrl = 'postgresql://atlasfit_test@127.0.0.1:56432/atlasfit_gym_stabilization_20261001';
const targetUrl = 'postgresql://atlasfit_test@127.0.0.1:56432/atlasfit_gym_baseline_20261007';
const source = new Client({ connectionString: sourceUrl });
const allowed = ['PATH', 'Path', 'SystemRoot', 'WINDIR', 'TEMP', 'TMP', 'COMSPEC', 'PATHEXT', 'USERPROFILE', 'LOCALAPPDATA', 'APPDATA'];
const baseEnv = Object.fromEntries(allowed.filter(key => process.env[key]).map(key => [key, process.env[key]]));
function prisma(args, url, accepted = [0]) {
  const result = spawnSync(process.execPath, ['node_modules/prisma/build/index.js', ...args, '--config', 'prisma.baseline.config.ts'], { env: { ...baseEnv, DATABASE_URL: url }, encoding: 'utf8' });
  if (!accepted.includes(result.status)) throw new Error(`Prisma ${args[0]} failed: ${(result.stdout + result.stderr).slice(0, 4000)}`);
  return { exitCode: result.status, output: result.stdout + result.stderr };
}
(async () => {
  try {
    await source.connect();
    const exists = await source.query('SELECT 1 FROM pg_database WHERE datname=$1', ['atlasfit_gym_baseline_20261007']);
    let recoverEmptyFailure = false;
    if (exists.rowCount) {
      const target = new Client({ connectionString: targetUrl });
      try {
        await target.connect();
        const tables = await target.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name <> '_prisma_migrations'`);
        if (tables.rowCount !== 0) throw new Error('Baseline target contains tables. Preserve it; regeneration is refused.');
        const failures = await target.query(`SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NULL AND rolled_back_at IS NULL`);
        if (failures.rowCount !== 1 || failures.rows[0].migration_name !== '0_atlasfit_20261007') throw new Error('Existing baseline history is not the known empty failed attempt.');
        recoverEmptyFailure = true;
      } finally { await target.end(); }
    }
    fs.mkdirSync(folder, { recursive: true });
    fs.writeFileSync('prisma/baseline-migrations/migration_lock.toml', 'provider = "postgresql"\n');
    const diff = prisma(['migrate', 'diff', '--from-config-datasource', '--to-schema', 'prisma/schema.prisma', '--exit-code'], sourceUrl);
    const generation = prisma(['migrate', 'diff', '--from-empty', '--to-schema', 'prisma/schema.prisma', '--script', '--output', `${folder}/migration.sql`], sourceUrl);
    const checks = await source.query(`SELECT format('ALTER TABLE %I.%I ADD CONSTRAINT %I %s;', n.nspname,t.relname,c.conname,pg_get_constraintdef(c.oid)) AS sql FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid JOIN pg_namespace n ON n.oid=t.relnamespace WHERE n.nspname='public' AND c.contype='c' ORDER BY t.relname,c.conname`);
    const functions = await source.query(`SELECT pg_get_functiondef(p.oid) || ';' AS sql FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.prokind='f' AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.classid='pg_proc'::regclass AND d.objid=p.oid AND d.deptype='e') ORDER BY p.proname,p.oid`);
    const triggers = await source.query(`SELECT pg_get_triggerdef(t.oid) || ';' AS sql FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND NOT t.tgisinternal ORDER BY c.relname,t.tgname`);
    const partial = await source.query(`SELECT pg_get_indexdef(i.indexrelid) || ';' AS sql FROM pg_index i JOIN pg_class c ON c.oid=i.indrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND i.indpred IS NOT NULL ORDER BY i.indexrelid::regclass::text`);
    const extensions = [...checks.rows, ...functions.rows, ...triggers.rows, ...partial.rows].map(row => row.sql);
    if (!partial.rows.some(row => row.sql.includes('GymEnrollment_one_live_per_student'))) extensions.push('CREATE UNIQUE INDEX "GymEnrollment_one_live_per_student" ON "GymEnrollment" ("workspaceId", "studentMemberId") WHERE "status" IN (\'ACTIVE\', \'PAUSED\');');
    fs.appendFileSync(`${folder}/migration.sql`, '\n-- Additional verified checks, functions, triggers and partial indexes.\n' + extensions.join('\n\n') + '\n');
    if (!exists.rowCount) await source.query('CREATE DATABASE atlasfit_gym_baseline_20261007 OWNER atlasfit_test');
    if (recoverEmptyFailure) prisma(['migrate', 'resolve', '--rolled-back', '0_atlasfit_20261007'], targetUrl);
    const deploy = prisma(['migrate', 'deploy'], targetUrl);
    const repeat = prisma(['migrate', 'deploy'], targetUrl);
    const verification = prisma(['migrate', 'diff', '--from-config-datasource', '--to-schema', 'prisma/schema.prisma', '--exit-code'], targetUrl);
    const migrationFile = `${folder}/migration.sql`;
    const report = { completedAt: new Date().toISOString(), sourceDisposableDatabase: 'atlasfit_gym_stabilization_20261001', targetDisposableDatabase: 'atlasfit_gym_baseline_20261007', production: false, configuredDatabaseChanged: false, schemaDiffBefore: diff, generation, deploy, repeatedDeploy: repeat, schemaDiffAfter: verification, customChecks: checks.rowCount, customFunctions: functions.rowCount, customTriggers: triggers.rowCount, partialIndexes: partial.rowCount + (partial.rows.some(row => row.sql.includes('GymEnrollment_one_live_per_student')) ? 0 : 1), migration: { file: migrationFile, sha256: createHash('sha256').update(fs.readFileSync(migrationFile)).digest('hex') }, limitation: 'Fresh installation verified. Existing configured database needs an additive transition and preflight before marking the baseline applied.' };
    fs.writeFileSync('docs/audits/academias/estabilizacao/verificacoes-baseline.json', JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify({ success: true, customChecks: checks.rowCount, customFunctions: functions.rowCount, customTriggers: triggers.rowCount, partialIndexes: report.partialIndexes }));
  } finally { await source.end(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
