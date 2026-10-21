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
const labels = [['integracao-realtime-completa', 258], ['personal-entregas-realtime', 77], ['realtime-scope', 2], ['realtime-externo', 1]];
for (const [label, passed] of labels) { assert.equal(checks[label].success, true, label); assert.equal(checks[label].passed, passed, label); assert.equal(checks[label].failed, 0, label); }
const http = read(folder + '/verificacoes-http-lotes.json');
assert.equal(http.success, true); assert.equal(http.selected.length, 60); assert.equal(http.passed, 60); assert.equal(http.failed, 0);
const visual = read(folder + '/verificacoes-realtime-browser.json');
assert.equal(visual.success, true); assert.equal(visual.scenarios.length, 5); assert.deepEqual(visual.errors, []);
const typeFile = [folder + '/typecheck-realtime-final.json', folder + '/typecheck-realtime.json', folder + '/typecheck-typecheck-realtime.json'].find(file => fs.existsSync(file));
assert(typeFile); const typescript = read(typeFile); assert.equal(typescript.exitCode, 0);
const target = folder + '/realtime'; fs.mkdirSync(target, { recursive: true });
const artifacts = [];
function copy(source) { const file = target + '/' + path.basename(source); fs.copyFileSync(source, file); artifacts.push({ file, sha256: hash(file) }); return file; }
const exportedChecks = {};
for (const [label] of labels) exportedChecks[label] = { ...checks[label], rawFile: copy(checks[label].rawFile) };
for (const name of fs.readdirSync('.tmp/gym-stabilization').filter(name => /^(realtime-scope|realtime-externo|integracao-realtime-completa|personal-entregas-realtime)-.+-raw\.json$/.test(name))) copy('.tmp/gym-stabilization/' + name);
for (const batch of http.batches) copy(batch.rawFile);
const httpFile = copy(folder + '/verificacoes-http-lotes.json'); const browserFile = copy(visual.file); const typeExport = copy(typeFile);
// Pin the previous report to its already exported immutable snapshot; the live HTTP summary changes on every run.
const oldManifestFile = folder + '/verificacoes-entregas.json';
const oldManifest = read(oldManifestFile);
if (hash(oldManifest.http.file) !== oldManifest.http.sha256) {
  const previousSnapshot = oldManifest.artifacts.find(artifact => /http-lotes-\d+-summary\.json$/.test(artifact.file) && artifact.sha256 === oldManifest.http.sha256);
  assert(previousSnapshot, 'Previous HTTP summary must remain archived.'); assert.equal(hash(previousSnapshot.file), oldManifest.http.sha256);
  oldManifest.http.file = previousSnapshot.file; fs.writeFileSync(oldManifestFile, JSON.stringify(oldManifest, null, 2) + '\n');
}
const sources = ['src/providers/ably-provider.tsx', 'src/lib/ably.ts', 'src/modules/workspaces/application/realtime-capabilities.ts',
  'src/app/api/ably/token/route.ts', 'src/stores/workspace.store.ts', 'src/stores/chat.store.ts',
  'src/modules/payments/__tests__/financial.test.ts', 'tests/gym/http.spec.ts', 'tests/gym/realtime-scope.integration.ts',
  'tests/gym/realtime-provider.fixture.tsx', 'tests/gym/realtime-client.fixture.ts', 'tests/services/realtime.external.ts',
  'scripts/gym-realtime-browser.cjs', 'scripts/gym-check-realtime.cjs', 'scripts/gym-redact-service-results.cjs',
  'scripts/gym-test-realtime-scope.cjs', 'scripts/gym-test-realtime-regression.cjs', 'scripts/gym-test-personal-deliveries.cjs',
  'scripts/gym-record-realtime.cjs', folder + '/realtime-contexto.md'];
