const { Client } = require('pg');
const fs = require('node:fs');
(async () => {
 const client = new Client({ connectionString: 'postgresql://atlasfit_test@127.0.0.1:56432/atlasfit_gym_stabilization_20261001' });
 await client.connect();
 try {
  const existing = await client.query("SELECT 1 FROM information_schema.columns WHERE table_name='PaymentWebhookEvent' AND column_name='gymWorkspaceId'");
  if (existing.rowCount) { console.log('Migration de retenção já aplicada no banco descartável.'); return; }
  await client.query(fs.readFileSync('prisma/migrations/20261002020000_gym_legacy_webhook_review/migration.sql', 'utf8'));
  console.log('Migration aditiva aplicada exclusivamente ao PostgreSQL descartável.');
 } finally { await client.end(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
