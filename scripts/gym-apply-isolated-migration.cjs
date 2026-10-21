const fs = require('node:fs');
const { Client } = require('pg');
const migration = 'prisma/migrations/20261001020000_gym_invitation_profile/migration.sql';
async function main() {
 const client = new Client({ connectionString: 'postgresql://atlasfit_test@127.0.0.1:56432/atlasfit_gym_stabilization_20261001' });
 await client.connect();
 try {
  const existing = await client.query('SELECT column_name FROM information_schema.columns WHERE table_schema=\'public\' AND table_name=\'WorkspaceInvitation\' AND column_name=\'cref\'');
  if (existing.rowCount === 0) { await client.query('BEGIN'); try { await client.query(fs.readFileSync(migration,'utf8')); await client.query('COMMIT'); } catch(error) { await client.query('ROLLBACK'); throw error; } }
  console.log('Migration aditiva de convite validada no banco descartável.');
 } finally { await client.end(); }
}
main().catch(error => { console.error(error.message); process.exitCode=1; });
