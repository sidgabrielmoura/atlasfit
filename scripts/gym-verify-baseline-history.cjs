const fs = require('node:fs');
const { randomUUID, createHash } = require('node:crypto');
const { spawnSync } = require('node:child_process');
const assert = require('node:assert/strict');
const { Client } = require('pg');
const url = 'postgresql://atlasfit_test@127.0.0.1:56432/atlasfit_gym_legacy_transition_20261007v2';
const client = new Client({ connectionString: url });
const allowed = ['PATH', 'Path', 'SystemRoot', 'WINDIR', 'TEMP', 'TMP', 'COMSPEC', 'PATHEXT', 'USERPROFILE', 'LOCALAPPDATA', 'APPDATA'];
const env = Object.fromEntries(allowed.filter(key => process.env[key]).map(key => [key, process.env[key]]));
env.DATABASE_URL = url;
(async () => {
  try {
    await client.connect();
    const applied = await client.query(`SELECT 1 FROM "_prisma_migrations" WHERE migration_name='0_atlasfit_20261007' AND finished_at IS NOT NULL`);
    assert.equal(applied.rowCount, 1, 'The disposable legacy rehearsal must already have completed.');
    const name = '20260514191258_init_atlasfit_schema';
    const checksum = createHash('sha256').update(fs.readFileSync(`prisma/migrations/${name}/migration.sql`)).digest('hex');
    if (!(await client.query('SELECT 1 FROM "_prisma_migrations" WHERE migration_name=$1', [name])).rowCount) await client.query(`INSERT INTO "_prisma_migrations" (id,checksum,finished_at,migration_name,started_at,applied_steps_count) VALUES ($1,$2,now(),$3,now(),1)`, [randomUUID(), checksum, name]);
    const checks = [];
    for (const command of ['deploy', 'status']) {
      const result = spawnSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', command, '--config', 'prisma.baseline.config.ts'], { env, encoding: 'utf8' });
      checks.push({ command, exitCode: result.status, output: result.stdout + result.stderr });
    }
    const report = { completedAt: new Date().toISOString(), disposableDatabase: 'atlasfit_gym_legacy_transition_20261007v2', configuredDatabaseChanged: false, historicalMigration: name, checks, success: checks.every(check => check.exitCode === 0), limitation: 'Synthetic history coexistence only. Actual historical failed migrations and checksums still require read-only preflight.' };
    fs.writeFileSync('docs/audits/academias/estabilizacao/verificacoes-baseline-historico.json', JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify({ success: report.success, checks: checks.map(({ command, exitCode }) => ({ command, exitCode })) }));
    if (!report.success) process.exitCode = 1;
  } finally { await client.end(); }
})().catch(error => { console.error(error.message.slice(0, 1200)); process.exitCode = 1; });
