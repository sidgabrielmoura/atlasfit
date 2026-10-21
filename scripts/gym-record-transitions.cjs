const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const folder = 'docs/audits/academias/estabilizacao';
const hash = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const original = 'docs/audits/academias/achados.json';
assert.equal(hash(original), '0cc3c815e28c2590e569d515ef1c3855e0a99595066f37ed2fa0059df143c225');
const checks = JSON.parse(fs.readFileSync(folder + '/verificacoes-isoladas.json', 'utf8'));
const names = ['contract-complete-final', 'contract-http-final-verified', 'contract-browser-fixture-final'];
for (const [index, name] of names.entries()) {
 assert.equal(checks[name].success, true, name); assert.equal(checks[name].failed, 0, name);
 assert.equal(checks[name].passed, [245, 4, 2][index], name);
}
const typecheckFile = folder + '/typecheck-contract-types-final.json';
const typecheck = JSON.parse(fs.readFileSync(typecheckFile, 'utf8')); assert.equal(typecheck.exitCode, 0);
const visual = JSON.parse(fs.readFileSync('.tmp/gym-stabilization/contract-visual-latest.json', 'utf8'));
assert.equal(visual.success, true); assert.equal(visual.scenarios.length, 6); assert.equal(visual.errors.length, 0);
const target = folder + '/transicoes'; fs.mkdirSync(target, { recursive: true });
const artifacts = [];
for (const file of fs.readdirSync('.tmp/gym-stabilization').filter(file => /^contract-.+-raw\.json$/.test(file))) {
 const exported = target + '/' + file; fs.copyFileSync('.tmp/gym-stabilization/' + file, exported);
 artifacts.push({ file: exported, sha256: hash(exported) });
}
// Synthetic login fixtures are deliberately excluded from the published evidence.
for (const source of [visual.file, ...visual.screenshots]) {
 const exported = target + '/' + path.basename(source); fs.copyFileSync(source, exported);
 artifacts.push({ file: exported, sha256: hash(exported) });
}
for (const entry of fs.readdirSync('.tmp/gym-stabilization/contract-visual', { withFileTypes: true }).filter(entry => entry.isDirectory())) {
 const sourceFolder = '.tmp/gym-stabilization/contract-visual/' + entry.name;
 const reportFile = sourceFolder + '/report.json';
 if (!fs.existsSync(reportFile) || reportFile === visual.file) continue;
 const previous = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
 const exportedFolder = target + '/intermediarias/' + entry.name; fs.mkdirSync(exportedFolder, { recursive: true });
 for (const source of [reportFile, ...previous.screenshots, ...(fs.existsSync(sourceFolder + '/failure.png') ? [sourceFolder + '/failure.png'] : [])]) {
  const exported = exportedFolder + '/' + path.basename(source); fs.copyFileSync(source, exported); artifacts.push({ file: exported, sha256: hash(exported) });
 }
}
const sources = new Set(['prisma/schema.prisma', 'prisma/migrations/20261006020000_gym_contract_reconciliation/migration.sql', 'prisma/migrations/20261006022000_gym_cash_transfer_evidence/migration.sql', 'src/modules/payments/webhooks/gym-legacy-scope.ts', 'src/components/application/gym-sidebar.tsx', 'tests/gym/contract-reconciliation.integration.ts', 'tests/gym/contract-visual.fixture.ts', 'tests/gym/http.spec.ts', 'scripts/gym-contract-visual.cjs', 'scripts/gym-record-transitions.cjs']);
for (const file of ['scripts/gym-http-isolated.cjs', 'scripts/gym-warm-contract-http.cjs', 'scripts/gym-check-runner.cjs', 'scripts/gym-verify-source.cjs', 'scripts/test-gym-contract.cjs']) sources.add(file);
function walk(directory) { for (const entry of fs.readdirSync(directory, { withFileTypes: true })) { const file = path.posix.join(directory, entry.name); if (entry.isDirectory()) walk(file); else if (/\.(ts|tsx)$/.test(file)) sources.add(file); } }
for (const directory of ['src/modules/workspaces', 'src/app/api/gym', 'src/app/(gym)/gym/enrollments', 'src/app/(gym)/gym/reconciliation']) walk(directory);
const manifest = { recordedAt: new Date().toISOString(), scope: 'Ponto 3: transições contratuais, pausa SKIP, cancelamento e reconciliação administrativa local/manual.', environment: { database: 'PostgreSQL descartável 127.0.0.1:56432/atlasfit_gym_stabilization_20261001', application: 'Cópia sem .env, porta 31173', realCredentials: false }, checks: Object.fromEntries(names.map(name => [name, checks[name]])), typescript: { ...typecheck, file: typecheckFile, sha256: hash(typecheckFile) }, browser: { ...visual, file: target + '/report.json', screenshots: visual.screenshots.map(file => target + '/' + path.basename(file)) }, artifacts, sources: [...sources].sort().map(file => ({ file, sha256: hash(file) })), originalAudit: { file: original, sha256: hash(original) }, migration: { disposablePublicSchemaApplied: true, configuredDatabase: false, production: false, completeHistoricalChainVerified: false }, limits: ['52 HTTP históricos fora do filtro; regressão focal não homologa toda a plataforma.', 'Provedor, banco legado e conferência documental reais não acessados. Inventário e implantação permanecem em 022/030/043/046.', 'Execuções intermediárias e falhas brutas preservadas; evidências anteriores são históricas.'] };
fs.writeFileSync(folder + '/verificacoes-transicoes.json', JSON.stringify(manifest, null, 2) + '\n');
const statesFile = folder + '/tratamento.json'; const states = JSON.parse(fs.readFileSync(statesFile, 'utf8'));
const updates = {
 '021': ['Corrigido e verificado', 'Condições comerciais, novo aceite próprio ou por representante verificado e ativação de revisão foram conferidos em HTTP e Chrome desktop/celular/teclado. Renovação mantém vigência atual e exige novo aceite. Não reutiliza contrato anterior nem transforma ajuste em recebimento.'],
 '022': ['Pendente', 'Transições locais completas e verificadas: uma matrícula vigente por aluno/academia; pausa suspende geração e pula vencimentos do intervalo efetivo sem retroatividade; retomada concorrente e job atrasado não antecipam cobrança. Revisão aceita bloqueia ciclo duplicado do contrato anterior. Fila identifica duplicidades sem escolher o contrato a conservar. Restam inventário/decisões do legado e aplicação do índice parcial após regularização, junto à baseline/implantação 046.'],
 '023': ['Corrigido e verificado', 'Cancelamento imediato/futuro, retirada justificada, execução concorrente do job, encerramento de pausas e propostas dependentes preservam aceites, dívida e recibos. Assinatura externa exige revisão documental administrativa antes do comando, sem operação de gateway. Fluxos verificados por PostgreSQL, HTTP e formulários Chrome desktop/celular. Conferência de contratos reais e implantação permanecem em 030/043/046.'],
 '030': ['Pendente', 'Reconciliação administrativa implementada e verificada: encerramento externo atestado, ciclos/crédito/agendamento legado, reconhecimento de pagamento histórico sem receita fictícia, saldo de conta a partir de fatos confirmados, classificação exata de movimentos de caixa e evidência imutável antes/depois. Preview obsoleto, concorrência, precisão BIGINT, unidade original, revogação e webhooks externos atrasados cobertos. Restam inventário, conferência documental e decisões sobre assinaturas/faturas/contas reais, incluindo lançamentos antigos sem vínculos suficientes, e implantação 046.'],
};
for (const [suffix, [state, correction]] of Object.entries(updates)) {
 const item = states['GYM-AUD-' + suffix];
 if (item.completedBatch !== 'transitions-20261007') { item.history ??= []; item.history.push({ batch: 'before-transitions-20261007', state: item.state, correction: item.correction }); }
 item.state = state; item.completedBatch = 'transitions-20261007'; item.correction = correction;
 item.currentConfirmation = 'Ponto 3 local verificado: 245 PostgreSQL/0 falhas, quatro HTTP focais/0 falhas/52 excluídos, seis jornadas Chrome desktop/celular/teclado/0 pageerror e TypeScript completo exit 0. Migrations somente no banco descartável; legado real/implantação não homologados.';
 item.files = [...new Set([...item.files, 'tests/gym/contract-reconciliation.integration.ts', 'docs/audits/academias/estabilizacao/transicoes-cancelamento-reconciliacao.md', 'docs/audits/academias/estabilizacao/verificacoes-transicoes.json'])];
 const validation = 'Ponto 3 — 07/10/2026: 245 PostgreSQL, quatro HTTP focais, seis jornadas Chrome e TypeScript aprovados; manifesto verificacoes-transicoes.json.';
 if (!item.validation.includes(validation)) item.validation.push(validation);
}
fs.writeFileSync(statesFile, JSON.stringify(states, null, 2) + '\n');
const main = 'docs/audits/academias/estabilizacao-modulo-academias.md'; let report = fs.readFileSync(main, 'utf8');
if (!report.includes('<!-- transitions-20261007 -->')) report += '\n\n<!-- transitions-20261007 -->\n## Transições contratuais, cancelamento e reconciliação — 07/10\n\nO [ponto 3](estabilizacao/transicoes-cancelamento-reconciliacao.md) completa os comandos e formulários locais. Pausa pula vencimentos suspensos sem retroatividade; troca/renovação exigem novo aceite, recebimento e ativação. Cancelamento encerra propostas e pausas sem apagar obrigações. Revisão administrativa inclui contratos externos históricos, faturas, contas e movimentos de caixa, com evidência imutável e sem receita fictícia. Resultado: 245 PostgreSQL/0 falhas, quatro HTTP focais/0 falhas/52 excluídos, seis jornadas Chrome/0 pageerror e TypeScript exit 0. Migrations somente no banco descartável. Achados 021/023 fechados no escopo local; legado/índice/implantação permanecem em 022/030/043/046. O [manifesto](estabilizacao/verificacoes-transicoes.json) e a [lista completa do restante](estabilizacao/pendencias-restantes.md) registram a posição atual: 26 achados abertos.\n';
report = report.replace(/Posição atual após os pontos 1 e 2:[^\r\n]+/, 'Posição atual após os pontos 1, 2 e 3: 26 achados corrigidos e verificados, 13 retirados do escopo, 2 implementados aguardando verificação específica e 24 pendentes. São 26 achados abertos, detalhados na lista exaustiva; não representam processos independentes.');
fs.writeFileSync(main, report);
console.log(JSON.stringify({ closed: ['021', '023'], retainedForLegacy: ['022', '030'], checks: names.map(name => ({ name, passed: checks[name].passed })), browserScenarios: visual.scenarios.length, sources: sources.size, artifacts: artifacts.length }));
