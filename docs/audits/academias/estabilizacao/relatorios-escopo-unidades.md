# Relatórios, carteira e unidades — atualização de 05/10/2026

Este lote corrige autorização de indicadores/exportação e consulta do histórico externo. Não encerra o achado composto GYM-AUD-036. A revisão temporal GYM posterior está em [indicadores-temporais.md](indicadores-temporais.md); consultas SuperAdmin, dados legados e demais limites permanecem pendentes.

| Consumidor | Autoridade e comportamento atual |
|---|---|
| `/gym/dashboard` e `/api/gym/analytics/kpis` | Ator real obrigatório; financeiro depende dos grants atuais. TRAINER recebe apenas sua carteira dentro das unidades autorizadas, com valores financeiros zerados. Parâmetros não concedem financeiro. |
| `/api/gym/analytics/export` | Exportação financeira exige autoridade financeira; aluno operacional permanece restrito à carteira quando não existe gestão. Seleção de campos omite autenticação e saúde. CSV neutraliza fórmulas e conserva precisão. |
| `/api/gym/finance/legacy` | Consulta sem comandos, provisionamento ou polling externo. Inventário global exige `reports.finance` global; papel/grant local não concede acesso ao histórico de outras unidades. |
| Recursos financeiros | Matrícula, aluno e plano precisam pertencer à academia consultada. Recebimentos nos indicadores somam somente alocações autorizadas, evitando incluir parcelas de outra unidade. |

`gym-report-authority.ts` resolve ator, vínculo, suspensão, grants, unidade e carteira dentro da mesma transação Serializable dos fatos consultados. Grants existentes substituem o legado, inclusive após revogação. Alvo profissional estrangeiro é recusado. Na consulta operacional por unidade, a falta de financeiro pode resultar em carteira operacional; exportação financeira nunca usa esse fallback para conceder acesso.

Exportação tem limite explícito de 5.000 registros: consulta um registro adicional e devolve 413/`EXPORT_LIMIT_EXCEEDED` se ultrapassar. Não entrega CSV truncado como completo. Consultas de indicadores ainda podem crescer com os fatos autorizados; não foram adicionados índices ou cache sem medição.

## Evidências

- PostgreSQL real descartável: lote `report-scope` em [verificacoes-isoladas.json](verificacoes-isoladas.json), **6 aprovações, 0 falhas, 34 casos fora do filtro**. Inclui grants acumulados/revogados, legado local, carteira, suspensão, academia estrangeira, valores alocados e exportações.
- HTTP/SSR real isolado: lote `http-report-scope` no mesmo registro, **1 aprovação, 0 falhas, 29 casos fora do filtro**. Credentials/sessão/contexto reais; indicadores e exportações locais, alteração para TRAINER, revogação, dashboard sem financeiro e histórico externo sem criação de conta.
- TypeScript do lote terminou com saída 0. A verificação posterior de financeiro está registrada em [typecheck-financeiro-unidades.json](typecheck-financeiro-unidades.json); resultados só cobrem a revisão indicada pelo registro.
- Uma execução intermediária de fixture falhou pela falta de `termsText`; o dado obrigatório foi acrescentado à fixture, sem afrouxar a implementação ou as assertions. Outra verificação intermediária encontrou o novo código de erro ausente da união de tipos; o contrato foi corrigido.

Arquivos centrais: `application/gym-report-authority.ts`, `gym-analytics-service.ts`, `gym-unit-access.ts`, APIs analytics/legacy, página/cliente dashboard e `tests/gym/report-scope.integration.ts`/`http.spec.ts`, sob `src/modules/workspaces` e `src/app`.

## Limites preservados

Não houve homologação de navegador, dados reais, implantação, agendamento ou integração externa. Cold SSR local incluiu aproximadamente 77 segundos de compilação; renderização aquecida observada foi de aproximadamente 1,7 segundo. São observações locais, não benchmark de produção. Unidade inativa, recebimentos históricos sem alocação e reconciliação de fatos legados permanecem pendentes. O total em aberto do card financeiro inicial foi renomeado para explicitar que corresponde à página carregada.

A continuação de 05/10/2026 das consultas financeiras SuperAdmin está em [superadmin-indicadores.md](superadmin-indicadores.md), com evidência própria. O achado composto continua parcial nos limites restantes.
