const fs = require('node:fs');
const { Client } = require('pg');
async function main() {
 const db = new Client({ connectionString: 'postgresql://atlasfit_test@127.0.0.1:56432/atlasfit_gym_stabilization_20261001' }); await db.connect();
 try {
  const found = await db.query("SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='GymCashDrawerMovement' AND column_name='accountTransferId'");
  if (!found.rowCount) { await db.query('BEGIN'); try { await db.query(fs.readFileSync('prisma/migrations/20261006022000_gym_cash_transfer_evidence/migration.sql', 'utf8')); await db.query('COMMIT'); } catch (error) { await db.query('ROLLBACK'); throw error; } }
  console.log('Vínculo de transferências validado apenas no banco descartável.');
 } finally { await db.end(); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
