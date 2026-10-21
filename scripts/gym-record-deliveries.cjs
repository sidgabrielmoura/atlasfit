const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const folder = 'docs/audits/academias/estabilizacao';
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const hash = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const original = 'docs/audits/academias/achados.json';
assert.equal(hash(original), '0cc3c815e28c2590e569d515ef1c3855e0a99595066f37ed2fa0059df143c225');
const checks = read(folder + '/verificacoes-isoladas.json');
for (const [label, count] of [['integracao-entregas-completa', 256], ['servicos-externos', 3]]) {
  assert.equal(checks[label].success, true, label);
  assert.equal(checks[label].passed, count, label);
  assert.equal(checks[label].failed, 0, label);
}
const httpFile = folder + '/verificacoes-http-lotes.json';
const http = read(httpFile);
assert.equal(http.success, true); assert.equal(http.selected.length, 59);
assert.equal(http.passed, 59); assert.equal(http.failed, 0);
assert.equal(new Set(http.batches.flatMap(batch => batch.selected)).size, 59);
const typescriptFile = folder + '/typecheck-entregas.json';
const typescript = read(typescriptFile); assert.equal(typescript.exitCode, 0);
const baselineFile = folder + '/verificacoes-baseline.json';
const baseline = read(baselineFile);
for (const key of ['deploy', 'repeatedDeploy', 'schemaDiffBefore', 'schemaDiffAfter']) assert.equal(baseline[key].exitCode, 0, key);
assert.equal(hash(baseline.migration.file), baseline.migration.sha256);
const transitionFile = folder + '/verificacoes-transicao-legado.json';
const transition = read(transitionFile);
for (const key of ['schemaDiff', 'baselineResolvedAfterSchemaMatch', 'deploy']) assert.equal(transition[key].exitCode, 0, key);
assert.equal(transition.syntheticBillingsPreserved, 7); assert.equal(transition.unresolvedLinksPreserved, 7);
assert.equal(transition.configuredDatabaseChanged, false); assert.equal(transition.sourceIncludedRealData, false);
const historyFile = folder + '/verificacoes-baseline-historico.json';
const history = read(historyFile); assert.equal(history.success, true);
const exportedFolder = folder + '/entregas'; fs.mkdirSync(exportedFolder, { recursive: true });
const artifacts = [];
// Preserve intermediate failures as well as final results; do not publish login fixtures or server logs.
const rawNames = fs.readdirSync('.tmp/gym-stabilization').filter(name =>
  /^(integracao-entregas|http-completo-entregas|servicos-externos|delivery|outbox|preferences|preferencias|comunicacoes).+-raw\.json$/.test(name)
  || /^http-batch-\d+-\d+\.json$/.test(name)
  || /^http-lotes-\d+-summary\.json$/.test(name));
for (const name of rawNames) {
  const file = exportedFolder + '/' + name;
  const source = fs.readFileSync('.tmp/gym-stabilization/' + name, 'utf8')
    .replace(/([?&]token=)[a-zA-Z0-9_-]+/g, '$1[redacted]');
  fs.writeFileSync(file, source);
  artifacts.push({ file, sha256: hash(file) });
}
const sources = new Set([
  'prisma/schema.prisma', 'prisma.baseline.config.ts', baseline.migration.file,
  'src/lib/notifications/preferences.ts', 'src/lib/notifications/notification-service.ts',
  'src/app/api/personal/notifications/preferences/route.ts', 'src/app/api/cron/deliveries/route.ts',
  'src/app/api/student/finance/route.ts', 'src/modules/workspaces/application/transaction.ts',
  'src/modules/payments/application/payment-service.ts', 'tests/gym/http.spec.ts', 'tests/services/providers.external.ts',
  'vitest.services.config.ts', 'scripts/gym-check-services.cjs', 'scripts/gym-redact-service-results.cjs',
  'scripts/gym-http-batches.cjs', 'scripts/gym-http-isolated.cjs', 'scripts/gym-record-deliveries.cjs',
  'scripts/gym-prepare-baseline.cjs', 'scripts/gym-legacy-inventory.cjs', 'scripts/gym-prepare-legacy-transition.cjs',
  'scripts/gym-test-legacy-transition.cjs', 'scripts/gym-verify-baseline-history.cjs',
  folder + '/entregas-webhooks-baseline.md', 'scripts/gym-remaining-report.cjs',
]);
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.posix.join(directory, entry.name);
    if (entry.isDirectory()) walk(file); else sources.add(file);
  }
}
for (const directory of ['src/lib/delivery', 'src/modules/payments/webhooks',
  'prisma/migrations/20261007000000_delivery_outbox', 'prisma/migrations/20261007010000_gym_communication_dispatch',
  'prisma/migrations/20261007020000_gym_schema_alignment']) walk(directory);
