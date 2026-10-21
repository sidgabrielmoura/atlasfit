# Edição de métodos e grupos — 08/10/2026

A biblioteca de treinos possui a ação **Métodos e grupos**. O formulário edita séries, repetições, descanso, carga, observações, preferência de ajuste de repetições e os parâmetros de dropset/rest-pause. Também cria, altera, remove e associa biset, triset e circuito, validando a quantidade mínima de exercícios por grupo.

A edição mantém os IDs dos exercícios do modelo. Fichas previamente prescritas e seus grupos são cópias independentes; não são atualizados pelo comando. Campos legados adicionais de configuração são preservados quando o tipo do método ou grupo permanece o mesmo. Retirar o método ou grupo é uma ação explícita.

O editor envia uma revisão do estado carregado. O servidor verifica a autorização atual, academia e autoria/gestão na mesma transação, bloqueia o modelo durante a gravação e recusa uma revisão antiga com `409 WORKOUT_EDIT_CONFLICT`. IDs de outra ficha, configuração inválida e campos desconhecidos são recusados. A auditoria faz parte da transação: falha ao registrá-la reverte a alteração inteira.

O formulário só confirma sucesso depois de validar a resposta. Erro de carregamento, conflito ou resposta inválida permanecem visíveis; **Recarregar modelo** descarta a edição local e busca o estado atual. Carregamentos antigos são cancelados e callbacks de um contexto anterior não atualizam o formulário atual.

Para adicionar/remover exercícios pelo editor básico, é preciso retirar os métodos/grupos e devolver os ajustes individuais à preferência da ficha. A edição avançada não substitui indiscriminadamente as linhas. Configurações legadas incompatíveis precisam de regularização explícita; não são convertidas silenciosamente.

Verificações e limites de ambiente são registrados nos manifestos `verificacoes-treinos-browser.json`, `verificacoes-treinos-app-browser.json` e `verificacoes-treinos-avancados.json`. Dados e credenciais dos ensaios pertencem exclusivamente ao banco descartável. O ensaio de formulário usa transporte controlado; o ensaio da aplicação usa Next, HTTP e PostgreSQL reais.

O ensaio completo detectou um rodapé inacessível no desktop: o estilo compartilhado do diálogo usava `sm:overflow-visible`. O editor agora aplica `sm:overflow-auto` com altura máxima explícita, preservando a tela cheia no celular. A repetição confirmou acesso aos controles, ausência de overflow horizontal e operação por teclado. A falha e sua captura foram preservadas junto às evidências finais.
