const { Client } = require('pg'); const fs = require('node:fs');
(async () => {
 const client = new Client({ connectionString: 'postgresql://atlasfit_test@127.0.0.1:56432/atlasfit_gym_stabilization_20261001' }); await client.connect();
 try {
  const exists = await client.query(`SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='GymStudentProfile' AND column_name='registrationRequestKey'`);
  if (exists.rows.length) { console.log('Integridade de cadastro já presente no banco descartável.'); return; }
  await client.query(fs.readFileSync('prisma/migrations/20261002000000_gym_student_registration_integrity/migration.sql','utf8'));
  console.log('Integridade de cadastro aplicada somente ao banco descartável.');
 } finally { await client.end(); }
})().catch(error => { console.error(error.message); process.exitCode=1; });
