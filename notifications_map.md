# Mapa Geral do Sistema de Notificações - AtlasFit

Este documento apresenta o mapeamento completo de todas as telas, funcionalidades, condições e fluxos de negócio do sistema AtlasFit onde o envio de notificações (seja para o **Personal Trainer** ou para o **Aluno**) é aplicável, detalhando os canais recomendados, regras de disparo e níveis de prioridade.

---

## 1. Canais e Níveis de Prioridade

O sistema suporta múltiplos canais de entrega, configuráveis pelo usuário em suas preferências:

*   **In-App (Central / Sininho):** Exibição na barra de navegação superior, armazenando o histórico de notificações na base de dados.
*   **Web Push (Navegador):** Notificação push nativa enviada via Firebase Cloud Messaging (FCM).
*   **WhatsApp:** Mensagens transacionais diretas enviadas via Z-API/Twilio.
*   **E-mail:** E-mails transacionais enviados via Resend/SendGrid.

### Níveis de Prioridade (Prisma Enum)
*   `LOW`: Informações secundárias e gamificação.
*   `NORMAL`: Atualizações de treinos, novidades e tarefas de rotina.
*   `HIGH`: Confirmação de pagamentos, agendamentos comerciais e novos leads.
*   `CRITICAL`: Alertas de segurança, expiração de planos e faturamento pendente.

---

## 2. Mapeamento por Módulos e Funcionalidades

### 2.1. Módulo: CRM & Vendas (Funil de Vendas)
*Destinatário principal: Personal Trainer*

| Tela / Funcionalidade | Condição / Gatilho | Canal Sugerido | Prioridade | Tipo de Notificação | Descrição da Mensagem |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Funil de CRM (Visualização de Leads)** | Cadastro de um novo lead (manual ou via formulário de captura) | In-App, Push, WhatsApp | `HIGH` | `CRM_LEAD_CREATED` | "Novo Lead Capturado 🎯: O lead '{Nome}' foi adicionado ao seu funil." |
| **Funil de CRM (Visualização de Leads)** | Lead alterou de estágio no pipeline (ex: de "Novos" para "Proposta") | In-App, Push | `NORMAL` | `CRM_LEAD_STATUS_UPDATED` | "Lead Atualizado 🔄: O status de '{Nome}' foi alterado para '{Novo Status}'." |
| **Atividades do Lead** | Lead permanece inativo na mesma coluna por mais de 5 dias úteis | In-App, WhatsApp, E-mail | `HIGH` | `CRM_LEAD_STAGNANT` | "Alerta de Negócio ⏳: O lead '{Nome}' está sem movimentação há 5 dias. Entre em contato!" |
| **Tarefas do Lead** | Uma tarefa atrelada ao lead atinge a data/hora limite sem ser concluída | In-App, Push | `HIGH` | `CRM_LEAD_TASK_OVERDUE` | "Tarefa Comercial Atrasada 🚨: '{Titulo da Tarefa}' para o lead '{Nome}' expirou." |

---

### 2.2. Módulo: Treinos & Prescrição
*Destinatários: Aluno e Personal Trainer*

| Tela / Funcionalidade | Condição / Gatilho | Canal Sugerido | Prioridade | Tipo de Notificação | Descrição da Mensagem |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Prescrição de Treino** *(Personal)* | Um novo treino é publicado/prescrito para o aluno | In-App, Push, WhatsApp | `HIGH` | `TRAINING_CREATED` | **Para Aluno:** "Novo Treino Prescrito! 🏋️‍♂️ O professor preparou a ficha '{Nome do Treino}'." |
| **Edição de Treino** *(Personal)* | Um treino ativo do aluno é atualizado/modificado | In-App, Push | `NORMAL` | `TRAINING_UPDATED` | **Para Aluno:** "Treino Atualizado 🔄: A ficha '{Nome do Treino}' sofreu alterações de cargas/séries." |
| **Execução de Treino** *(Aluno)* | O aluno finaliza e registra a execução de um treino no aplicativo | In-App, Push | `NORMAL` | `TRAINING_COMPLETED` | **Para Personal:** "Treino Concluído! 🏆 '{Aluno}' finalizou a rotina '{Nome do Treino}'." |
| **Ajuste de Treino** *(Aluno)* | Aluno envia uma mensagem/solicitação de ajuste de carga ou alteração de exercício | In-App, Push | `HIGH` | `TRAINING_ADJUSTMENT_REQUEST` | **Para Personal:** "Solicitação de Ajuste ⚙️: '{Aluno}' pediu modificação no exercício '{Exercicio}'." |

