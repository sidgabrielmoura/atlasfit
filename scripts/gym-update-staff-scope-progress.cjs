const fs = require('node:fs');
const { createHash } = require('node:crypto');
const { execFileSync } = require('node:child_process');
const root = 'docs/audits/academias/estabilizacao';
const labels = ['staff-scope', 'staff-invite-regression', 'http-staff-scope'];
const checks = JSON.parse(fs.readFileSync(`${root}/verificacoes-isoladas.json`, 'utf8'));
const typecheck = JSON.parse(fs.readFileSync(`${root}/typecheck-equipe-convites.json`, 'utf8'));
if (typecheck.exitCode !== 0 || labels.some(label => !checks[label]?.success)) throw new Error('Checks finais obrigatórios ainda não aprovados.');
const files = [
 'src/modules/workspaces/domain/gym-staff-contract.ts', 'src/modules/workspaces/domain/access-roles.ts',
 'src/modules/workspaces/application/gym-staff-query.ts', 'src/modules/workspaces/application/gym-staff-http.ts',
 'src/modules/workspaces/application/staff-service.ts', 'src/modules/workspaces/application/staff-mutations.ts',
 'src/modules/workspaces/application/team-lifecycle.ts', 'src/modules/workspaces/application/gym-offboarding-service.ts',
 'src/modules/workspaces/application/ownership-service.ts',
 'src/modules/workspaces/application/entitlements-service.ts',
 'src/app/api/gym/staff/route.ts', 'src/app/api/gym/staff/[id]/route.ts', 'src/app/api/gym/staff/[id]/terminate/route.ts',
 'src/app/api/gym/invitations/route.ts', 'src/app/api/gym/invitations/[id]/route.ts', 'src/app/api/gym/invitations/accept/route.ts',
 'src/app/api/gym/settings/transfer-ownership/route.ts',
 'src/app/(gym)/gym/staff/page.tsx', 'src/app/(gym)/gym/staff/staff-client.tsx', 'src/app/auth/invite/page.tsx',
 'src/app/auth/gym/page.tsx', 'src/app/auth/register/register-form.tsx', 'src/components/auth/auth-form.tsx',
 'src/lib/auth/invitation-return.ts', 'tests/gym/staff-scope.integration.ts', 'tests/gym/http.spec.ts',
];
const report = {
 recordedAt: new Date().toISOString(), head: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
 sourceHashes: Object.fromEntries(files.map(file => [file, createHash('sha256').update(fs.readFileSync(file)).digest('hex')])),
 checks: Object.fromEntries(labels.map(label => [label, checks[label]])), typecheck,
 relatedChecks: { ownership: checks['workspace-administration'] },
 environment: { host: '127.0.0.1', port: 56432, database: 'atlasfit_gym_stabilization_20261001', httpPort: 31173, productionInspected: false },
 limits: ['Sem homologação visual, mobile, teclado ou Clipboard API real.', 'Convites entregues por link manual; nenhum envio externo executado.', 'Cadastro pessoal e criação/trial/paywall do personal vinculado continuam na última etapa.', 'Suíte histórica com falhas e casos fora do filtro não são considerados aprovados.'],
};
fs.writeFileSync(`${root}/verificacoes-equipe-convites.json`, JSON.stringify(report, null, 2) + '\n');
const stateFile = `${root}/tratamento.json`; const states = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
const annex = `${root}/equipe-convites-unidades.md`;
const marker = 'Equipe/convites/unidades — 05/10/2026';
const proof = `${marker}: PostgreSQL real 3 novos testes agrupados + 11 de regressão, sem falhas; HTTP 1 jornada/0 falhas/32 fora do filtro; TypeScript exit 0. Evidências e hashes em verificacoes-equipe-convites.json; não homologa navegador ou e-mail.`;
const corrections = {
 'GYM-AUD-004': 'Aceite confere e-mail autenticado, expiração, estado, quota e autoridade atual do remetente dentro da transação; concorrência consome uma única vez. Convites respeitam unidade, revogação disputa o claim atomicamente e consulta pública é mínima/mascarada/sem escrita. UI usa link manual explícito, retorno seguro após login e recarga do contexto após aceite. CREF/cargo persistidos. PostgreSQL real e HTTP confirmam as condições originais.',
 'GYM-AUD-024': 'UI, DELETE e alias terminate delegam ao mesmo comando transacional de desligamento/repasse. Autoridade sobre todas as unidades/grants e elegibilidade do substituto revalidadas; erro preserva carteira, titular protegido e papel STUDENT revogado não é restaurado por perfil. Autoria/histórico/identidade/outro workspace permanecem. Transferência usa busca/criação segura de grant global nullable, sem null as any; concorrência e duas transferências sucessivas verificadas. Aulas/equipamentos foram retirados por instrução do usuário.',
};
for (const [id, correction] of Object.entries(corrections)) {
 const entry = states[id]; Object.assign(entry, { state: 'Corrigido e verificado', correction, currentConfirmation: 'Condição original corrigida e verificada por banco real e HTTP no escopo atual; homologação visual/externa e dados históricos permanecem nos achados próprios.', files: [...new Set([...entry.files, ...files, annex])], validation: [...entry.validation.filter(item => !item.startsWith(marker)), proof] });
}
for (const number of [1, 2, 3, 5, 42, 48, 50, 51, 52, 60]) {
 const entry = states[`GYM-AUD-${String(number).padStart(3, '0')}`];
 if (!entry.validation.some(item => item.startsWith(marker))) entry.correction += ' Equipe/convites usam autoridade transacional e escopo de unidade nas consultas e mutações; DTOs mínimos e paginação compartilhada no SSR/API. Formulário não transforma unidade em global nem altera papéis acumulados ao editar perfil; falha de recarga e cópia são explícitas. Desligamento exige autoridade sobre todos os grants, preserva outros vínculos e não restaura STUDENT revogado. Lote não encerra as demais superfícies do achado.';
 if (number === 42) entry.correction = entry.correction.replace('Caminhos antigos de ensureSubscription e aplicação geral ainda pendentes.', 'Nenhuma referência a ensureSubscription foi localizada no código atual. Contagem GYM de colaboradores usa autoridade vigente, sem ocupar quota por perfil profissional histórico de aluno; cenário verificado em PostgreSQL. Aplicação geral das demais regras de licença continua pendente.');
 entry.files = [...new Set([...entry.files, ...files, annex])]; entry.validation = [...entry.validation.filter(item => !item.startsWith(marker)), proof];
}
fs.writeFileSync(stateFile, JSON.stringify(states, null, 2) + '\n');
const mainFile = 'docs/audits/academias/estabilizacao-modulo-academias.md';
let main = fs.readFileSync(mainFile, 'utf8');
const counts = Object.values(states).reduce((result, entry) => { result[entry.state] = (result[entry.state] || 0) + 1; return result; }, {});
main = main.replace(/Posição deste marco: \d+ achados corrigidos e verificados, \d+ retirados do escopo, \d+ implementados aguardando verificação específica e \d+ pendentes\./, `Posição deste marco: ${counts['Corrigido e verificado']} achados corrigidos e verificados, ${counts['Desativado ou retirado do escopo com segurança']} retirados do escopo, ${counts['Implementado, aguardando verificação específica']} implementados aguardando verificação específica e ${counts.Pendente} pendentes.`);
if (!main.includes('(estabilizacao/equipe-convites-unidades.md)')) main = main.replace('## Arquitetura e sequência', 'O [lote de equipe, convites e desligamento por unidade](estabilizacao/equipe-convites-unidades.md) completa GYM-AUD-004 e GYM-AUD-024 no escopo atual. Consultas, SSR e comandos compartilham autoridade; convite tem entrega manual explícita e aceite/cookie verificados. PERSONAL conserva identidade/vínculo; sua experiência afiliada permanece por último.\n\n## Arquitetura e sequência');
fs.writeFileSync(mainFile, main);
console.log(JSON.stringify({ achadosConcluidos: Object.keys(corrections), counts, hashes: files.length }));
