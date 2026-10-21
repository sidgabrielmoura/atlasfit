const fs = require('node:fs');
const { Client } = require('pg');
const { createHash } = require('node:crypto');
const configured = process.argv.includes('--configured');
const url = configured ? require('dotenv').parse(fs.readFileSync('.env')).DATABASE_URL : 'postgresql://atlasfit_test@127.0.0.1:56432/atlasfit_gym_stabilization_20261001';
const client = new Client({ connectionString: url, connectionTimeoutMillis: 10000, query_timeout: 15000 });
const report = { startedAt: new Date().toISOString(), readOnly: true, target: configured ? 'CONFIGURED' : 'DISPOSABLE', targetFingerprint: createHash('sha256').update(new URL(url).host + new URL(url).pathname).digest('hex'), relations: [] };
(async () => {
 try {
  await client.connect(); await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY'); await client.query("SET LOCAL statement_timeout='10s'");
  report.gymWorkspaces = (await client.query(`SELECT count(*)::text AS count FROM "Workspace" WHERE type='GYM'`)).rows[0].count;
  for (const edge of [...JSON.parse(fs.readFileSync('prisma/gym-tenant-integrity.json', 'utf8')).edges, ...JSON.parse(fs.readFileSync('prisma/gym-reference-integrity.json','utf8')).queries.map(row => ({ ...row, field: row.rule, ownVia: true }))]) {
   await client.query('SAVEPOINT relation_check');
   try { report.relations.push({ table: edge.table, field: edge.field, status: 'READ', count: (await client.query(edge.query)).rows[0].count }); }
   catch (error) {
    await client.query('ROLLBACK TO SAVEPOINT relation_check');
    const row = { table: edge.table, field: edge.field, status: 'SCHEMA_UNAVAILABLE', code: /^[A-Z0-9]{5}$/.test(error.code || '') ? error.code : 'QUERY_FAILED' };
    // An unavailable future relation is not reported as zero mismatches.
    // Separately count applicable child records where the installed schema permits it.
    if (!edge.ownVia) {
     try { row.applicableGymRecords = (await client.query(`SELECT count(*)::text AS count FROM "${edge.table}" c JOIN "Workspace" w ON w.id=c."workspaceId" WHERE w.type='GYM'`)).rows[0].count; }
     catch { await client.query('ROLLBACK TO SAVEPOINT relation_check'); }
    }
    report.relations.push(row);
   }
   await client.query('RELEASE SAVEPOINT relation_check');
  }
  await client.query('ROLLBACK');
  report.success = true;
  report.readyToMigrate = report.relations.every(row => row.status === 'READ' && row.count === '0');
 } finally { await client.end(); }
})().catch(error => { report.success = false; report.errorCode = /^[A-Z0-9]{5}$/.test(error.code || '') ? error.code : 'PREFLIGHT_FAILED'; process.exitCode = 1; }).finally(() => {
 report.finishedAt = new Date().toISOString();
 const file = `docs/audits/academias/estabilizacao/preflight-tenant-${configured ? 'real' : 'teste'}.json`;
 fs.writeFileSync(file, JSON.stringify(report, null, 2) + '\n');
 console.log(JSON.stringify({ success: report.success, readyToMigrate: report.readyToMigrate, gymWorkspaces: report.gymWorkspaces, divergentRelations: report.relations.filter(row => row.count !== '0').length, file }));
});
