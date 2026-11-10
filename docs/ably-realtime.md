# Documentação de Tempo Real com Ably — AtlasFit

Este documento descreve detalhadamente a infraestrutura, arquitetura, canais, eventos e integração reativa do **Ably Realtime** no ecossistema AtlasFit.

---

## 1. Visão Geral

O **Ably** é a espinha dorsal de comunicação em tempo real da plataforma AtlasFit. Ele substitui a necessidade de conexões WebSocket mantidas diretamente nos servidores da aplicação e elimina o polling contínuo via HTTP, provendo:

1. **Notificações In-App Instantâneas:** Alertas na barra superior e sinos de notificação para personais e alunos.
2. **Atualização Financeira da Carteira (Wallet):** Saldo e lançamentos atualizados em milissegundos após confirmação de pagamentos (Asaas e AbacatePay).
3. **Chat em Tempo Real:** Envio, edição, exclusão, confirmação de leitura e status de digitação entre alunos e personais.
4. **Presença em Tempo Real:** Identificação de quem está online no workspace da academia ou no portal do aluno.
5. **Progresso ao Vivo:** Acompanhamento em tempo real de importação e migração de planilhas de dados.
6. **Votações do Roadmap:** Atualização instantânea de contagem de votos em features e enquetes.

---

## 2. Arquitetura Server-Side

