const fs = require('node:fs');
const { spawnSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const configured = require('dotenv').parse(fs.readFileSync('.env'));
const folder = '.tmp/gym-stabilization';
const file = `${folder}/configured-database-transition.sql`;
fs.mkdirSync(folder, { recursive: true });
const allowed = ['PATH', 'Path', 'SystemRoot', 'WINDIR', 'TEMP', 'TMP', 'COMSPEC', 'PATHEXT', 'USERPROFILE', 'LOCALAPPDATA', 'APPDATA'];
const env = Object.fromEntries(allowed.filter(key => process.env[key]).map(key => [key, process.env[key]]));
env.DATABASE_URL = configured.DATABASE_URL;
const args = ['node_modules/prisma/build/index.js', 'migrate', 'diff', '--from-config-datasource', '--to-schema', 'prisma/schema.prisma', '--script', '--output', file, '--config', 'prisma.baseline.config.ts'];
const result = spawnSync(process.execPath, args, { env, encoding: 'utf8' });
const report = { completedAt: new Date().toISOString(), readOnlySource: true, configuredDatabaseChanged: false, exitCode: result.status, sql: null, destructiveStatements: [], limitation: 'Only a draft schema transition. Data backfills, custom invariants, synthetic legacy migration and production rollout are not verified.' };
if (result.status === 0) {
  const sql = fs.readFileSync(file, 'utf8');
  report.sql = { file, sha256: createHash('sha256').update(sql).digest('hex'), bytes: Buffer.byteLength(sql) };
  report.destructiveStatements = sql.split('\n').filter(line => /DROP (TABLE|COLUMN|TYPE)|ALTER COLUMN.+(SET NOT NULL|TYPE)/.test(line)).map(line => line.trim());
  const schemaFile = `${folder}/configured-database-schema-only.sql`;
  const schema = spawnSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'diff', '--from-empty', '--to-config-datasource', '--script', '--output', schemaFile, '--config', 'prisma.baseline.config.ts'], { env, encoding: 'utf8' });
  report.schemaCopyExitCode = schema.status;
  if (schema.status !== 0) process.exitCode = 1;
  else report.schemaOnly = { file: schemaFile, sha256: createHash('sha256').update(fs.readFileSync(schemaFile)).digest('hex'), includesData: false };
}
fs.writeFileSync('docs/audits/academias/estabilizacao/transicao-legado-preview.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ success: result.status === 0, readOnlySource: true, sqlBytes: report.sql?.bytes, destructiveStatements: report.destructiveStatements.length }));
process.exitCode ||= result.status ?? 1;
