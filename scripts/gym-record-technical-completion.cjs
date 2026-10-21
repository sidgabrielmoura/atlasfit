const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
process.chdir(path.resolve(__dirname, '..'));
const folder = 'docs/audits/academias/estabilizacao';
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const journal = read(`${folder}/verificacoes-isoladas.json`);
const units = journal['finalizar-unitarios'];
const integration = journal.postgresql;
const http = read(`${folder}/verificacoes-http-lotes.json`);
const build = read(`${folder}/verificacoes-final-build.json`);
const install = read(`${folder}/verificacoes-final-install.json`);
const legacy = read(`${folder}/verificacoes-transicao-legado.json`);
const deploy = read(`${folder}/verificacoes-tenant-deploy.json`);
for (const result of [units, integration, http, build, install, deploy]) assert.equal(result.success, true);
for (const result of [units, integration]) {
  assert.equal(result.exitCode, 0); assert.equal(result.failed, 0); assert.equal(result.skipped, 0);
  assert.equal(result.assertions.length, result.passed);
}
assert.equal(units.passed, 262); assert.equal(integration.passed, 341);
const executed = http.batches.flatMap(batch => {
  assert.equal(batch.exitCode, 0); assert.equal(batch.failed, 0);
  return read(batch.rawFile).testResults.flatMap(suite => suite.assertionResults)
    .filter(test => test.status === 'passed')
    .map(test => ({ name: test.fullName, status: test.status }));
});
assert.equal(new Set(executed.map(test => test.name)).size, http.selected.length);
assert.deepEqual(executed.map(test => test.name).sort(), [...http.selected].sort());
assert.equal(http.passed, executed.length);
assert.equal(legacy.schemaDiff.exitCode, 0); assert.equal(legacy.deploy.exitCode, 0);
assert.equal(legacy.status.exitCode, 0); assert.equal(legacy.finalTriggerDefinitionsMatch, true);
const files = [
  'package.json', 'package-lock.json', 'prisma/schema.prisma',
  'scripts/test-gym-unit.cjs', 'scripts/gym-build-isolated.cjs', 'scripts/gym-install-isolated.cjs',
  'scripts/gym-http-batches.cjs', 'scripts/gym-test-legacy-transition.cjs',
  'src/modules/payments/__tests__/financial.test.ts',
  'src/modules/payments/application/payment-service.ts', 'src/modules/payments/providers/asaas/asaas-adapter.ts',
  'tests/gym/personal-charge-recovery.integration.ts', 'tests/gym/storage-dashboard.integration.ts',
];
const hash = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
assert.equal(install.manifestSha256, hash('package.json'));
assert.equal(install.lockSha256, hash('package-lock.json'));
const states = read(`${folder}/tratamento.json`);
const open = Object.entries(states).filter(([, row]) => row.state === 'Pendente').map(([id]) => id).sort();
assert.deepEqual(open, ['GYM-AUD-029', 'GYM-AUD-030', 'GYM-AUD-046', 'GYM-AUD-050']);
const manifest = {
  recordedAt: new Date().toISOString(), scope: 'Local technical completion; four findings retain external and human acceptance criteria.',
  configuredDatabaseChanged: false, deploymentExecuted: false, asaasCommandsExecuted: 0,
  unit: units, integration, http: { ...http, executedCases: executed }, build, install,
  transitionEvidence: `${folder}/verificacoes-transicao-legado.json`,
  schemaEvidence: `${folder}/verificacoes-tenant-deploy.json`,
  financialInventory: `${folder}/inventario-financeiro-real.json`,
  preflight: `${folder}/preflight-tenant-real.json`,
  sourceHashes: Object.fromEntries(files.map(file => [file, hash(file)])),
  openFindings: open,
  limitations: [
    'Unit and HTTP providers are controlled; no financial command was sent to Asaas.',
    'Seven legacy billings and the undocumented GYM balance remain preserved and unresolved.',
    'Configured database schema, hosted scheduler and external alerts were not changed.',
    'Screen reader acceptance, representation/legal review, pilot and hosted performance remain pending.',
    'Clean npm installation was verified on Windows; build used existing local dependencies. Linux host installation still requires validation.',
    'PERSONAL linked to GYM remains an additional final stage, not implemented.',
  ],
};
fs.writeFileSync(`${folder}/verificacoes-finalizacao-tecnica.json`, JSON.stringify(manifest, null, 2) + '\n');
const report = [
  '# Finalização técnica dos quatro achados restantes',
  '',
  '12/10/2026. A etapa interrompida foi concluída nas verificações locais. **029, 030, 046 e 050 continuam abertos**, pois seus critérios restantes exigem documentos, execução no ambiente publicado ou aceite humano. O catálogo permanece com 65 IDs: 48 corrigidos e verificados, 13 retirados e quatro pendentes. Nenhuma publicação foi executada; o usuário fará a implantação manualmente.',
  '',
  '## Resultados atuais',
  '',
  '| Verificação | Resultado | Evidência |',
  '|---|---|---|',
  `| Unitários atuais | ${units.passed} aprovações, zero falhas/skips; exit 0 | [Manifesto](verificacoes-finalizacao-tecnica.json), seção unit |`,
  `| PostgreSQL descartável | ${integration.passed} aprovações, zero falhas/skips; exit 0 | Manifesto, seção integration |`,
  `| HTTP isolado completo | ${http.passed} nomes distintos selecionados e executados, zero falhas; ${http.batches.length} lotes | [Lotes](verificacoes-http-lotes.json) e manifesto |`,
  '| Build de produção | Compilação, TypeScript e geração de páginas concluídos; exit 0 | [Build](verificacoes-final-build.json) |',
  '| Instalação limpa | npm ci em pasta nova sem node_modules anterior; exit 0, Node 24/Windows | [Instalação](verificacoes-final-install.json) |',
  '| Schema final | Sete migrations fresca/repetida, status e diff aprovados | [Schema](verificacoes-tenant-deploy.json) |',
  `| Transição legada sintética | ${legacy.syntheticBillingsPreserved} cobranças sem vínculos preservadas; ${legacy.finalTriggerCount} gatilhos iguais; ${legacy.copiedHistoricalMigrationNames} nomes/checksums históricos coexistem com a cadeia nova | [Transição](verificacoes-transicao-legado.json) |`,
  '',
  'Os skips de cada lote HTTP correspondem a testes executados em outros lotes. O registrador comparou o conjunto completo de nomes selecionados com os nomes aprovados, sem duplicações nem casos ausentes. Os provedores financeiros e de comunicação destas regressões são controlados; nenhuma operação financeira externa foi executada.',
  '',
  '## Correções e revalidação',
  '',
  'A etapa anterior reconstruíra fixtures de equipe, cadastro, responsáveis, faturas, caixa, relatórios, importação e privacidade conforme autoridade, licença, unidade e regras atuais. A retomada confirmou o conjunto vigente inteiro. Casos antigos e módulos retirados não têm correspondência automática com as novas contagens; os caminhos retirados permanecem exercitados como recusas. As antigas 69 falhas foram superadas pela regressão atual, e os relatórios históricos permanecem disponíveis.',
  '',
  'Um teste de recuperação financeira excedeu o limite ao carregar dinamicamente o grafo de módulos dentro do caso. PaymentService passou a ser importado antes do cronômetro do teste, mantendo as expectativas de uma reserva e um comando. Uma execução seguinte terminou com exit 1 e 261 aprovações, sem incluir o caso de gateway legado; esse caso passou isoladamente e a execução completa sequencial passou com todos os 262. A causa do erro do executor não foi determinada; os artefatos intermediários permanecem em .tmp/gym-stabilization.',
  '',
  'A divergência intermediária no resumo global de armazenamento não se repetiu quando a integração foi executada sem a suíte HTTP concorrente. A expectativa de igualdade entre páginas foi preservada. Não se atribui uma causa definitiva a essa falha intermediária. A execução PostgreSQL completa atual tem exit 0.',
  '',
  'O package-lock.json antigo não correspondia ao package.json. O lockfile preparado para as dependências atuais foi incorporado e npm ci passou em pasta nova com o SDK local em file:src/dataconnect-generated. O build usou dependências locais existentes, em cópia sem .env nem credenciais externas. A instalação limpa e a compilação são evidências distintas; não comprovam build com as dependências recém-instaladas nem instalação Linux no host. Os scripts gym-install-isolated.cjs, gym-build-isolated.cjs e test-gym-unit.cjs tornam as verificações repetíveis.',
  '',
  '## Trabalho que permanece',
  '',
  '| Achado | Critério restante |',
  '|---|---|',
  '| 029 | Homologar split, taxas, pagamento e estorno em Asaas controlado com credencial válida; conferir documentalmente as sete cobranças PERSONAL antigas. Timeout conserva revisão e referência, sem novo POST. |',
  '| 030 | Conferir as sete cobranças e a origem do saldo GYM de R$ 150,00. O inventário não encontrou faturas, recebimentos ou despesas GYM que expliquem esse saldo; não criar lançamentos fictícios. |',
  '| 046 | Executar a transição revisada, revalidar o preflight real e configurar scheduler, retenção e alertas na publicação manual. readyToMigrate continua false; dados reais e histórico com falhas não foram ensaiados pelo snapshot sintético. |',
  '| 050 | Realizar leitor de tela humano, revisão de representação/documentos, piloto e medição de capacidade/latência hospedadas. Os testes automatizados não satisfazem esses critérios. |',
  '',
  'O [inventário financeiro](inventario-financeiro-real.json) e a [investigação das cobranças](evidencias-cobrancas-legadas.json) são somente leitura. A documentação ausente não foi encontrada e não foi inferida por nome, valor ou vínculo de aluno. Nenhum backfill ou alteração do banco configurado, comando Asaas, exclusão de objeto legado, commit ou push foi realizado nesta retomada.',
  '',
  'A publicação está preparada no [guia Hostinger](implantacao-manual-hostinger.md), e os aceites estão no [roteiro manual](homologacao-manual-quatro.md). PERSONAL vinculado à academia permanece como etapa adicional por último; o estudo não representa implementação. CRM, turmas, equipamentos e gateway GYM continuam retirados; o financeiro GYM continua local/manual.',
  '',
].join('\n');
fs.writeFileSync(`${folder}/finalizacao-tecnica-quatro.md`, report);
const common = `12/10/2026: ${units.passed} unitários, ${integration.passed} integrações PostgreSQL e ${http.passed} HTTP aprovados; nenhum caso ausente no conjunto combinado. Build com TypeScript e npm ci limpo aprovados localmente. Manifesto verificacoes-finalizacao-tecnica.json; sem implantação ou homologação humana.`;
const corrections = {
  'GYM-AUD-029': 'Cobrança PERSONAL conserva obrigação e idempotência antes do provedor; resultado incerto não repete POST, recuperação exige referência e fatos compatíveis. Split/taxas e escopo de ambiente/subconta têm testes locais. Homologação financeira externa, estornos reais e vínculos documentais das sete cobranças continuam pendentes.',
  'GYM-AUD-030': 'Inventário financeiro completo em READ ONLY registrou ausência de faturas/recebimentos/despesas GYM que expliquem o saldo interno de 15000 centavos. Reconciliação local foi revalidada; o saldo e as sete cobranças PERSONAL não receberam fatos inventados. Conferência documental e externa permanece pendente.',
  'GYM-AUD-046': 'Transição sintética preservou sete cobranças sem vínculos, conferiu 200 gatilhos e coexistiu com 36 nomes/checksums históricos. Cadeia de sete migrations fresca/repetida, status e diff aprovados. Lockfile npm sincronizado, instalação limpa e build aprovados localmente. Preflight real continua readyToMigrate=false; aplicação real, backfills documentais, scheduler e alertas permanecem pendentes. Publicação será manual pelo usuário.',
  'GYM-AUD-050': 'Fixtures restantes de equipe, cadastro, responsáveis, faturas, caixa, relatórios, importação e privacidade foram reconstruídas para autoridade e dados persistidos atuais. Conjunto vigente tem 262 unitários, 341 integrações e regressão HTTP completa, sem falhas/skips no conjunto combinado. Contagens antigas são históricas, não correspondência individual automática; retiradas continuam testadas como recusas. Leitor de tela humano, representação/documentos, piloto e latência hospedada ainda precisam de aceite.',
};
for (const id of open) {
  const row = states[id]; row.history ??= [];
  if (!row.history.some(item => item.batch === 'before-technical-completion-20261012')) {
    row.history.push({ batch: 'before-technical-completion-20261012', state: row.state, correction: row.correction, currentConfirmation: row.currentConfirmation });
  }
  row.correction = corrections[id]; row.currentConfirmation = common;
  row.validation = [...new Set([...row.validation, common])];
  row.files = [...new Set([...row.files, `${folder}/finalizacao-tecnica-quatro.md`, `${folder}/verificacoes-finalizacao-tecnica.json`, `${folder}/homologacao-manual-quatro.md`, `${folder}/implantacao-manual-hostinger.md`])];
  row.completedBatch = 'technical-completion-20261012';
}
fs.writeFileSync(`${folder}/tratamento.json`, JSON.stringify(states, null, 2) + '\n');
require('./gym-stabilization-report.cjs');
require('./gym-remaining-report.cjs');
console.log(JSON.stringify({ unit: units.passed, integration: integration.passed, http: http.passed, open }));
