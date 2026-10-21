const { Client } = require('pg');
const fs = require('node:fs');
(async () => {
 const client = new Client({ connectionString: 'postgresql://atlasfit_test@127.0.0.1:56432/atlasfit_gym_stabilization_20261001' });
 await client.connect();
 try {
  const existing = await client.query("SELECT 1 FROM information_schema.columns WHERE table_name='GymInvoice' AND column_name='issuanceKey'");
  if (existing.rowCount) { console.log('Migration de emissão já aplicada no banco descartável.'); return; }
  await client.query(fs.readFileSync('prisma/migrations/20261005000000_gym_manual_invoice_retry/migration.sql', 'utf8'));
  console.log('Migration aditiva aplicada exclusivamente ao PostgreSQL descartável.');
 } finally { await client.end(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
