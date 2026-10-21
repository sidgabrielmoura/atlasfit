const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const root = path.resolve(__dirname, '..'), folder = 'docs/audits/academias/estabilizacao';
const read = name => JSON.parse(fs.readFileSync(path.join(root, folder, name), 'utf8'));
const journal = read('verificacoes-isoladas.json');
const unit = journal['finalizar-unitarios'], integration = journal.postgresql, http = read('verificacoes-http-entrega.json');
const build = read('verificacoes-final-build.json'), install = read('verificacoes-final-install.json');
const migrations = read('verificacoes-tenant-deploy.json'), transition = read('verificacoes-transicao-legado.json'), browser = read('verificacoes-personal-afiliado-browser.json');
for (const [value, count] of [[unit, 262], [integration, 351]]) { assert(value.success && value.exitCode === 0); assert.equal(value.passed, count); assert.equal(value.failed, 0); assert.equal(value.skipped, 0); }
assert(http.success); assert.equal(http.selected.length, 79); assert.equal(http.passed, 79); assert.equal(http.failed, 0);
const httpAssertions = http.finalAssertions;
assert.equal(new Set(httpAssertions.map(item => item.fullName)).size, 79); assert(http.selected.every(name => httpAssertions.some(item => item.fullName === name)));
assert(build.success && install.success); assert(migrations.success); assert.equal(migrations.appliedMigrations.length, 8);
assert(transition.finalTriggerDefinitionsMatch); assert.equal(transition.syntheticBillingsPreserved, 7); assert.equal(transition.copiedHistoricalMigrationNames, 36); assert.equal(transition.finalTriggerCount, 201);
assert(browser.success && browser.appMode === 'production'); assert.equal(browser.scenarios.length, 6); assert.equal(browser.errors.length, 0); assert(browser.viewportChecks.every(item => item.scrollWidth <= item.width + 1));
const hash = file => createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
assert.equal(hash('package.json'), install.manifestSha256); assert.equal(hash('package-lock.json'), install.lockSha256);
function enumerate(relative, base = root) { const location = path.join(base, relative); return fs.statSync(location).isDirectory() ? fs.readdirSync(location).sort().flatMap(item => enumerate(relative + '/' + item, base)) : [relative]; }
const buildRoot = path.join(root, '.tmp/gym-final-build');
const sourceFiles = ['src', 'public', 'prisma'].flatMap(directory => enumerate(directory));
assert.deepEqual(sourceFiles, ['src', 'public', 'prisma'].flatMap(directory => enumerate(directory, buildRoot)), 'Build source inventory differs.');
for (const file of sourceFiles) assert(fs.readFileSync(path.join(root, file)).equals(fs.readFileSync(path.join(buildRoot, file))), 'Build differs: ' + file);
const capturesFolder = folder + '/entrega-capturas'; fs.mkdirSync(path.join(root, capturesFolder), { recursive: true });
const captures = browser.screenshots.map(file => { const target = capturesFolder + '/' + path.basename(file); fs.copyFileSync(path.join(root, file), path.join(root, target)); return { file: target, sha256: hash(target) }; });
const summary = { unit: unit.passed, integration: integration.passed, http: http.passed, totalAutomatedTests: unit.passed + integration.passed + http.passed, browserScenarios: browser.scenarios.length, productionBuild: true, cleanInstall: true, migrations: 8 };
const report = {
  recordedAt: new Date().toISOString(), success: true, summary, publicationMode: 'manual publication from project folder; no ZIP requested',
  configuredDatabaseChanged: false, deploymentExecuted: false, externalFinancialCommandsExecuted: 0,
  unit, integration, http: { ...http, assertions: httpAssertions.map(item => ({ name: item.fullName, status: item.status, durationMs: item.duration })) },
  build, install, migrations, transition, browser: { ...browser, command: 'node scripts/gym-affiliation-browser-run.cjs --production', captures },
  sourceHashes: [...sourceFiles, 'package.json', 'package-lock.json', 'next.config.ts', 'tsconfig.json', 'prisma.config.ts', 'prisma.baseline.config.ts'].map(file => ({ file, sha256: hash(file) })),
  externalAcceptances: ['029: controlled Asaas validation and documentary links', '030: documentary explanation of charges and GYM opening balance', '046: manual publication, real migration and hosted scheduler', '050: human accessibility/representation and hosted pilot'],
  limitations: ['Clean install verified on Windows Node 24.14.1; target host installation remains manual.', 'Database/HTTP/browser tests use disposable PostgreSQL and synthetic accounts; no configured database migration or financial transaction was performed.', 'Local automation does not replace provider validation, human/legal acceptance or hosted capacity measurements.'],
};
fs.writeFileSync(path.join(root, folder, 'verificacoes-entrega-final.json'), JSON.stringify(report, null, 2) + '\n');
const md = [
  '# Entrega final para publicação manual', '', '13/10/2026. Código concluído e PERSONAL vinculado implementado. O usuário escolheu publicar manualmente a partir da pasta do projeto, sem ZIP. Fonte, assets, lock npm, SDK local, histórico/cadeia de migrations, testes, configuração de exemplo e instruções estão nessa pasta.', '',
  '| Verificação | Resultado |', '|---|---|', '| Unitários | 262 passaram; zero falhas/pendentes |', '| PostgreSQL isolado | 351 passaram; zero falhas/pendentes |', '| HTTP isolado | 79 passaram; conjunto completo conferido por nome |', '| Navegador no build de produção | Seis cenários; cinco capturas; zero erro JavaScript/overflow |', '| Build com TypeScript | Aprovado; fonte compilada comparada arquivo a arquivo |', '| Instalação npm ci em pasta nova | Aprovada; package/lock atuais conservam os hashes validados |', '| Migrations em banco novo | Oito aplicadas; repetição, status e diff aprovados |', '| Transição legada sintética | Sete cobranças; 36 nomes/checksums históricos e 201 gatilhos conservados |', '',
  'São **692 testes automatizados** de unidade/PostgreSQL/HTTP, além de navegador e build/instalação/banco. Datas, nomes e hashes estão no [manifesto](verificacoes-entrega-final.json). Lotes anteriores permanecem históricos.', '',
  'O conjunto HTTP combina a suíte completa e uma repetição de despesa manual após um 404 no servidor de desenvolvimento. Esse fluxo foi confirmado também no build de produção, incluindo a preservação do pagamento na tentativa com tenant estrangeiro. Os relatórios brutos preservam a falha inicial e as reexecuções.', '',
  'O navegador verificou agenda CRUD com autor no PostgreSQL, navegação desktop/celular, ausência de preload comercial PERSONAL no GYM, switcher, trial revogado, paywall, checkout sem gateway e retorno à academia com e sem cookie prévio. Ver [implementação](personal-vinculado-implementacao.md).', '',
  'A migration final acrescenta autoria à agenda e conserva tarefas legadas sem atribuição inferida. A prévia da transição configurada foi obtida em leitura: 10.085 bytes, sem instrução destrutiva detectada. Execução real exige backup, revisão e conferência; o preflight configurado não autoriza migrar.', '',
  'Use README-PUBLICACAO.md na raiz, .env.example e o [guia de implantação](implantacao-manual-hostinger.md). O [roteiro manual](homologacao-manual-quatro.md) registra aceites externos 029, 030, 046 e 050. As sete cobranças antigas e o saldo sem comprovantes não foram reconciliados por inferência. Não houve implantação, migration/backfill configurado ou comando financeiro externo.', '',
  'Instalação limpa: Windows Node 24.14.1. O host deve instalar e compilar em seu sistema. Não envie credenciais, node_modules, .next, .tmp, .env ou exportações de clientes ao publicar o código. O Playwright 1.63.0 usado na QA foi instalado separadamente em .tmp/gym-visual-runner, com Chrome local; não é dependência de execução da aplicação.', '',
  '## Capturas sintéticas', '', ...captures.map(item => '- [' + path.basename(item.file) + '](entrega-capturas/' + path.basename(item.file) + ')'), '',
].join('\n');
fs.writeFileSync(path.join(root, folder, 'entrega-final-manual.md'), md);
require('./gym-remaining-release-report.cjs');
console.log(JSON.stringify({ success: true, ...summary }));
