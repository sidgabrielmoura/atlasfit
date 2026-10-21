const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const folder = 'docs/audits/academias/estabilizacao';
const checks = JSON.parse(fs.readFileSync(`${folder}/verificacoes-isoladas.json`, 'utf8'));
const names = ['enrollment-approved-policy', 'enrollment-approved-policy-http', 'enrollment-policy-migration'];
const expected = [46, 2, 2];
for (let i = 0; i < names.length; i++) { assert.equal(checks[names[i]].success, true); assert.equal(checks[names[i]].passed, expected[i]); assert.equal(checks[names[i]].failed, 0); }
const hash = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const original = 'docs/audits/academias/achados.json';
assert.equal(hash(original), '0cc3c815e28c2590e569d515ef1c3855e0a99595066f37ed2fa0059df143c225');
const target = `${folder}/politicas-matricula`;
fs.mkdirSync(target, { recursive: true });
const artifacts = [];
for (const file of fs.readdirSync('.tmp/gym-stabilization').filter(file => /^enrollment-(approved-policy|approved-policy-http|policy-migration)-.+-raw\.json$/.test(file))) {
 const source = `.tmp/gym-stabilization/${file}`, exported = `${target}/${file}`;
 fs.copyFileSync(source, exported); artifacts.push({ file: exported, source, sha256: hash(exported) });
}
const sources = [
 'src/modules/workspaces/application/enrollment-uniqueness.ts',
 'src/modules/workspaces/application/enrollment-activation.ts',
 'src/modules/workspaces/application/enrollment-creation.ts',
 'src/modules/workspaces/application/enrollment-pause.ts',
 'src/modules/workspaces/application/manual-subscription-service.ts',
 'src/modules/workspaces/domain/types.ts',
 'src/app/(gym)/gym/enrollments/enrollments-client.tsx',
 'tests/gym/enrollment-policy.integration.ts', 'tests/gym/enrollment-policy-migration.integration.ts',
 'tests/gym/http.spec.ts', 'prisma/migrations/20261005010000_gym_single_live_enrollment/migration.sql',
];
fs.writeFileSync(`${folder}/verificacoes-politicas-matricula.json`, JSON.stringify({
 recordedAt: new Date().toISOString(), decisions: { billingDuringPause: 'Suspender a geração durante a pausa', liveEnrollments: 'Uma matrícula ativa por aluno em cada academia', postPauseDates: 'Pergunta enviada; resposta ainda pendente.' },
 environment: { database: 'PostgreSQL descartável 127.0.0.1:56432/atlasfit_gym_stabilization_20261001', application: 'Cópia sem .env, porta 31173', realCredentials: false },
 checks: Object.fromEntries(names.map(name => [name, checks[name]])),
 typescript: { command: 'node node_modules/typescript/bin/tsc --noEmit --pretty false', exitCode: 0, output: '', toolSession: 92642 },
 migration: { prepared: true, sqlTestedOnTemporaryTable: true, appliedToPublicTestTable: false, appliedToConfiguredDatabase: false, production: false },
 sources: sources.map(file => ({ file, sha256: hash(file) })), artifacts, originalAudit: { file: original, sha256: hash(original) },
 limits: ['HTTP focal: dois casos, 42 fora do filtro.', 'Sem aplicação do índice na tabela pública; histórico duplicado exige revisão antes de migrar.', 'Calendário financeiro atual preservado; competências vencidas durante pausas longas ainda exigem definição.', 'Não encerra transições, jornadas visuais, cadeia histórica de migrations, legado ou produção.'],
}, null, 2));
const note = ' Políticas aprovadas — 05/10/2026: uma matrícula vigente por aluno/academia, com pausa conservando o vínculo; cadastro/ativação/retomada/geração transacionais recusam segundo contrato independente. Emissão suspensa também pelo intervalo de pausa antes do job, dívida/replay preservados. SQL de índice parcial e preflight sem correção automática verificados em tabela temporária; não aplicado à tabela pública nem produção. PostgreSQL 46/0, HTTP focal 2/0 (42 fora do filtro), migration 2/0 e TypeScript completo 0. Calendário após pausa longa, legado e jornadas restantes seguem pendentes; politicas-matricula-pausa.md.';
const statesFile = `${folder}/tratamento.json`;
const states = JSON.parse(fs.readFileSync(statesFile, 'utf8'));
for (const id of ['GYM-AUD-011', 'GYM-AUD-022', 'GYM-AUD-043', 'GYM-AUD-046', 'GYM-AUD-050']) {
 const state = states[id];
 if (!state.correction.includes('Políticas aprovadas — 05/10/2026')) { state.correction += note; state.validation.push(note.trim()); }
 state.files = [...new Set([...state.files, ...sources, `${folder}/politicas-matricula-pausa.md`, `${folder}/verificacoes-politicas-matricula.json`, `${folder}/pendencias-restantes.md`])];
}
fs.writeFileSync(statesFile, JSON.stringify(states, null, 2));
const annex = `${folder}/politicas-matricula-pausa.md`;
let text = fs.readFileSync(annex, 'utf8');
text = text.replace('Os resultados finais e hashes são registrados no manifesto deste lote.', '**Resultado final: 46 testes PostgreSQL, dois HTTP e dois do SQL da migration passaram, sem falhas; TypeScript completo saiu com código 0.** O filtro HTTP deixou 42 casos fora da execução. Resultados brutos, comandos e hashes estão em [verificacoes-politicas-matricula.json](verificacoes-politicas-matricula.json). A primeira rodada de seis casos novos falhou na fixture por usar phone em vez de whatsapp; corrigiu-se a fixture, sem mudar os guards. Uma chamada HTTP sem a origem de teste exigida foi rejeitada pela proteção do runner; a execução foi repetida com a configuração isolada correta.');
fs.writeFileSync(annex, text);
const main = 'docs/audits/academias/estabilizacao-modulo-academias.md';
let content = fs.readFileSync(main, 'utf8');
if (!content.includes('## Políticas de matrícula aprovadas — 05/10')) content += '\n## Políticas de matrícula aprovadas — 05/10\n\nO usuário confirmou geração suspensa durante pausa e uma matrícula ativa por aluno/academia. O [lote de políticas de matrícula](estabilizacao/politicas-matricula-pausa.md) aplica checagens transacionais, filtro/revalidação da geração e prepara índice parcial com preflight. PostgreSQL 46/0, HTTP 2/0, SQL da migration 2/0 e TypeScript completo 0. Não houve aplicação da migration à tabela pública/banco configurado/produção. Competências após pausas longas, legado, migrações e jornadas completas continuam pendentes; a [lista exaustiva](estabilizacao/pendencias-restantes.md) foi atualizada.\n';
fs.writeFileSync(main, content);
for (const file of ['pausa-e-escopo-financeiro.md', 'cadastro-responsaveis.md']) {
 const name = `${folder}/${file}`; let old = fs.readFileSync(name, 'utf8');
 if (!old.includes('Continuação de 05/10 — decisões respondidas')) old += '\n## Continuação de 05/10 — decisões respondidas\n\nAs dúvidas históricas sobre matrícula simultânea e geração durante pausa receberam respostas: uma matrícula ativa por aluno/academia; geração suspensa durante pausa. Implementação e limites atuais estão em [políticas de matrícula e pausa](politicas-matricula-pausa.md). O estado deste anexo registra o lote anterior e não substitui essa continuação.\n';
 fs.writeFileSync(name, old);
}
console.log(JSON.stringify({ recorded: names, artifacts: artifacts.length, originalAuditUnchanged: true }));
