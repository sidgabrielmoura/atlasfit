# Integridade, agregação financeira e acessibilidade — 09/10/2026

O pedido de continuar retomou a estabilização após a interrupção anterior. Este lote conclui as alterações recentes de integridade e consultas financeiras e verifica a configuração global. Os achados compostos 011, 036, 046, 050, 051 e 052 permanecem abertos nos limites abaixo.

## Integridade no banco

A migração aditiva protege 35 relações declaradas GYM, incluindo unidade, equipe, contratos, planos, faturas, recebimentos e despesas. Também impede mudança de workspace envolvendo GYM em 48 tabelas e mudança de tenant herdado em três tabelas: grants de papel, alocações de pagamento e pagamentos de despesas. A fronteira GYM/PERSONAL é conferida dos dois lados; relações exclusivamente PERSONAL conservam o comportamento existente.

O preflight e a criação dos triggers ocorrem na mesma transação, com bloqueio das tabelas e limite de espera de dez segundos. Uma divergência interrompe e reverte a instalação inteira. A migração não adivinha, reescreve ou completa vínculos históricos. O gerador produz SQL idêntico na cadeia histórica e na cadeia explícita de baseline; a baseline aplicada anteriormente não foi alterada.

Nove testes em banco descartável verificaram referências estrangeiras, troca de produto/plano/workspace, troca do pai nas três relações herdadas, fronteira PERSONAL e reversão após inconsistência inicial ou tardia. A implantação Prisma em outro banco descartável passou em instalação vazia, repetição, status e diff de schema, com 35 triggers de relações, 48 de workspace e três de tenant herdado.

O inventário real foi somente de leitura, em snapshot repetível: 33 relações disponíveis retornaram zero divergências; `Notification.dispatchId` e `StudentBilling.workspacePaymentId` dependem do schema futuro e não foram contabilizadas como verificadas. O resultado continua `readyToMigrate: false`. Transição da baseline, histórico real de migrations, referências indiretas/identidade global e conciliação documental permanecem pendentes. Nenhuma migração foi aplicada ao banco configurado.

## Relatórios financeiros

Recebimentos, reversões, despesas, formas de pagamento e faixas de atraso agora usam somas/contagens no PostgreSQL. Valores conservam BigInt até a conversão validada em centavos. A consulta retorna totais e linhas por forma de pagamento; não carrega todas as faturas, parcelas ou pagamentos para somar em JavaScript. Contratos e eventos de ciclo de vida ainda exigem a consulta histórica existente.

Recebimentos e estornos pertencem às suas datas próprias. Parcelas de outra unidade ficam fora do total consultado. Despesas com recibos individuais não são duplicadas pelo agregado legado, e o líquido pode ser negativo. O histórico sem pagamentos individuais permanece identificado: recebimentos sem fatura ficam fora dos totais por aluno/unidade; despesas antigas usam somente datas/valores registrados. A interface explica a necessidade de conferência.

Sete testes de escopo/tempo passaram, incluindo estornos em mês diferente, parcelas entre unidades, legado e uma amostra de 5.000 faturas e 1.000 recebimentos. O manifesto registra a duração local; uma amostra sintética não estabelece desempenho operacional. Chrome conferiu o contrato HTTP e a mensagem em 390 e 1280 pixels, sem overflow da página ou erros JavaScript. O primeiro roteiro browser aguardou dados sem acionar Atualizar; a repetição corrigiu o roteiro e preservou a evidência dessa falha local.

## Acessibilidade da configuração global

Zoom da página foi habilitado, a busca usa botão nativo, controles têm nomes acessíveis e o painel de notificações tem nome de diálogo. Contraste de textos compartilhados do SuperAdmin foi ajustado. Foram conferidos celular/desktop (390/1280 pixels), temas claro/escuro, ausência de overflow, nomes de switches/campos na árvore de acessibilidade e uso de Espaço, Tab, ArrowUp, Enter e Escape.

As quatro amostras não apresentaram violações automáticas WCAG A/AA. Os itens inconclusivos foram registrados e conferidos separadamente: painel de notificações fechado/montado ao abrir, retorno do foco com Escape, contraste do item após rolagem da sidebar e contraste calculado do símbolo do atalho. Isso não representa verificação com leitor de tela real ou das outras superfícies.

## Evidências e continuidade

O [manifesto deste lote](verificacoes-integridade-agregacao.json) reúne comandos, resultados e hashes das fontes. A regressão completa executou 295 integrações PostgreSQL, sem falhas ou skips. Schema Prisma e TypeScript completo passaram. Os 77 testes PERSONAL e os lotes HTTP anteriores são evidência histórica e não foram reexecutados neste lote. A suíte antiga de mocks ainda tem falhas documentadas; esta regressão não declara toda a aplicação homologada.

A regressão de serviços usou o banco descartável habitual. Os nove casos de constraints e a instalação de baseline/migração usaram bancos novos separados; não foi aplicado o novo SQL ao banco habitual, que contém fixtures históricas. Uma jornada completa de aplicação sobre a baseline integral com a nova migração permanece parte da homologação anterior à implantação.

Restam jornadas legais/representação, identidade e finanças legadas, scheduler/notificações, reservas R2 por HTTP, paginação/índices, demais superfícies visuais, retenção/purga e PERSONAL vinculado. CRM, turmas, hardware e gateway financeiro GYM permanecem retirados; o financeiro GYM continua manual/local. Não houve commit, push, implantação ou alteração de dados de clientes.
