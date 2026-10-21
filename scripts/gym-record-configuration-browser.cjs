const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const folder = 'docs/audits/academias/estabilizacao';
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const hash = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
assert.equal(hash('docs/audits/academias/achados.json'), '0cc3c815e28c2590e569d515ef1c3855e0a99595066f37ed2fa0059df143c225');
const browser = read(folder + '/verificacoes-configuracao-browser.json');
assert.equal(browser.success, true); assert.equal(browser.scenarios.length, 7); assert.deepEqual(browser.errors, []);
assert(browser.viewportChecks.every(check => check.scrollWidth <= check.width + 1));
const fixture = read(folder + '/verificacoes-isoladas.json')['configuration-browser-fixture'];
assert.equal(fixture.success, true); assert.equal(fixture.passed, 1); assert.equal(fixture.failed, 0);
const typeFile = folder + '/typecheck-configuracao-browser.json'; assert.equal(read(typeFile).exitCode, 0);
const target = folder + '/configuracao'; fs.mkdirSync(target, { recursive: true });
const artifacts = [];
function copy(source, name = path.basename(source)) {
  const file = target + '/' + name; fs.copyFileSync(source, file); artifacts.push({ file, sha256: hash(file) }); return file;
}
const browserFile = copy(browser.file, path.basename(path.dirname(browser.file)) + '-report.json');
for (const shot of browser.screenshots) copy(shot);
// Preserve failed/intermediate reports without publishing credentials from fixture files.
for (const name of fs.readdirSync('.tmp/gym-stabilization').filter(name => /^configuration-browser-\d+$/.test(name))) {
  const file = '.tmp/gym-stabilization/' + name + '/report.json'; if (fs.existsSync(file) && file !== browser.file) copy(file, name + '-report.json');
}
const sources = ['src/app/(superadmin)/superadmin/workspaces/[id]/page.tsx', 'src/app/(superadmin)/superadmin/gym-settings/page.tsx', 'src/modules/workspaces/domain/gym-config.ts', 'src/modules/workspaces/application/superadmin-service.ts', 'src/modules/workspaces/application/gym-feature-flags-service.ts', 'src/app/api/superadmin/gym-settings/route.ts', 'tests/gym/configuration-browser.fixture.ts', 'scripts/gym-configuration-browser.cjs', 'scripts/gym-configuration-browser-run.cjs', 'vitest.gym-configuration-browser.config.ts', 'scripts/gym-record-configuration-browser.cjs'];
const manifest = folder + '/verificacoes-configuracoes.json';
fs.writeFileSync(manifest, JSON.stringify({ recordedAt: new Date().toISOString(), browser: { file: browserFile, sha256: hash(browserFile), scenarios: browser.scenarios, errors: [], realApplication: true }, fixture: { ...fixture, rawFile: copy(fixture.rawFile) }, typescript: { file: copy(typeFile), exitCode: 0 }, artifacts, sources: sources.map(file => ({ file, sha256: hash(file) })), environment: { database: 'PostgreSQL descartável 127.0.0.1:56432', configuredDatabaseChanged: false, deployed: false, browser: browser.browser }, limitations: ['Falhas de GET foram induzidas no transporte do navegador; PATCH/POST, login, concorrência e persistência usaram aplicação Next e PostgreSQL reais.', 'A verificação cobre estas configurações, sem homologar todas as superfícies do achado 051.'] }, null, 2) + '\n');
const stateFile = folder + '/tratamento.json', states = read(stateFile);
for (const suffix of ['013', '016']) {
  const state = states['GYM-AUD-' + suffix];
  if (state.completedBatch !== 'configuration-browser-20261008') { state.history ??= []; state.history.push({ batch: 'before-configuration-browser-20261008', state: state.state, correction: state.correction }); }
  state.state = 'Corrigido e verificado'; state.completedBatch = 'configuration-browser-20261008';
  state.correction += suffix === '013' ? ' Endereço string da unidade exibido corretamente, licença lida mesmo sem settings, bloqueio de campos durante save e confirmação por GET antes do sucesso; layout/abas corrigidos no celular.' : ' Falha de leitura, recuperação, drafts de administradores distintos, preservação de campos diferentes e conflito no mesmo campo verificados no navegador.';
  state.currentConfirmation = 'Sete cenários Chrome com aplicação Next e PostgreSQL descartável aprovados; recarga, confirmação após escrita, falha induzida, unidade/endereço, concorrência, teclado e celular. TypeScript aprovado; sem implantação.';
  state.validation.push('08/10/2026: sete cenários reais de configuração no Chrome, zero pageerrors, persistência conferida por GET/SQL, teclado e viewports 1440/390; verificacoes-configuracoes.json.');
  state.files = [...new Set([...state.files, ...sources.filter(file => !file.startsWith('scripts/')), manifest])];
}
fs.writeFileSync(stateFile, JSON.stringify(states, null, 2) + '\n');
const main = 'docs/audits/academias/estabilizacao-modulo-academias.md'; let report = fs.readFileSync(main, 'utf8');
report = report.replace(/Posição atual após os pontos 1, 2 e 3[^\r\n]+/, 'Posição atual após implementação e verificações: 29 achados corrigidos e verificados, 13 retirados do escopo, 1 implementado aguardando verificação específica e 22 pendentes. São 23 achados abertos, detalhados na lista exaustiva.');
if (!report.includes('<!-- configuration-browser-20261008 -->')) report += '\n\n<!-- configuration-browser-20261008 -->\n## Configurações verificadas — 08/10\n\nOs achados 013 e 016 foram corrigidos e verificados em sete cenários Chrome/Next/PostgreSQL. Endereço de unidade, recarga, falha de confirmação, concorrência, teclado e celular passaram. O [manifesto](estabilizacao/verificacoes-configuracoes.json) conserva resultados, capturas e falhas intermediárias. Restam 23 achados abertos.\n';
fs.writeFileSync(main, report);
console.log(JSON.stringify({ closed: ['013', '016'], remaining: 23, browser: 7 }));
