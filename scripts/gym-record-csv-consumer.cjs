const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), { createHash } = require('node:crypto');
const folder = 'docs/audits/academias/estabilizacao';
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const hash = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
assert.equal(hash('docs/audits/academias/achados.json'), '0cc3c815e28c2590e569d515ef1c3855e0a99595066f37ed2fa0059df143c225');
const native = read('.tmp/gym-csv-consumer/latest.json'), run = path.dirname(native.file), verification = read(run + '/verification.json');
assert.equal(verification.success, true); assert.equal(verification.checks.length, 4);
const isolated = read(folder + '/verificacoes-isoladas.json');
for (const key of ['csv-consumer-fixture', 'integracao-seguranca-completa']) assert.equal(isolated[key].success, true);
assert.equal(read(folder + '/typecheck-csv-consumer.json').exitCode, 0);
const target = folder + '/csv-consumidor'; fs.mkdirSync(target, { recursive: true }); const artifacts = [];
function copy(source, name = path.basename(source)) { const file = target + '/' + name; fs.copyFileSync(source, file); artifacts.push({ file, sha256: hash(file) }); return file; }
copy(native.file); copy(run + '/cells.json'); copy(run + '/verification.json'); copy('.tmp/gym-csv-consumer/expected.json');
for (const kind of ['students', 'invoices']) {
  copy('.tmp/gym-csv-consumer/input/' + kind + '.csv', kind + '-original.csv');
  for (const stage of ['opened', 'reopened']) copy(run + '/' + stage + '/' + kind + '.ods', kind + '-' + stage + '.ods');
  copy(run + '/saved/' + kind + '.csv', kind + '-salvo.csv');
}
for (const key of ['csv-consumer-fixture', 'integracao-seguranca-completa']) copy(isolated[key].rawFile);
copy(folder + '/typecheck-csv-consumer.json');
const sources = ['src/modules/workspaces/domain/spreadsheet-csv.ts', 'tests/gym/operation-authority.integration.ts', 'tests/gym/csv-consumer.fixture.ts', 'scripts/gym-prepare-csv-consumer.ps1', 'scripts/gym-csv-consumer.cjs', 'scripts/gym-inspect-csv-consumer.ps1', 'scripts/gym-verify-csv-consumer.cjs'];
const manifest = folder + '/verificacoes-csv-consumidor.json';
fs.writeFileSync(manifest, JSON.stringify({ recordedAt: new Date().toISOString(), success: true, consumer: native.consumer, packageSha256: native.packageSha256, nativeConversions: 6, checks: verification.checks, integration: { passed: isolated['integracao-seguranca-completa'].passed, failed: 0 }, typescript: { exitCode: 0 }, sources: sources.map(file => ({ file, sha256: hash(file) })), artifacts, limitations: verification.limitations, verified: ['Exportações reais com dez nomes sintéticos, fórmulas/controles/Unicode, telefone, aspas/acento/separador, dinheiro e datas.', 'Abertura, salvamento e reabertura pelo motor nativo; nenhuma fórmula executada, tipos e valores conferidos nos ODS.', 'Reprodução preservada revelou perda de centavos acima de 15 dígitos. Correção mantém esses valores como texto e valores menores como números.'] }, null, 2) + '\n');
const stateFile = folder + '/tratamento.json', states = read(stateFile), state = states['GYM-AUD-059'];
if (state.completedBatch !== 'csv-consumidor-20261008') { state.history ??= []; state.history.push({ batch: 'before-csv-consumidor-20261008', state: state.state, correction: state.correction }); }
state.state = 'Corrigido e verificado'; state.completedBatch = 'csv-consumidor-20261008';
state.correction = 'CSV neutraliza conteúdo humano interpretável como fórmula. Valores monetários com mais de 15 dígitos significativos recebem prefixo de texto, preservando centavos ao salvar; valores menores permanecem numéricos. Exportações reais sintéticas de alunos/faturas abriram, foram salvas e reabertas no LibreOffice Calc 26.8.1, com zero fórmulas e preservação dos valores, telefone e datas ISO. Localidades de importação e reabertura estão declaradas no manifesto; não declara teste no Excel.';
state.currentConfirmation = 'Seis conversões nativas e quatro inspeções de células aprovadas; 264 integrações e TypeScript aprovados. Pacote oficial extraído apenas na pasta temporária, sem instalação global.';
state.files = [...new Set([...state.files, ...sources, manifest])]; state.validation.push('08/10/2026: consumidor nativo LibreOffice Calc 26.8.1 abre/salva/reabre exportações reais; verificacoes-csv-consumidor.json e ODS/CSV.');
fs.writeFileSync(stateFile, JSON.stringify(states, null, 2) + '\n');
const main = 'docs/audits/academias/estabilizacao-modulo-academias.md'; let report = fs.readFileSync(main, 'utf8');
report = report.replace(/Posição atual após implementação e verificações:[^\r\n]+/, 'Posição atual após implementação e verificações: 32 achados corrigidos e verificados, 13 retirados do escopo, 2 implementados aguardando verificação específica e 18 pendentes. São 20 achados abertos, detalhados na lista exaustiva.');
if (!report.includes('<!-- csv-consumidor-20261008 -->')) report += '\n\n<!-- csv-consumidor-20261008 -->\n## CSV em consumidor nativo — 08/10\n\nO achado 059 foi corrigido e verificado com abertura, salvamento e reabertura das exportações reais sintéticas no LibreOffice. A verificação detectou e corrigiu perda de centavos em números grandes, que agora são texto. [Evidências e limites](estabilizacao/verificacoes-csv-consumidor.json). Restam 20 achados abertos.\n';
fs.writeFileSync(main, report); console.log(JSON.stringify({ closed: ['059'], remaining: 20 }));