---

### 2.3. Módulo: Avaliação Física
*Destinatários: Aluno e Personal Trainer*

| Tela / Funcionalidade | Condição / Gatilho | Canal Sugerido | Prioridade | Tipo de Notificação | Descrição da Mensagem |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Nova Avaliação** *(Personal)* | Uma nova avaliação física (Pollock/Bioimpedância) é salva e disponibilizada | In-App, Push, E-mail | `HIGH` | `ASSESSMENT_CREATED` | **Para Aluno:** "Sua Avaliação Física está Pronta! 📊 Veja os resultados do dia {Data}." |
| **Histórico / Evolução** *(Aluno)* | Aluno envia fotos de progresso corporal ou medidas | In-App, Push | `NORMAL` | `ASSESSMENT_PHOTO_UPLOADED` | **Para Personal:** "Novas Fotos de Progresso 📷: O aluno '{Aluno}' postou novas fotos para acompanhamento." |
| **Comentário de Progresso** *(Personal)* | Personal comenta ou curte uma foto de evolução do aluno | In-App, Push | `NORMAL` | `ASSESSMENT_FEEDBACK_RECEIVED` | **Para Aluno:** "Seu Personal curtiu seu progresso! ❤️ '{Personal}' deixou um comentário na sua evolução." |

---

### 2.4. Módulo: Financeiro & Cobrança
*Destinatários: Aluno e Personal Trainer*

| Tela / Funcionalidade | Condição / Gatilho | Canal Sugerido | Prioridade | Tipo de Notificação | Descrição da Mensagem |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Pagamentos de Alunos** | Sistema confirma a recepção do PIX/Boleto de mensalidade do aluno | In-App, Push, WhatsApp | `HIGH` | `PAYMENT_CONFIRMED` | **Para Aluno:** "Pagamento Confirmado! ✅ Acesso ao app liberado por mais um período." <br>**Para Personal:** "Mensalidade Recebida 💰: '{Aluno}' efetuou o pagamento do plano." |
| **Vencimento de Fatura** | Fatura do aluno atinge o vencimento e não foi liquidada | In-App, Push, WhatsApp, E-mail | `HIGH` | `PAYMENT_OVERDUE` | **Para Aluno:** "Fatura Pendente ⚠️: Sua assinatura expira em breve. Evite o bloqueio efetuando o pagamento." |
| **Mensalidade da Plataforma** *(Personal)* | A assinatura do plano profissional do Personal expira ou falha (AbacatePay) | In-App, E-mail, WhatsApp | `CRITICAL` | `PLATFORM_BILLING_FAILED` | **Para Personal:** "Assinatura Expirada 🚨: Regularize seu plano AtlasFit para evitar o bloqueio dos painéis." |

---

### 2.5. Módulo: Agenda, Consultas & Check-ins
*Destinatários: Aluno e Personal Trainer*

| Tela / Funcionalidade | Condição / Gatilho | Canal Sugerido | Prioridade | Tipo de Notificação | Descrição da Mensagem |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Agenda / Calendário** *(Personal)* | Uma nova consulta presencial ou avaliação é marcada na agenda | In-App, Push, WhatsApp | `HIGH` | `APPOINTMENT_SCHEDULED` | **Para Aluno:** "Agendamento Confirmado 🗓️: Sua avaliação com '{Personal}' foi marcada para {Data} às {Hora}." |
| **Agenda / Calendário** *(Personal)* | Um compromisso agendado é cancelado | In-App, Push, WhatsApp | `HIGH` | `APPOINTMENT_CANCELLED` | **Para Aluno/Personal:** "Compromisso Cancelado ❌: O agendamento do dia {Data} foi desmarcado." |
| **Resumo do Dia** | Lembrete matinal automático (enviado diariamente às 08:00) | E-mail, In-App | `NORMAL` | `DAILY_AGENDA_SUMMARY` | **Para Personal:** "Sua Agenda de Hoje ☕: Você possui {X} alunos agendados e {Y} tarefas pendentes." |

---

### 2.6. Módulo: Feedbacks Diários & Comunicação
*Destinatários: Aluno e Personal Trainer*

