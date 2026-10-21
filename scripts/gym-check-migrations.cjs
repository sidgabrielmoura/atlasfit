const fs = require('node:fs');
const { spawnSync } = require('node:child_process');
const { Client } = require('pg');
const database = 'atlasfit_gym_migrations_20261001';
const url = `postgresql://atlasfit_test@127.0.0.1:56432/${database}`;
(async () => {
 const admin = new Client({ connectionString: 'postgresql://atlasfit_test@127.0.0.1:56432/postgres' });
 await admin.connect();
 try {
  if ((await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [database])).rows.length) throw new Error('Banco de cadeia histórica já existe; nenhum reset será feito.');
  await admin.query('CREATE DATABASE "atlasfit_gym_migrations_20261001"');
 } finally { await admin.end(); }
 const startedAt = new Date().toISOString();
 const result = spawnSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy'], { env: { ...process.env, DATABASE_URL: url }, encoding: 'utf8' });
 const output = `${result.stdout || ''}\n${result.stderr || ''}`;
 fs.writeFileSync('docs/audits/academias/estabilizacao/cadeia-migrations.txt', output);
 const file = 'docs/audits/academias/estabilizacao/verificacoes-isoladas.json';
 const report = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
 report['historical-migrations'] = { startedAt, finishedAt: new Date().toISOString(), command: 'prisma migrate deploy — banco descartável exclusivo de cadeia histórica', exitCode: result.status, resultFile: 'cadeia-migrations.txt' };
 fs.writeFileSync(file, JSON.stringify(report, null, 2));
 console.log(output); process.exitCode = result.status ?? 1;
})().catch(error => { console.error(error.message); process.exitCode = 1; });
