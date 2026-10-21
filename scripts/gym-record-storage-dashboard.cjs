const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), { createHash } = require('node:crypto');
const folder = 'docs/audits/academias/estabilizacao', read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const hash = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
assert.equal(hash('docs/audits/academias/achados.json'), '0cc3c815e28c2590e569d515ef1c3855e0a99595066f37ed2fa0059df143c225');
const isolated = read(folder + '/verificacoes-isoladas.json');
for (const [label, passed] of [['storage-dashboard', 6], ['storage-dashboard-http', 1], ['storage-browser-fixture', 1], ['integracao-storage-dashboard', 278]]) {
  assert.equal(isolated[label].success, true); assert.equal(isolated[label].passed, passed); assert.equal(isolated[label].failed, 0); assert.equal(read(isolated[label].rawFile).success, true);
}
const browser = read(folder + '/verificacoes-storage-browser.json'); assert.equal(browser.success, true); assert.equal(browser.scenarios.length, 5); assert.deepEqual(browser.errors, []);
const typeFile = folder + '/typecheck-contexto-final.json'; assert.equal(read(typeFile).exitCode, 0);
const performanceFile = '.tmp/gym-stabilization/storage-dashboard-performance.json', performance = read(performanceFile); assert.equal(performance.samples, 20); assert.equal(performance.synthetic, true); assert(performance.maxPayloadBytes < 30000); assert(performance.p95Ms > 0);
const target = folder + '/storage-dashboard'; fs.mkdirSync(target, { recursive: true }); const artifacts = [];
function copy(source, name = path.basename(source)) { const file = target + '/' + name; fs.copyFileSync(source, file); artifacts.push({ file, sha256: hash(file) }); return file; }
for (const label of ['storage-dashboard', 'storage-dashboard-http', 'storage-browser-fixture', 'integracao-storage-dashboard']) copy(isolated[label].rawFile);
const performanceArchived = copy(performanceFile); copy(typeFile, 'typecheck-final.json'); copy(browser.file, 'browser-report.json'); for (const screenshot of browser.screenshots) copy(screenshot);
for (const file of ['.tmp/gym-stabilization/storage-dashboard-d2f1d467-0631-4b83-876c-f9304f2fc816-raw.json', '.tmp/gym-stabilization/storage-dashboard-ce6f8a3b-8656-49f4-8f14-f446e4c7222b-raw.json']) { assert.equal(read(file).success, false); copy(file); }
for (const entry of fs.readdirSync('.tmp/gym-stabilization').filter(name => /^storage-browser-\d+$/.test(name))) {
  const source = '.tmp/gym-stabilization/' + entry + '/report.json'; if (!fs.existsSync(source) || read(source).success) continue;
  const diagnostic = read(source); if (diagnostic.failure) diagnostic.failure = diagnostic.failure.split('\nCall log:')[0];
  const file = target + '/' + entry + '-diagnostico.json'; fs.writeFileSync(file, JSON.stringify(diagnostic, null, 2) + '\n'); artifacts.push({ file, sha256: hash(file) });
  for (const shot of diagnostic.screenshots ?? []) if (fs.existsSync(shot)) copy(shot, entry + '-' + path.basename(shot));
}
const sources = ['src/lib/storage-quota.service.ts', 'src/lib/personal-storage-dashboard.ts', 'src/modules/workspaces/domain/personal-storage.ts', 'src/app/api/superadmin/storage/route.ts', 'src/app/(superadmin)/superadmin/storage/page.tsx', 'tests/gym/storage-dashboard.integration.ts', 'tests/gym/storage-aggregation.integration.ts', 'tests/gym/storage-browser.fixture.ts', 'tests/gym/http.spec.ts', 'vitest.gym-storage-browser.config.ts', 'scripts/gym-storage-browser.cjs', 'scripts/gym-test-storage-dashboard.cjs', 'scripts/gym-test-storage-dashboard-http.cjs', 'scripts/gym-test-storage-browser-fixture.cjs', 'scripts/gym-test-storage-dashboard-regression.cjs', 'scripts/gym-record-storage-dashboard.cjs', folder + '/storage-dashboard.md'];
const manifest = folder + '/verificacoes-storage-dashboard.json';
fs.writeFileSync(manifest, JSON.stringify({ recordedAt: new Date().toISOString(), success: true, partialFinding: 'GYM-AUD-052', integration: { passed: 278, failed: 0 }, focal: { passed: 6, failed: 0 }, http: { passed: 1, failed: 0, skipped: 71 }, browser: { scenarios: browser.scenarios, version: browser.browser, errors: [] }, typescript: { exitCode: 0 }, performance: { file: performanceArchived, samples: 20, p95Ms: performance.p95Ms, maxPayloadBytes: performance.maxPayloadBytes, synthetic: true }, sources: sources.map(file => ({ file, sha256: hash(file) })), artifacts, limitations: ['Achado 052 continua aberto pelos demais catálogos/indicadores, índices e medição operacional.', 'Resumo global agrega no PostgreSQL e paginação usa offset; latência ainda depende do volume total.', 'Latências locais em base descartável, sem SLA ou p95 de produção.', 'R2 e Ably externos desabilitados; navegador verifica paginação, teclado, filtros, resposta atrasada e retry, não inventário completo do bucket.', 'Política histórica de membership PERSONAL preservada; não afirma migração de ownership.', 'Dados sintéticos, sem implantação, upload ou alteração de clientes reais.'] }, null, 2) + '\n');
const stateFile = folder + '/tratamento.json', states = read(stateFile), state = states['GYM-AUD-052']; assert.equal(state.state, 'Pendente');
const correction = ' Administração de armazenamento agora pagina/busca/filtra no servidor, com uma consulta agregada para página e resumo global. UI cancela respostas antigas, oferece retry e não reconsulta R2 em cada página; amostra R2 identificada explicitamente. PostgreSQL volumoso, HTTP, cinco cenários Chrome e EXPLAIN/20 amostras conferidos; demais consultas e desempenho operacional seguem pendentes.';
if (!state.correction.includes('Administração de armazenamento agora pagina')) state.correction += correction;
state.files = [...new Set([...state.files, ...sources, manifest])];
const validation = '09/10/2026: 278 integrações, seis casos focais, HTTP focal, cinco cenários Chrome, TypeScript e medição local aprovados; verificacoes-storage-dashboard.json. Conclusão parcial de 052.';
if (!state.validation.includes(validation)) state.validation.push(validation);
fs.writeFileSync(stateFile, JSON.stringify(states, null, 2) + '\n');
const main = 'docs/audits/academias/estabilizacao-modulo-academias.md'; let report = fs.readFileSync(main, 'utf8');
if (!report.includes('<!-- storage-dashboard-20261009 -->')) report += '\n\n<!-- storage-dashboard-20261009 -->\n## Armazenamento administrativo — 09/10\n\nPaginação, busca, filtros, agregação global, retry e teclado verificados. [Detalhamento](estabilizacao/storage-dashboard.md) e [manifesto](estabilizacao/verificacoes-storage-dashboard.json). O achado 052 permanece parcial e o total continua em 17 achados abertos.\n';
fs.writeFileSync(main, report); console.log(JSON.stringify({ partial: ['052'], integration: 278, browser: 5, p95SyntheticMs: performance.p95Ms, remaining: 17 }));
