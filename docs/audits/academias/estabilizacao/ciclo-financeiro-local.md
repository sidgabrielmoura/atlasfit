# Ciclo financeiro local e transição dos eventos externos

Lote de 02/10/2026. Código implementado e testes descritos abaixo; não é homologação de produção ou de navegador. CRM, aulas e equipamentos continuam fora do escopo operacional GYM. A configuração do personal vinculado continua como última etapa, ainda pendente.

## Arquitetura aplicada

| Responsabilidade | Fonte de verdade e intervenção | Limitação restante |
|---|---|---|
| Catálogo | `GymPlan` identifica o plano; `GymPlanVersion` guarda condições imutáveis de cada versão. Publicação serializada, uma versão comercial ativa; condições de matrículas existentes são preservadas | Listagem de todas as versões ainda precisa de paginação apropriada |
| Contratação | `enrollment-creation.ts` valida academia GYM, aluno, unidade, grants atuais, plano ativo, preço e pagador dentro de transação Serializable. Cria PENDING_ACCEPTANCE, sem ativação ou cobrança externa | Regra de múltiplas matrículas aguarda decisão explícita; criação não limita a uma matrícula |
| Obrigação | `GymInvoice` mantém competência, vencimento, total, saldo e vínculo contratual. Serviço de recorrência local emite uma obrigação por chave de competência | Pausa, troca e renovação ainda não foram consolidadas; não presumir o ciclo completo aprovado |
| Recebimento | `GymPayment` é o recebimento; `GymPaymentAllocation` aplica o valor às obrigações. Baixa parcial não quita o saldo nem substitui aceite | Validações anteriores de dinheiro estão nos anexos de caixa/despesas e artefatos PostgreSQL |
| Reversão | Preserva recebimento/alocações, recompõe saldo e gera compensação de caixa quando aplicável | Sem qualquer estorno externo durante a tarefa |
| Cancelamento contratual | `enrollment-cancellation.ts` revalida ator e unidade. Imediato encerra contrato/acesso local e geração futura; programado conserva o estado até `endDate`. Ambos preservam dívida, recibos e aceite | `endDate` representa vigência contratual, não confirmação de período pago; revisar produto antes de prometer outro efeito |
| Encerramento automático | `enrollment-closure-job.ts` revalida contrato local na transação, aplica cancelamento/expiração vencidos uma vez; ignora assinatura externa e contabiliza a pendência | Agendamento implantado não inspecionado; contratos processados por lote de 500 |
| Legado externo | `PaymentWebhookEvent` retém payload criptografado e hash; vínculo GYM e estado REVIEW_REQUIRED. Nenhuma obrigação/baixa/saque/acesso é alterado automaticamente por esses eventos | Reconciliação administrativa efetiva, eventos sem vínculo demonstrável e histórico anterior sem payload recuperável ainda exigem tratamento |

## Validação e segurança dos contratos

- DTOs de planos e matrícula são estritos: preços inteiros não negativos, ciclos/duração/termos e datas válidas; propriedades de módulos físicos retirados não são aceitas.
- Versão nova não altera o preço ou texto contratado anteriormente. Plano desativado não pode receber nova publicação/contratação.
- Preço diferente do catálogo requer `workspace.manage`, além de `enrollments.manage`; ID de operador enviado pelo cliente não concede autoridade.
- Aluno e unidade devem pertencer à academia; pagador global arbitrário e responsável de outro vínculo são recusados. Pagador personalizado exige documento válido.
- Menor não recebe acesso próprio nesta etapa. Representação verificada continua necessária no aceite; cadastro de responsável não fabrica verificação.
- Respostas omitem token de cartão e selecionam explicitamente os campos públicos de User; dados de autenticação não integram a matrícula.
- Assinatura externa bloqueia cancelamento local e conversão automática. Histórico permanece preservado, sem consulta/comando ao gateway.

## Transição dos webhooks

A migration aditiva `20261002020000_gym_legacy_webhook_review` acrescenta REVIEW_REQUIRED, vínculo opcional à academia e índice da fila. O FK impede exclusão do workspace enquanto houver evento vinculado. Nenhum dado financeiro é removido ou convertido. Foi aplicada somente no PostgreSQL descartável `127.0.0.1:56432/atlasfit_gym_stabilization_20261001`; não foi implantada.