| Tela / Funcionalidade | Condição / Gatilho | Canal Sugerido | Prioridade | Tipo de Notificação | Descrição da Mensagem |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Feedback Diário** *(Aluno)* | O aluno preenche seu diário de bem-estar (Energia, Humor, Fadiga) | In-App, Push | `NORMAL` | `DAILY_FEEDBACK_RECEIVED` | **Para Personal:** "Feedback de '{Aluno}' 📋: Relatou Energia {E}, Humor {H} e Fadiga {F} hoje." |
| **Falta de Feedback** | O aluno está há 3 dias sem registrar treinos ou feedbacks diários | In-App, Push, WhatsApp | `NORMAL` | `INACTIVITY_ALERT` | **Para Aluno:** "Sentimos sua falta! 👋 Que tal registrar seu treino ou como está se sentindo hoje?" <br>**Para Personal:** "Alerta de Inatividade: '{Aluno}' está há 3 dias sem dar notícias." |
| **Chat / Mensagens** | Uma nova mensagem direta é enviada no chat interno | In-App, Push | `HIGH` | `MESSAGE_RECEIVED` | **Para Destinatário:** "Nova mensagem de '{Nome}': '{Previa da mensagem}'." |

---

### 2.7. Módulo: Gamificação & Engajamento
*Destinatário principal: Aluno*

| Tela / Funcionalidade | Condição / Gatilho | Canal Sugerido | Prioridade | Tipo de Notificação | Descrição da Mensagem |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Nível / XP** | Aluno ganha pontos por treinos consistentes e sobe de nível | In-App, Push | `LOW` | `LEVEL_UP` | "Level Up! ⚡ Você subiu para o nível {Nivel}! Continue firme." |
| **Conquistas (Badges)** | Aluno desbloqueia uma conquista (ex: 'Frequência Nota 10') | In-App, Push | `LOW` | `BADGE_UNLOCKED` | "Conquista Desbloqueada! 🏅 Você ganhou o selo '{Badge}'." |
| **Metas de Frequência** | Aluno completa uma meta personalizada estipulada pelo personal | In-App, Push | `NORMAL` | `GOAL_COMPLETED` | "Meta Cumprida! 🎉 Você completou a meta de treinar 4x esta semana!" |

---

### 2.8. Módulo: Sistema & Segurança
*Destinatários: Aluno e Personal Trainer*

| Tela / Funcionalidade | Condição / Gatilho | Canal Sugerido | Prioridade | Tipo de Notificação | Descrição da Mensagem |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Segurança / Login** | Login realizado em um novo navegador ou localização geográfica atípica | In-App, E-mail | `CRITICAL` | `SECURITY` | "Novo Acesso Detectado 🛡️: Um login foi feito no seu perfil AtlasFit a partir de {Dispositivo}." |
| **Segurança / Senha** | Senha da conta é alterada com sucesso | E-mail | `HIGH` | `SECURITY` | "Senha Alterada 🔐: Sua senha foi alterada com sucesso. Se não foi você, contate o suporte." |
| **Notícias / Atualizações** | Lançamento de novas campanhas ou avisos do sistema (Admin) | In-App, Push | `NORMAL` | `CAMPAIGN` | "Novidade na AtlasFit! 🚀 Confira as novas ferramentas de evolução e gráficos de progresso." |

---

## 3. Diretrizes de Desenvolvimento e Regras de Negócio

Para garantir a melhor experiência do usuário (UX) e escalabilidade técnica:

1.  **Centro de Preferências do Usuário (Opt-In / Opt-Out):**
    *   Todas as categorias descritas neste documento (exceto `SYSTEM` e `SECURITY` por motivos de conformidade) devem permitir que o usuário desative os canais individualmente nas configurações de perfil.
2.  **Agrupamento de Notificações (Throttling / Debounce):**
    *   Notificações rápidas e sucessivas (como o Personal atualizando 3 exercícios seguidos de um treino) devem ser agrupadas em um único alerta final para não causar fadiga de notificações no dispositivo do usuário.
3.  **Filas e Workers Assíncronos:**
    *   O envio de mensagens pesadas (WhatsApp, Push FCM e E-mail) deve ser sempre despachado para filas em background (usando Redis/BullMQ ou similar) para que as rotas de API da aplicação respondam instantaneamente, eliminando atrasos visuais para o usuário durante o clique.
