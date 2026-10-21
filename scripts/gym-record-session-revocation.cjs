const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), { createHash } = require('node:crypto');
const folder = 'docs/audits/academias/estabilizacao';
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const hash = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
assert.equal(hash('docs/audits/academias/achados.json'), '0cc3c815e28c2590e569d515ef1c3855e0a99595066f37ed2fa0059df143c225');
const isolated = read(folder + '/verificacoes-isoladas.json');
for (const [label, passed] of [['integracao-seguranca-completa', 274], ['session-revocation', 5], ['session-http', 11]]) {
  assert.equal(isolated[label].success, true); assert.equal(isolated[label].passed, passed); assert.equal(isolated[label].failed, 0);
  const raw = read(isolated[label].rawFile); assert.equal(raw.success, true); assert.equal(raw.numPassedTests, passed); assert.equal(raw.numFailedTests, 0);
}
assert.equal(isolated['session-http'].assertions.filter(row => row.status === 'passed' && row.name.startsWith('HTTP sessão global e suporte')).length, 5);
const typeFile = folder + '/typecheck-contexto-final.json'; assert.equal(read(typeFile).exitCode, 0);
const target = folder + '/sessao-revogacao'; fs.mkdirSync(target, { recursive: true }); const artifacts = [];
function copy(source, name = path.basename(source)) {
  const file = target + '/' + name; fs.copyFileSync(source, file); artifacts.push({ file, sha256: hash(file) }); return file;
}
const integrationFile = copy(isolated['integracao-seguranca-completa'].rawFile);
const focalFile = copy(isolated['session-revocation'].rawFile);
const httpFile = copy(isolated['session-http'].rawFile);
copy(typeFile, 'typecheck-final.json');
const diagnostic = '.tmp/gym-stabilization/integracao-seguranca-completa-0ed94e96-1cff-4bde-b06f-381d732afef0-raw.json';
assert.equal(read(diagnostic).numFailedTests, 1); copy(diagnostic, 'diagnostico-fixture-token-fixo.json');
const sources = ['src/auth.ts', 'src/types/next-auth.d.ts', 'src/lib/auth/impersonation-service.ts', 'src/lib/auth/password-change-service.ts', 'src/app/api/superadmin/impersonate/route.ts', 'src/app/api/superadmin/unimpersonate/route.ts', 'src/app/api/student/settings/route.ts', 'src/app/(student)/student/settings/page.tsx', 'tests/gym/session-revocation.integration.ts', 'tests/gym/http.spec.ts', 'scripts/gym-test-session-revocation.cjs', 'scripts/gym-test-session-http.cjs', 'scripts/gym-test-security-regression.cjs', 'scripts/gym-record-session-revocation.cjs', folder + '/sessao-revogacao.md'];
const manifest = folder + '/verificacoes-sessao-revogacao.json';
fs.writeFileSync(manifest, JSON.stringify({ recordedAt: new Date().toISOString(), success: true, integration: { file: integrationFile, passed: 274, failed: 0 }, focal: { file: focalFile, passed: 5, failed: 0 }, http: { file: httpFile, passed: 11, failed: 0, skipped: 60, newGlobalCases: 5 }, typescript: { exitCode: 0 }, sources: sources.map(file => ({ file, sha256: hash(file) })), artifacts, policy: { sensitiveChanges: 'sessionVersion revalidada na próxima autenticação', impersonationGrant: 'SHA256, IDs e versões vinculados, dois minutos, consumo único transacional', administrativeTargets: 'login próprio obrigatório', sessionExpiration: '24 horas desde iat do JWT; endpoint de sessão renova emissão' }, limitations: ['Next/PostgreSQL isolados e dados sintéticos; sem implantação ou alteração de contas reais.', 'Onze casos HTTP executados; 60 fora do filtro ignorados neste ensaio.', 'Logout estudantil compilado e contrato HTTP exercitado; sem novo ensaio visual dessa tela.', 'Não introduz revogação por dispositivo ou cancelamento de requisições em andamento; tokens externos mantêm prazos próprios.', 'Grants legados não são aceitos e precisam de nova emissão.', 'Diagnóstico de fixture com token fixo preservado; suíte completa final aprovada após correção da fixture.'] }, null, 2) + '\n');
const stateFile = folder + '/tratamento.json', states = read(stateFile), state = states['GYM-AUD-065'];
if (state.completedBatch !== 'session-revocation-20261009') { state.history ??= []; state.history.push({ batch: 'before-session-revocation-20261009', state: state.state, correction: state.correction }); }
state.state = 'Corrigido e verificado'; state.completedBatch = 'session-revocation-20261009';
state.correction = 'JWT revalida papel, versão, senha e elegibilidade; alterações administrativas e sensíveis revogam sessões. Troca própria de senha é transacional, exige senha atual, limpa reset/setup e encerra o portal após sucesso. Impersonação e retorno usam grants hash-only, IDs/versões vinculados, consumo único e auditoria do administrador original; recusam encadeamento e destino administrativo. Origem, JSON, tamanho, cache e rate limit protegidos. Política de expiração global verificada no endpoint real.';
state.currentConfirmation = '274 integrações PostgreSQL, cinco testes focais, 11 casos HTTP reais e TypeScript aprovados. Demissão administrativa, remoção de senha, revogação de duas sessões, suporte/grants pendentes, retorno, replay, expiração e regressões legais verificadas. Sem implantação; limites explícitos no manifesto.';
state.files = [...new Set([...state.files, ...sources, manifest])];
if (!state.validation.some(row => row.includes('verificacoes-sessao-revogacao.json'))) state.validation.push('09/10/2026: autenticação, credenciais, revogação e impersonação verificadas; verificacoes-sessao-revogacao.json.');
fs.writeFileSync(stateFile, JSON.stringify(states, null, 2) + '\n');
const remaining = Object.values(states).filter(row => row.state === 'Pendente' || row.state.startsWith('Implementado')).length;
const corrected = Object.values(states).filter(row => row.state === 'Corrigido e verificado').length;
const pending = Object.values(states).filter(row => row.state === 'Pendente').length;
const main = 'docs/audits/academias/estabilizacao-modulo-academias.md'; let report = fs.readFileSync(main, 'utf8');
report = report.replace(/Posição atual após implementação e verificações:[^\r\n]+/, `Posição atual após implementação e verificações: ${corrected} achados corrigidos e verificados, 13 retirados do escopo, 2 implementados aguardando verificação específica e ${pending} pendentes. São ${remaining} achados abertos, detalhados na lista exaustiva.`);
if (!report.includes('<!-- session-revocation-20261009 -->')) report += `\n\n<!-- session-revocation-20261009 -->\n## Sessões e impersonação — 09/10\n\nO achado 065 foi corrigido e verificado: papel/credenciais atuais, revogação, troca de senha, grants de suporte/retorno, auditoria e expiração global. [Detalhamento](estabilizacao/sessao-revogacao.md) e [manifesto](estabilizacao/verificacoes-sessao-revogacao.json). Restam ${remaining} achados abertos.\n`;
fs.writeFileSync(main, report); console.log(JSON.stringify({ closed: ['065'], remaining, corrected, pending }));