Ingresso exige autenticação do webhook e armazenamento criptografado configurado. Sem chave adequada retorna indisponibilidade para retry, sem confirmar recebimento perdido. A chave usada é `ASAAS_ENCRYPTION_SECRET`, ou o fallback existente `AUTH_SECRET`, com mínimo de 32 caracteres. Segredos e payloads completos não são enviados por DTO ou logs.

O registro único é criado com `createMany(skipDuplicates)` e relido pela chave provider/environment/event. Entrega simultânea não depende de um upsert implementado com precheck no cliente Prisma. Hash divergente para o mesmo ID é recusado; não substitui o evento original. Na ausência de ID legado, o fallback é hash determinístico do corpo, sem timestamp inventado.

GYM é identificado por assinatura contratual, cobrança, conta, saque ou operação de recuperação existente. Identificação ambígua permanece em revisão global, sem atribuir payload a uma academia arbitrária. Replay GYM retorna REVIEW_REQUIRED e não cria efeitos. `/api/gym/finance/legacy` disponibiliza resumo limitado da fila própria, sem payload/segredos ou botões de wallet.

Para eventos autônomos, claim condicional impede dois processadores do mesmo evento. Falha retorna FAILED_RETRYABLE/HTTP 503 e não PROCESSED/200. PROCESSING interrompido não é retomado automaticamente: ainda falta procedimento seguro de recuperação, pois apenas mudar status pode repetir efeitos externos.

Transferências PERSONAL agora aplicam fatos em transação Serializable: falha/cancelamento compensa a reserva uma vez; conclusão/falha conflitantes exigem revisão; evento atrasado não reabre estado terminal. Conta é localizada pelo ID interno correto. A rotina aplica fatos e nunca solicita transferência/saque.

A resolução de aluno de cobrança externa só aceita PERSONAL pertencente ao titular da conta. Sem workspace explícito, exige um único vínculo possível; não usa qualquer matrícula do aluno ou academia em que o personal seja funcionário. A sincronização histórica de `WorkspacePayment` ainda usa nome, sem FK da obrigação: não foi considerada completa ou segura contra todos os homônimos. E-mails/realtime sem outbox e reconciliação compartilhada continuam pendências.

## Comunicação e indicadores

`gym-communication-service.ts` aceita somente IN_APP. Seleção de destinatários respeita grants, unidade e atribuição ao member do treinador; responsáveis devem estar verificados e não revogados. Resposta PERSISTED confirma persistência interna, sem alegar EMAIL/PUSH entregues. Notificação e auditoria são atômicas; retry de solicitação e entrega externa ainda não fazem parte de uma fila implementada.

Fluxo de caixa analítico usa `paidAt` e `reversedAt`, não a data de criação: recebimento e reversão pertencem ao seu período efetivo. Despesa parcial entra pelo ledger, sem duplicar agregados legados. Alocações de outra unidade não entram no total da unidade; reversão histórica pode produzir líquido negativo. Centavos são agregados em BigInt antes da conversão segura para apresentação.

MRR, churn, contagem de renovação e aging por data civil/timezone ainda precisam de revisão. A correção do fluxo de caixa não foi usada para encerrar todo o GYM-AUD-036.

## Verificações

