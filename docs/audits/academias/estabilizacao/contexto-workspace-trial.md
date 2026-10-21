# Contexto GYM/PERSONAL e trial — 08 e 09/10/2026

A seleção de workspace continua usando a action autorizada do servidor para verificar vínculo e gravar os cookies. O cliente atualiza o store apenas após essa resposta. Os layouts agora inicializam o store com o contexto que o servidor resolveu, incluindo papéis e rota padrão. O PERSONAL também faz isso após recarga; antes dessa correção, seu store começava vazio.

O layout PERSONAL preserva o ingresso de novas contas pelo onboarding. Depois do onboarding, exige contexto PERSONAL autorizado e direciona contextos GYM/aluno para a área correspondente. A API do dashboard também valida tipo, vínculo ativo, papéis de equipe e o workspace selecionado antes de retornar dados; uma requisição de um contexto anterior recebe `409`.

O trial exige `isActive`, início já alcançado e instante atual anterior ao fim. Layout e API compartilham essa regra; o paywall usa o resultado autorizado da API. Trial revogado com data final futura permanece bloqueado, evitando divergência entre a decisão do layout e a do paywall. A decisão de realizar uma compra não foi acionada no ensaio.

A quota de alunos da assinatura PERSONAL conta apenas workspaces PERSONAL do titular. Academias não consomem essa quota. O limite de assessorias continua contando somente PERSONAL e os ensaios não ampliam nem reiniciam a duração do trial.

O CTA de upgrade abre a página real de assinatura. Quando acionado no GYM, primeiro seleciona uma assessoria própria ativa pelo servidor; manter o cookie GYM faria o layout PERSONAL devolver o usuário à academia. Não registra uma solicitação fictícia nem confirma envio por toast. A opção de adicionar workspace aguarda a quota carregada; antes, clicar cedo podia abrir a criação mesmo com o limite atingido. O diálogo possui rolagem explícita para manter o CTA acessível quando existem vários planos. A seleção inicial também aceita Enter/Espaço pelo teclado após a inicialização.

O ensaio usa dois usuários, duas academias licenciadas e uma assessoria com trial no PostgreSQL descartável. O usuário de equipe é gerente na academia A e financeiro na B. Cookies HTTP-only, cabeçalho que consome o store, requisições, recarga, retorno GYM/PERSONAL, quota, trial revogado e rotas de login são verificados no Chrome com Next real. Nenhum serviço de pagamento ou dado real de cliente é modificado.

O resultado final e seus limites são registrados em `verificacoes-contexto-workspace.json`. Os ensaios anteriores que falharam por ambiguidade de seletor, por verificar uma URL que já era igual antes da resposta da action e por troca de chunks durante compilação a frio são preservados. A sincronização final aguarda o cookie autorizado mudar e as rotas são compiladas antes de carregar o navegador, sem suprimir erros de página. A matriz temporal do trial e a regressão PERSONAL são registradas em `verificacoes-isoladas.json`.
