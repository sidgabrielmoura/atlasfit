const fs = require('node:fs');
const root = 'docs/audits/academias/estabilizacao';
const file = `${root}/tratamento.json`;
const states = JSON.parse(fs.readFileSync(file, 'utf8'));
const marker = 'Relatórios e formulário por unidade — 05/10/2026';
const reports = JSON.parse(fs.readFileSync(`${root}/verificacoes-isoladas.json`, 'utf8'));
const annexes = [`${root}/relatorios-escopo-unidades.md`, `${root}/financeiro-unidades-catalogo.md`];
const files = [
 'src/modules/workspaces/application/gym-report-authority.ts', 'src/modules/workspaces/application/gym-analytics-service.ts',
 'src/modules/workspaces/application/gym-unit-access.ts', 'src/modules/workspaces/application/gym-finance-page-data.ts',
 'src/modules/workspaces/application/gym-expense-catalog.ts', 'src/modules/workspaces/application/gym-provisioning.ts',
 'src/modules/workspaces/application/cash-drawer-expense-service.ts', 'src/modules/workspaces/application/cash-mutations.ts',
 'src/modules/workspaces/application/invoice-service.ts', 'src/modules/workspaces/domain/types.ts',
 'src/modules/workspaces/application/manual-invoice-service.ts', 'src/modules/workspaces/application/transaction.ts',
 'src/modules/workspaces/domain/manual-finance-contract.ts', 'src/hooks/use-request-attempt.ts', 'prisma/schema.prisma',
 'prisma/migrations/20261005000000_gym_manual_invoice_retry/migration.sql',
 'src/app/api/gym/analytics/kpis/route.ts', 'src/app/api/gym/analytics/export/route.ts', 'src/app/api/gym/finance/legacy/route.ts',
 'src/app/api/gym/finance/suppliers/route.ts', 'src/app/api/gym/finance/expenses/categories/route.ts',
 'src/app/api/gym/finance/expenses/route.ts', 'src/app/api/gym/finance/expenses/[id]/pay/route.ts', 'src/app/api/gym/finance/expenses/[id]/cancel/route.ts',
 'src/app/(gym)/gym/finance/page.tsx', 'src/app/(gym)/gym/finance/finance-client.tsx',
 'src/app/(gym)/gym/finance/components/expenses-tab.tsx', 'src/app/(gym)/gym/finance/components/internal-finance-contract.ts',
 'src/app/(gym)/gym/dashboard/page.tsx', 'src/app/(gym)/gym/dashboard/dashboard-client.tsx',
 'tests/gym/report-scope.integration.ts', 'tests/gym/finance-page.integration.ts', 'tests/gym/http.spec.ts', ...annexes,
];
const proofs = ['report-scope', 'http-report-scope', 'finance-page', 'http-finance-page', 'invoice-retry'].map(label => {
 const result = reports[label];
 return result ? `${label}: ${result.passed} aprovações/${result.failed} falhas; ${result.skipped} fora do filtro; ${result.finishedAt}.` : `${label}: execução ainda sem resultado registrado.`;
});
function update(number, correction) {
 const state = states[`GYM-AUD-${String(number).padStart(3, '0')}`];
 if (!state.validation.some(item => item.startsWith(marker))) state.correction += ` ${correction}`;
 state.files = [...new Set([...state.files, ...files])];
 state.validation = [...state.validation.filter(item => !item.startsWith(marker)), `${marker}: ${proofs.join(' ')}`];
}
update(2, 'Indicadores/exportações revalidam ator/grants, unidade e carteira em transação; parcelas financeiras respeitam escopo. Página financeira deixou de exigir permissão global e metadados dos formulários usam a autoridade da operação, sem promover papel local. Demais consultas/recursos continuam pendentes.');
update(30, 'Histórico externo somente leitura exige autoridade global atual e não cria contas nem consulta gateway. Não declara reconciliados saldos/assinaturas reais.');
update(36, 'Relatórios usam ator obrigatório/escopo transacional; TRAINER não obtém financeiro por parâmetros e visualiza sua carteira. CSV tem seleção explícita, precisão e limite com 413 sem truncamento silencioso. Fórmulas de MRR/churn/aging/renovação e consultas superadmin permanecem pendentes.');
update(51, 'Página e abas financeiras refletem autoridade disponível; catálogo vazio tem recuperação explícita em POST e consulta GET pura. Recibo indica valor recebido, inclusive parcial. Browser e UX por recurso/paginação continuam pendentes.');
update(52, 'Carga do formulário usa selects mínimos e consulta financeira ordenada/paginada; exportação limita volume explicitamente. Defaults de categorias saíram do GET; provisionamento é atômico e recuperação explícita. Medição representativa, catálogo/seletores paginados e custo dos indicadores permanecem pendentes.');
update(50, 'Novos lotes focais agrupam cenários em 2 testes PostgreSQL e 1 HTTP da jornada, preservando limitações e falhas anteriores. Não foram repetidas suítes amplas sem necessidade; regressão PERSONAL final e navegador seguem pendentes.');
const invoiceMarker = 'Emissão avulsa idempotente — 05/10/2026';
const issuanceState = states['GYM-AUD-018'];
if (!issuanceState.validation.some(item => item.startsWith(invoiceMarker))) issuanceState.correction += ' Emissão avulsa agora exige chave de tentativa, grava fingerprint/índice único separado da recorrência e reautoriza replay. Concorrência cria uma obrigação/uma auditoria; intenção diferente conflita. Interface de emissão/recebimento conserva chave na aba, com homologação de recuperação visual ainda pendente.';
issuanceState.files = [...new Set([...issuanceState.files, ...files])];
issuanceState.validation = [...issuanceState.validation.filter(item => !item.startsWith(invoiceMarker)), `${invoiceMarker}: ${proofs.join(' ')}`];
fs.writeFileSync(file, JSON.stringify(states, null, 2) + '\n');
const main = 'docs/audits/academias/estabilizacao-modulo-academias.md';
let text = fs.readFileSync(main, 'utf8');
if (!text.includes('`20261005000000_gym_manual_invoice_retry`')) text = text.replace('## Decisões e migrações', '## Decisões e migrações\n\n- `20261005000000_gym_manual_invoice_retry` adiciona chave única e fingerprint nullable para emissão avulsa. Retry não cria nova obrigação e revalida autorização; histórico preservado. Aplicada somente ao banco descartável; consumidores de emissão precisam enviar chave estável e implantação/baseline continuam pendentes.');
if (!text.includes('(estabilizacao/relatorios-escopo-unidades.md)')) text = text.replace('## Arquitetura e sequência', 'Os [relatórios por unidade e carteira](estabilizacao/relatorios-escopo-unidades.md) e a [jornada financeira com catálogo autorizado](estabilizacao/financeiro-unidades-catalogo.md) conectam consultas, página e comandos. Validação focal e limites estão nos anexos; os achados compostos continuam abertos.\n\n## Arquitetura e sequência');
text = text.replace('GYM-AUD-018 está corrigido e verificado na condição original; 026 e 036 continuam parciais nas pendências descritas.', 'GYM-AUD-018 e GYM-AUD-026 estão corrigidos e verificados nas condições originais; GYM-AUD-036 permanece parcial nas pendências descritas.');
text = text.replace('Homologação física exige agente/equipamento e firmware identificados.', 'CRM GYM, aulas e hardware foram retirados da operação por revisão de escopo. Referências de homologação física nos anexos anteriores são históricas e pertencem à futura task separada, não à conclusão do escopo atual.');
fs.writeFileSync(main, text);
console.log('Evidências acrescentadas; nenhum achado composto encerrado apenas pelo lote focal.');
