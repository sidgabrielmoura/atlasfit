const fs = require('node:fs');
const { Client } = require('pg');
async function main() {
 const db = new Client({ connectionString: 'postgresql://atlasfit_test@127.0.0.1:56432/atlasfit_gym_stabilization_20261001' });
 await db.connect();
 try {
  const present = await db.query("SELECT to_regclass('public.\"GymAdministrativeReview\"') AS table_name");
  if (!present.rows[0].table_name) {
   await db.query('BEGIN');
   try { await db.query(fs.readFileSync('prisma/migrations/20261006020000_gym_contract_reconciliation/migration.sql', 'utf8')); await db.query('COMMIT'); }
   catch (error) { await db.query('ROLLBACK'); throw error; }
  }
  // This disposable schema may contain the earlier draft of the approved pause policy.
  await db.query('BEGIN');
  try {
   await db.query('ALTER TABLE "GymEnrollmentPause" DROP CONSTRAINT IF EXISTS "GymEnrollmentPause_resumePolicy_check"');
   await db.query('ALTER TABLE "GymEnrollmentPause" ADD CONSTRAINT "GymEnrollmentPause_resumePolicy_check" CHECK ("billingResumePolicy" = \'SKIP\')');
   await db.query('COMMIT');
  } catch (error) { await db.query('ROLLBACK'); throw error; }
  console.log('Migration contratual aplicada apenas no PostgreSQL descartável.');
 } finally { await db.end(); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
