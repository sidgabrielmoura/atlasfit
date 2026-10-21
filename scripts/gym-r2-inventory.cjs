const fs = require('node:fs');
const { createHash } = require('node:crypto');
const { Client } = require('pg');
const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const configured = require('dotenv').parse(fs.readFileSync('.env'));
const fingerprint = value => createHash('sha256').update(value).digest('hex');
const bucket = configured.CLOUDFLARE_R2_BUCKET || 'atlasfit';
const storage = new S3Client({ region: 'auto', endpoint: 'https://ba71c882bd0e9a802f4a93d6cb22cd3c.r2.cloudflarestorage.com', credentials: { accessKeyId: configured.CLOUDFLARE_ID_TOKEN_ACCESS || configured.CLOUDFLARE_TOKEN_VALUE || '', secretAccessKey: configured.CLOUDFLARE_SECRET_ACCESS_KEY || '' } });
const database = new Client({ connectionString: configured.DATABASE_URL, connectionTimeoutMillis: 10000, query_timeout: 15000 });
const report = { startedAt: new Date().toISOString(), readOnly: true, deletesExecuted: 0, targetFingerprint: fingerprint(new URL(configured.DATABASE_URL).host + new URL(configured.DATABASE_URL).pathname), bucketFingerprint: fingerprint(bucket), pages: 0, completeListing: false, columns: [], objects: [], limitations: ['Inventário em leitura; ausência de referência é candidata a órfão e não autoriza exclusão.', 'Snapshot do banco e listagem R2 não são uma transação distribuída.', 'URLs externas sem chave recuperável são contadas separadamente; não se presume ausência de referência.'] };
const references = new Set(), possibleReferences = new Set();
let unresolvedStorageURLs = 0, externalURLs = 0;
function visit(value, directKey = false) {
 if (Array.isArray(value)) return value.forEach(item => visit(item));
 if (value && typeof value === 'object') return Object.values(value).forEach(item => visit(item));
 if (typeof value !== 'string' || !value) return;
 if (directKey) { references.add(value); return; }
 if (value.startsWith('/api/storage/file?')) {
  const key = new URL(value, 'https://atlasfit.invalid').searchParams.get('key');
  if (key) references.add(key); else unresolvedStorageURLs++;
  return;
 }
 if (/^https?:\/\//i.test(value)) {
  const url = new URL(value);
  if (url.pathname === '/api/storage/file') { const key = url.searchParams.get('key'); if (key) references.add(key); else unresolvedStorageURLs++; return; }
  const key = decodeURIComponent(url.pathname.slice(1));
  possibleReferences.add(key);
  if (/\.r2\.dev$|\.r2\.cloudflarestorage\.com$/.test(url.hostname)) { if (key) references.add(key.startsWith(bucket + '/') ? key.slice(bucket.length + 1) : key); else unresolvedStorageURLs++; }
  else externalURLs++;
 }
}
(async () => {
 try {
  await database.connect();
  await database.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  await database.query("SET LOCAL statement_timeout='10s'");
  const columns = (await database.query("SELECT table_name,column_name,data_type FROM information_schema.columns WHERE table_schema='public' AND (data_type IN ('text','character varying','json','jsonb')) ORDER BY table_name,column_name")).rows;
  const selected = columns.filter(row => /(?:url|image|avatar|attachment|attachments|objectKey|logoKey|watermarkKey|workoutCoverKey)$/i.test(row.column_name));
  for (const row of selected) {
   const quoted = name => '"' + name.replaceAll('"', '""') + '"';
   const query = await database.query(`SELECT ${quoted(row.column_name)} AS value FROM ${quoted(row.table_name)} WHERE ${quoted(row.column_name)} IS NOT NULL`);
   for (const item of query.rows) visit(item.value, /^(objectKey|logoKey|watermarkKey|workoutCoverKey)$/.test(row.column_name));
   report.columns.push({ table: row.table_name, column: row.column_name, recordsRead: query.rowCount });
  }
  const workspaces = (await database.query('SELECT id,type FROM "Workspace"')).rows;
  const knownWorkspaces = new Map(workspaces.map(row => [row.id, row.type]));
  report.gymWorkspaces = workspaces.filter(row => row.type === 'GYM').length;
  report.referenceKeys = references.size; report.unresolvedStorageURLs = unresolvedStorageURLs; report.externalURLs = externalURLs;
  let continuation;
  const tokens = new Set(), listed = new Set();
  do {
   const page = await storage.send(new ListObjectsV2Command({ Bucket: bucket, MaxKeys: 1000, ...(continuation ? { ContinuationToken: continuation } : {}) }));
   report.pages++;
   for (const object of page.Contents || []) {
    if (!object.Key || listed.has(object.Key)) continue;
    listed.add(object.Key);
    const workspaceId = /^workspace\/([^/]+)\//.exec(object.Key)?.[1];
    const type = workspaceId ? knownWorkspaces.get(workspaceId) : undefined;
    const state = references.has(object.Key) ? 'REFERENCED' : possibleReferences.has(object.Key) ? 'POSSIBLE_URL_REFERENCE' : 'UNREFERENCED_CANDIDATE';
    report.objects.push({ keyFingerprint: fingerprint(object.Key), size: object.Size ?? null, lastModified: object.LastModified?.toISOString() ?? null, state, scope: workspaceId ? type || 'UNKNOWN_WORKSPACE' : object.Key.startsWith('__atlasfit_stabilization_tests__/') ? 'SYNTHETIC_TEST' : 'GLOBAL_OR_LEGACY' });
   }
   if (!page.IsTruncated) { report.completeListing = true; break; }
   if (!page.NextContinuationToken || tokens.has(page.NextContinuationToken)) throw Error('R2_PAGINATION_INCOMPLETE');
   tokens.add(page.NextContinuationToken); continuation = page.NextContinuationToken;
  } while (true);
  report.totalObjects = listed.size;
  report.missingReferenceObjects = [...references].filter(key => !listed.has(key)).map(key => ({ keyFingerprint: fingerprint(key) }));
  report.success = report.completeListing;
  await database.query('ROLLBACK');
 } catch (error) { report.success = false; report.errorCode = /^[A-Z0-9_]+$/.test(error.code || '') ? error.code : 'INVENTORY_FAILED'; process.exitCode = 1; }
 finally {
  await database.end(); storage.destroy(); report.finishedAt = new Date().toISOString();
  const file = 'docs/audits/academias/estabilizacao/inventario-r2-real.json';
  fs.writeFileSync(file, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ file, success: report.success, pages: report.pages, completeListing: report.completeListing, totalObjects: report.totalObjects, gymWorkspaces: report.gymWorkspaces, referenceKeys: report.referenceKeys, unreferencedCandidates: report.objects.filter(row => row.state === 'UNREFERENCED_CANDIDATE').length, missingReferences: report.missingReferenceObjects?.length, unresolvedStorageURLs: report.unresolvedStorageURLs }));
 }
})();