const manifestFile = folder + '/verificacoes-realtime.json';
fs.writeFileSync(manifestFile, JSON.stringify({ recordedAt: new Date().toISOString(), scope: 'Capabilities selecionadas e ciclo do provedor React/Ably.', checks: exportedChecks,
  http: { file: httpFile, sha256: hash(httpFile), passed: 60, failed: 0, selected: 60, batches: http.batches.length },
  browser: { file: browserFile, sha256: hash(browserFile), scenarios: visual.scenarios, realTransport: false },
  typescript: { file: typeExport, sha256: hash(typeExport), exitCode: 0 }, artifacts,
  sources: sources.map(file => ({ file, sha256: hash(file) })), originalAudit: { file: original, sha256: hash(original) },
  environment: { database: 'PostgreSQL descartável 127.0.0.1:56432', configuredDatabaseChanged: false, deployed: false, realAbly: 'Canais e contas sintéticos; sem comandos financeiros.' },
  limitations: ['Tokens emitidos antes da revogação duram até o TTL de 60 segundos; nova autorização revalida vínculo/licença/sessão.', 'Node verifica transporte real; Chrome verifica separadamente o componente React com transporte controlado.', 'Não homologa todas as superfícies visuais ou a política global de autenticação.'] }, null, 2) + '\n');
const stateFile = folder + '/tratamento.json'; const states = read(stateFile); const state = states['GYM-AUD-049'];
if (state.completedBatch !== 'realtime-20261007') { state.history ??= []; state.history.push({ batch: 'before-realtime-20261007', state: state.state, correction: state.correction }); }
state.state = 'Corrigido e verificado'; state.completedBatch = 'realtime-20261007';
state.correction = 'Token tem ACL explícita por usuário/participante e workspace selecionado; licença, unidade/carteira e vínculos ativos revalidados. Chat de lista é por usuário/workspace. Troca cria conexão nova, fecha anterior e disponibiliza cliente React somente depois de autorizar; resultados atrasados e retorno A/B/A não recuperam conexão antiga. Ably real negou leitura estrangeira e publicação financeira e removeu acesso após renovar com vínculo revogado. TTL máximo de 60 segundos e implantação/política global permanecem explicitados em 043/065.';
state.currentConfirmation = 'Verificado em PostgreSQL, HTTP isolado, cinco cenários React no Chrome e Ably real com canais sintéticos; regressão de 258 integrações, 77 PERSONAL e 60 HTTP aprovada. Sem implantação ou alteração do banco real.';
state.files = [...new Set([...state.files, ...sources.filter(file => !file.startsWith('scripts/')), manifestFile])];
const validation = 'Realtime — 07/10/2026: ACL por contexto, leitura/publicação negadas, renovação após revogação real, cinco cenários React, 258 integrações/77 PERSONAL/60 HTTP e TypeScript aprovados; verificacoes-realtime.json.';
if (!state.validation.includes(validation)) state.validation.push(validation);
fs.writeFileSync(stateFile, JSON.stringify(states, null, 2) + '\n');
const main = 'docs/audits/academias/estabilizacao-modulo-academias.md'; let report = fs.readFileSync(main, 'utf8');
if (!report.includes('<!-- realtime-20261007 -->')) report += '\n\n<!-- realtime-20261007 -->\n## Realtime por contexto — 07/10\n\nO [achado 049](estabilizacao/realtime-contexto.md) foi corrigido e verificado: ACL explícita por workspace/vínculo, troca de conexão no React, callbacks antigos descartados e leitura/publicação estrangeiras recusadas no Ably real. O [manifesto](estabilizacao/verificacoes-realtime.json) registra 258 integrações, 77 testes PERSONAL, 60 HTTP e cinco cenários React aprovados. Restam 25 achados abertos; implantação e política global de autenticação continuam em 043/065.\n';
report = report.replace(/Posição atual após os pontos 1, 2 e 3:[^\r\n]+/, 'Posição atual após os pontos 1, 2 e 3, entregas e realtime: 27 achados corrigidos e verificados, 13 retirados do escopo, 2 implementados aguardando verificação específica e 23 pendentes. São 25 achados abertos, detalhados na lista exaustiva.');
fs.writeFileSync(main, report);
console.log(JSON.stringify({ closed: ['049'], remaining: 25, integration: 258, personal: 77, http: 60, browserScenarios: 5, realRealtime: 1 }));
