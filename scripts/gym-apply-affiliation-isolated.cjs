const fs = require('node:fs');
const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://atlasfit_test@127.0.0.1:56432/atlasfit_gym_stabilization_20261001' });
(async () => {
  await client.connect();
  const exists = await client.query("SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='TrainerTask' AND column_name='authorId'");
  const sql = fs.readFileSync('prisma/baseline-migrations/20261012170000_affiliated_personal_agenda/migration.sql', 'utf8');
  if (!exists.rowCount) await client.query(sql);
  else {
    const ownership = await client.query("SELECT 1 FROM pg_constraint WHERE conname='TrainerTask_authorId_workspaceId_fkey'");
    if (!ownership.rowCount) await client.query('BEGIN;\n' + sql.slice(sql.indexOf('-- Membership ownership')));
  }
  console.log('Agenda migration available only in the designated disposable PostgreSQL database.');
})().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => client.end());
