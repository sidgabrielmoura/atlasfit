const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
const { Client } = require('pg');
const database = 'atlasfit_gym_stabilization_20261001';
const url = `postgresql://atlasfit_test@127.0.0.1:56432/${database}`;
async function main() {
  const sql = execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'diff', '--from-empty', '--to-schema', 'prisma/schema.prisma', '--script'], { env: { ...process.env, DATABASE_URL: url }, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
  fs.writeFileSync('docs/audits/academias/estabilizacao/baseline-schema.sql', sql);
  const client = new Client({ connectionString: url, connectionTimeoutMillis: 3000 });
  await client.connect();
  const tables = await client.query("SELECT COUNT(*)::int AS count FROM information_schema.tables WHERE table_schema='public'");
  if (tables.rows[0].count !== 0) throw new Error('O banco descartável já contém tabelas; nenhuma exclusão/reset será feita.');
  await client.query('BEGIN');
  try { await client.query(sql); await client.query('COMMIT'); } catch (error) { await client.query('ROLLBACK'); throw error; }
  const count = await client.query("SELECT COUNT(*)::int AS count FROM information_schema.tables WHERE table_schema='public'");
  console.log(`Schema completo criado: ${count.rows[0].count} tabelas no banco descartável.`);
  await client.end();
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
