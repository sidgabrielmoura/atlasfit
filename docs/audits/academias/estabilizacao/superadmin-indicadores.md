# Indicadores financeiros do SuperAdmin — 05/10/2026

Este lote continua GYM-AUD-036 após a revisão dos indicadores temporais da academia. Separa a operação financeira local das assinaturas SaaS da plataforma e elimina indicadores sem base demonstrável. Não encerra o achado composto nem o módulo inteiro.

## Fontes e comportamento

| Indicador | Base aplicada |
| --- | --- |
| Recorrência contratual no detalhe da academia | O mesmo GymAnalyticsService usado no relatório interno, com contratos vigentes normalizados em centavos, acesso administrativo atual e mesma transação Serializable do detalhe. A soma acumulada de WorkspacePayment foi retirada do campo mrr. |
| Alunos com contrato ativo | Pessoas distintas na posição contratual atual do serviço GYM. O consumo da licença continua separado: vínculos ativos, perfis e grants, conforme EntitlementsService. |
| Planos e treinos cadastrados | Contagem de GymPlan para GYM e Workout para o workspace. Não usa a lista limitada dos últimos cinco treinos nem o catálogo legado para representar a academia. |
| Referência mensal SaaS | Subscription de Personal por usuário, sem multiplicar pelos seus workspaces, mais WorkspaceSubscription ACTIVE de GYM. Vigência iniciada e não encerrada; pré-assinatura, trial, cancelada, vencida ou futura não entra. Suspensão operacional do workspace não é cancelamento da assinatura vigente. |
| Valor SaaS | Preço atual do catálogo Plan, interval month ou year. Anual é dividido por 12 com arredondamento inteiro por assinatura. A referência anual é a mensal vezes 12. **Não é MRR contratado:** não existe preço contratado preservado nessas tabelas. Os nomes mrr/arr permanecem no contrato de resposta por compatibilidade. |
| Licença sem preço ou ciclo válido | Contagem explícita de assinaturas não valoradas. Referência total mrr/arr retorna null; subtotal conhecido em centavos permanece disponível com aviso. Não atribui zero ao preço ausente. |
| Transações aprovadas e falhas | Apenas Transaction da plataforma, por status atual, valores exatos em centavos. Aprovados de hoje usa createdAt no dia civil de São Paulo. Status FAILED representa tentativa falha, sem equivalência automática a dívida vencida. Não inclui WorkspacePayment ou GymPayment. |
| Histórico de MRR, churn e LTV | Indisponíveis: null para taxas/valor e array vazio para histórico, com motivo explícito. O estado atual de Subscription não reconstitui assinatura cancelada, preço anterior ou coorte histórica. Percentuais fixos de crescimento foram retirados. |
| Plano na tabela de transações | Plano **atual** da conta e filtro pelo plano atual. Transaction não guarda plano adquirido na data do pagamento. |

As consultas verificam o papel SUPERADMIN persistido dentro da mesma transação dos fatos. A academia suspensa continua acessível administrativamente. Transações retornam somente identificação, valor, status, método, descrição, data e nome/email/plano atual da conta; não incluem o objeto completo de User, credenciais ou identificadores de gateway. Paginação e filtros têm schema estrito e limites.

O detalhe conserva pagamentos legados para consulta e identifica essa fonte; a tela GYM desabilita a moderação legada. Os comandos legados dessa rota não foram reimplementados neste lote. Não há conciliação automática, migração ou fabricação de pagamento local a partir do legado.

Financeiro e dashboard mostram falha recuperável, carregamento e indisponibilidade em vez de transformar falha de consulta em indicadores zerados. As consultas financeiras possuem estado próprio; respostas antigas de filtros de transações são abortadas e não substituem a consulta vigente. Cache anterior dos indicadores é descartado na inicialização. Contas com sessão válida e workspaces cadastrados recebem rótulos compatíveis com a consulta existente.

## Verificação

**PostgreSQL real:** 10 testes passaram, 0 falhas (superadmin-finance, report-temporal, report-scope e finance-page). **HTTP real:** 4 jornadas passaram, 0 falhas, 32 casos fora do filtro (financeiro SuperAdmin e regressão de indicadores/exportação por unidade). **TypeScript completo:** saída 0.

A rodada HTTP ampliada intermediária excedeu o limite de 120 segundos durante a primeira compilação das telas; financeiro e dashboard responderam 200, mas os tempos somados de compilação ultrapassaram o limite da jornada. A repetição com as páginas compiladas preservou timeout e assertivas. Arquivos brutos intermediários permanecem no diretório descartável.

Resultados, comandos e arquivos brutos do lote são registrados em verificacoes-isoladas.json, nos labels superadmin-finance e superadmin-finance-http. Hashes finais e checagem de tipos são registrados em verificacoes-superadmin-indicadores.json.

Os testes usam somente PostgreSQL descartável específico e Next isolado com credenciais sintéticas. Cobrem ciclos, vigência, trial/pré-assinatura, conta Personal com múltiplos workspaces, academia suspensa, dados não valorados, fontes locais/legadas, dia civil, precisão, autorização atual, DTO sem segredos, filtros, paginação e consistência entre financeiro e dashboard. As jornadas HTTP usam autenticação Credentials real e verificam compilação SSR do financeiro e dashboard.

## Limites e continuidade

GYM-AUD-036 permanece parcial para reconciliação de dados legados e evolução histórica; GYM-AUD-052 permanece aberto para carga e desempenho. Consultas ainda percorrem registros autorizados de contratos/eventos e transações aprovadas/falhas; não houve ensaio representativo de volume. O histórico SaaS exigirá fatos de vigência, cancelamento e preço contratado antes de disponibilizar métricas históricas.

SSR e contratos HTTP não homologam interação do navegador, teclado, mobile, troca rápida de filtros ou recuperação visual. Não foram executados migration, seed, integrações externas, envio de mensagens ou operações em banco de produção. CRM, turmas, hardware e gateway GYM permanecem retirados. Personal vinculado à academia continua como última etapa.
