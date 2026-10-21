const { Client } = require('pg');
const fs = require('node:fs');
(async () => {
 const client = new Client({ connectionString: 'postgresql://atlasfit_test@127.0.0.1:56432/atlasfit_gym_stabilization_20261001' });
 await client.connect();
 try {
  const exists = await client.query("SELECT to_regclass('public.\"GymExpensePayment\"') AS relation");
  if (exists.rows[0].relation) {
   await client.query('BEGIN');
   try {
    await client.query(`ALTER TABLE "GymExpensePayment" DROP CONSTRAINT "GymExpensePayment_reversal_complete", ADD CONSTRAINT "GymExpensePayment_reversal_complete" CHECK (("reversedAt" IS NULL AND "reversedByUserId" IS NULL AND "reversalReason" IS NULL) OR ("reversedAt" IS NOT NULL AND "reversedByUserId" IS NOT NULL AND "reversalReason" IS NOT NULL AND length(trim("reversalReason")) >= 5))`);
    await client.query('COMMIT');
   } catch (error) { await client.query('ROLLBACK'); throw error; }
   console.log('Constraint atual verificada somente no banco descartável.'); return;
  }
  await client.query('BEGIN');
  try { await client.query(fs.readFileSync('prisma/migrations/20261001050000_gym_expense_receipts/migration.sql', 'utf8')); await client.query('COMMIT'); }
  catch (error) { await client.query('ROLLBACK'); throw error; }
  console.log('Ledger de despesas e índices aplicados somente ao banco descartável.');
 } finally { await client.end(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