### 2.1. Cliente REST Global e Publicação Inteligente
- **Arquivo:** [`src/lib/ably.ts`](file:///c:/Users/gabriel/development/atlasfit/src/lib/ably.ts)
- **Instância:** `ablyRest` é inicializada de forma resiliente a partir de `process.env.ABLY_API_KEY`. Se a chave não for fornecida (ex: testes locais ou CI), a aplicação não trava e registra avisos operacionais.
- **Função Principal:** `publishToChannel(channelName, eventName, data)`
  - **Roteamento de Chat:** Quando o canal segue o padrão `workspace:<id>:chat`, o serviço valida no banco os participantes ativos da conversa, verifica permissões de acesso ao workspace e publica no canal individual de cada participante (`user:<participantId>:workspace:<workspaceId>:chat`).
  - **Roteamento Scoped de Academias:** Se o workspace for do tipo `GYM`, eventos financeiros são automaticamente roteados para o sufixo `:finance`.

### 2.2. Integração com o Transactional Outbox & Disparo Reativo
- **Arquivos:** [`src/lib/delivery/outbox.ts`](file:///c:/Users/gabriel/development/atlasfit/src/lib/delivery/outbox.ts) e [`src/lib/delivery/worker.ts`](file:///c:/Users/gabriel/development/atlasfit/src/lib/delivery/worker.ts)
- **Padrão de Confiabilidade (Transactional Outbox):**
  1. Quando uma notificação in-app é criada via `enqueueNotification`, ela é persistida na tabela `DeliveryOutbox` no PostgreSQL com `channel = "ABLY"` e payload cifrado.
  2. Logo após a confirmação (`commit`) da transação no banco, a função `triggerOutboxProcessing()` é executada em segundo plano.
  3. No Next.js (App Router), utiliza a API `after()` de `next/server`. Fora do contexto de requisição, utiliza `setImmediate()`. `OUTBOX_REACTIVE_PROCESSING=false` desativa somente o disparo reativo, permitindo testes controlados ou operação exclusivamente pelo cron.
  4. O trabalhador recupera a mensagem com `SELECT FOR UPDATE`, decodifica o payload, valida com schema Zod e publica no Ably via `ablyRest.channels.get(channelName).publish(...)`.
  5. O commit preserva a intenção de entrega de forma atômica; a publicação ocorre depois e pode falhar. O disparo reativo processa até dois lotes de 25, e o cron recupera backlog e retries. A latência até o consumidor precisa ser medida no ambiente publicado; não há garantia de 100 ms ou de exibição ao usuário.

---

## 3. Arquitetura Client-Side

### 3.1. Contexto e Provedor React
- **Arquivo:** [`src/providers/ably-provider.tsx`](file:///c:/Users/gabriel/development/atlasfit/src/providers/ably-provider.tsx)
- **Hook de Consumo:** `useAbly()`
- **Autenticação Segura via Token Scoped:**
  - O cliente frontend **nunca** recebe a chave mestra do Ably.
  - Ao iniciar, o cliente solicita um token efêmero ao endpoint `/api/ably/token?workspaceId=...`.
  - O backend ([`src/modules/workspaces/application/realtime-capabilities.ts`](file:///c:/Users/gabriel/development/atlasfit/src/modules/workspaces/application/realtime-capabilities.ts)) gera uma *capability* estrita permitindo apenas inscrição (*subscribe*) e presença nos canais que pertencem especificamente ao usuário autenticado e ao workspace ativo.
  - Membros ativos recebem permissão de leitura nos canais `workspace:<workspaceId>` para acompanhar o ciclo de vida do workspace (ex: suspensões).
- **Assinaturas Globais de Ciclo de Vida e Segurança:**
  - `user:<userId>`: Escuta o evento `user:blocked`. Ao ser disparado, desconecta o usuário em tempo real via `signOut({ callbackUrl: "/auth/student?blocked=1" })`.
  - `workspace:<activeWorkspaceId>`: Escuta o evento `workspace:suspended`. Ao ser disparado, invalida os cookies de contexto do workspace ativo e redireciona imediatamente todos os alunos e instrutores para `/select-workspace`.

### 3.2. Presença (Presence)
- Canais de presença no formato `workspace:<workspaceId>:presence`.
- Registra status `online` com `userId`, `userName` e papel do membro.
- O componente de presença atualiza dinamicamente avatares e listas de usuários conectados.

### 3.3. Importação assistida sem polling

A etapa de **confirmação/criação dos alunos** usa o stream da própria requisição HTTP, sem eventos Ably. Veja [a arquitetura e os limites da confirmação](./assisted-import-commit.md). Os canais abaixo continuam restritos à extração, processamento das fontes e consumo de créditos.

- O [hook compartilhado](../src/hooks/use-import-realtime.ts) inscreve dashboard, revisão e indicador de coins nos canais autorizados pelo token. [Dashboard](../src/components/migration/migration-dashboard-view.tsx) e [revisão](../src/components/migration/migration-review-view.tsx) aplicam `job_updated` ao estado React, preservando os cards e formulários abertos. Não há consultas periódicas nem `router.refresh()` para acompanhar processamento.
- A API fornece o estado inicial. Ao conectar o canal pela primeira vez, ou receber `attached`/`update` com `resumed: false`, cada consumidor faz uma sincronização HTTP discreta para cobrir mensagens perdidas. Reconexões com continuidade são recuperadas pelo SDK. A tela conserva os dados existentes e informa quando o tempo real está indisponível; não reativa skeletons durante sincronizações.
- O [controle de atualizações](../src/lib/migration/realtime.ts) preserva eventos recebidos enquanto uma consulta HTTP estava em andamento. Respostas de outro workspace, requisições substituídas e callbacks de assinaturas encerradas são descartados. A limpeza remove somente os próprios handlers, sem destacar canais compartilhados com alertas globais.
- Após persistir cada débito e o consumo do job, o [serviço de extração](../src/lib/migration/extraction.service.ts) publica o saldo por meio de [credit-realtime.service.ts](../src/lib/migration/credit-realtime.service.ts). Dashboard e [badge de coins](../src/components/application/personal-coins-badge.tsx) aplicam os valores recebidos diretamente. Falhas de publicação não interrompem débitos já confirmados. O saldo da academia pertence ao workspace; o saldo do personal circula exclusivamente no canal privado do usuário que pagou.
- O evento contém somente identificadores, saldo/franquia e dados operacionais de progresso. Os registros de alunos e treinos continuam sendo obtidos pela API autenticada. Ao chegar a revisão, pausa ou falha, os registros são buscados uma vez, sem desmontar a interface; eventos repetidos com os mesmos contadores não repetem essa busca.

---

## 4. Catálogo de Canais e Eventos

A tabela abaixo lista todos os canais e eventos utilizados no AtlasFit:

| Canal | Evento | Origem / Publicador | Destinatário / Consumidor | Finalidade |
| :--- | :--- | :--- | :--- | :--- |
| `user:<userId>:notifications` | `notification:new` | [`src/lib/delivery/worker.ts`](file:///c:/Users/gabriel/development/atlasfit/src/lib/delivery/worker.ts) | Sino de Notificações / Toasts | Exibe novas notificações in-app para alunos, personais e superadmins. |
| `user:<userId>` | `user:blocked` | [`src/lib/auth/admin-user-service.ts`](file:///c:/Users/gabriel/development/atlasfit/src/lib/auth/admin-user-service.ts) | [`src/providers/ably-provider.tsx`](file:///c:/Users/gabriel/development/atlasfit/src/providers/ably-provider.tsx) | Encerra a sessão do usuário em tempo real ao ser bloqueado pelo superadmin, deslogando-o para a tela de login. |
| `user:<userId>` | `wallet:updated` | Webhooks Asaas/AbacatePay / PaymentService | Painel da Carteira (Personal) | Atualiza saldo disponível, saldo pendente e histórico de faturamento sem recarregar a tela. |
| `workspace:<workspaceId>` | `workspace:suspended` | [`src/modules/workspaces/application/workspace-administration.ts`](file:///c:/Users/gabriel/development/atlasfit/src/modules/workspaces/application/workspace-administration.ts) / [`admin-user-service.ts`](file:///c:/Users/gabriel/development/atlasfit/src/lib/auth/admin-user-service.ts) / [`src/lib/recurrence.ts`](file:///c:/Users/gabriel/development/atlasfit/src/lib/recurrence.ts) | [`src/providers/ably-provider.tsx`](file:///c:/Users/gabriel/development/atlasfit/src/providers/ably-provider.tsx) | Desconecta em tempo real todos os alunos e membros do workspace suspenso (manualmente ou por atraso em recorrência), redirecionando para `/select-workspace`. |
| `workspace:<workspaceId>` / `:finance` | `financial:updated` | Webhooks / GymFinancialService / PaymentService | Dashboards Financeiros | Recalcula métricas e gráficos de faturamento de academias e personais. |
| `conversation:<conversationId>` | `message:new` | `/api/chat/messages` | Interface de Chat | Entrega nova mensagem enviada na conversa aberta. |
| `conversation:<conversationId>` | `message:update` | `/api/chat/messages/[id]` | Interface de Chat | Atualiza texto de mensagem editada. |
| `conversation:<conversationId>` | `message:status` | `/api/chat/messages/[id]` | Interface de Chat | Atualiza status de envio/entrega da mensagem (`SENT`, `DELIVERED`). |
| `conversation:<conversationId>` | `message:read_all` | `/api/chat/messages/read` | Interface de Chat | Marca visualmente confirmação de leitura (dois checks azuis). |
| `conversation:<conversationId>` | `message:delete` | `/api/chat/messages/[id]` | Interface de Chat | Remove mensagem apagada em tempo real na tela dos interlocutores. |
| `workspace:<workspaceId>:chat` | `conversation:new` | `/api/chat/conversations` | Lista de Conversas | Insere nova conversa iniciada no topo da listagem. |
| `workspace:<workspaceId>:chat` | `conversation:update` | `/api/chat/messages` | Lista de Conversas | Atualiza preview da última mensagem e contador de não lidas. |
| `workspace:<workspaceId>:presence` | Presença (enter/leave) | [`src/providers/ably-provider.tsx`](file:///c:/Users/gabriel/development/atlasfit/src/providers/ably-provider.tsx) | Barra lateral e cabeçalhos | Indica membros e instrutores atualmente conectados no workspace. |
| `migration:<workspaceId>` | `job_updated` | [`src/lib/migration/extraction.service.ts`](file:///c:/Users/gabriel/development/atlasfit/src/lib/migration/extraction.service.ts) | Dashboard e Revisão de Migração no Personal ([`src/app/(personal)/personal/clients/migrate/page.tsx`](file:///c:/Users/gabriel/development/atlasfit/src/app/(personal)/personal/clients/migrate/page.tsx), [`[id]/page.tsx`](file:///c:/Users/gabriel/development/atlasfit/src/app/(personal)/personal/clients/migrate/[id]/page.tsx)) e na Academia ([`src/app/(gym)/gym/import/page.tsx`](file:///c:/Users/gabriel/development/atlasfit/src/app/(gym)/gym/import/page.tsx), [`[id]/page.tsx`](file:///c:/Users/gabriel/development/atlasfit/src/app/(gym)/gym/import/[id]/page.tsx)) via componentes reutilizáveis ([`migration-dashboard-view.tsx`](file:///c:/Users/gabriel/development/atlasfit/src/components/migration/migration-dashboard-view.tsx), [`migration-review-view.tsx`](file:///c:/Users/gabriel/development/atlasfit/src/components/migration/migration-review-view.tsx)) | Notifica atualizações em tempo real do processamento de migração/importação: status (`UPLOADED`, `PROCESSING`, `REVIEW`, `PARTIAL`, `COMPLETED`, `FAILED`), porcentagem de progresso, créditos consumidos dinamicamente (`creditsConsumed`), motivo de pausa (`pauseReason`: `CREDITS_EXHAUSTED` ou `MANUAL_PAUSE`) e mensagem de progresso. |
| `roadmap:features` | `feature-voted` | `/api/roadmap/features/[id]/vote` | Página Pública de Roadmap | Incrementa contagem de votos ao vivo. |
| `migration:<workspaceId>` (academia) / `user:<userId>` (personal) | `import:credits_updated` | [credit-realtime.service.ts](../src/lib/migration/credit-realtime.service.ts), após débito na [extração](../src/lib/migration/extraction.service.ts) | [useImportCreditRealtime](../src/hooks/use-import-realtime.ts), dashboard e badge de coins | Entrega `{ workspaceId, quotaBalance }` com o saldo atual após consumo, incluindo franquia usada/total e créditos avulsos. Usa capabilities existentes, sem conceder publicação ao cliente. |
| `roadmap:polls` | `poll-voted` | `/api/roadmap/polls/active` | Widget de Enquetes | Atualiza porcentagem de votos da enquete ao vivo. |
| `adjustment-request-<requestId>` | `new_message` | `/api/personal/workouts/.../messages` | Modal de Ajuste de Treino | Troca de mensagens entre aluno e personal sobre ajustes em exercícios. |

---

## 5. Boas Práticas e Regras de Segurança

1. **Princípio do Privilégio Mínimo no Token:** Tokens emitidos no frontend devem conter apenas as permissões de leitura necessárias para os canais do usuário autenticado.
2. **Dados Sensíveis:** Nunca publique senhas, tokens de banco, dados completos de cartão de crédito (PAN/CVV) ou segredos criptográficos em payloads do Ably.
3. **Idempotência:** Todo evento crítico despachado via outbox possui ID determinístico (`${job.id}:0`) garantindo que clientes não processem eventos duplicados em caso de reconexão.
4. **Isolamento de Tenants:** Canais com escopo de workspace obrigatoriamente exigem validação de pertinência do usuário ao workspace correspondente antes do token ser emitido.

---

## 6. Manutenção

> [!IMPORTANT]
> Qualquer alteração, exclusão ou inclusão de novos canais, eventos ou fluxos de tempo real DEVE ser refletida imediatamente neste documento, em conformidade com as regras do projeto em [`.agents/rules/documentation.md`](file:///c:/Users/gabriel/development/atlasfit/.agents/rules/documentation.md).
