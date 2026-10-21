const fs = require('node:fs');
const { createHash } = require('node:crypto');
const { Client } = require('pg');
const configured = require('dotenv').parse(fs.readFileSync('.env'));
const hash = value => createHash('sha256').update(value).digest('hex');
const db = new Client({ connectionString: configured.DATABASE_URL, connectionTimeoutMillis: 10000, query_timeout: 15000 });
const report = { startedAt: new Date().toISOString(), readOnly: true, configuredDatabaseChanged: false, externalCommands: 0, targetFingerprint: hash(new URL(configured.DATABASE_URL).host + new URL(configured.DATABASE_URL).pathname), cases: [], limitations: ['Candidatos por vínculos internos; nenhum backfill executado.', 'Não usa nome, título, CPF ou igualdade de valor como prova de obrigação.', 'Sem consulta ao gateway nesta execução; referência externa não prova pagamento nem liquidação.'] };
(async () => {
 try {
  await db.connect(); await db.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY'); await db.query("SET LOCAL statement_timeout='10s'");
  const billings = await db.query('SELECT b.id,b."providerBillingId",b."billingReference",b."studentUserId",b."subscriptionId",b."workspaceId",b.status,a."personalUserId",a."workspaceId" AS "accountWorkspaceId",a.environment,a.provider,a."providerApiKeyEncrypted" IS NOT NULL AS "hasStoredCredential" FROM "StudentBilling" b JOIN "PaymentProviderAccount" a ON a.id=b."providerAccountId" WHERE b."workspaceId" IS NULL ORDER BY b.id');
  for (const billing of billings.rows) {
   const members = await db.query('SELECT w.id,w.type FROM "WorkspaceMember" m JOIN "Workspace" w ON w.id=m."workspaceId" WHERE m."userId"=$1 AND w."ownerId"=$2 AND w.type=\'PERSONAL\'', [billing.studentUserId, billing.personalUserId]);
   const caseId = hash(billing.id);
   report.cases.push({ caseId, status: billing.status, environment: billing.environment, provider: billing.provider, hasProviderBillingId: Boolean(billing.providerBillingId), hasBillingReference: Boolean(billing.billingReference), hasSubscription: Boolean(billing.subscriptionId), hasAccountOwner: Boolean(billing.personalUserId), hasAccountWorkspace: Boolean(billing.accountWorkspaceId), hasStoredCredential: billing.hasStoredCredential, personalWorkspaceCandidates: members.rowCount, candidateFingerprints: members.rows.map(row => hash(row.id)), disposition: members.rowCount === 1 ? 'UNIQUE_MEMBERSHIP_CANDIDATE_REQUIRES_OBLIGATION_EVIDENCE' : members.rowCount === 0 ? 'NO_INTERNAL_WORKSPACE_EVIDENCE' : 'AMBIGUOUS_WORKSPACE_EVIDENCE' });
  }
  report.success = true; await db.query('ROLLBACK');
 } catch (error) { report.success = false; report.errorCode = /^[A-Z0-9_]+$/.test(error.code || '') ? error.code : 'EVIDENCE_UNAVAILABLE'; process.exitCode = 1; }
 finally { await db.end(); report.finishedAt = new Date().toISOString(); const file='docs/audits/academias/estabilizacao/evidencias-cobrancas-legadas.json'; fs.writeFileSync(file, JSON.stringify(report,null,2)+'\n'); console.log(JSON.stringify({file,success:report.success,cases:report.cases.length,dispositions:report.cases.reduce((counts,row)=>(counts[row.disposition]=(counts[row.disposition]||0)+1,counts),{})})); }
})();
