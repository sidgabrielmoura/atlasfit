const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const folder = 'docs/audits/academias/estabilizacao';
const hash = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const original = 'docs/audits/academias/achados.json';
assert.equal(hash(original), '0cc3c815e28c2590e569d515ef1c3855e0a99595066f37ed2fa0059df143c225');
const checks = JSON.parse(fs.readFileSync(folder + '/verificacoes-isoladas.json', 'utf8'));
const names = ['privacy-complete-regression', 'privacy-http-delivery-final', 'privacy-browser-fixture-final'];
for (const [index, name] of names.entries()) { assert.equal(checks[name].success, true); assert.equal(checks[name].failed, 0); assert.equal(checks[name].passed, [229, 4, 2][index]); }
const typecheckFile = folder + '/typecheck-privacy-types-final.json';
const typecheck = JSON.parse(fs.readFileSync(typecheckFile, 'utf8')); assert.equal(typecheck.exitCode, 0);
const visual = JSON.parse(fs.readFileSync('.tmp/gym-stabilization/privacy-visual-latest.json', 'utf8')); assert.equal(visual.success, true); assert.equal(visual.scenarios.length, 3); assert.equal(visual.errors.length, 0);
const target = folder + '/privacidade'; fs.mkdirSync(target, { recursive: true });
const artifacts = [];
for (const file of fs.readdirSync('.tmp/gym-stabilization').filter(file => /^privacy-.+-raw\.json$/.test(file))) {
 const source = '.tmp/gym-stabilization/' + file, exported = target + '/' + file;
 fs.copyFileSync(source, exported); artifacts.push({ file: exported, sha256: hash(exported) });
}
for (const source of [visual.file, ...visual.screenshots]) {
 const exported = target + '/' + path.basename(source); fs.copyFileSync(source, exported); artifacts.push({ file: exported, sha256: hash(exported) });
}
const sources = new Set(['prisma/schema.prisma', 'prisma/migrations/20261006010000_gym_privacy_health/migration.sql', 'src/lib/storage-access.ts', 'src/lib/audit-context.ts', 'src/lib/logger.ts', 'src/lib/auth/invitation-return.ts', 'src/lib/auth/account-eligibility.ts', 'src/lib/student-auth.ts', 'src/app/auth/student/page.tsx', 'src/app/api/cron/process-recurrence/route.ts', 'src/app/(gym)/gym/students/students-client.tsx', 'src/app/(gym)/gym/settings/settings-client.tsx', 'src/app/(gym)/gym/settings/page.tsx', 'src/app/(guardian)/guardian/dependents/dependents-client.tsx', 'tests/gym/privacy-health.integration.ts', 'tests/gym/privacy-visual.fixture.ts', 'tests/gym/student-registration.integration.ts', 'tests/gym/http.spec.ts', 'scripts/gym-record-privacy.cjs', 'scripts/gym-privacy-visual.cjs']);
function walk(directory) { for (const entry of fs.readdirSync(directory, { withFileTypes: true })) { const file = path.posix.join(directory, entry.name); if (entry.isDirectory()) walk(file); else if (/\.(ts|tsx)$/.test(file)) sources.add(file); } }
for (const directory of ['src/modules/workspaces', 'src/app/api/gym', 'src/app/api/guardian', 'src/app/api/student', 'src/app/api/user', 'src/app/account', 'src/lib/privacy', 'src/components/privacy']) walk(directory);
const manifest = { recordedAt: new Date().toISOString(), scope: 'Ponto 2: privacidade/saúde/identidade/representação/maioridade, GYM mantido local/manual.', environment: { database: 'PostgreSQL descartável 127.0.0.1:56432/atlasfit_gym_stabilization_20261001', application: 'Cópia sem .env, porta 31173', realCredentials: false }, checks: Object.fromEntries(names.map(name => [name, checks[name]])), typescript: { ...typecheck, file: typecheckFile, sha256: hash(typecheckFile) }, browser: { ...visual, file: target + '/report.json' }, artifacts, sources: [...sources].sort().map(file => ({ file, sha256: hash(file) })), originalAudit: { file: original, sha256: hash(original) }, migration: { disposablePublicSchemaApplied: true, configuredDatabase: false, production: false, completeHistoricalChainVerified: false }, limits: ['48 HTTP históricos fora do filtro; regressão local não homologa toda a plataforma.', 'Binários, streams e exclusão externa simulados; sem R2 real.', 'Revisão jurídica, representação/entrega documental reais, baseline/banco legado e implantação separados em 019/020/043/046/047.', 'Execuções intermediárias e falhas brutas preservadas; evidência anterior é histórica.'] };
fs.writeFileSync(folder + '/verificacoes-privacidade.json', JSON.stringify(manifest, null, 2) + '\n');
const statesFile = folder + '/tratamento.json'; const states = JSON.parse(fs.readFileSync(statesFile, 'utf8'));
const corrections = {
 '005': 'DTOs mantidos com identidade allowlist, sem credenciais/cartão/saúde global. Ficha operacional separa dados de saúde; respostas de configurações não espalham User. Logs e auditoria ocultam credenciais, contatos/documentos/saúde e argumentos Prisma. Desafios internos de identidade excluídos da fila e SSR. Módulos físicos retirados.',
 '007': 'Saúde local por GymStudentProfile/StudentProgress, sem copiar User global; consumidores estudantis usam contexto explícito. Autoridade de saúde, unidade, atribuição e bloqueio de tratamento em perfil/avaliações/medidas/fotos/arquivos, qualquer categoria. Feedback/execução GYM revalidam dentro da transação. Portal verifica hasHealthAccess, identidade e idade canônica; recepção/financeiro não recebem saúde.',
 '008': 'Busca POST por identificador completo, desafio opaco de 15 minutos, 20 consultas/hora persistidas e auditoria. Convite manual de 48h com hash, autorização própria adulta ou representante legal conferido; consumo atômico vinculado ao ator/unidade/identidade/prazo. Sem autorização, identificadores globais não cadastram nem importam. Login preserva retorno local seguro.',
 '009': 'Solicitação local separada da execução; fila atual de gestão e direitos próprios/representados, inclusive após encerramento comercial. Identidade/representação revalidadas; retenção por grupo com motivo/data e resposta explícita. Decisão/bloqueio persistidos; objetos privados/referências compartilhadas conferidos, confirmação externa/retry e liberação de quota antes do encerramento parcial. User/outros vínculos intactos; exclusão global antiga bloqueada para GYM. Nova finalidade exige pedido/revisão/evidência, sem restaurar dados eliminados.',
 '010': 'Dossiê com privacy.manage e escopo local; inclui contratos/finanças/avaliações/arquivos/medidas/fotos/treinos/execuções/feedback/mensagens próprias/representação/pedidos/aceites sem corte silencioso. Teste de 501 medidas. Binários base64 com SHA-256/tamanho/MIME, limites cumulativos 100MB/1000, chaves/autoria verificáveis e falha fechada para legado não reconciliado. Formaliza geração efetiva e entrega ainda não confirmada; exportação própria ampliada. R2/legado em 047.',
 '060': 'Cadastro/importação/edição usam DOB canônica e matrícula administrativa transacional já verificada. Comando, edição e job limitado compartilham maioridade auditada única, revogando representação legal/saúde sem alterar histórico do pagador. Identidades inconsistentes exigem conferência. Prova de conta menor depende de representante adulto; login próprio segue bloqueado até revisão jurídica 019.',
};
for (const [suffix, correction] of Object.entries(corrections)) {
 const state = states['GYM-AUD-' + suffix]; if (state.completedBatch !== 'privacy-20261006') { state.history ??= []; state.history.push({ batch: 'before-privacy-20261006', state: state.state, correction: state.correction }); }
 state.state = 'Corrigido e verificado'; state.completedBatch = 'privacy-20261006'; state.correction = correction;
 state.currentConfirmation = 'Ponto 2 local verificado: 229 PostgreSQL/0 falhas, quatro HTTP focais/0 falhas/48 excluídos, três jornadas de navegador/4 capturas/0 pageerror, TypeScript completo exit 0. Migration apenas no banco descartável. Revisão jurídica/R2/legado/produção continuam em achados próprios.';
 state.files = [...new Set([...state.files, 'tests/gym/privacy-health.integration.ts', 'docs/audits/academias/estabilizacao/privacidade-saude-identidade.md', 'docs/audits/academias/estabilizacao/verificacoes-privacidade.json'])];
 const validation = 'Ponto 2 — 06/10/2026: 229 PostgreSQL, quatro HTTP focais, três jornadas Chrome desktop/celular/teclado e TypeScript aprovados. Manifesto verificacoes-privacidade.json; sem homologação jurídica/R2/produção.';
 if (!state.validation.includes(validation)) state.validation.push(validation);
}
fs.writeFileSync(statesFile, JSON.stringify(states, null, 2) + '\n');
const remainingFile = 'scripts/gym-remaining-report.cjs'; let remaining = fs.readFileSync(remainingFile, 'utf8');
for (const suffix of Object.keys(corrections)) remaining = remaining.replace(new RegExp("^ '" + suffix + "':.*\\r?\\n", 'm'), '');
remaining = remaining.replace('após os sete tópicos de autoridade, licença e quotas do ponto 1.', 'após os pontos 1 (autoridade/licenças/quotas) e 2 (privacidade/saúde/identidade/representação).');
fs.writeFileSync(remainingFile, remaining);
const main = 'docs/audits/academias/estabilizacao-modulo-academias.md'; let report = fs.readFileSync(main, 'utf8');
if (!report.includes('<!-- privacy-20261006 -->')) report += '\n\n<!-- privacy-20261006 -->\n## Privacidade, saúde, identidade e representação — 06/10\n\nO [ponto 2](estabilizacao/privacidade-saude-identidade.md) completa o escopo local dos achados 005/007/008/009/010/060. Saúde local, autorização de vínculo, pedidos e exclusão com retenção/retry, portabilidade com binários, portal do responsável e transição de maioridade foram implementados e verificados. Resultado: 229 PostgreSQL/0 falhas, quatro HTTP focais/0 falhas/48 fora do filtro, três jornadas Chrome/4 capturas/0 pageerror e TypeScript completo exit 0. Migration aplicada apenas ao banco descartável. Revisão jurídica, R2 real, legado e implantação permanecem explícitos. O [manifesto](estabilizacao/verificacoes-privacidade.json) preserva resultados e hashes; a [lista de tudo que falta](estabilizacao/pendencias-restantes.md) contém 28 achados abertos.\n';
report = report.replace(/Posição deste marco: 12 achados corrigidos e verificados[^\r\n]+/, 'Posição atual após os pontos 1 e 2: 24 achados corrigidos e verificados, 13 retirados do escopo, 3 implementados aguardando verificação específica e 25 pendentes. São 28 achados abertos, detalhados na lista exaustiva; não representam processos independentes.');
fs.writeFileSync(main, report);
console.log(JSON.stringify({ closed: Object.keys(corrections), checks: names.map(name => ({ name, passed: checks[name].passed })), browserScenarios: visual.scenarios.length, sources: sources.size, artifacts: artifacts.length }));
