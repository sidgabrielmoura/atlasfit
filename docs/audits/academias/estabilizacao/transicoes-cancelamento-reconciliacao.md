# Ponto 3 — transições contratuais, cancelamento e reconciliação

Escopo local/manual do GYM, iniciado em 06/10/2026 e concluído em 07/10/2026. A conferência final e os resultados brutos estão em [verificacoes-transicoes.json](verificacoes-transicoes.json). A auditoria original permanece intacta.

## Verificação do lote

245 testes PostgreSQL e quatro cenários HTTP focais passaram, sem falhas. O filtro HTTP deixa 52 casos fora da execução; não equivale à aprovação da suíte HTTP completa. TypeScript completo passou. A jornada no Chrome verifica seis cenários, em desktop e celular, incluindo foco por teclado no aceite e checagem dos fatos persistidos após cada comando.

O teste visual agora aguarda a resposta HTTP do comando antes de consultar os registros e o fechamento do formulário. A regressão da pausa verifica tanto o início no dia da ativação quanto a rejeição do dia anterior, sem gravar pausa. Execuções intermediárias e capturas de falha permanecem no manifesto.

`node scripts/test-gym-contract.cjs` encadeia os testes PostgreSQL, HTTP, preparação das contas visuais, navegador, TypeScript e documentação, com parada na primeira falha. Exige os servidores descartáveis previamente iniciados. A ordem é necessária: as suítes publicam documentos jurídicos sintéticos no mesmo banco; executá-las durante a jornada visual pode abrir o reaceite obrigatório. Essa interferência foi reproduzida nesta continuação e a validação final usa execução sequencial.

## Comportamento implementado

- Troca de plano e renovação criam contratos sucessores com condições próprias, novo aceite e obrigação inicial. A ativação substitui o contrato anterior atomicamente, após o recebimento exigido; dívida, recibos e aceite anteriores permanecem no histórico. Uma revisão aceita impede outra cobrança no contrato anterior para o mesmo período. A vigência futura exige ativação explícita depois de seu início.
- Pausa suspende novas mensalidades. Na retomada, vencimentos dentro do intervalo efetivo são pulados, sem cobrança retroativa. Dívidas anteriores continuam exigíveis. Pausa futura retirada não inventa tempo de vigência; retomada concorrente e scheduler atrasado não geram uma mensalidade futura antecipadamente. O formulário aceita pausa no dia da ativação, preservando o instante inicial do contrato.
- Cancelamento imediato encerra acesso e recorrência local, fecha pausas abertas e propostas dependentes ainda não ativadas. Cancelamento futuro mantém a vigência até sua data, quando o job efetiva o encerramento uma única vez. Retirada justificada de cancelamento futuro preserva o estado e não reinicia recorrência interrompida. As obrigações e os aceites permanecem.
- Assinatura externa histórica exige conferência documental do encerramento externo, cobranças pendentes, ciclos, crédito e troca agendada. A revisão preserva a referência externa para identificar webhooks atrasados, sem executar uma operação no provedor nem conceder acesso. Uma nova data local futura é opcional e não regulariza faturas antigas automaticamente.
- Reconciliação de fatura distingue pagamento histórico reconhecido de novos recebimentos alocados. Reconciliação de conta calcula abertura, recebimentos confirmados, despesas individuais não estornadas, transferências e movimentos avulsos de caixa. Centavos são exatos, inclusive acima do limite seguro de números JavaScript. Ajuste de saldo não cria receita.
- Transferências novas têm vínculo exato com seus movimentos de caixa. Movimentos antigos sem vínculo exigem classificação documental como transferência existente ou dinheiro avulso; não se infere o vínculo pela descrição. Um lançamento vinculado não entra duas vezes no saldo.
- Fila de contratos identifica matrículas ativas/pausadas duplicadas. O gestor escolhe explicitamente quais encerrar, preservando obrigações. A rotina não escolhe um contrato por conta própria.
- Aprovação exige autoridade atual na academia/unidade original do recurso, justificativa, referência documental e confirmação. Preview obsoleto é recusado; retry idêntico conserva uma única decisão e revalida permissões. Evidência anterior/posterior é imutável no banco. A portabilidade inclui as revisões próprias de contratos e faturas, sem dados de outras contas.
- Os formulários de renovação e cancelamento aguardam o servidor e permanecem abertos em caso de falha. Reconciliação e retirada de cancelamento têm navegação por teclado e apresentação em celular.

## Dados e implantação

As migrations `20261006020000_gym_contract_reconciliation` e `20261006022000_gym_cash_transfer_evidence` foram aplicadas somente ao PostgreSQL descartável especificado nos testes. A primeira inclui evidência imutável e regra de pausa `SKIP`; a segunda só preenche vínculos históricos quando a referência é exata e não ambígua. Não houve acesso ao banco configurado, credenciais reais ou provedores externos. A cópia HTTP sem `.env` conserva o React Compiler; cache de rotas e otimização de memória são configurações exclusivas dessa cópia para a verificação.

O código da reconciliação está implementado. Inventário e decisões sobre contratos, cobranças, saldos e movimentos reais continuam nos achados 022/030/046; verificação local não declara o legado reconciliado. Dados inconsistentes, relações entre academias ou históricos acima do limite exigem revisão individual antes de aprovação. Pagamentos históricos sem conta identificada e despesas antigas sem pagamentos individuais exigem conferência adicional; não são transformados em recebimentos novos. A instalação operacional dos jobs e a baseline histórica permanecem em 043/046.

A [lista completa do restante](pendencias-restantes.md) inclui esses limites e todos os demais achados abertos. PERSONAL vinculado à academia continua como última etapa. CRM, turmas, hardware e gateway financeiro GYM permanecem retirados do escopo.
