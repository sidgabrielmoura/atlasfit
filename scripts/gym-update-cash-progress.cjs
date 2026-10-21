const fs = require('node:fs');
const root = 'docs/audits/academias/estabilizacao';
const file = `${root}/tratamento.json`;
const states = JSON.parse(fs.readFileSync(file, 'utf8'));
const annex = `${root}/caixa-retry-unidades.md`;
const files = [
  'src/modules/workspaces/application/cash-mutations.ts',
  'src/modules/workspaces/application/cash-drawer-expense-service.ts',
  'src/modules/workspaces/application/manual-finance-authority.ts',
  'src/app/api/gym/finance/accounts/route.ts', 'src/app/api/gym/finance/transfers/route.ts',
  'src/app/api/gym/finance/expenses/route.ts', 'src/app/api/gym/finance/cash-drawer/route.ts',
  'src/app/api/gym/finance/cash-drawer/movements/route.ts', 'src/app/api/gym/finance/cash-drawer/close/route.ts',
  'src/app/api/gym/finance/cash-drawer/reconcile/route.ts',
  'src/app/(gym)/gym/finance/components/accounts-tab.tsx', 'src/app/(gym)/gym/finance/components/cash-drawer-tab.tsx',
  'src/app/(gym)/gym/finance/components/internal-finance-contract.ts', 'src/app/(gym)/gym/finance/finance-client.tsx',
  'src/hooks/use-request-attempt.ts', 'prisma/migrations/20261003020000_gym_cash_movement_retry/migration.sql',
  'tests/gym/cash-expense.integration.ts', 'tests/gym/manual-finance.integration.ts', 'tests/gym/http.spec.ts', annex,
];
const proof = 'Caixa interno: 42/0 PostgreSQL real atuais e 1/0 HTTP com FINANCE local/retry/fechamento/conferência/revogação; 28 fora do filtro HTTP. UI/reload/abas ainda sem browser, como delimitado no anexo.';
if (states['GYM-AUD-026'].validation.includes(proof)) { console.log('Este lote de caixa já está registrado.'); process.exit(0); }
function add(number, correction) {
  const state = states[`GYM-AUD-${String(number).padStart(3, '0')}`];
  state.correction = correction;
  state.files = [...new Set([...state.files, ...files])];
  state.validation = [...new Set([...state.validation, proof])];
}
add(26, 'Recebimento, reversão e despesas convergem com contas/turnos por lançamentos atômicos e compensatórios; parcial conserva saldo. CASH exige turno próprio e diferença é justificada. Transferência relê saldo e ambas as unidades na transação. Sangria/transferência agora exigem chave/fingerprint; retry concorrente persiste uma única movimentação, conteúdo diferente retorna 409, e replay de registro concluído não edita turno fechado. Grants/suspensão são revalidados inclusive no retry. As causas originais e invariantes foram verificadas em PostgreSQL e HTTP. Reconciliação de agregados históricos e homologação visual permanecem explicitamente nos achados pertinentes, sem fabricar histórico.');
states['GYM-AUD-026'].state = 'Corrigido e verificado';
states['GYM-AUD-026'].currentConfirmation = 'Causas originais corrigidas e invariantes verificadas no código atual/ambiente descartável. Não declara homologação de produção, dados legados ou browser.';
add(2, states['GYM-AUD-002'].correction + ' Contas internas, turno atual, histórico e despesas agora exigem ator e filtram unidades na transação; pesquisa/KPIs de despesas conservam o escopo. FINANCE local fecha/confere via autoridade no recurso. SSR financeiro completo, analytics e demais consultas ainda pendentes.');
add(11, states['GYM-AUD-011'].correction + ' Comandos de caixa/transferência/contas usam autoridade financeira que não promove legado local a central e validam ambos os destinos. Relações históricas e FKs compostas globais permanecem pendentes.');
add(51, states['GYM-AUD-051'].correction + ' Contas/caixa têm seletores de unidade/conta, DTOs validados, erro/retry e proteção de resposta antiga. Opção/texto de gateway residual retirados. Chave de tentativa persiste na aba sem dados pessoais; comportamento de reload e conflitos requer browser.');
states['GYM-AUD-030'].correction += ' Cadastro de conta também perdeu opção/badge/texto de gateway residual; API recusa esse tipo e consultas excluem contas externas.';
fs.writeFileSync(file, JSON.stringify(states, null, 2) + '\n');
const main = 'docs/audits/academias/estabilizacao-modulo-academias.md';
let text = fs.readFileSync(main, 'utf8');
if (!text.includes('(estabilizacao/caixa-retry-unidades.md)')) text = text.replace('## Arquitetura e sequência', 'O [lote de caixa, repetição e unidades](estabilizacao/caixa-retry-unidades.md) consolida transferências/sangrias únicas, replay sem editar turno fechado e leitura autorizada de contas/turnos/despesas. PostgreSQL e HTTP verificaram as invariantes; interface e SSR completo seguem com limitações explícitas.\n\n## Arquitetura e sequência');
const counts = Object.values(states).reduce((result, state) => { result[state.state] = (result[state.state] || 0) + 1; return result; }, {});
text = text.replace(/Posição deste marco: [^\n]+/, `Posição deste marco: ${counts['Corrigido e verificado'] || 0} achados corrigidos e verificados, ${counts['Desativado ou retirado do escopo com segurança'] || 0} retirados do escopo, ${counts['Implementado, aguardando verificação específica'] || 0} implementados aguardando verificação específica e ${counts.Pendente || 0} pendentes. Pendências incluem achados compostos com correções parciais; não representam processos independentes.`);
const marker = '- `20261003020000_gym_cash_movement_retry`';
if (!text.includes(marker)) text = text.replace('## Decisões e migrações', `## Decisões e migrações\n\n${marker} adiciona chave única/fingerprint nullable para movimento e transferência. Histórico preservado, aplicada somente ao banco descartável. Clientes atuais enviam chave estável; implantação/baseline seguem pendentes.`);
fs.writeFileSync(main, text);
const old = `${root}/caixa-despesas.md`;
let prior = fs.readFileSync(old, 'utf8');
if (!prior.includes('(caixa-retry-unidades.md)')) prior = prior.replace(/^(#[^\n]+\n)/, '$1\nAtualização de 03/10: [retry de caixa, unidades e contratos implementados](caixa-retry-unidades.md). Pendências de idempotência descritas abaixo representam o lote anterior.\n');
fs.writeFileSync(old, prior);
console.log('Caixa registrado por achado; demais pendências preservadas.', counts);
