# Indicadores de contratos e atraso — 05/10/2026

O lote separa a posição atual de contratos/saldos dos fatos do período selecionado. Não reconstrói saldos financeiros históricos a partir do saldo atual. Autoridade, carteira e unidades continuam resolvidas na mesma transação Serializable das consultas.

## Bases apresentadas

| Indicador | Base atual |
|---|---|
| Receita mensal contratada | Contratos ACTIVE vigentes agora, sem término ou cancelamento efetivo já atingido. Não inclui propostas, pausas ou contratos vencidos ainda aguardando job. Não representa dinheiro recebido. |
| Normalização | Preço contratual em BigInt; mensal /1, bimestral /2, trimestral /3, semestral /6, anual /12. CUSTOM usa preço × 30 / duração real, sem arredondar antes a quantidade de meses. Centavos são arredondados por contrato; somas e média permanecem inteiras até o DTO seguro. |
| Alunos ativos/pausados | Pessoas distintas na posição atual; alguém com contrato vigente e outro pausado não é contado nas duas categorias. |
| Novas matrículas | Contratos originais efetivamente ativados no período, pela data activatedAt. Proposta criada não é matrícula ativada. |
| Renovações | Contratos sucessores com changeKind RENEWAL ativados no período. Não procura texto livre no motivo de evento. |
| Cancelamentos | Cancelamento efetivo de contrato anteriormente ativado; eventos usam effectiveDate, não updatedAt ou a data de execução tardia do job. Contratos substituídos por revisão ativada não são perdas. |
| Cancelamento da coorte | Contratos ativos imediatamente antes do início, acompanhando seus sucessores ativados até o fim do período. Numerador conta cancelamentos dessa coorte; novos contratos não ampliam o denominador. Expiração e pausa não são cancelamentos nesta métrica. |
| Histórico insuficiente | Estado inicial não demonstrável por transições/ativação persistidas produz churnRatePercentage null e contagem de contratos insuficientes. A interface informa indisponibilidade, sem estimar a coorte pelo saldo de contratos atual. |
| Saldo em aberto/atraso | Posição atual, indicada por snapshot.asOf/basis CURRENT, independente do filtro de eventos. Saldo positivo de OPEN/PARTIALLY_PAID; vencimento no próprio dia continua a vencer. |
| Faixas de atraso | Dias civis no fuso escolhido da academia: 1–30, 31–60, 61–90 e mais de 90. Não divide duração em milissegundos por 24 horas; suporta dias de 23/25 horas. |
| Inadimplência | Saldo atualmente vencido / valor total das obrigações emitidas já vencidas. Exclui DRAFT, CANCELLED e REFUNDED do denominador e conserva sua base explícita no DTO/interface. |

O nome da tela é **Receita mensal contratada**: contratos finitos e recorrência encerrada ainda podem ter vigência contratual. O campo mrrInCents foi conservado por compatibilidade; não promete recorrência automática nem reconhecimento contábil. A referência conceitual de normalização é a [documentação da Stripe sobre MRR](https://support.stripe.com/questions/calculating-monthly-recurring-revenue-%28mrr%29-in-billing?locale=en-GB). A métrica de cancelamento local tem o escopo contratual definido acima, sem equivalência implícita ao churn de assinantes de um provedor.

Filtros YYYY-MM-DD abrangem todo o dia no fuso da academia; timestamps explícitos conservam o instante. A tela recebe reportTimezone do servidor antes da primeira consulta e monta períodos de 7/30/90 dias civis ou mês atual. A exportação usa a mesma interpretação de datas locais. Agendar/cancelar agendamento sem mudança de estado não altera o estado histórico da coorte.

## Verificação

- **PostgreSQL real descartável:** 8 testes aprovados, sem falhas, nos arquivos report-temporal, report-scope e finance-page. Incluem todos os ciclos, CUSTOM de 15/45 dias, arredondamento, overflow recusado, contratos vencidos/futuros, pessoa com contratos acumulados, fatura parcial, vencimento hoje/ontem, limites de faixas, horário de verão, período histórico, revisões/cancelamento posterior do sucessor, proposta não ativada, rascunho cancelado, evento registrado tardiamente, histórico insuficiente e regressão de grants/unidade/catálogo.
- **HTTP real isolado:** 2 jornadas aprovadas; 32 casos fora do filtro. Credentials, sessão e cookie reais; posição atual e null serializados, filtro de dia completo, fuso inválido recusado, SSR financeiro compilado, metadado do fuso vindo do servidor, grants/carteira/exportação/suspensão do acesso verificados.
- **TypeScript:** comando completo sem emissão, saída 0. Não foram introduzidos any ou casts para superar a verificação.
- Evidência bruta e comandos: lotes report-temporal e http-report-temporal em [verificacoes-isoladas.json](verificacoes-isoladas.json). Hashes e resumo do lote em verificacoes-indicadores-temporais.json.

Uma execução intermediária PostgreSQL encontrou uma proposta sintética apontando para contrato que já possuía sucessor vigente, recusada pelo índice de integridade. A fixture foi corrigida para propor a próxima revisão do sucessor vigente. A primeira execução HTTP tentou encontrar um card de aba montada somente no cliente no HTML SSR; a verificação foi ajustada para o contrato HTTP e o metadado SSR realmente disponíveis. Não foram removidas assertivas de cálculo ou afrouxadas regras do servidor. Arquivos brutos intermediários permanecem no diretório descartável.

## Limites

GYM-AUD-036 continua parcial: consultas financeiras do SuperAdmin, reconciliação de dados legados e indicadores históricos mais completos ainda exigem revisão. GYM-AUD-052 continua aberto: a consulta carrega contratos/eventos e obrigações autorizados; não há medição de carga representativa ou otimização homologada.

Ativação ausente em registros antigos não é fabricada nem preenchida automaticamente. Novas matrículas/renovações usam a ativação persistida; registros antigos incompletos exigem revisão de dados. Esta implementação não cria ledger histórico de saldo, política de cobrança durante pausa ou política de matrículas simultâneas.

HTTP/SSR não homologa interação da aba, filtros no navegador, mobile, teclado ou recuperação visual. A compilação mantém o React Compiler da configuração existente. Nenhuma migration, envio de mensagem, integração externa ou operação em banco existente/produção foi realizada. Personal vinculado permanece por último.

A continuação de 05/10/2026 das consultas financeiras SuperAdmin está em [superadmin-indicadores.md](superadmin-indicadores.md), com evidência própria. O achado composto continua parcial nos limites restantes.
