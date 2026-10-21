const fs = require('node:fs');
const root = 'docs/audits/academias/estabilizacao';
const file = `${root}/tratamento.json`;
const states = JSON.parse(fs.readFileSync(file, 'utf8'));
const annex = `${root}/revisao-contratual-manual.md`;
const files = [
  'src/modules/workspaces/application/enrollment-revision.ts',
  'src/modules/workspaces/application/enrollment-service.ts',
  'src/modules/workspaces/application/enrollment-contract.ts',
  'src/modules/workspaces/application/enrollment-activation.ts',
  'src/modules/workspaces/application/manual-subscription-service.ts',
  'src/modules/workspaces/application/gym-unit-access.ts',
  'src/app/api/gym/enrollments/route.ts',
  'src/app/api/gym/enrollments/[id]/route.ts',
  'src/app/api/gym/enrollments/[id]/change-plan/route.ts',
  'src/app/api/gym/enrollments/[id]/renew/route.ts',
  'src/app/api/gym/enrollments/[id]/simulate-change-plan/route.ts',
  'src/app/api/gym/enrollments/[id]/accept/route.ts',
  'src/app/(gym)/gym/enrollments/page.tsx',
  'src/app/(gym)/gym/enrollments/enrollments-client.tsx',
  'prisma/migrations/20261003010000_gym_contract_revisions/migration.sql',
  'tests/gym/enrollment-revision.integration.ts', 'tests/gym/http.spec.ts', annex,
];
function record(number, correction, relevant = files) {
  const state = states[`GYM-AUD-${String(number).padStart(3, '0')}`];
  state.correction = correction;
  state.files = [...new Set([...state.files, ...relevant])];
  state.validation = [...new Set([...state.validation, 'Lote revisão contratual: 43/0 PostgreSQL antes da ampliação de leitura por unidade; 4/0 específicos atuais; 1/0 HTTP com gestor local, novo aceite/baixa/ativação e impersonação negada, 27 fora do filtro. Typecheck/Prisma aprovados; sem browser/produção.'])];
  state.currentConfirmation = 'Intervenção atual confirmada nos cenários delimitados no anexo; o achado composto conserva as pendências indicadas.';
}
record(22, 'Criação, aceite, ativação e pausa efetiva consolidados nos cenários registrados. Troca agora prepara contrato sucessor, exige gestão real/ajuste aprovado e novo aceite; primeira obrigação surge atomicamente no aceite. Parcial não ativa, boolean/override não dispensam pagamento positivo da revisão. Ativação substitui anterior atomicamente, sem reescrever assinatura/dívidas/recebimentos. Renovação exige contrato antes ativado e novo aceite, sem duração arbitrária ou bypass de pendência. Propostas/retry/concorrência/unidade/licença e mudanças posteriores são revalidados. Múltiplas matrículas independentes, política financeira da pausa, demais transições e homologação visual permanecem pendentes.');
record(30, 'Ciclo GYM é local/manual, com obrigação distinta do recebimento e sem wallet/onboarding. Revisão conserva versão/aceite antigos e primeira obrigação aprovada; ciclos seguintes usam preço novo, após ativação. Troca/renovação/pagamento parcial não fingem acesso ou dinheiro recebido. Provider, crédito e agendamento legados exigem reconciliação. Transição administrativa real, processamento histórico e demais regras pendentes.');
record(2, 'Grants e revogação governam escopo. Alunos, avulsas, recibos, baixa e reversão derivam unidade real. Lista/detalhe de matrículas agora consultam unidade/ator dentro da fotografia transacional; papel legado local não vira leitura global. Filtro alheio é recusado, ID alheio não retorna registro e retry reautoriza. SSR de matrículas admite grants locais sem lhes conceder autoridade global. Demais queries, OWNER e seleção de unidade em todas as interfaces ainda pendentes.');
record(12, 'Settings/subscription e financeiro usam DTO monetário seguro. Matrícula serializa o ajuste inicial sem BigInt cru e omite chave/fingerprint internos e token de cartão. Prévia apresenta recebimento como string exata. Demais superfícies monetárias ainda em revisão.');
record(19, 'Representação exige conta vinculada, CPF correspondente, maioridade e conferência atual; aceite literal e digest das condições exibidas. Novo contrato comercial possui assinatura própria; transação desfaz aceite se a primeira obrigação falhar. Impersonação não pode registrar aceite pelo aluno/responsável, confirmado em HTTP. Criação/ingresso da conta, conferência humana de representação e revisão jurídica continuam dependências operacionais, sem se declarar homologadas.');
record(51, 'Formulários GYM existentes e configuração global simplificados. Diálogo comercial agora mostra plano, vigência, obrigação inicial, motivo e aprovação, sem pró-rata fictício; campos usam Label e componentes existentes. Feedback distingue proposta, aceite, recebimento, ativação e retry de recebimento revertido. Desktop/mobile/teclado e reorganização visual integral pendentes.', [...files, 'src/app/(gym)/gym/finance/finance-client.tsx']);
states['GYM-AUD-045'].correction = 'Biblioteca/CRUD/prescrição de treinos conectados à página GYM e aos handlers autorizados, com estados efetivos. CRM, aulas, acessos/equipamentos e feed físico foram retirados do código operacional por instrução do usuário; não são tarefas de integração pendentes desta etapa. Edição avançada de treinos declara indisponibilidade. Navegação visual, métodos avançados e demais jornadas mantidas ainda pendentes.';
states['GYM-AUD-024'].correction = 'Desligamento de equipe delega à transação de repasse de alunos, elegibilidade do substituto, revogação e auditoria, preservando vínculo STUDENT e PERSONAL. Motivo obrigatório. Aulas/equipamentos foram retirados. Outras reatribuições, UI e comunicação de desligamento permanecem pendentes.';
states['GYM-AUD-020'].correction = 'Cadastro GYM canônico/atômico; adulto tem token com prazo, menor não recebe convite próprio. Setup/elegibilidade seguem decisão confirmada. CRM GYM foi retirado. Entrega/reemissão, criação segura da conta do responsável e portal completo ainda pendentes.';
states['GYM-AUD-001'].correction = 'Guards e comandos financeiros/treinos examinados rejeitam suspensão e revalidam grants atuais dentro da transação, inclusive retries. Caminhos de dispositivo/cache físico foram retirados do escopo operacional. Enforcement de suspensão em todos os serviços/jobs mantidos ainda exige cobertura; não se declara encerrado por estes comandos.';
states['GYM-AUD-015'].correction = 'Configuração global oferece somente controles mantidos com efeito delimitado; defaults de provisionamento não mudam licenças existentes. CRM/aulas/biometria/equipamentos foram retirados. Aplicação completa das flags/licença nos módulos mantidos ainda pendente; esconder controles não substitui autorização no servidor.';
states['GYM-AUD-050'].correction = 'Resultados históricos e falhas preservados. Lotes atuais: pausa/financeiro 34/0, revisão/contrato/pausa/financeiro 43/0, revisão específica ampliada 4/0, HTTP comercial 1/0 com 27 fora do filtro e typecheck final aprovado. Mock comercial antigo substituído por PostgreSQL real/HTTP da regra aprovada, com backup/hash; não equivale a aprovar suíte antiga. Browser, serviços externos, baseline de migrations e regressão final pendentes.';
states['GYM-AUD-022'].retiredFiles = [...new Set([...(states['GYM-AUD-022'].retiredFiles || []), 'src/modules/workspaces/__tests__/gym-034.test.ts'])];
fs.writeFileSync(file, JSON.stringify(states, null, 2) + '\n');
const main = 'docs/audits/academias/estabilizacao-modulo-academias.md';
let source = fs.readFileSync(main, 'utf8');
if (!source.includes('(estabilizacao/revisao-contratual-manual.md)')) source = source.replace('## Arquitetura e sequência', 'A [troca e renovação com novo contrato](estabilizacao/revisao-contratual-manual.md) implementa a decisão de 03/10: aprovação real da gestão, novo aceite, obrigação inicial própria e substituição atômica após recebimento/ativação. Lista/detalhe respeitam unidade; sessão de suporte não assina pelo aluno. O anexo registra migration e provas, sem declarar concluídos achados compostos.\n\n## Arquitetura e sequência');
source = source.replace('`ManualSubscriptionService`: primeira fatura inclui plano e taxa de matrícula;', '`ManualSubscriptionService`: primeira fatura comum inclui plano e taxa de matrícula; revisão contratual usa o valor inicial aprovado, sem nova taxa;');
source = source.replace('## Decisões e migrações', '## Decisões e migrações\n\n- Troca imediata autorizada pelo usuário exige novo aceite e ajuste financeiro aprovado pela gestão. Contrato sucessor conserva o histórico anterior; crédito nominal automático foi retirado. A nova vigência e obrigação são exibidas para confirmação, e ativação exige recebimento integral ou obrigação zero explicitamente aprovada.\n- `20261003010000_gym_contract_revisions` adiciona ligação de sucessão, metadados de aprovação/retry e valor inicial, com FK Restrict, check não negativo e índice de revisão vigente. Aplicada somente ao banco descartável; baseline/implantação continuam pendentes.');
fs.writeFileSync(main, source);
const previous = `${root}/pausa-e-escopo-financeiro.md`;
let prior = fs.readFileSync(previous, 'utf8');
if (!prior.includes('(revisao-contratual-manual.md)')) prior = prior.replace(/^(#[^\n]+\n)/, '$1\nAtualização posterior do mesmo dia: [troca e renovação implementadas com novo contrato](revisao-contratual-manual.md). As pendências comerciais descritas abaixo representam o estado anterior àquele lote.\n');
fs.writeFileSync(previous, prior);
console.log('Revisão comercial e pendências individuais registradas; estados compostos preservados.');
