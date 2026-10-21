# Página financeira, despesas e catálogo — atualização de 05/10/2026

## Causa e implementação

A página exigia `invoices.read` global mesmo quando os comandos permitiam FINANCE/RECEPTIONIST por unidade. Agora a página usa o contexto GYM ativo e `getGymFinancePageData`: grants atuais definem controles disponíveis e, separadamente, o escopo dos dados necessários a cada ação. A união de capacidades serve à apresentação; não confere autoridade global aos comandos.

| Operação | Resultado implementado |
|---|---|
| Formulário de fatura | Alunos, matrículas e responsáveis verificados são selecionados nas unidades em que o operador pode emitir. Consulta explícita omite dados de autenticação. |
| Recebimento | Lista de contas internas limitada às unidades de `payments.record`; backend revalida obrigação, saldo, conta e ator. |
| Abas | Pagamentos/caixa exigem leitura de pagamentos; métricas financeiras exigem relatórios financeiros. Query string não seleciona aba ausente. |
| Listagem de faturas/recebimentos | Autoridade, escopo, contagem e registros consultados na mesma transação Serializable, com ordenação determinística. Recibo que atravessa unidades permanece indisponível ao operador local; não se fabrica recibo parcial. |
| Despesas | Contratos HTTP estritos reutilizam schemas dos comandos; operador vem da sessão. Strings booleanas, campos de ator e corpo inesperado são recusados. Baixa/cancelamento autorizam o recurso por unidade, sem exigir papel global. |
| Categorias/fornecedores | Ator obrigatório e autorização dentro da transação. São metadados compartilhados da própria academia, sem saldo nem fatos financeiros; não pertencem a uma unidade no modelo atual. Autoridade local de emissão permite manutenção desse catálogo compartilhado. |
| Categorias padrão | Provisionamento de nova academia dentro da transação principal. GET é consulta pura. Academia existente sem categorias usa ação explícita “Preparar categorias padrão”. Unicidade e `createMany(skipDuplicates)` evitam duplicação concorrente, preservando categorias existentes/inativas. |

O método órfão que criava caixa implicitamente foi removido após busca de consumidores. Contas são criadas por comando autorizado. O lote inicial da página/catálogo não exigiu migration. A ampliação de emissão descrita abaixo usa migration aditiva; nenhuma operação ocorreu em dados reais, gateway, mensagens ou equipamento.

## Emissão avulsa e tentativa de recebimento

Também foi corrigido o retry da emissão avulsa, que anteriormente criava uma obrigação nova a cada POST. `GymInvoice.issuanceKey` é única e nullable para preservar histórico; `issuanceFingerprint` representa o conteúdo validado e o operador. É uma chave de emissão distinta de `recurrenceKey`, que continua representando o ciclo contratual.

O contrato de emissão exige `idempotencyKey`. A transação reautoriza a obrigação existente antes de devolver um replay; conteúdo/ator diferente com a mesma chave retorna 409. Duas emissões simultâneas criam uma fatura e um registro de auditoria. Não são canceladas ou deduplicadas faturas históricas. Consumidores antigos precisam enviar chave estável; a interface atual foi atualizada. Mocks antigos de emissão ainda não foram reconciliados com esse contrato, e sua aprovação não foi declarada.

Emissão e recebimento da interface usam `useRequestAttempt`, escopado por academia/operação e, para recebimento, obrigação. A aba guarda somente a chave em sessionStorage; confirmação remove a chave, enquanto resposta incerta conserva a tentativa. Trocar os dados de uma tentativa persistida conflita no servidor. Recuperação em browser após reload e edição de tentativa incerta ainda precisa de homologação e feedback contextual; não se declara essa UX concluída.

`20261005000000_gym_manual_invoice_retry` acrescenta dois campos nullable e índice único, sem backfill destrutivo. Aplicada somente ao PostgreSQL descartável identificado nos testes; Prisma Client gerado e schema validado com saída 0. A cadeia histórica/baseline e o rollout em ambiente existente continuam pendentes.

## Validação e limites

PostgreSQL real descartável: `finance-page` em [verificacoes-isoladas.json](verificacoes-isoladas.json), **2 aprovações, 0 falhas**. Casos agrupam escopo do formulário, alteração/revogação de grant sem restaurar legado, catálogo GET sem escrita, inicialização concorrente, unicidade de categoria, formatos, fornecedor, aluno sem autoridade, suspensão e provisionamento completo com categorias.

HTTP/SSR real isolado: `http-finance-page` em `tests/gym/http.spec.ts`, **1 aprovação, 0 falhas, 30 casos fora do filtro**. FINANCE local abriu a página sem receber aluno/conta de outra unidade; GET não criou categorias; POST preparou catálogo; contrato adulterado foi recusado; despesa estrangeira/conta estrangeira foram negadas; baixa parcial conservou saldo; retry não duplicou recebimento; reversão recompôs a conta; cancelamento só ocorreu após reversão; grant revogado negou consulta e retry. TypeScript: [resultado](typecheck-financeiro-unidades.json). Teste HTTP não equivale a interação em navegador.

Ampliação final: `invoice-retry`, **5 aprovações, 0 falhas, 28 casos fora do filtro**, em PostgreSQL real. Inclui emissão concorrente, alteração de intenção, revogação/suspensão do replay e regressão de alçada, pagador, unidade, recibo e reversão. As fixtures passaram a informar chave obrigatória; assertions de segurança foram preservadas. A repetição HTTP passou novamente após gerar o Prisma Client, incluindo emissão simultânea única, 409 para conteúdo alterado e 403 para replay após revogação.

Ainda pendentes: navegador/mobile/teclado, seletores paginados acima de 100 alunos/contas, paginação do catálogo, seleção contextual da conta conforme a obrigação e feedback de eventual revogação durante a jornada. Um controle disponível em alguma unidade pode estar indisponível para determinado recurso: o servidor recusa a operação; a UI ainda precisa representar essa distinção por linha. Fórmulas de indicadores e dados financeiros históricos permanecem nos achados compostos correspondentes. PERSONAL e suas integrações não foram alterados neste lote.