for (const file of fs.readdirSync('tests/gym')) if (/delivery|preference|retirement/.test(file)) sources.add('tests/gym/' + file);
for (const file of fs.readdirSync('src/modules/workspaces/application')) if (/communication/.test(file)) sources.add('src/modules/workspaces/application/' + file);
// Resolve historical module naming without silently omitting the service from the manifest.
if (!fs.existsSync('src/lib/notifications/notification-service.ts')) {
  sources.delete('src/lib/notifications/notification-service.ts');
  for (const entry of fs.readdirSync('src/lib/notifications')) if (/service/.test(entry)) sources.add('src/lib/notifications/' + entry);
}
const manifest = {
  recordedAt: new Date().toISOString(),
  scope: 'Webhooks PERSONAL transacionais, outbox financeira, preferências concorrentes, comunicação GYM idempotente e baseline explícita.',
  checks: Object.fromEntries(['integracao-entregas-completa', 'servicos-externos'].map(label => [label, checks[label]])),
  http: { file: httpFile, sha256: hash(httpFile), success: true, passed: 59, failed: 0, batches: http.batches.length },
  typescript: { ...typescript, file: typescriptFile, sha256: hash(typescriptFile) },
  baseline: { file: baselineFile, sha256: hash(baselineFile), freshInstallation: true, repeatedDeploy: true, schemaDiff: 0 },
  legacyRehearsal: { file: transitionFile, sha256: hash(transitionFile), syntheticBillingsPreserved: 7, unresolvedLinksPreserved: 7 },
  historicalCoexistence: { file: historyFile, sha256: hash(historyFile), success: true, actualHistoryVerified: false },
  inventory: { file: folder + '/inventario-legado-real.json', sha256: hash(folder + '/inventario-legado-real.json'), readOnly: true },
  artifacts, sources: [...sources].sort().map(file => ({ file, sha256: hash(file) })),
  originalAudit: { file: original, sha256: hash(original) },
  environment: { application: 'Cópia sem .env; Next isolado entre lotes HTTP.', database: 'PostgreSQL descartável 127.0.0.1:56432',
    realProviders: ['R2: objeto temporário', 'Ably: canal sintético', 'Resend: delivered@resend.dev'],
    configuredDatabaseChanged: false, asaasMoneyCommands: false, deployed: false },
  limits: ['A suíte HTTP completa contém 59 casos; não representa todas as jornadas visuais da aplicação.',
    'Histórico de migrations real, vínculos/documentos legados, índices e implantação continuam pendentes.',
    'Scheduler, retenção periódica, eventos PERSONAL restantes, push e reautorização realtime não concluídos.',
    'A baseline usa configuração explícita; a cadeia histórica original não é uma instalação vazia homologada.'],
};
const manifestFile = folder + '/verificacoes-entregas.json';
fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2) + '\n');
const stateFile = folder + '/tratamento.json'; const states = read(stateFile);
const updates = {
  '011': 'Cobranças PERSONAL novas vinculam conta, aluno, workspace e obrigação explicitamente; processamento revalida origem. Restam integridade dos demais modelos e relações históricas por tenant/unidade.',
  '022': 'Inventário READ ONLY real encontrou zero grupos de matrículas vigentes duplicadas. Índice parcial validado na baseline descartável; aplicação no banco configurado e preflight continuam pendentes em 046.',
  '027': 'Baixa PERSONAL exige vínculo explícito com obrigação, nunca escolhe dívida pelo nome. Sete cobranças reais sem workspace foram inventariadas sem alteração. Restam coerência de pagador/responsável/identidade global e conciliação documental do legado.',
  '029': 'Consulta de sincronização e webhook usam o mesmo reducer transacional; CONFIRMED não paga a obrigação, settlement e replay não baixam a próxima parcela. Recovery com resultado incerto exige revisão. Restam split, taxas/estornos reais, retry completo e vínculo de cobranças legadas. Gateway GYM permanece retirado.',
  '030': 'Inventário READ ONLY encontrou zero assinaturas/faturas/contas externas GYM e sete cobranças sem workspace. Comandos e interface locais de reconciliação permanecem verificados. Restam conferência documental, fatos financeiros e decisões sobre registros reais sem vínculos suficientes e implantação.',
  '031': 'Efeitos financeiros, enfileiramento e conclusão do webhook são atômicos. PROCESSING antigo pode ser retomado; replay valida payload/hash, usa backoff e revisão para dados ausentes ou eventos sem fatos suficientes. Outbox cifrada com lease/recibo e fencing foi verificada. Restam eventos PERSONAL restantes, estornos reais, retenção periódica, legado e implantação.',
  '043': 'Cron deliveries autentica segredo em tempo constante e processa lotes limitados de recuperação/outbox; HTTP negado sem autorização e contagens redigidas verificadas. Restam scheduler no ambiente hospedado, backlog/alertas e demais cron compartilhados.',
  '044': 'Merge de preferências é estrito e concorrente por flag; comunicação IN_APP GYM exige UUID, fingerprint, recibo/destinatários atômicos e revalidação no retry. HTTP concorrente aprovado. Outbox financeira real Resend/Ably aprovada; restam notificações genéricas PERSONAL, push e observabilidade.',
  '046': 'Baseline explícita fresca/repetida passou com checks, funções, triggers e índices parciais. Transição do schema real ensaiada em cópia descartável sem dados reais preservou sete cobranças sintéticas sem vínculos inventados; diff zero. Baseline resolvida após igualdade de schema e deploy/status com histórico antigo sintético aprovados. Restam preflight do histórico real, backfills/documentos e implantação.',
  '047': 'R2 real verificou PUT binário assinado, HEAD/hash GET, tamanho adulterado, inventário do prefixo de teste e exclusão. Restam jornadas HTTP de reservas/quotas com serviço real e inventário completo de órfãos legados.',
  '049': 'Publicação financeira Ably pela outbox usa ID estável e deliveryId; repetição real resultou em uma mensagem no histórico. Restam reautorização do cliente depois da troca de workspace e testes do consumidor.',
  '050': 'Regressão deste lote: 256 integrações PostgreSQL, 59 HTTP completos em 15 lotes, três serviços reais sintéticos e TypeScript completo aprovados. Falhas intermediárias preservadas; fixtures HTTP corrigidas conforme guards existentes. Restam regressão PERSONAL ampla, visual/acessibilidade e superfícies não exercitadas.',
};
for (const [suffix, correction] of Object.entries(updates)) {
  const state = states['GYM-AUD-' + suffix];
  assert.equal(state.state, 'Pendente', suffix);
  if (state.completedBatch !== 'deliveries-20261007') {
    state.history ??= []; state.history.push({ batch: 'before-deliveries-20261007', state: state.state, correction: state.correction });
  }
  state.completedBatch = 'deliveries-20261007'; state.correction = correction;
  state.currentConfirmation = 'Lote verificado: 256 PostgreSQL/0 falhas, 59 HTTP/0 falhas, três verificações reais sintéticas/0 falhas, TypeScript exit 0 e baseline/transição/histórico sintéticos aprovados. Sem implantação nem alteração do banco real; escopo restante explícito.';
  state.files = [...new Set([...state.files, manifestFile, folder + '/entregas-webhooks-baseline.md'])];
  const validation = 'Webhooks/entregas/baseline — 07/10/2026: manifesto verificacoes-entregas.json; 256 integrações, 59 HTTP, três serviços reais sintéticos e TypeScript aprovados. Achado continua parcial.';
  if (!state.validation.includes(validation)) state.validation.push(validation);
}
fs.writeFileSync(stateFile, JSON.stringify(states, null, 2) + '\n');
const main = 'docs/audits/academias/estabilizacao-modulo-academias.md';
let report = fs.readFileSync(main, 'utf8');
if (!report.includes('<!-- deliveries-20261007 -->')) report += '\n\n<!-- deliveries-20261007 -->\n## Webhooks, entregas e baseline — 07/10\n\nO [lote de entregas](estabilizacao/entregas-webhooks-baseline.md) implementa webhook transacional, recuperação PROCESSING, outbox cifrada, preferências concorrentes e comunicação GYM idempotente. Verificação: 256 integrações, 59 HTTP completos, três serviços reais sintéticos e TypeScript aprovados. Baseline fresca/repetida e transição existente com sete cobranças sintéticas passaram; histórico antigo sintético coexistiu com deploy/status. Inventário real somente READ ONLY. O [manifesto](estabilizacao/verificacoes-entregas.json) preserva resultados e hashes. Implantação, conferência documental e as demais jornadas continuam na [lista dos 26 achados abertos](estabilizacao/pendencias-restantes.md).\n';
fs.writeFileSync(main, report);
console.log(JSON.stringify({ integration: 256, http: 59, providers: 3, artifacts: artifacts.length, sources: sources.size, closedFindings: 0, updatedFindings: Object.keys(updates).length }));
