# Caixa interno — repetição, unidade e contratos

Lote de 03/10/2026, complementar ao [financeiro interno](caixa-despesas.md) e ao [acompanhamento](../estabilizacao-modulo-academias.md). Intervenções principais: GYM-AUD-026 e partes de 001, 002, 011, 012, 030 e 051. Não altera assinaturas PERSONAL ou integrações compartilhadas de pagamento.

## Comportamento consolidado

| Operação | Regra efetiva |
|---|---|
| Transferência interna | Chave da tentativa obrigatória; origem/destino internos, mesma academia e autoridade nas duas unidades. Débito, crédito, movimentos em CASH e auditoria são atômicos. |
| Sangria/suprimento | Chave obrigatória; apenas o operador do turno. Sangria com destino mantém um movimento e uma transferência vinculada. Saldo e contagem são relidos na transação. |
| Repetição | Mesma chave e conteúdo/ator devolvem o registro persistido. Conteúdo alterado retorna 409. Permissões, suspensão e pertencimento são revalidados antes de devolver o registro. |
| Turno fechado/conferido | Pode consultar o resultado de uma tentativa concluída, sem editar o turno. Outra chave representa novo lançamento e é recusada. |
| Abertura | Conta CASH explícita na interface; o servidor valida unidade e conta juntas. Uma abertura repetida não cria outro turno aberto. Contagem inicial não é receita nova. |
| Fechamento | Somente operador; diferença exige justificativa. Contrato estrito de centavos não aceita strings monetárias ou campos adicionais. |
| Conferência | `refunds.approve` na unidade do turno e justificativa mínima de cinco caracteres. Não exige promoção a gestor global. |
| Leitura de contas/turnos/despesas | Ator obrigatório e grants atuais dentro de Serializable. Papel legado com unidade não restaura autoridade central. Despesas e indicadores usam o mesmo filtro de unidades, inclusive com busca textual. |

Os pagamentos e reversões mantêm as regras dos lotes anteriores: obrigação distinta do recebimento, parcial conserva saldo, conta/caixa e alocações atualizados na mesma transação, compensação rastreável sem apagar recibo. Reversão em CASH usa o turno atual do operador, conservando o turno fechado original. Despesas com agregado histórico sem recibo individual exigem reconciliação; não se inventa um recebimento para estorná-las.

## API e interface

| Contrato | Alteração |
|---|---|
| POST `/api/gym/finance/transfers` | `idempotencyKey` obrigatória, schema estrito; ator vem da sessão. |
| POST `/api/gym/finance/cash-drawer/movements` | Chave obrigatória, tipo SUPPLY/BLEED e valor positivo; recurso governa a autorização. |
| GET/POST `/api/gym/finance/accounts` | GET retorna contas internas autorizadas, unidades e disponibilidade de conta central. POST recusa GATEWAY_ONLINE e resolve a unidade no servidor. |
| GET/POST `/api/gym/finance/cash-drawer` | Enum de situação e corpo estritos; status inválido retorna 400. Consultas não provisionam contas. |
| POST `/api/gym/finance/cash-drawer/close` e `/reconcile` | Schemas compartilhados com os comandos; autorização na unidade real do recurso. |
| GET `/api/gym/finance/expenses` | Ator não é fornecido pelo cliente. Unidade opcional deve estar autorizada; filtros/paginação inválidos retornam 400. |

O cadastro de contas perdeu opção, badge e texto de subconta/gateway. Mostra unidade, tipos internos e saldo **registrado**, sem anunciar saldo disponível externo. Unidade da nova conta/despesa e conta do turno são selecionáveis. Pagamento imediato da despesa filtra contas da unidade ou centrais autorizadas. Erro de carregamento possui nova tentativa, e resposta antiga não sobrescreve contexto mais recente. DTOs de contas e caixa são validados no cliente sem `any` novo. Seletores usam Label e componentes existentes; o campo bancário não força duas colunas em mobile.

A criação/pagamento de despesa também conserva a chave no hook comum, sem zerá-la ao editar formulário ou reabrir modal após resposta incerta. Os controles de despesa usam `invoices.issue`. Esta evolução de interface foi compilada; o comportamento em browser continua uma lacuna explicitada abaixo.

