const fs = require('node:fs');
const { createHash } = require('node:crypto');
const { execFileSync } = require('node:child_process');
const root = 'docs/audits/academias/estabilizacao';
const files = [
 'src/modules/workspaces/application/workspace-administration.ts',
 'src/modules/workspaces/application/team-lifecycle.ts',
 'src/modules/workspaces/domain/workspace-administration-contract.ts',
 'src/app/api/superadmin/workspaces/route.ts',
 'src/app/api/superadmin/workspaces/[id]/route.ts',
 'src/stores/superadmin.store.ts',
 'src/app/(superadmin)/superadmin/workspaces/page.tsx',
 'src/app/(superadmin)/superadmin/workspaces/[id]/page.tsx',
 'tests/gym/workspace-administration.integration.ts', 'tests/gym/http.spec.ts',
];
const checks = JSON.parse(fs.readFileSync(`${root}/verificacoes-isoladas.json`, 'utf8'));
const labels = ['workspace-administration', 'http-workspace-administration'];
const typecheck = JSON.parse(fs.readFileSync(`${root}/typecheck-administracao-workspace.json`, 'utf8'));
if (typecheck.exitCode !== 0 || labels.some(label => !checks[label]?.success)) throw new Error('Verificações finais obrigatórias ainda não aprovadas.');
const report = {
 recordedAt: new Date().toISOString(), head: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
 environment: { host: '127.0.0.1', port: 56432, database: 'atlasfit_gym_stabilization_20261001', httpPort: 31173, productionInspected: false },
 sourceHashes: Object.fromEntries(files.map(file => [file, createHash('sha256').update(fs.readFileSync(file)).digest('hex')])),
 checks: Object.fromEntries(labels.map(label => [label, checks[label]])), typecheck,
 limits: ['Não homologa navegador, mobile ou teclado.', 'Não encerra todos os caminhos de suspensão, titularidade, impersonação ou regressão PERSONAL.', 'Falhas históricas e casos fora do filtro não são considerados aprovados.'],
};
fs.writeFileSync(`${root}/verificacoes-administracao-workspace.json`, JSON.stringify(report, null, 2) + '\n');
const stateFile = `${root}/tratamento.json`;
const states = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
const annex = `${root}/administracao-suspensao-workspace.md`;
const marker = 'Administração e suspensão — 05/10/2026';
const proof = `${marker}: PostgreSQL real 2 aprovações/0 falhas; HTTP 1 aprovação/0 falhas/31 fora do filtro; TypeScript exit 0. Artefato verificacoes-administracao-workspace.json; navegador não homologado.`;
const current = states['GYM-AUD-014'];
Object.assign(current, {
 state: 'Corrigido e verificado',
 currentConfirmation: 'Lista e atualização verificadas por jornada HTTP com banco real; integração cliente inspecionada. Homologação visual permanece em 050/051.',
 correction: 'Lista retorna isActive. PATCH estrito exige baseline, revalida SUPERADMIN atual, mantém tipo imutável e altera titularidade/atributos/auditoria atomicamente. Lista/detalhe usam estado aplicado; store separa erro de recarga de gravação confirmada e oferece recuperação. Suspensão/reativação e rollback concorrente foram verificados.',
 files: [...new Set([...current.files, ...files, annex])],
 validation: [proof],
});
for (const number of [1, 3, 50, 51, 53]) {
 const state = states[`GYM-AUD-${String(number).padStart(3, '0')}`];
 if (!state.validation.some(item => item.startsWith(marker))) state.correction += ' Administração de workspace agora usa estado observado, transferência atômica e auditoria com ator original; suspension/reativação e rollback foram verificados. Este lote não encerra os demais caminhos do achado.';
 state.files = [...new Set([...state.files, ...files, annex])];
 state.validation = [...state.validation.filter(item => !item.startsWith(marker)), proof];
}
fs.writeFileSync(stateFile, JSON.stringify(states, null, 2) + '\n');
const mainFile = 'docs/audits/academias/estabilizacao-modulo-academias.md';
let main = fs.readFileSync(mainFile, 'utf8').replace('9 achados corrigidos e verificados, 13 retirados do escopo, 3 implementados aguardando verificação específica e 40 pendentes', '10 achados corrigidos e verificados, 13 retirados do escopo, 3 implementados aguardando verificação específica e 39 pendentes');
if (!main.includes('(estabilizacao/administracao-suspensao-workspace.md)')) main = main.replace('## Arquitetura e sequência', 'A [administração e suspensão de workspace](estabilizacao/administracao-suspensao-workspace.md) completa GYM-AUD-014: estado persistido, atualização estrita, titularidade atômica e feedback de recarga. PostgreSQL/HTTP/TypeScript aprovados; homologação visual continua pendente.\n\n## Arquitetura e sequência');
fs.writeFileSync(mainFile, main);
console.log('GYM-AUD-014 registrado com provas; achados relacionados preservados abertos.');
