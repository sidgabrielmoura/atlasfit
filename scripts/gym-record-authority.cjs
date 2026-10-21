const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const folder = 'docs/audits/academias/estabilizacao';
const hash = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const original = 'docs/audits/academias/achados.json';
assert.equal(hash(original), '0cc3c815e28c2590e569d515ef1c3855e0a99595066f37ed2fa0059df143c225');
const checks = JSON.parse(fs.readFileSync(`${folder}/verificacoes-isoladas.json`, 'utf8'));
const names = ['authority-regression-shared', 'authority-http-final', 'authority-bounded-upload'];
for (const [index, name] of names.entries()) {
  assert.equal(checks[name].success, true); assert.equal(checks[name].failed, 0);
  assert.equal(checks[name].passed, [207, 4, 1][index]);
}
const typecheckFile = `${folder}/typecheck-authority-final.json`;
const typecheck = JSON.parse(fs.readFileSync(typecheckFile, 'utf8'));
assert.equal(typecheck.exitCode, 0);
const artifactFolder = `${folder}/autoridade`;
fs.mkdirSync(artifactFolder, { recursive: true });
const artifacts = fs.readdirSync('.tmp/gym-stabilization').filter(file => /^authority-.+-raw\.json$/.test(file)).map(file => {
  const source = `.tmp/gym-stabilization/${file}`, exported = `${artifactFolder}/${file}`;
  fs.copyFileSync(source, exported);
  return { source, file: exported, sha256: hash(exported) };
});
const sources = new Set([
  'src/lib/prisma.ts', 'src/lib/audit-context.ts', 'src/lib/audited-request.ts', 'src/lib/logger.ts', 'src/auth.ts',
  'src/lib/storage.service.ts', 'src/lib/storage-access.ts', 'src/lib/storage-quota.service.ts', 'src/lib/storage-bounded-upload.test.ts',
  'src/lib/student-auth.ts', 'src/lib/ably.ts', 'src/providers/ably-provider.tsx', 'src/components/application/actions.ts',
  'src/app/(gym)/gym/plans/page.tsx', 'src/app/(gym)/gym/students/page.tsx', 'src/app/(gym)/gym/settings/page.tsx',
  'prisma/schema.prisma', 'prisma/migrations/20261005020000_gym_authority_audit_storage/migration.sql',
  'scripts/gym-check-runner.cjs', 'scripts/gym-remaining-report.cjs', 'scripts/gym-record-authority.cjs',
]);
function walk(folder) {
  for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
    const file = path.posix.join(folder, entry.name);
    if (entry.isDirectory()) walk(file); else if (/\.(ts|tsx)$/.test(file)) sources.add(file);
  }
}
for (const directory of ['src/modules/workspaces', 'src/app/api/gym', 'src/app/api/chat', 'src/app/api/storage', 'src/app/api/student/evolution', 'src/app/api/superadmin/workspaces', 'src/app/api/superadmin/gym-settings', 'tests/gym']) walk(directory);
const manifest = {
  recordedAt: new Date().toISOString(), topics: ['Permissões', 'Unidades', 'Titularidade', 'Suspensão', 'Licenças', 'Quotas', 'Auditoria'],
  scope: 'GYM mantido; financeiro local/manual; sem CRM, turmas, hardware ou gateway GYM.',
  environment: { database: 'PostgreSQL descartável 127.0.0.1:56432/atlasfit_gym_stabilization_20261001', application: 'Cópia sem .env, porta 31173', realCredentials: false },
  checks: Object.fromEntries(names.map(name => [name, checks[name]])),
  typescript: { ...typecheck, file: typecheckFile, sha256: hash(typecheckFile) },
  migration: { prepared: true, ddlAppliedToDisposablePublicSchema: true, configuredDatabase: false, production: false, completeHistoricalChainVerified: false },
  sources: [...sources].sort().map(file => ({ file, sha256: hash(file) })), artifacts,
  originalAudit: { file: original, sha256: hash(original) },
  limits: ['44 casos HTTP fora do filtro.', 'HEAD/exclusão simulados; assinatura de PUT com SDK real e credenciais sintéticas sem rede.', 'R2/Ably reais, bucket legado, produção e baseline completo de migrations pendentes.', 'Sem homologação visual deste lote ou da aplicação inteira.'],
  historicalEvidence: 'Hashes e resultados de lotes anteriores são fotografias daquele código; este manifesto registra as fontes atuais e preserva as execuções intermediárias com falhas.',
};
fs.writeFileSync(`${folder}/verificacoes-autoridade.json`, JSON.stringify(manifest, null, 2) + '\n');
const statesFile = `${folder}/tratamento.json`;
const states = JSON.parse(fs.readFileSync(statesFile, 'utf8'));
const corrections = {
  '001': 'Suspensão aplicada nos guards, comandos, consultas estudantis compartilhadas, arquivos, chat e jobs GYM mantidos. Superadmin operacional também bloqueado; recuperação administrativa separada. Jobs filtram antes do lote e revalidam na transação.',
  '002': 'Papéis legados locais não concedem autoridade global nem de outra unidade; grants revogados não restauram legado. Seletores reconhecem titular registrado e grants ativos. Chat, conversas, anexos e capacidades/presença realtime respeitam unidade e carteira.',
  '003': 'OWNER não é concedido por edição comum; coproprietários históricos e titular registrado são protegidos. Mudança de papel revoga todos os grants profissionais anteriores. Transferência e desligamento são atômicos, auditados e aplicam quota. Edição estudantil não desativa autoridade acumulada.',
  '015': 'Licença operacional e flags mantidas são aplicadas no servidor e nos jobs, inclusive recursos compartilhados e sessões existentes. Recursos físicos e flags de módulos retirados não são reativados. Recuperação administrativa preserva acesso específico.',
  '042': 'Defaults na transação, ausência/vigência/zero respeitados sem trial criado em leitura. Alunos/importação, equipe/convites/aceite/papéis/transferência e unidades revalidam quota atomicamente. Inventário/reservas de arquivos, fotos, marca e chat, assinatura limitada e HEAD na finalização. Reservas vencidas não escondem órfãos; exclusão confirmada libera consumo. Homologação externa/inventário legado separados em 047 e implantação em 046.',
  '053': 'Fronteiras HTTP GYM/administrativas/shared mantidas usam contexto de auditoria compartilhado entre bundles e Prisma, com executor real, usuário efetivo, impersonação, correlação e fase vindos da sessão. Comandos críticos de autoridade incluem antes/depois; gravação e auditoria são atômicas. Medidas/avaliações/fotos mantidas auditadas. Login/logger preservam executor. Revogação do administrador invalida sessão de suporte. Outbox e jornadas globais restantes permanecem em 044/065.',
};
for (const [suffix, correction] of Object.entries(corrections)) {
  const id = `GYM-AUD-${suffix}`, state = states[id];
  if (state.completedBatch !== 'authority-20261006') {
    state.history ??= [];
    state.history.push({ batch: 'before-authority-20261006', state: state.state, correction: state.correction });
  }
  state.state = 'Corrigido e verificado'; state.correction = correction; state.completedBatch = 'authority-20261006';
  state.currentConfirmation = 'Implementação e verificação do escopo GYM mantido: 207 integrações PostgreSQL, quatro HTTP focais, um teste de assinatura real do SDK e TypeScript aprovado. Sem homologação externa/visual ou de toda a aplicação.';
  state.files = [...new Set([...state.files, 'tests/gym/authority-completion.integration.ts', 'docs/audits/academias/estabilizacao/autoridade-licenca-quotas.md', 'docs/audits/academias/estabilizacao/verificacoes-autoridade.json', ...[...sources].filter(file => /gym-license|gym-chat-contacts|audit-context|audited-request|staff-capacity|gym-storage|gym-selectors|gym-unit-commands|gym-progress-commands/.test(file))])];
  const validation = 'Ponto 1 — 06/10/2026: 207 PostgreSQL/0 falhas; quatro HTTP/0 falhas/44 fora do filtro; SDK S3 um unitário/0 falhas; TypeScript exit 0. Manifesto verificacoes-autoridade.json. DDL aplicada apenas ao banco descartável; sem homologação externa.';
  if (!state.validation.includes(validation)) state.validation.push(validation);
}
const partialNotes = {
  '046': 'Lote de autoridade de 06/10: DDL de AuditLog.metadata e GymStorageObject aplicada exclusivamente ao schema público do PostgreSQL descartável. Cadeia completa, baseline legado e produção continuam pendentes.',
  '047': 'Lote de autoridade de 06/10: inventário, reserva/limite de PUT, finalização com HEAD, quotas de marca/chat/fotos/arquivos, reconciliação de referências e limpeza de órfãos inventariados implementados. PostgreSQL com mocks de HEAD/delete e assinatura real de SDK passaram. R2 real e inventário completo de objetos legados do bucket continuam pendentes.',
  '049': 'Lote de autoridade de 06/10: capacidades atuais e publicação de chat revalidam participantes/unidade/carteira/licença. Presença GYM por usuário/workspace e contatos autorizados. Reautorização do cliente após alterações e homologação real Ably continuam pendentes.',
};
for (const [suffix, note] of Object.entries(partialNotes)) {
  const state = states[`GYM-AUD-${suffix}`];
  if (!state.correction.includes(note)) state.correction += ' ' + note;
  state.files = [...new Set([...state.files, 'docs/audits/academias/estabilizacao/autoridade-licenca-quotas.md'])];
}
fs.writeFileSync(statesFile, JSON.stringify(states, null, 2) + '\n');
require('./gym-stabilization-report.cjs');
require('./gym-remaining-report.cjs');
const progressFile = 'docs/audits/academias/estabilizacao-modulo-academias.md';
let progress = fs.readFileSync(progressFile, 'utf8');
if (!progress.includes('<!-- authority-20261006 -->')) progress += '\n\n<!-- authority-20261006 -->\n## Sete tópicos do ponto 1 — 06/10\n\nO [lote de autoridade, licença e quotas](estabilizacao/autoridade-licenca-quotas.md) completa permissões, unidades, titularidade, suspensão, licenças, quotas e auditoria no GYM mantido. Verificação final: 207 integrações PostgreSQL, quatro HTTP focais, um unitário com SDK S3 real e TypeScript completo aprovados. Os achados 001, 002, 003, 015, 042 e 053 foram atualizados com evidências; restam 34 achados abertos. Migração/produção, bucket legado, R2/Ably reais e jornadas visuais continuam nos achados próprios. A DDL de auditoria/inventário foi aplicada somente ao banco descartável. Resultados intermediários preservados no manifesto; evidências anteriores continuam históricas. A [lista exaustiva do restante](estabilizacao/pendencias-restantes.md) foi regenerada.\n';
fs.writeFileSync(progressFile, progress);
console.log(JSON.stringify({ artifacts: artifacts.length, sources: sources.size, completedFindings: Object.keys(corrections).length }));