Os botões de conta usam `invoices.issue`; conferência usa `refunds.approve`, coerentes com o servidor. A página financeira como um todo ainda usa permissões globais para alguns carregamentos e controles. Grants exclusivamente locais já operam as rotas delimitadas, mas a jornada SSR completa ainda precisa de consolidação em GYM-AUD-002/051. Despesas, categorias, fornecedores, analytics e navegação não devem ser considerados integralmente revisados por este lote.

`useRequestAttempt` conserva a chave até confirmação. A chave fica no `sessionStorage` por workspace/operação; movimento também identifica o turno. Reload na mesma aba recupera a tentativa. Apenas a chave é armazenada, sem nome, valor ou descrição. Editar após resposta incerta conserva a chave e permite ao servidor recusar divergência. Falha no armazenamento impede envio; não há fallback silencioso para nova chave. Essa parte foi inspecionada/compilada; recuperação em navegador real, abas, troca de usuário e mensagens específicas de conflito continuam sem homologação. Não oferece idempotência entre dispositivos sem reutilização explícita da chave.

## Dados e transição

Migration aditiva [`20261003020000_gym_cash_movement_retry`](../../../../prisma/migrations/20261003020000_gym_cash_movement_retry/migration.sql): `idempotencyKey` única e `requestFingerprint` nullable em GymAccountTransfer/GymCashDrawerMovement. Linhas anteriores conservam valores e chave null. Não atribui correspondências fictícias a movimentos históricos. Aplicada somente em PostgreSQL descartável específico por `scripts/gym-apply-cash-retry-isolated.cjs`. Não houve migration, envio ou operação em ambiente real.

Clientes antigos precisam fornecer chave estável; corpos sem chave passam a retornar 400. Implantação deve coordenar cliente/API/schema. Rollback do aplicativo pode conservar as colunas novas; não remover dados nem índices automaticamente. Cadeia histórica de migrations continua uma pendência independente em GYM-AUD-046.

## Verificações e limites

Resultados íntegros e caminhos dos artefatos em [verificacoes-isoladas.json](verificacoes-isoladas.json).

| Verificação | Resultado | Alcance |
|---|---|---|
| `cash-movement-scope`: cash-expense + manual-finance | 42 passaram, 0 falharam, 0 filtrados | PostgreSQL real: recebimentos, alocações, compensação, parcial, concorrência, turno, retry de transferência/sangria e escopo de contas/turnos/despesas. |
| `http-cash-movement-scope` | 1 jornada passou; 28 casos fora do filtro | Credentials/prova e cookie de workspace reais; FINANCE local, schema inválido, central/outra unidade negadas, duas tentativas simultâneas únicas, fechamento/conferência, consulta após fechamento e revogação. Não é browser. |
| Prisma validate | Aprovado | Coerência do schema; não reconcilia dados implantados ou baseline histórica. |
| TypeScript | Resultado no artefato `verificacoes-caixa-contratos.json` | Compilação é distinta de interação/homologação visual. |

Aviso do driver PG sobre consultas simultâneas e aviso de configuração futura do Vite foram conservados; não houve falha por esses avisos. `git diff --check` do conjunto rastreado encontrou whitespace em arquivos compartilhados de outros lotes; isso não foi ocultado nem alterado indiscriminadamente. Registro separado no artefato das verificações.

A compilação intermediária encontrou duas referências ao mecanismo antigo de chave nos botões de despesa. A [falha anterior](typecheck-caixa-antes-limpeza.json) foi preservada; as referências foram removidas, mantendo a tentativa até confirmação. Resultado posterior consta no artefato de verificações.

Limites: navegador/mobile/teclado indisponíveis neste lote; R2/comprovantes e conciliação histórica não homologados; MRR/churn/aging e escopo completo de relatórios permanecem pendentes; a criação de defaults em GET de categorias continua uma escrita a separar. O estado final de GYM-AUD-026 se refere às causas e invariantes financeiras demonstradas, não à certificação dos dados existentes ou de toda a interface GYM.
