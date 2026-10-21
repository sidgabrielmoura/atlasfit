const { Client } = require('pg');
const fs = require('node:fs');
(async () => {
 const client = new Client({ connectionString: 'postgresql://atlasfit_test@127.0.0.1:56432/atlasfit_gym_stabilization_20261001' });
 await client.connect();
 try {
  const exists = await client.query('SELECT 1 FROM pg_indexes WHERE schemaname = $1 AND indexname = $2', ['public', 'WorkspaceRoleGrant_active_global_unique']);
  if (exists.rows.length) { console.log('Índice já presente no banco descartável.'); return; }
  await client.query(fs.readFileSync('prisma/migrations/20261001040000_gym_global_role_concurrency/migration.sql', 'utf8'));
  console.log('Índice de grant global aplicado somente ao banco descartável.');
 } finally { await client.end(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
