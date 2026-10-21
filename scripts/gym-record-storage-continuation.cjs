const fs = require('node:fs');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const folder = 'docs/audits/academias/estabilizacao';
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const journal = read(`${folder}/verificacoes-isoladas.json`);
const r2 = journal['r2-http-real'];
const inventory = read(`${folder}/inventario-r2-real.json`);
const billings = read(`${folder}/evidencias-cobrancas-legadas.json`);
const preflight = read(`${folder}/preflight-tenant-real.json`);
const initial = read('.tmp/gym-stabilization/continuacao-suite-atual.json');
const regression = read('.tmp/gym-stabilization/continuacao-suite-regressao.json');
assert.equal(r2?.success, true); assert.equal(r2.passed, 4); assert.equal(r2.failed, 0); assert.equal(r2.skipped, 0);
assert.equal(inventory.success, true); assert.equal(inventory.completeListing, true); assert.equal(inventory.readOnly, true); assert.equal(inventory.deletesExecuted, 0);
assert.equal(billings.success, true);
const files = ['scripts/gym-http-isolated.cjs', 'scripts/gym-r2-http.cjs', 'scripts/gym-r2-inventory.cjs', 'scripts/gym-billing-evidence.cjs', 'tests/services/r2-http.external.ts', 'vitest.r2-http.config.ts', 'vitest.services.config.ts', 'src/modules/workspaces/__tests__/gym-020.test.ts', 'src/modules/workspaces/__tests__/gym-021.test.ts', 'src/modules/workspaces/__tests__/gym-023.test.ts', 'src/modules/workspaces/__tests__/workspace-guard.test.ts'];
const hashes = Object.fromEntries(files.map(file => [file, createHash('sha256').update(fs.readFileSync(file)).digest('hex')]));
const cases = report => report.testResults.flatMap(file => file.assertionResults.map(test => ({ file: file.name.replaceAll('\\', '/').replace(process.cwd().replaceAll('\\', '/') + '/', ''), name: test.fullName, status: test.status })));
const manifest = {
 recordedAt: new Date().toISOString(), scope: 'Retomada dos cinco restantes; 047 concluído, 029/030/046/050 permanecem abertos.',
 configuredDatabaseChanged: false, legacyR2ObjectsDeleted: 0, asaasCommandsExecuted: 0,
 r2Http: r2, inventoryFile: `${folder}/inventario-r2-real.json`, billingEvidenceFile: `${folder}/evidencias-cobrancas-legadas.json`, preflightFile: `${folder}/preflight-tenant-real.json`,
 unitInitial: { passed: initial.numPassedTests, failed: initial.numFailedTests, skipped: initial.numPendingTests, rawFile: '.tmp/gym-stabilization/continuacao-suite-atual.json' },
 unitCurrent: { passed: regression.numPassedTests, failed: regression.numFailedTests, skipped: regression.numPendingTests, success: regression.success, rawFile: '.tmp/gym-stabilization/continuacao-suite-regressao.json', cases: cases(regression) },
 typecheck: { command: 'npx tsc --noEmit --incremental --tsBuildInfoFile .tmp/gym-stabilization/typecheck-continuacao.tsbuildinfo', exitCode: 0 },
 sourceHashes: hashes,
 limitations: ['A suíte completa continua reprovada; não declarar homologação transversal.', 'Inventário de candidatos a órfãos não é autorização de exclusão.', 'Seis cobranças sem workspace candidato; uma com candidato sem prova da obrigação. Credenciais de subconta ausentes nas sete; sem conferência externa.', 'Preflight somente em leitura; readyToMigrate continua false. Sem implantação ou backfill real.', 'Leitor de tela humano, revisão jurídica, piloto e PERSONAL vinculado não foram concluídos.'],
};
const states = read(`${folder}/tratamento.json`);
function preserve(id) { const row=states[id]; row.history ??= []; if (!row.history.some(item => item.batch === 'before-storage-continuation-20261011')) row.history.push({ batch: 'before-storage-continuation-20261011', state: row.state, correction: row.correction, currentConfirmation: row.currentConfirmation }); }
for (const id of ['GYM-AUD-029','GYM-AUD-030','GYM-AUD-046','GYM-AUD-047','GYM-AUD-050']) preserve(id);
const addFiles = (id, paths) => { states[id].files=[...new Set([...states[id].files,...paths])]; };
states['GYM-AUD-047'].state = 'Corrigido e verificado';
states['GYM-AUD-047'].correction = 'R2 real verificado pelo HTTP da aplicação em banco descartável: reserva/PUT/HEAD/finalização, GET privado/range/hash, replay e tamanho adulterado, quota concorrente, expiração sem liberação fictícia, exclusão administrativa e revogação de licença. Limpeza dos objetos sintéticos confirmada por HEAD 404. Inventário completo do bucket configurado cruzado com colunas de referências do schema real em READ ONLY: 67 objetos, 34 referenciados e 33 candidatos a órfãos, zero referências ausentes/URLs R2 sem chave recuperável. Candidatos não foram excluídos nem atribuídos a tenants sem evidência. Verificação delimita armazenamento; implantação permanece em 046 e piloto em 050.';
states['GYM-AUD-047'].currentConfirmation = '11/10/2026: quatro jornadas R2 HTTP reais/0 falhas/0 skips, inventário completo em uma página/READ ONLY, TypeScript exit 0. Manifesto verificacoes-retomada-armazenamento.json; banco real e objetos legados preservados.';
states['GYM-AUD-047'].validation.push(states['GYM-AUD-047'].currentConfirmation);
addFiles('GYM-AUD-047',files.filter(file=>/r2|gym-http-isolated/.test(file)).concat([`${folder}/inventario-r2-real.json`,`${folder}/retomada-armazenamento-legado.md`,`${folder}/verificacoes-retomada-armazenamento.json`]));
for(const id of ['GYM-AUD-029','GYM-AUD-030']) {
 states[id].correction += ' Retomada 11/10/2026: investigação READ ONLY das sete cobranças PRODUCTION: seis sem vínculo interno com workspace PERSONAL do titular e uma com candidato único, ainda sem prova da obrigação. Todas sem subscription e sem credencial de subconta persistida. Nenhuma consulta/comando Asaas nem backfill executado.';
 addFiles(id,['scripts/gym-billing-evidence.cjs',`${folder}/evidencias-cobrancas-legadas.json`,`${folder}/retomada-armazenamento-legado.md`]);
}
states['GYM-AUD-046'].correction += ` Retomada 11/10/2026: preflight real em READ ONLY executado novamente; readyToMigrate=${preflight.readyToMigrate}. Relações indisponíveis no schema instalado não foram reportadas como zero divergências. Sem implantação/backfill real.`;
addFiles('GYM-AUD-046',[`${folder}/preflight-tenant-real.json`,`${folder}/retomada-armazenamento-legado.md`]);
states['GYM-AUD-050'].correction += ` Retomada 11/10/2026: reconstruídas fixtures de guard, contexto, titularidade, backfill e provisionamento, com licença, grants, administrador e unidades. Expectativas respeitam resolução somente em leitura, seleção explícita, ausência de fallback após grants e retirada de hardware/turmas. Quatro arquivos/47 casos aprovados, incluindo duas novas recusas de ator. Suíte unitária completa passou de ${initial.numPassedTests}/${initial.numFailedTests} para ${regression.numPassedTests}/${regression.numFailedTests}, sem skips; as ${regression.numFailedTests} falhas continuam abertas, sem atribuição automática a mocks. TypeScript exit 0. Sem homologação humana/operacional.`;
addFiles('GYM-AUD-050',files.filter(file=>file.includes('__tests__')).concat([`${folder}/verificacoes-retomada-armazenamento.json`,`${folder}/retomada-armazenamento-legado.md`]));
assert.equal(Object.keys(states).length,65);
fs.writeFileSync(`${folder}/verificacoes-retomada-armazenamento.json`,JSON.stringify(manifest,null,2)+'\n');
fs.writeFileSync(`${folder}/tratamento.json`,JSON.stringify(states,null,2)+'\n');
require('./gym-stabilization-report.cjs');
console.log(JSON.stringify({ closed: ['GYM-AUD-047'], open: Object.entries(states).filter(([,row])=>row.state==='Pendente').map(([id])=>id), currentUnitPassed:regression.numPassedTests,currentUnitFailed:regression.numFailedTests }));
