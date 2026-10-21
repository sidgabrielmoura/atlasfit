const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const folder = 'docs/audits/academias/estabilizacao';
const run = process.argv[2];
if (!/^run-\d+$/.test(run || '')) throw Error('Informe a rodada final específica.');
const source = `.tmp/gym-stabilization/guardian-visual/${run}`;
const result = JSON.parse(fs.readFileSync(`${source}/result.json`, 'utf8'));
assert.equal(result.success, true); assert.equal(result.failures.length, 0);
assert.equal(result.scenarios.length, 6); assert.equal(result.browserErrors.length, 0);
const reports = JSON.parse(fs.readFileSync(`${folder}/verificacoes-isoladas.json`, 'utf8'));
const checkNames = ['legal-reacceptance-runtime', 'legal-reacceptance-http', 'legal-runtime-unit-regression'];
const expected = [12, 3, 31];
for (let i = 0; i < checkNames.length; i++) { const check = reports[checkNames[i]]; assert.equal(check.success, true); assert.equal(check.passed, expected[i]); assert.equal(check.failed, 0); }
const hash = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const original = 'docs/audits/academias/achados.json';
assert.equal(hash(original), '0cc3c815e28c2590e569d515ef1c3855e0a99595066f37ed2fa0059df143c225');
const target = `${folder}/reaceite-runtime`;
fs.mkdirSync(`${target}/rodadas`, { recursive: true });
const artifacts = [];
const copy = (from, to) => { fs.copyFileSync(from, to); artifacts.push({ file: to, source: from, sha256: hash(to) }); };
for (const file of result.screenshots) copy(file, `${target}/${path.basename(file)}`);
copy(`${source}/result.json`, `${target}/result.json`);
for (const name of ['run-1791230967962', 'run-1791231142210', run]) copy(`.tmp/gym-stabilization/guardian-visual/${name}/result.json`, `${target}/rodadas/${name}.json`);
for (const name of checkNames) copy(reports[name].rawFile, `${target}/${path.basename(reports[name].rawFile)}`);
const sources = [
 'src/lib/privacy/reacceptance.ts', 'src/app/api/user/privacy/accept/route.ts',
 'src/components/privacy/legal-reacceptance-modal.tsx', 'src/lib/firebase-analytics.ts',
 'src/lib/firebase.ts', 'src/lib/notifications/service.ts', 'src/lib/firebase-analytics.test.ts',
 'tests/gym/legal-reacceptance.integration.ts', 'tests/gym/notification-preferences.integration.ts',
 'tests/gym/http.spec.ts', 'scripts/gym-guardian-visual.cjs', 'scripts/gym-remaining-report.cjs',
 'src/lib/realtime-operation.ts', 'src/lib/realtime-operation.test.ts',
 'src/providers/ably-provider.tsx', 'src/components/application/notification-bell.tsx',
];
fs.writeFileSync(`${folder}/verificacoes-reaceite-runtime.json`, JSON.stringify({
 recordedAt: new Date().toISOString(), environment: { database: 'PostgreSQL descartável 127.0.0.1:56432/atlasfit_gym_stabilization_20261001', application: 'Cópia sem .env, porta 31173', remoteBrowserRequests: 'blocked', realCredentials: false },
 checks: Object.fromEntries(checkNames.map(name => [name, reports[name]])),
 typescript: { command: 'node node_modules/typescript/bin/tsc --noEmit --pretty false', exitCode: 0, output: '', toolSession: 31464, verification: 'Saída observada da execução completa, incluindo novos testes HTTP e tratamento das operações Ably.' },
 browser: { command: 'node scripts/gym-guardian-visual.cjs', rawFile: `${source}/result.json`, exportedFile: `${target}/result.json`, ...result },
 sources: sources.map(file => ({ file, sha256: hash(file) })), artifacts,
 originalAudit: { file: original, sha256: hash(original) },
 limits: ['HTTP focal: 3 casos executados, 40 fora do filtro.', 'Compilação fria causou timeout na primeira rodada; espera ajustada para 60 segundos, asserções preservadas.', 'Ably 503/configuração ausente e logs de Engage em página pública permanecem; zero pageerror na rodada final não significa zero avisos/erros tratados.', 'Sem homologação jurídica, externa ou de produção.'],
}, null, 2));
const note = ' Lote reaceite/preferências/analytics — 05/10/2026: reaceite próprio por ID/versão/hash e confirmação literal, autoridade atual e auditoria atômica, replay/concorrência únicos, recuperação no modal. Inicialização de preferências sem P2002, analytics opcional e operações Ably de setup/cleanup sem rejeição não tratada. PostgreSQL 12/0, HTTP focal 3/0 (40 fora do filtro), unitários 31/0, TypeScript completo 0; navegador 6/0 com zero pageerror. Não encerra achados compostos; limites em reaceite-preferencias-analytics.md.';
const statesFile = `${folder}/tratamento.json`;
const states = JSON.parse(fs.readFileSync(statesFile, 'utf8'));
for (const id of ['GYM-AUD-019', 'GYM-AUD-044', 'GYM-AUD-049', 'GYM-AUD-050']) {
 const state = states[id];
 if (!state.correction.includes('Lote reaceite/preferências/analytics')) { state.correction += note; state.validation.push(note.trim()); }
 state.files = [...new Set([...state.files, ...sources, `${folder}/reaceite-preferencias-analytics.md`, `${folder}/verificacoes-reaceite-runtime.json`, `${folder}/pendencias-restantes.md`])];
}
fs.writeFileSync(statesFile, JSON.stringify(states, null, 2));
const annex = `${folder}/reaceite-preferencias-analytics.md`;
let text = fs.readFileSync(annex, 'utf8');
text = text.replace('Os resultados finais, capturas, comandos e hashes serão registrados no manifesto deste lote.', `Resultados finais: **12 testes PostgreSQL, 3 HTTP e 31 unitários passaram, sem falhas; TypeScript completo saiu com código 0. Seis jornadas de navegador passaram, zero pageerror e 13 capturas.** O filtro HTTP deixou 40 casos sem executar. Resultados, comandos e hashes estão em [verificacoes-reaceite-runtime.json](verificacoes-reaceite-runtime.json).`);
text += '\nA jornada nova comprovou conflito real de hash sem escrita, duas tentativas de clique com um envio, recarga 503 com confirmação bloqueada, retry, caixa desmarcada e aceite próprio do hash atualizado. Compare [falha de recarga](reaceite-runtime/reaceite-recarga-erro-desktop.png) e [documento atual](reaceite-runtime/reaceite-atual-desktop.png). As cinco jornadas anteriores de convite/portal/operador também passaram. A primeira rodada ficou no Skeleton durante compilação fria; seu resultado está preservado no manifesto.\n';
fs.writeFileSync(annex, text);
const main = 'docs/audits/academias/estabilizacao-modulo-academias.md';
let content = fs.readFileSync(main, 'utf8');
const marker = '## Reaceite e estabilidade do cliente — 05/10';
if (!content.includes(marker)) content += `\n${marker}\n\nO [lote de reaceite, preferências e analytics](estabilizacao/reaceite-preferencias-analytics.md) completa três pendências observadas na validação visual anterior e o tratamento de rejeições no setup/cleanup Ably. PostgreSQL 12/0, HTTP focal 3/0, unitários 31/0, TypeScript completo 0 e seis jornadas no navegador com zero pageerror. Achados compostos permanecem abertos. A [lista exaustiva do restante](estabilizacao/pendencias-restantes.md) reúne os 40 achados abertos e Personal vinculado por último.\n`;
fs.writeFileSync(main, content);
console.log(JSON.stringify({ run, screenshots: result.screenshots.length, copied: artifacts.length, originalAuditUnchanged: true }));
