const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), { createHash } = require('node:crypto');
const folder = 'docs/audits/academias/estabilizacao';
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const hash = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
assert.equal(hash('docs/audits/academias/achados.json'), '0cc3c815e28c2590e569d515ef1c3855e0a99595066f37ed2fa0059df143c225');
const browser = read(folder + '/verificacoes-contexto-browser.json');
assert.equal(browser.success, true); assert.equal(browser.scenarios.length, 7); assert.deepEqual(browser.errors, []);
const isolated = read(folder + '/verificacoes-isoladas.json');
const http = isolated['contexto-http'];
assert.equal(http.success, true); assert.equal(http.passed, 1); assert.equal(http.failed, 0);
assert(http.assertions.filter(row => row.status === 'passed').every(row => row.name.startsWith('HTTP contexto PERSONAL e trial')));
for (const [label, passed] of [['contexto-trial-regra', 1], ['personal-shared-unit', 77], ['context-browser-fixture', 1]]) {
  assert.equal(isolated[label].success, true); assert.equal(isolated[label].passed, passed);
}
const typeFile = folder + '/typecheck-contexto-final.json'; assert.equal(read(typeFile).exitCode, 0);
const target = folder + '/contexto-workspace'; fs.mkdirSync(target, { recursive: true }); const artifacts = [];
function copy(source, name = path.basename(source)) {
  const file = target + '/' + name; fs.copyFileSync(source, file); artifacts.push({ file, sha256: hash(file) }); return file;
}
copy(browser.file, 'browser-report.json'); for (const shot of browser.screenshots) copy(shot);
const httpFile = copy(http.rawFile);
for (const label of ['contexto-trial-regra', 'personal-shared-unit', 'context-browser-fixture']) copy(isolated[label].rawFile);
copy(typeFile);
// Preserve failed browser diagnostics; never copy fixture credentials.
for (const name of ['context-browser-1791512253742', 'context-browser-1791512462362', 'context-browser-1791512678380', 'context-browser-1791512925640', 'context-browser-1791513416203', 'context-browser-1791513903114']) {
  const reportFile = '.tmp/gym-stabilization/' + name + '/report.json';
  if (!fs.existsSync(reportFile) || read(reportFile).success) continue;
  const diagnostic = read(reportFile); if (diagnostic.failure) diagnostic.failure = diagnostic.failure.split('\nCall log:')[0];
  const archived = target + '/' + name + '-report.json'; fs.writeFileSync(archived, JSON.stringify(diagnostic, null, 2) + '\n'); artifacts.push({ file: archived, sha256: hash(archived) });
  for (const shot of diagnostic.screenshots ?? []) if (fs.existsSync(shot)) copy(shot, name + '-' + path.basename(shot));
}
const sources = ['src/app/(gym)/layout.tsx', 'src/app/(personal)/personal/layout.tsx', 'src/app/api/personal/dashboard/route.ts', 'src/app/api/personal/subscription/route.ts', 'src/app/subscription-expired/page.tsx', 'src/app/select-workspace/select-workspace-client.tsx', 'src/components/application/workspace-switcher.tsx', 'src/modules/workspaces/domain/personal-trial.ts', 'tests/gym/personal-trial.integration.ts', 'tests/gym/http.spec.ts', 'tests/gym/context-browser.fixture.ts', 'scripts/gym-context-browser.cjs', 'scripts/gym-context-browser-run.cjs', 'docs/audits/academias/estabilizacao/contexto-workspace-trial.md'];
const manifest = folder + '/verificacoes-contexto-workspace.json';
fs.writeFileSync(manifest, JSON.stringify({ recordedAt: new Date().toISOString(), success: true, browser: { scenarios: browser.scenarios, browser: browser.browser, cookieChecks: browser.cookieChecks }, http: { file: httpFile, passed: 1, failed: 0 }, trialMatrix: { passed: 1 }, personalRegression: { passed: 77 }, typescript: { exitCode: 0 }, sources: sources.map(file => ({ file, sha256: hash(file) })), artifacts, limitations: ['Next/Chrome/PostgreSQL reais com dados sintéticos e banco descartável; sem implantação ou alteração de clientes reais.', 'Nenhuma compra, cobrança ou mensagem externa acionada; regressão de gateway permanece no achado 029.', 'Não implementa PERSONAL vinculado à academia; esse estudo permanece para a etapa final.', 'Realtime externo desabilitado neste ensaio; homologação de Ably possui evidência separada.'] }, null, 2) + '\n');
const stateFile = folder + '/tratamento.json', states = read(stateFile), state = states['GYM-AUD-048'];
if (state.completedBatch !== 'contexto-workspace-20261009') { state.history ??= []; state.history.push({ batch: 'before-contexto-workspace-20261009', state: state.state, correction: state.correction }); }
state.state = 'Corrigido e verificado'; state.completedBatch = 'contexto-workspace-20261009';
state.correction = 'Layouts GYM/PERSONAL inicializam workspace, papéis e rota pelo contexto autorizado do servidor. Dashboard PERSONAL valida tipo, vínculo e cookie; contexto anterior recebe 409. Trial exige flag ativa e intervalo válido; paywall consome a decisão da API. Quota PERSONAL exclui alunos GYM. Seleção por teclado aguarda inicialização e o CTA de upgrade abre assinatura real. Gerente/financeiro, recarga, retorno GYM/PERSONAL, cookies HTTP-only e trial revogado conferidos no navegador.';
state.currentConfirmation = 'Sete cenários Chrome na aplicação Next/PostgreSQL, um caso HTTP focal, matriz temporal de trial, 77 regressões PERSONAL e TypeScript aprovados. Rotas canônicas de login respondem 200. Trial preservado entre workspaces e nenhum pagamento criado.';
state.files = [...new Set([...state.files, ...sources, manifest])];
state.validation.push('09/10/2026: contexto, trial, quota e upgrade verificados em Chrome desktop/celular e HTTP; verificacoes-contexto-workspace.json.');
fs.writeFileSync(stateFile, JSON.stringify(states, null, 2) + '\n');
const remaining = Object.values(states).filter(row => row.state === 'Pendente' || row.state.startsWith('Implementado')).length;
const corrected = Object.values(states).filter(row => row.state === 'Corrigido e verificado').length;
const pending = Object.values(states).filter(row => row.state === 'Pendente').length;
const main = 'docs/audits/academias/estabilizacao-modulo-academias.md'; let report = fs.readFileSync(main, 'utf8');
report = report.replace(/Posição atual após implementação e verificações:[^\r\n]+/, `Posição atual após implementação e verificações: ${corrected} achados corrigidos e verificados, 13 retirados do escopo, 2 implementados aguardando verificação específica e ${pending} pendentes. São ${remaining} achados abertos, detalhados na lista exaustiva.`);
if (!report.includes('<!-- contexto-workspace-20261009 -->')) report += `\n\n<!-- contexto-workspace-20261009 -->\n## Contexto e trial — 09/10\n\nO achado 048 foi corrigido e verificado: seleção/recarga, papéis, retorno GYM/PERSONAL, quota, trial revogado e upgrade real. [Manifesto](estabilizacao/verificacoes-contexto-workspace.json). Restam ${remaining} achados abertos.\n`;
fs.writeFileSync(main, report); console.log(JSON.stringify({ closed: ['048'], remaining }));
