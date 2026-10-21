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
  3. No Next.js (App Router), utiliza a API `after()` de `next/server` para manter o ambiente serverless ativo até o envio da mensagem. Em testes ou fora do contexto de requisição, utiliza `setImmediate()`.
  4. O trabalhador recupera a mensagem com `SELECT FOR UPDATE`, decodifica o payload, valida com schema Zod e publica no Ably via `ablyRest.channels.get(channelName).publish(...)`.
  5. **Vantagem:** O usuário recebe o evento na tela em **menos de 100 milissegundos**, com total garantia ACID e sem precisar esperar nenhum cron job de polling.

---

## 3. Arquitetura Client-Side

### 3.1. Contexto e Provedor React
- **Arquivo:** [`src/providers/ably-provider.tsx`](file:///c:/Users/gabriel/development/atlasfit/src/providers/ably-provider.tsx)
- **Hook de Consumo:** `useAbly()`
- **Autenticação Segura via Token Scoped:**
  - O cliente frontend **nunca** recebe a chave mestra do Ably.
  - Ao iniciar, o cliente solicita um token efêmero ao endpoint `/api/ably/token?workspaceId=...`.
  - O backend gera uma *capability* estrita permitindo apenas inscrição (*subscribe*) e presença nos canais que pertencem especificamente ao usuário autenticado e ao workspace ativo.

### 3.2. Presença (Presence)
- Canais de presença no formato `workspace:<workspaceId>:presence`.
- Registra status `online` com `userId`, `userName` e papel do membro.
- O componente de presença atualiza dinamicamente avatares e listas de usuários conectados.

---

## 4. Catálogo de Canais e Eventos

A tabela abaixo lista todos os canais e eventos utilizados no AtlasFit:

| Canal | Evento | Origem / Publicador | Destinatário / Consumidor | Finalidade |
| :--- | :--- | :--- | :--- | :--- |
| `user:<userId>:notifications` | `notification:new` | [`src/lib/delivery/worker.ts`](file:///c:/Users/gabriel/development/atlasfit/src/lib/delivery/worker.ts) | Sino de Notificações / Toasts | Exibe novas notificações in-app para alunos, personais e superadmins. |
| `user:<userId>` | `wallet:updated` | Webhooks Asaas/AbacatePay / PaymentService | Painel da Carteira (Personal) | Atualiza saldo disponível, saldo pendente e histórico de faturamento sem recarregar a tela. |
| `workspace:<workspaceId>` / `:finance` | `financial:updated` | Webhooks / GymFinancialService / PaymentService | Dashboards Financeiros | Recalcula métricas e gráficos de faturamento de academias e personais. |
| `conversation:<conversationId>` | `message:new` | `/api/chat/messages` | Interface de Chat | Entrega nova mensagem enviada na conversa aberta. |
| `conversation:<conversationId>` | `message:update` | `/api/chat/messages/[id]` | Interface de Chat | Atualiza texto de mensagem editada. |
| `conversation:<conversationId>` | `message:status` | `/api/chat/messages/[id]` | Interface de Chat | Atualiza status de envio/entrega da mensagem (`SENT`, `DELIVERED`). |
| `conversation:<conversationId>` | `message:read_all` | `/api/chat/messages/read` | Interface de Chat | Marca visualmente confirmação de leitura (dois checks azuis). |
| `conversation:<conversationId>` | `message:delete` | `/api/chat/messages/[id]` | Interface de Chat | Remove mensagem apagada em tempo real na tela dos interlocutores. |
| `workspace:<workspaceId>:chat` | `conversation:new` | `/api/chat/conversations` | Lista de Conversas | Insere nova conversa iniciada no topo da listagem. |
| `workspace:<workspaceId>:chat` | `conversation:update` | `/api/chat/messages` | Lista de Conversas | Atualiza preview da última mensagem e contador de não lidas. |
| `workspace:<workspaceId>:presence` | Presença (enter/leave) | [`src/providers/ably-provider.tsx`](file:///c:/Users/gabriel/development/atlasfit/src/providers/ably-provider.tsx) | Barra lateral e cabeçalhos | Indica membros e instrutores atualmente conectados no workspace. |
| `migration:<workspaceId>` | `job_updated` | [`src/lib/migration/extraction.service.ts`](file:///c:/Users/gabriel/development/atlasfit/src/lib/migration/extraction.service.ts) | Tela de Migração de Dados | Atualiza barra de progresso e porcentagem de importação de planilhas. |
| `roadmap:features` | `feature-voted` | `/api/roadmap/features/[id]/vote` | Página Pública de Roadmap | Incrementa contagem de votos ao vivo. |
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