| Execução | Resultado | Alcance real |
|---|---|---|
| `enrollment-lifecycle` | 27/0 PostgreSQL | Valores/planos, versões concorrentes, contratos antigos, criação/autoridade/pagador, baixa parcial/integral/reversão, ciclo único e cancelamento/job concorrente preservando dívida/legado |
| `postgresql-plan-finance` | 38/0 PostgreSQL, execução anterior | Plano, caixa/despesas e períodos de recebimento/reversão; anterior às últimas mudanças de encerramento/webhook |
| `gym-states-analytics` | 7/0 unitários | Transições locais, métricas e neutralização CSV; não prova todos os indicadores |
| `postgresql-notification-retirement` | 5/0 PostgreSQL | Canal interno, atribuição, unidade, suspensão, recepção e desligamento |
| `legacy-webhook` | 3/0 PostgreSQL | Payload recuperável, retry concorrente, hash adulterado, autenticação, ausência de efeitos GYM, compensação única PERSONAL, rollback sem reserva e seleção sem fallback para GYM |
| `personal-shared-unit` | 77/0 unitários selecionados | Pagamentos/segurança/recorrência/privacy/workout existentes; não prova toda a operação PERSONAL ou a experiência afiliada |
| `local-cycle-unit` | 8/0 unitários | Transições, gateway GYM retirado, métricas e CSV; substitui expectativas antigas de gateway ativo |
| `csv-assigned` | 2/0 PostgreSQL, 20 fora do filtro | Exportação por unidade/atribuição, fórmulas e precisão monetária; demais casos não executados nesse filtro |
| `http-legacy-webhook` | 1/0 HTTP, 24 fora do filtro | Autenticação inválida 400, retenção GYM REVIEW_REQUIRED/200 e falha real de processamento FAILED_RETRYABLE/503 |
| `http-workspace-csv` | 1/0 HTTP, 25 fora do filtro | Seleção inicial/Server Action/cookie com grant local, CSV atribuído, financeiro negado e revogação na sessão existente |
| `prisma validate` | Exit 0 | Schema válido; não comprova a cadeia histórica completa de migrations |
| `transaction-regression` | 16/0 PostgreSQL | Webhooks e caixa/despesas após ampliar reconhecimento dos conflitos de serialização do adapter |

O [registro da análise de tipos](typecheck-ciclo-local.json) contém comando, horário, saída e exit code da última execução.

Resultados detalhados em [verificacoes-isoladas.json](verificacoes-isoladas.json), incluindo falhas intermediárias. O primeiro teste concorrente de webhook encontrou P2002 no upsert; o código foi corrigido e repetido com sucesso. Testes antigos que esperavam cobrança/cancelamento automático GYM foram substituídos por tombstone 410 e verificação PostgreSQL de retenção; fontes anteriores preservadas em `.tmp/gym-retired-sources`.

Uma repetição de recorrência expôs P2002 na chave única do ciclo: o índice evitava duplicidade, mas a requisição concorrente falhava. Agora o serviço bloqueia a matrícula com `SELECT ... FOR UPDATE` parametrizado antes das leituras de setup/geração/encerramento. O adapter expôs o conflito como P2010 com `driverAdapterError.cause.kind=TransactionWriteConflict`; o retry transacional reconhece esse formato e SQLSTATE 40001/40P01, com limite de tentativas. Não repete erros de negócio/constraints genericamente. A execução posterior de 27 cenários e a regressão compartilhada de 16 passaram. Falhas e logs brutos anteriores estão preservados; não foram consideradas aprovações.

## Cobertura e decisões pendentes

| Arquivos | Profundidade | Pendência |
|---|---|---|
| `plan-service.ts`, handlers de planos e cliente | DTO, persistência, versões, uso UI e teste de concorrência cruzados | Browser, catálogo extenso e serialização do legado em todas as telas |
| `enrollment-creation.ts`, `enrollment-cancellation.ts`, handlers, cliente e facade | Entrada/autoridade/regra/efeitos/persistência acompanhados; testes PostgreSQL | Regra de uma/várias matrículas; fluxos pause/resume/change/renew antigos |
| `enrollment-closure-job.ts`, dois cron e manual-subscription | Job local e concorrência verificados | Agendamento/observabilidade implantados, timezone e recuperação de todos os efeitos |
| `webhook-processor.ts`, `gym-legacy-scope.ts`, `personal-transfer-event.ts`, `personal-billing-student.ts`, Asaas ingress/adapter e migration | Caminhos alterados seguidos, fatos sintéticos reais no banco e regressão selecionada | Reconciliação efetiva, lease/outbox, homônimos e jornadas compartilhadas com gateway real |
| Comunicação e analytics | Canal/autoridade/destinatários e caixa por data cruzados com dados reais | Entrega externa, métricas restantes e browser |
| Seleção inicial, selectActiveWorkspace e analytics/export | Action HTTP real conserva papel local; papel revogado não seleciona workspace; instrutor não exporta alunos não atribuídos nem financeiro | EXPERIÊNCIA afiliada e trial/paywall próprios continuam como última etapa; navegação visual pendente |

A escolha sobre múltiplas matrículas e efeito da pausa na geração futura foi apresentada ao usuário e permanece sem resposta específica. “Continue” não foi interpretado como escolha de regra contratual. Partes independentes avançaram normalmente; nenhuma decisão foi escondida numa refatoração.
