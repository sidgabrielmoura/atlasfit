const fs = require('node:fs');
const { spawnSync } = require('node:child_process');
const { Client } = require('pg');
const url = 'postgresql://atlasfit_test@127.0.0.1:56432/atlasfit_gym_stabilization_20261001';
async function main() {
  const db = new Client({ connectionString: url }); await db.connect();
  try {
    const state = await db.query(`SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='GymStudentProfile' AND column_name IN ('healthData','onboardedAt','privacyRestrictedAt')`);
    if (!state.rowCount) {
      await db.query('BEGIN');
      try { await db.query(fs.readFileSync('prisma/migrations/20261006010000_gym_privacy_health/migration.sql','utf8')); await db.query('COMMIT'); }
      catch (e) { await db.query('ROLLBACK'); throw e; }
    } else if (state.rowCount !== 3) throw new Error('Partial disposable privacy schema.');
  } finally { await db.end(); }
  const allowed=['PATH','Path','SystemRoot','WINDIR','TEMP','TMP','COMSPEC','PATHEXT','USERPROFILE','LOCALAPPDATA','APPDATA'];
  const env=Object.fromEntries(allowed.filter(k=>process.env[k]!==undefined).map(k=>[k,process.env[k]])); env.DATABASE_URL=url;
  const result=spawnSync(process.execPath,['node_modules/prisma/build/index.js','generate','--config','.tmp/gym-stabilization/prisma-authority.config.ts'],{env,stdio:'inherit'});
  process.exitCode=result.status ?? 1;
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
